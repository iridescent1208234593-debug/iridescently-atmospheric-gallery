import * as THREE from 'three'
import { fallbackMood } from '../data/palette.js'

export const loading = { radius: 3, concurrency: 2, textureSize: 1536, sampleSize: 160 }

export class GalleryResources {
  constructor(files, onTexture, onPalette) {
    this.files = files
    this.onTexture = onTexture
    this.onPalette = onPalette
    this.textures = new Map()
    this.palettes = new Map()
    this.pending = new Map()
    this.failed = new Set()
    this.wanted = []
    this.disposed = false
    this.jobs = new Map()
    try {
      this.worker = new Worker(new URL('../data/palette-worker.js', import.meta.url), {
        type: 'module',
      })
      this.worker.onmessage = ({ data }) => {
        const job = this.jobs.get(data.id)
        if (!job) return
        this.jobs.delete(data.id)
        if (data.error) job.reject(new Error(data.error))
        else job.resolve(data.result)
      }
      this.worker.onerror = () => {
        this.jobs.forEach((job) => job.reject(new Error('Palette worker unavailable')))
        this.jobs.clear()
        this.worker?.terminate()
        this.worker = null
      }
    } catch {
      this.worker = null
    }
  }

  update(indices) {
    this.wanted = [...new Set(indices)].filter((index) => this.files[index])
    for (const [index, texture] of this.textures) {
      if (this.wanted.includes(index)) continue
      this.onTexture(index, null)
      texture.dispose()
      texture.image.width = texture.image.height = 1
      this.textures.delete(index)
    }
    for (const [index, controller] of this.pending) {
      if (!this.wanted.includes(index)) controller.abort()
    }
    this.pump()
  }

  pump() {
    if (this.disposed) return
    for (const index of this.wanted) {
      if (this.pending.size >= loading.concurrency) break
      if (this.textures.has(index) || this.pending.has(index) || this.failed.has(index)) continue
      const controller = new AbortController()
      this.pending.set(index, controller)
      this.load(index, controller).finally(() => {
        this.pending.delete(index)
        this.pump()
      })
    }
  }

  async load(index, controller) {
    let bitmap
    let texture
    let canvas
    const timeout = setTimeout(() => controller.abort(), 20000)
    try {
      const file = this.files[index]
      const response = await fetch(file.textureSrc, { signal: controller.signal })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      bitmap = await createImageBitmap(await response.blob())
      if (controller.signal.aborted || this.disposed) return
      const scale = Math.min(1, loading.textureSize / Math.max(bitmap.width, bitmap.height))
      canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(bitmap.width * scale))
      canvas.height = Math.max(1, Math.round(bitmap.height * scale))
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      texture = new THREE.CanvasTexture(canvas)
      texture.colorSpace = THREE.SRGBColorSpace
      this.textures.set(index, texture)
      this.onTexture(index, texture)
      clearTimeout(timeout)

      if (!this.palettes.has(file.textureSrc)) {
        try {
          if (!this.worker) throw new Error('Palette worker unavailable')
          const sample = document.createElement('canvas')
          const sampleScale = loading.sampleSize / Math.max(bitmap.width, bitmap.height)
          sample.width = Math.max(1, Math.round(bitmap.width * sampleScale))
          sample.height = Math.max(1, Math.round(bitmap.height * sampleScale))
          const context = sample.getContext('2d', { willReadFrequently: true })
          context.drawImage(bitmap, 0, 0, sample.width, sample.height)
          const pixels = context.getImageData(0, 0, sample.width, sample.height)
          const result = await this.analyze(index, pixels)
          if (this.disposed) return
          this.palettes.set(file.textureSrc, result)
        } catch (error) {
          if (this.disposed) return
          this.palettes.set(file.textureSrc, {
            source: 'fallback',
            mood: fallbackMood,
            error: error.message,
          })
        }
      }
      this.onPalette(index, this.palettes.get(file.textureSrc))
    } catch (error) {
      if (!controller.signal.aborted && !this.disposed) {
        this.failed.add(index)
        this.onPalette(index, { source: 'fallback', mood: fallbackMood, error: error.message })
        console.warn(`Gallery image failed: ${this.files[index].filename}`, error)
      }
    } finally {
      clearTimeout(timeout)
      bitmap?.close()
      if (texture && (this.disposed || !this.wanted.includes(index))) {
        this.onTexture(index, null)
        texture.dispose()
        canvas.width = canvas.height = 1
        this.textures.delete(index)
      }
    }
  }

  analyze(id, pixels) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.jobs.delete(id)
        reject(new Error('Palette analysis timed out'))
      }, 10000)
      this.jobs.set(id, {
        resolve: (value) => {
          clearTimeout(timeout)
          resolve(value)
        },
        reject: (error) => {
          clearTimeout(timeout)
          reject(error)
        },
      })
      try {
        this.worker.postMessage({ id, pixels }, [pixels.data.buffer])
      } catch (error) {
        this.jobs.delete(id)
        clearTimeout(timeout)
        reject(error)
      }
    })
  }

  dispose() {
    this.disposed = true
    this.pending.forEach((controller) => controller.abort())
    this.jobs.forEach((job) => job.reject(new Error('Gallery disposed')))
    this.jobs.clear()
    this.worker?.terminate()
    this.worker = null
    this.textures.forEach((texture, index) => {
      this.onTexture(index, null)
      texture.dispose()
      texture.image.width = texture.image.height = 1
    })
    this.textures.clear()
    this.palettes.clear()
  }
}
