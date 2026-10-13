import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import glsl from 'vite-plugin-glsl'
import { externalGallery } from './gallery-plugin.js'

export default defineConfig({
  base: './',
  plugins: [
    glsl(),
    externalGallery(
      process.env.GALLERY_DIR ||
        fileURLToPath(
          new URL('./sample-images/', import.meta.url),
        )
    ),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
