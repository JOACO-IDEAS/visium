# Setup

## Web application

Prerequisites: Node.js 20.9+ and npm.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000/v2` for the product demo and scanned-property viewer. No credential is required for the viewer, lint, typecheck, scoring tests, or build.

Validation:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Set `RESEND_API_KEY` and `LEAD_ALERT_EMAIL` only when a real, explicitly authorized lead-delivery test is intended. Otherwise leave them blank. `DEMO_ROOT_V2=1` is a deployment routing switch, not needed locally.

## Viewer assets

`public/models/casa1.glb` is tracked and sufficient to load the current first-person viewer. The experimental `penthouse.splat` is not needed by the application and is intentionally absent. See `ASSETS.md`.

The viewer uses drei's Draco loading behavior; internet access may be required for its decoder depending on library/runtime cache. This should be made explicitly self-hosted before claiming a fully offline viewer.

## Spatial service

Prerequisites:

- Python 3.10–3.12
- Node.js 20 for glTF Transform compression
- Native GL libraries described in the service README/Dockerfile

From `services/spatial-pipeline/`:

```bash
python3.11 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn service.api:app --reload --port 8000
```

The service is not called by the web app. Run it independently and use only synthetic or authorized assets. The Dockerfile is provided but was not built or deployed during this handoff.

## Scoring

```bash
npm run test:scoring
```

The package has no external runtime dependency and is not yet integrated into Next.js.

## Lead-dashboard prototype

Open `prototypes/lead-dashboard/index.html` directly. It uses synthetic in-file data and is a product/design reference, not a production surface.
