# Technical handoff

## 1. What is VISIUM?

VISIUM is a PropTech buyer-intent and lead-qualification product. Its thesis is to use a 3D property experience as a behavioral sensor and turn spatial interaction into explainable, actionable lead intelligence.

## 2. What works today?

The root Next.js demo, first-person GLB viewer, optional email lead capture, standalone spatial-processing service, deterministic scoring engine, and scoring tests work as independent components. The static lead dashboard is preserved for product/design reference.

## 3. Where is the viewer?

`components/v2/TwinViewer.tsx`, launched from the `/v2` experience, loads `public/models/casa1.glb`. The root marketing hero has separate procedural Three.js visuals under `three/`.

## 4. What does it capture?

Only local camera altitude for an on-screen HUD. It does not persist sessions, positions, rooms, dwell, measurements, returns, contact/share events, or scores.

## 5. What is prototype-only?

Measurement and WIF/furniture behaviors, live score animation, lead ranking, the web property-processing flow, and the static dashboard are simulations/prototypes. The TypeScript property pipeline uses stubs/in-memory state.

## 6. Does Visium Score exist?

Yes. `packages/scoring/computeVisiumScore.js` contains deterministic v1 logic with tests for dwell weighting/caps, conversion signals, returns, measurements, reliability degradation, and temperature thresholds. It is not imported by the web app and receives no live events.

## 7. What backend/data model exists?

Next.js route handlers/server actions, an ephemeral in-memory property-job map, and a standalone FastAPI service exist. No database schema, event store, authentication, tenant model, durable lead store, or queue exists in this repository.

## 8. Biggest gaps

- Versioned telemetry/zone/session contract and consent/privacy design
- Viewer event emitter and durable event storage
- Score orchestration and lead persistence
- Secure web-to-spatial-service integration
- Real 3D measurement/WIF capabilities
- Productized authenticated lead dashboard
- Browser/visual tests and Python automated tests

## 9. First work for the incoming owner

Start with a synthetic, local vertical slice: viewer event adapter → versioned events → scoring package → inspectable test output. In parallel, add contract tests between the TypeScript property-package model and Python service before replacing stubs. Do not begin with deployment or real data.

## 10. External assets/services

The optional `penthouse.splat` is intentionally absent. Resend is optional. Vercel hosts the confirmed demo. Draco decoder delivery may depend on drei/CDN defaults. The Python service requires native packages and glTF Transform tooling. No spatial-service deployment is known.

## 11. Do not touch casually

Vercel configuration/domains, provider credentials, lead recipients/data, proprietary models/property inputs, the tracked viewer GLB, scoring weights, or native spatial dependencies.

## 12. Intentionally absent from GitHub

Credentials, local env/Vercel state, boardroom experiments, Python environments, dependencies/build output, raw/proprietary property assets, generated spatial outputs, personal lead data, and `penthouse.splat`.

## Provenance

The Python service, score implementation, and static dashboard were active standalone VISIUM artifacts consolidated into this repository during G3.1. Source behavior was preserved; documentation and tests were added around it. No artificial runtime integration was introduced.
