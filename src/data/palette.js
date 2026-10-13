import { oklchToRgb } from 'colorthief/internals'

export const fallbackMood = {
  background: '#416989',
  blob1: '#d59b43',
  blob2: '#498e9e',
  accent: '#f2bb62',
}

// Art direction in perceptual OKLCH; shader softens blobs by 35% already.
export const atmosphere = {
  minimumShare: 0.035,
  chromaFloor: 0.065,
  chromaCeiling: 0.15,
  backgroundLightness: [0.6, 0.74],
  blobLightness: [0.73, 0.85],
  monochromeHueSpread: 28,
  paletteSmoothing: 0.075,
}
const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const hueDistance = (a, b) => Math.abs(((a - b + 540) % 360) - 180)
const hex = (l, c, h) =>
  '#' +
  oklchToRgb(l, c, h)
    .map((v) => Math.round(v).toString(16).padStart(2, '0'))
    .join('')

export function mapAtmosphere({ palette, swatches }) {
  const eligible = palette.filter((color) => color.proportion >= atmosphere.minimumShare)
  const candidates = eligible.length ? eligible : palette
  if (!candidates.length) throw new Error('No opaque colors')
  const score = (color) => Math.sqrt(color.proportion) * (0.035 + Math.min(color.oklch.c, 0.2))
  const ranked = [...candidates].sort((a, b) => score(b) - score(a))
  const primary = ranked[0]
  // Semantic swatches assist selection only when they represent substantial pixels.
  const vibrant = swatches.Vibrant || swatches.DarkVibrant || swatches.LightVibrant
  const anchor =
    vibrant && candidates.includes(vibrant) && score(vibrant) >= score(primary) * 0.9
      ? vibrant
      : primary
  const secondary = [...candidates].sort(
    (a, b) =>
      score(b) * hueDistance(b.oklch.h, anchor.oklch.h) -
      score(a) * hueDistance(a.oklch.h, anchor.oklch.h)
  )[0]
  const primaryHue = anchor.oklch.c < 0.012 ? 220 : anchor.oklch.h
  const secondaryHue =
    secondary.oklch.c > 0.025 && hueDistance(secondary.oklch.h, primaryHue) > 18
      ? secondary.oklch.h
      : primaryHue + atmosphere.monochromeHueSpread
  const chroma = (color) =>
    clamp(color.oklch.c * 0.85, atmosphere.chromaFloor, atmosphere.chromaCeiling)
  const backgroundL = clamp(anchor.oklch.l * 0.78, ...atmosphere.backgroundLightness)
  const blobL = clamp(anchor.oklch.l, ...atmosphere.blobLightness)
  return {
    background: hex(backgroundL, chroma(anchor), primaryHue),
    blob1: hex(blobL, chroma(anchor), primaryHue),
    blob2: hex(
      clamp(secondary.oklch.l, ...atmosphere.blobLightness),
      chroma(secondary),
      secondaryHue
    ),
    accent: hex(Math.max(blobL, 0.7), chroma(anchor), primaryHue),
  }
}
