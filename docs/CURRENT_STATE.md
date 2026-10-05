# Current state

Last reviewed during the G3.1 canonical-repository consolidation.

## Working today

- The root Next.js application builds the `/` and `/v2` product/demo surfaces.
- `/v2` can load and navigate the tracked `casa1.glb` model in first person.
- Optional Resend-backed lead capture is implemented server-side.
- The consolidated Python service contains real mesh-processing and OpenCV wall-detection code.
- Visium Score v1 is preserved as deterministic business logic with focused tests.
- The original lead dashboard is preserved as a standalone prototype.

## Not integrated

- The web property-processor does not call the Python spatial service.
- The viewer does not emit spatial zones, dwell, measurement, return, contact/share, or session events to a backend.
- The score package is not called by the web application.
- The static lead dashboard does not consume score output or real leads.
- No database, durable queue/event store, auth, or tenant model exists in this repository.

## Known deployment

The founder-confirmed demo is `https://visium-demo.vercel.app/`. `next.config.mjs` contains a demo-specific `DEMO_ROOT_V2=1` root rewrite, providing repository evidence for the source-to-demo mapping. Local `.vercel` metadata points to a project named `visium-web`, so exact Vercel project linkage should still be verified in the platform before a future deployment. No deployment was performed here.

## Technical debt and risks

- Visual claims exceed runtime telemetry/integration; documentation and UI labels must remain precise.
- Lead fallbacks avoid writing submitted fields when delivery is unavailable; production consent/privacy/log-retention behavior still needs review.
- The Python service has heavyweight native dependencies and no committed automated test suite.
- The wall detector is proven only against synthetic/example inputs and requires calibration against authorized real floorplans.
- Draco decoding currently relies on drei defaults/CDN behavior; fully offline viewer reconstruction should be evaluated.
- The property-processor in-memory store is ephemeral and unsuitable for production.
- Visual/browser regression coverage is absent.

## Local-only material

The experimental large splat, raw video originals, Vercel linkage, env files, boardroom experiment, generated builds, virtual environments, and tool state remain outside Git. The boardroom experiment contained a provider credential and is excluded; external rotation remains required.
