# VISIUM

VISIUM is a PropTech buyer-intent and lead-qualification system. It uses interaction inside a 3D property experience as a behavioral sensor; the viewer is an input to the intelligence layer, not the final product by itself.

```text
property → 3D interaction → behavioral/spatial events → session intelligence
         → buyer-intent signals → Visium Score → actionable lead intelligence
```

This repository consolidates the active web experience, spatial-processing service, deterministic scoring engine, and lead-dashboard prototype. Consolidation preserves the components without pretending they are already wired together.

## Actual state

### Implemented

- A Next.js marketing/demo application with `/` and `/v2` experiences.
- A first-person React Three Fiber viewer at `components/v2/TwinViewer.tsx`, loading the tracked `public/models/casa1.glb` model.
- Pointer-lock mouse look, WASD movement, keyboard rotation/vertical movement, GLB loading, and a local altitude HUD.
- Lead-capture server actions/API routes with optional Resend delivery.
- A standalone Python/FastAPI spatial service with mesh cleanup/compression and OpenCV wall detection.
- A deterministic, tested Visium Score v1 implementation under `packages/scoring/`.

### Prototype or partial

- The property-processor API uses an in-memory job store and TypeScript simulation/stub steps. It is not connected to the Python service.
- Measurement, furniture-fit/WIF behavior, dwell-time analysis, live score changes, and lead ranking are visual simulations in the web demo.
- `prototypes/lead-dashboard/index.html` is a standalone synthetic-data prototype, not the deployed application dashboard.
- The scoring engine is implemented but not imported by the web runtime and has no event store feeding it.

### Planned product thesis

- Durable session/event telemetry, spatial-zone awareness, dwell-time capture, return-visitor identity, real measurement/WIF events, scoring orchestration, persistence, authentication, and actionable lead workflows.

See [current state](docs/CURRENT_STATE.md) and the [technical handoff](docs/TECHNICAL_HANDOFF.md) before planning work.

## Repository structure

| Path | Purpose |
|---|---|
| `app/`, `components/`, `three/` | Root Next.js web/demo application and 3D experiences |
| `public/models/casa1.glb` | Tracked GLB used by the first-person viewer |
| `lib/property-pipeline/` | Web-side prototype contracts/stubs for property processing |
| `services/spatial-pipeline/` | Standalone Python/FastAPI mesh and wall-detection implementation |
| `packages/scoring/` | Standalone deterministic Visium Score implementation and tests |
| `prototypes/lead-dashboard/` | Preserved standalone lead-intelligence UI prototype |
| `docs/` | Canonical product, architecture, setup, security, deployment, roadmap, and handoff documentation |

The existing web application remains at repository root to preserve current Next.js and Vercel assumptions.

## Web quickstart

Prerequisites: Node.js 20.9+ and npm.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`; `/v2` contains the tracked GLB viewer experience.

## Validation

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

`npm test` currently covers the deterministic scoring package. The visual web viewer still lacks automated browser/visual-regression coverage.

## Spatial service

The Python service is independent of the web runtime today. Follow [services/spatial-pipeline/README.md](services/spatial-pipeline/README.md) and [docs/SETUP.md](docs/SETUP.md). Do not infer integration merely because the TypeScript and Python contracts describe similar steps.

## Assets

The viewer-reproducing GLB (`public/models/casa1.glb`) is tracked in normal Git. The experimental 186.7 MB `penthouse.splat` is intentionally excluded from Git and Git LFS; see [docs/ASSETS.md](docs/ASSETS.md).

## Deployment

The founder-confirmed demo is [https://visium-demo.vercel.app/](https://visium-demo.vercel.app/). Local code and `next.config.mjs` support the demo project’s `/` → `/v2` rewrite through `DEMO_ROOT_V2=1`. No deployment was performed during consolidation. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Documentation

- [Product](docs/PRODUCT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Current state](docs/CURRENT_STATE.md)
- [Setup](docs/SETUP.md)
- [Security](docs/SECURITY.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Assets](docs/ASSETS.md)
- [Roadmap](docs/ROADMAP.md)
- [Technical handoff](docs/TECHNICAL_HANDOFF.md)
- [Agent instructions](AGENTS.md)

## Security

Never commit provider credentials, `.env*` files other than `.env.example`, lead/customer data, local Vercel linkage, Python environments, generated spatial outputs, or proprietary external 3D assets. Real lead delivery and every infrastructure operation require explicit authorization.
