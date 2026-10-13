import { getPaletteSync } from 'colorthief'
import { classifySwatches } from 'colorthief/internals'
import { mapAtmosphere } from './palette.js'

self.onmessage = ({ data: { id, pixels } }) => {
  try {
    // ColorThief relaxes its filters on empty samples; fully transparent images
    // must fail explicitly rather than letting invisible RGB become a palette.
    let hasOpaquePixel = false
    for (let offset = 3; offset < pixels.data.length; offset += 4) {
      if (pixels.data[offset] >= 125) {
        hasOpaquePixel = true
        break
      }
    }
    if (!hasOpaquePixel) throw new Error('No opaque pixels')
    const colors =
      getPaletteSync(pixels, {
        colorCount: 12,
        quality: 2,
        colorSpace: 'oklch',
        ignoreWhite: false,
        alphaThreshold: 125,
      }) || []
    const serialize = (color) =>
      color
        ? {
            hex: color.hex(),
            oklch: color.oklch(),
            population: color.population,
            proportion: color.proportion,
          }
        : null
    const palette = colors.map(serialize)
    const roles = classifySwatches(colors)
    const swatches = Object.fromEntries(
      Object.entries(roles).map(([role, swatch]) => [
        role,
        swatch ? palette[colors.indexOf(swatch.color)] : null,
      ])
    )
    const dominant = [...palette].sort((a, b) => b.population - a.population)[0] || null
    const mood = mapAtmosphere({ palette, swatches })
    self.postMessage({ id, result: { palette, swatches, dominant, mood, source: 'auto' } })
  } catch (error) {
    self.postMessage({ id, error: error.message })
  }
}
