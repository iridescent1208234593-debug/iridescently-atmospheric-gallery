# Implementation notes

`gallery-plugin.js` discovers JPG/JPEG/PNG/WebP files, naturally sorts relative names with a Chinese numeric collator, encodes each URL segment and creates `virtual:gallery`. Development serves only files in that manifest and watches source changes. Builds copy the manifest inputs, unless an explicit HTTP(S) asset root is configured.

The runtime loads the current image and a bounded neighborhood. `GalleryResources` limits concurrent tasks to two, aborts out-of-window work and disposes textures/decoded bitmaps. A runtime cache retains palette results without keeping all textures. Filename labels use text content, not HTML interpretation.

Decoded RGBA samples feed a Worker running ColorThief 3.5.0. Transparent pixels are excluded, fully transparent/failed inputs receive an explicit fallback. Semantic swatches and population/proportion are mapped into OKLCH atmosphere colors. Existing neighboring-image mood interpolation drives the original Background shaders; analysis does not replace the interpolation architecture.

Engine owns RAF, canvas renderer, scroll bindings and resize/debug listeners. Experience owns its Gallery, Background, Label and TrailController resources. `dispose()` stops the engine and releases those owners in sequence. When embedding, create an Engine for a valid canvas and dispose it before removing the document/host. The sample runner initializes one instance.

`npm test` checks discovery, ordering, encoded filenames, input growth, local/CDN base handling, palette outliers/extremes and alpha mapping. `npm run lint` covers source. Build success validates bundling and sample copying; browser visual verification remains a separate check.

Limits: GIF is not included; development input changes refresh the page and reset local position/cache; broken images fall back instead of retrying forever; WebGL/browser GPU limits vary. The private deployment previously validated this same reusable pipeline with a 384-file image collection, but that collection and its rights are not included in this package. The standalone package only claims checks actually run against its synthetic fixtures.
