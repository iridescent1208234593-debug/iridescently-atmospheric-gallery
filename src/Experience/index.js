import * as THREE from 'three'
import { Gallery } from '@/Experience/Gallery'
import { Background } from '@/Experience/Background'
import { Debug } from '@/Experience/Debug'
import { Label } from '@/Experience/Label'
import { TrailController } from '@/Experience/TrailController'

class Experience {
  constructor() {
    this.isInitialized = false
    this.isDisposed = false
    this.isFrameTextDark = null
    this.debug = new Debug()
    this.gallery = new Gallery(this.debug)
    this.label = new Label(this.gallery)
    this.background = new Background(this.debug)
    this.trailController = new TrailController({
      gallery: this.gallery,
      debug: this.debug,
    })
  }

  async init(scene, camera) {
    if (this.isInitialized) return

    await this.gallery.init(scene)
    this.label.init()
    this.background.init()
    this.trailController.init(scene, camera)

    const initialPlaneBlendData = this.gallery.getPlaneBlendData(camera.position.z)
    this.updateFrameTextTone(initialPlaneBlendData)

    this.isInitialized = true
  }

  updateFrameTextTone(planeBlendData) {
    if (!planeBlendData) return

    const color = this.background.backgroundColor
    const luminance = color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722
    const shouldUseDarkText = luminance > (this.isFrameTextDark ? 0.42 : 0.48)

    if (this.isFrameTextDark === shouldUseDarkText) return

    this.isFrameTextDark = shouldUseDarkText
    document.body.classList.toggle('frame-text-dark', shouldUseDarkText)
  }

  update(time, camera = null, scroll = null) {
    this.trailController.update(camera, scroll, time)

    // Gallery + label
    this.gallery.update(camera, scroll)
    this.label.update(camera)

    // Camera-driven updates
    if (camera) {
      // Frame text tone
      const planeBlendData = this.gallery.getPlaneBlendData(camera.position.z)
      this.updateFrameTextTone(planeBlendData)

      // Mood colors
      const moodBlendData = this.gallery.getMoodBlendData(camera.position.z)
      if (moodBlendData) {
        this.background.setMoodBlend(moodBlendData)
      }

      // Depth + velocity -> background motion response
      const depthProgress = this.gallery.getDepthProgress(camera.position.z)
      const velocityMax = scroll?.velocityMax || 1
      const velocityIntensity = THREE.MathUtils.clamp(
        Math.abs(scroll?.velocity || 0) / Math.max(velocityMax, 0.0001),
        0,
        1
      )
      const blend = planeBlendData?.blend ?? 0
      const distanceFromBlendCenter = Math.abs(blend - 0.5) * 2
      const transitionStability = THREE.MathUtils.smoothstep(distanceFromBlendCenter, 0.35, 1)
      const stabilizedVelocityIntensity = velocityIntensity * transitionStability

      this.background.setMotionResponse({
        depthProgress,
        velocityIntensity: stabilizedVelocityIntensity,
      })
    }

    // Background tick
    this.background.update(time)
  }

  dispose() {
    if (this.isDisposed) return

    this.trailController.dispose()
    this.gallery.dispose()
    this.label.dispose()
    this.background.dispose()
    this.debug.dispose()
    this.isDisposed = true
  }
}

const world = new Experience()
export { Experience, world }
