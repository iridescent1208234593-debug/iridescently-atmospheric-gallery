# Iridescently Atmospheric Gallery

A standalone Three.js depth gallery. Images come from a directory, their filenames become labels, and their palettes drive a continuous GLSL atmosphere. This is a derivative of [Atmospheric Depth Gallery by Houmahani Kane](https://github.com/houmahani/codrops-depth-gallery), published with its original MIT notice and Codrops attribution.

## Run

Node.js 22.12 or newer is required.

```sh
npm ci
npm test
npm run lint
npm run build
npm run dev
```

Open the local address printed by Vite. `npm run preview` serves a completed `dist/` build. The default input is `sample-images/`, containing four generated PNG fixtures; no third-party gallery collection is bundled.

To use your own images in PowerShell:

```powershell
$env:GALLERY_DIR = 'C:/my-gallery'
npm run dev
```

In other shells, run `GALLERY_DIR=/path/to/my-gallery npm run dev`. Supported files are JPG, JPEG, PNG and WebP, discovered recursively and naturally sorted with Chinese-aware numeric ordering. Original files are read, never renamed or overwritten. File changes refresh the development gallery. Rebuild after changing production inputs.

Builds copy input images to `dist/gallery-files/`. For a separately hosted collection, set `VITE_ASSET_BASE_URL` to the root containing `gallery-files/`; explicit HTTP(S) asset roots avoid local image copying. An unset or empty value uses local build assets.

## What this derivative adds

- Recursive real-image discovery, URL encoding, filename labels and automatic build copies.
- ColorThief 3.5.0 palette analysis in a Worker, OKLCH mood mapping, semantic swatches and transparent-image fallback.
- A bounded neighboring-texture cache with two concurrent loads, cancellation, disposal and palette-result reuse.
- Large-collection motion bounds and lifecycle cleanup; the underlying depth, mood interpolation and shader composition remain the original interaction model.

The source checkpoint was `b91193b1c9d8dbe846ee42600bdaacc6354ad602`, tag `depth-auto-gallery-v1`; subsequent local corrections are included. See [UPSTREAM.md](UPSTREAM.md) and [implementation notes](docs/GALLERY-IMPLEMENTATION.md). This package contains the reusable engine and sample runner, not the private site's navigation, account preferences, music, QR assets, or media collection.

Scroll or swipe through the gallery. Press **D** for debug controls. `?inspect` exposes `window.galleryDebug` for opt-in resource/palette inspection. Browser/WebGL2 support is required. This runner is a visual example and does not promise the host site's autoplay, account features or accessibility controls.

## Ownership and license

The original gallery and this code distribution retain the [MIT license](LICENSE), including the original Codrops notice. Houmahani Kane is the original gallery author. Additional integration/discovery/palette/resource work was developed for Iridescently. Four bundled PNG fixtures were generated programmatically for this package and are distributed under the same MIT license. User-provided media keeps its own rights; the code license does not grant rights to arbitrary images.

Built with Three.js, ColorThief, Vite, vite-plugin-glsl and Tweakpane. Preserve their licenses when redistributing. The original color-chip layout credit is [@thisislandscape](https://www.instagram.com/p/DU2JTU_AEwM/?img_index=3). Public GitHub publication of this local candidate is pending review.
