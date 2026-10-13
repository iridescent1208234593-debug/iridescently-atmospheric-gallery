import files from 'virtual:gallery'
import { fallbackMood } from './palette.js'

// Layout repeats; image count and content always come from the filesystem.
const positions = [-0.9, 0.8, -0.7, 1, -0.7]
export const galleryPlaneData = files.map((file, index) => ({
  ...file,
  textureSrc: file.url,
  position: { x: positions[index % positions.length], y: 0 },
  fallbackColor: fallbackMood.accent,
  accentColor: fallbackMood.accent,
  backgroundColor: fallbackMood.background,
  blob1Color: fallbackMood.blob1,
  blob2Color: fallbackMood.blob2,
  label: { word: file.title },
}))
