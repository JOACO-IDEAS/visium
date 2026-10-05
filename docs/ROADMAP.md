# Roadmap

## First

1. Define a versioned telemetry contract for sessions, zones, dwell, measurements, conversions, and privacy/consent.
2. Add viewer event emission behind a local/test adapter before choosing persistence.
3. Integrate the scoring package with synthetic event fixtures and an explicit orchestration boundary.
4. Decide how the web app securely calls the Python service; replace the TypeScript simulation only after contract tests exist.
5. Add browser smoke coverage for `/v2` and the tracked GLB viewer.

## Then

- Design authentication, organization/property scope, data retention, and durable event/lead persistence.
- Connect score output to a productized lead-intelligence dashboard, using the static prototype only as reference.
- Implement genuine 3D measurement and evaluate WIF/furniture placement as separate capabilities.
- Benchmark/calibrate wall detection and mesh processing on authorized representative property inputs.
- Make 3D decoder/asset delivery reproducible without accidental third-party runtime dependence.

## Later

- Validate score weights against observed conversion outcomes before introducing ML.
- Add explainable lead workflows and integrations for real-estate teams.
- Establish production spatial-processing infrastructure, observability, cost controls, and failure recovery.

No roadmap item authorizes deployment, real lead collection, provider access, or customer/property-data processing without human approval.
