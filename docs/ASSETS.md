# Asset policy

## Tracked viewer asset

- File: `public/models/casa1.glb`
- Purpose: current first-person scanned-property viewer in `TwinViewer.tsx`
- Distribution: tracked in normal Git; required for clean-clone viewer reconstruction

Tracked brand SVGs and compressed demo videos under `public/` are also part of the web experience.

## Intentionally external large asset

- Filename: `penthouse.splat`
- Purpose: historical/experimental Gaussian-splat property scene
- Size: approximately 186.7 MB
- Expected optional local location: `external-assets/models/penthouse.splat`
- Runtime reference: none in the canonical application today
- Distribution: intentionally absent from Git and Git LFS; `*.splat` is ignored

Do not copy this binary into tracked paths. A future decision about provenance, licensing, storage, delivery, and format support is required before it can become a product asset.

## Generated and raw assets

Spatial-service input/output directories, raw video originals, processing intermediates, and proprietary customer/property files are local or external only. They must not enter Git. Only publish optimized assets after confirming ownership/licensing and privacy.
