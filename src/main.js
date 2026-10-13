import '@/css/base.css'
import '@/css/canvas.css'

import { Engine } from '@/Experience/Engine'

const canvas = document.querySelector('.webgl')

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('Missing .webgl canvas element in index.html')
}

const engine = new Engine(canvas)
// Opt-in inspection for palette and GPU resource diagnostics; absent in normal UI.
if (new URLSearchParams(location.search).has('inspect')) window.galleryDebug = engine

engine.init().catch((error) => {
  console.error('Engine initialization failed', error)
})
