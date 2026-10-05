# Product

VISIUM converts behavior inside a 3D property experience into buyer-intent intelligence for real-estate teams.

```text
property → experience → events → session intelligence → intent signals
         → Visium Score / qualification → actionable lead intelligence
```

## Product principles

- The 3D experience is a sensor, not the end product.
- Spatial behavior should be captured as explicit events with provenance.
- Scoring must be deterministic/explainable until evidence justifies a more complex model.
- Lead actionability requires durable identity, consent/privacy controls, and organization/property scope.
- Product claims must distinguish live runtime behavior from synthetic demo choreography.

## Capability matrix

| Capability | Status | Evidence |
|---|---|---|
| 3D property viewer and GLB loading | Implemented | `components/v2/TwinViewer.tsx`, `public/models/casa1.glb` |
| First-person navigation | Implemented | Pointer lock, mouse, WASD, arrows, R/F, Shift |
| Spatial/room awareness | Not found in runtime | No zone model or room-entry detection in viewer |
| Camera telemetry | Partial/local only | Altitude is sampled into component state for the HUD; no event transport |
| Dwell time | Scoring logic only | Score consumes `ZONE_EXIT.dwell_ms`; viewer does not emit it |
| Return visits | Scoring logic only | Score consumes `SESSION_START.payload.is_return`; no visitor store |
| Measurement | Prototype | `MeasureDemo.tsx` simulates measurement events; no 3D measurement tool |
| WIF/furniture simulation | Prototype | Demo choreography/text only; no placement/collision engine |
| Contact/share actions | Partial | Lead forms/email exist; score events are not emitted or correlated |
| Analytics/dashboard | Prototype | Web demo sections and standalone static dashboard use synthetic data |
| Visium Score | Implemented standalone | Deterministic v1 package with tests; not wired to web |
| Buyer-intent qualification | Prototype/partial | Algorithm and UI exist separately; no production event pipeline |
| Persistence/database | Not found | Property jobs use memory; no database client/schema in repository |
| Authentication | Not found | Demo and lead forms have no user/tenant authentication |
| Backend/API | Partial | Next lead/property routes plus standalone FastAPI service |
| Spatial processing | Implemented standalone | Mesh processing/compression and OpenCV wall detection service |
| Deployment | Demo confirmed | Vercel demo reference; spatial service deployment not evidenced |

## Provenance

The Python spatial service, scoring implementation, and lead-dashboard prototype originated as standalone VISIUM worktrees/artifacts and were incorporated unchanged during canonical-repository consolidation. Their lack of runtime integration is documented rather than hidden.
