import { readdir, stat, mkdir, copyFile } from 'node:fs/promises'
import { createReadStream, watch } from 'node:fs'
import path from 'node:path'

const imageExtension = /\.(jpe?g|png|webp)$/i
const collator = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' })
export const encodePath = (name) => name.split('/').map(encodeURIComponent).join('/')
export const resolveGalleryAssetBase = (env = {}) =>
  (env.VITE_ASSET_BASE_URL ?? '').trim().replace(/\/+$/, '')

export async function discoverGallery(directory) {
  const entries = await readdir(directory, { recursive: true, withFileTypes: true })
  const names = entries
    .filter((entry) => entry.isFile() && imageExtension.test(entry.name))
    .map((entry) =>
      path.relative(directory, path.join(entry.parentPath, entry.name)).split(path.sep).join('/')
    )
    .sort((a, b) => collator.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0))
  return Promise.all(
    names.map(async (name) => {
      const file = await stat(path.join(directory, name))
      const filename = path.posix.basename(name)
      return {
        name,
        filename,
        title: filename.replace(imageExtension, ''),
        version: `${file.size}-${file.mtimeMs}`,
      }
    })
  )
}

export function externalGallery(directory) {
  const moduleId = '\0virtual:gallery'
  let manifest = []
  let config
  let assetBase = ''
  return {
    name: 'external-gallery',
    configResolved(value) {
      config = value
      assetBase = resolveGalleryAssetBase(value.env)
    },
    async buildStart() {
      manifest = await discoverGallery(directory)
      if (!manifest.length) this.warn(`Gallery directory has no supported images: ${directory}`)
    },
    resolveId(id) {
      if (id === 'virtual:gallery') return moduleId
    },
    load(id) {
      if (id !== moduleId) return
      return `const assetBase = ${JSON.stringify(assetBase)}; export default ${JSON.stringify(manifest)}.map(file => ({...file, url: (assetBase ? assetBase + '/' : import.meta.env.BASE_URL) + 'gallery-files/' + file.name.split('/').map(encodeURIComponent).join('/') + '?v=' + encodeURIComponent(file.version)}))`
    },
    configureServer(server) {
      let timer
      const refresh = (filename) => {
        const relative = path.relative(directory, filename)
        if (
          relative.startsWith('..') ||
          path.isAbsolute(relative) ||
          !imageExtension.test(filename)
        )
          return
        clearTimeout(timer)
        timer = setTimeout(async () => {
          try {
            manifest = await discoverGallery(directory)
            const module = server.moduleGraph.getModuleById(moduleId)
            if (module) server.moduleGraph.invalidateModule(module)
            server.ws.send({ type: 'full-reload' })
          } catch (error) {
            server.config.logger.error(error.message)
          }
        }, 150)
      }
      // Watch the external source independently of Vite's ignored paths.
      const watcher = watch(directory, { recursive: true }, (_, filename) => {
        if (filename) refresh(path.join(directory, String(filename)))
      })
      watcher.on('error', (error) => server.config.logger.error(error.message))
      server.httpServer?.on('close', () => {
        watcher.close()
        clearTimeout(timer)
      })
      server.middlewares.use(async (req, res, next) => {
        const prefix = `${assetBase && !/^https?:\/\//i.test(assetBase) ? assetBase + '/' : config.base === './' ? '/' : config.base}gallery-files/`
        if (!req.url?.startsWith(prefix)) return next()
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          res.statusCode = 405
          return res.end()
        }
        let name
        try {
          name = decodeURIComponent(req.url.slice(prefix.length).split('?')[0])
        } catch {
          res.statusCode = 400
          return res.end()
        }
        // Only discovered regular files are exposed; no arbitrary /@fs access or traversal.
        if (!manifest.some((file) => file.name === name)) {
          res.statusCode = 404
          return res.end()
        }
        try {
          const filename = path.join(directory, name)
          const file = await stat(filename)
          const types = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.webp': 'image/webp',
          }
          res.setHeader('Content-Type', types[path.extname(name).toLowerCase()])
          res.setHeader('Content-Length', file.size)
          res.setHeader('Cache-Control', 'no-cache')
          if (req.method === 'HEAD') return res.end()
          const stream = createReadStream(filename)
          stream.on('error', () => res.destroy())
          res.on('close', () => stream.destroy())
          stream.pipe(res)
        } catch {
          res.statusCode = 404
          res.end()
        }
      })
    },
    async writeBundle() {
      if (/^https?:\/\//i.test(assetBase)) return
      const output = path.resolve(config.root, config.build.outDir, 'gallery-files')
      // Sequential copy keeps build memory bounded and leaves originals untouched.
      for (const file of manifest) {
        const target = path.join(output, file.name)
        await mkdir(path.dirname(target), { recursive: true })
        await copyFile(path.join(directory, file.name), target)
      }
    },
  }
}
