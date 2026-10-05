# Architecture

## Canonical layout

The deployed web application remains at the repository root. Moving it under `apps/web` would change current Vercel/root assumptions without product benefit. Consolidated standalone components sit alongside it:

```text
root Next.js app
├── components/v2/TwinViewer.tsx → public/models/casa1.glb
├── lib/property-pipeline/       → web-side prototype contracts/stubs
├── services/spatial-pipeline/   → Python/FastAPI implementation
├── packages/scoring/            → deterministic score implementation
└── prototypes/lead-dashboard/   → static synthetic-data UI prototype
```

## Web and viewer

Next.js App Router serves the legacy landing page and `/v2` product demo. `TwinViewer` uses React Three Fiber, Three.js, and drei:

- `useGLTF("/models/casa1.glb", true)` loads the tracked GLB with Draco support supplied by drei.
- `Canvas` renders with flat/unlit treatment appropriate for baked scan textures.
- `PointerLockControls` supplies mouse look.
- A custom frame loop supplies damped WASD movement, keyboard rotation, vertical motion, and a local altitude HUD.
- No collision, room graph, zone classification, durable session, or behavioral-event emitter is present.

The root marketing hero also contains procedural R3F scenes under `three/`; it is separate from the scanned-property viewer.

## Web backend

- `app/api/send-lead/route.ts` and `app/v2/actions.ts` optionally send lead alerts through Resend.
- `app/api/v1/property-processor/route.ts` validates an input package and tracks an asynchronous job in process memory.
- `lib/property-pipeline/` provides TypeScript types plus simulated/stub wall and keyframe steps. It does not call the Python service.
- There is no repository-local database, authentication system, durable queue, object store, or telemetry backend.

## Spatial service

`services/spatial-pipeline/` is a standalone Python 3.10–3.12/FastAPI component:

- mesh component cleanup, RANSAC planarization, hole filling/decimation;
- GLB compression through glTF Transform/Draco/WebP;
- OpenCV floorplan binarization, edge/line detection, collinear merging, wall-thickness pairing, and opening heuristics;
- `/health`, `/process-mesh`, and `/detect-walls` endpoints.

Its code is implemented, but deployment and web-to-service transport/authentication are not.

## Scoring

`packages/scoring/computeVisiumScore.js` consumes session events and a spatial-zone schema. It calculates:

- dwell score capped at 50, based on actual/expected dwell ratios and zone weight;
- a 1.2 decision-zone boost;
- conversion score capped at 50 from contact, share, dollhouse, floorplan, measurement, and return signals;
- linear degradation when model scale confidence is below 0.70;
- COLD/MILD/WARM/HOT bands and an explainable signal breakdown.

It is deterministic and tested. No web import, event collector, persistence adapter, or job orchestration currently invokes it.

## Intended future flow

```text
viewer event emitter → consented session/event store → spatial enrichment
                    → score calculation → durable lead profile → agent dashboard/action
```

Every arrow in this future flow is an integration gap today. Authentication, tenant/property scoping, privacy/retention, idempotency, and auditability must be designed before real lead telemetry is collected.
