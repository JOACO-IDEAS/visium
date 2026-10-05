# VISIUM agent instructions

Read in order before changing code:

1. `docs/TECHNICAL_HANDOFF.md`
2. `docs/CURRENT_STATE.md`
3. `docs/PRODUCT.md`
4. `docs/ARCHITECTURE.md`
5. `docs/SECURITY.md`
6. `docs/SETUP.md`
7. `docs/ROADMAP.md`

## Boundaries

- VISIUM is buyer-intent intelligence built from spatial behavior; do not reduce it to a tour viewer.
- Do not describe simulated measurement, WIF, telemetry, dashboards, or scoring as runtime-integrated functionality.
- Preserve the tracked `public/models/casa1.glb`; it is required to reconstruct the viewer.
- Never commit `.splat` files, provider credentials, `.env.local`, `.vercel/`, customer/lead data, generated spatial output, or local Python/Node environments.
- The root Next.js app, Python spatial service, scoring package, and dashboard prototype are consolidated but not automatically integrated.
- Outbound lead email, deployment, infrastructure, external models, and real property/customer data require explicit human approval.

## Working expectations

- Check `git status` first and preserve unrelated work.
- Web gate: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
- Spatial gate: compile/import checks and only safe synthetic smoke tests; never process proprietary assets without approval.
- Add focused tests for pure intelligence logic. Do not invent large test suites around unstable visual prototypes.
- Update `docs/CURRENT_STATE.md` and `docs/TECHNICAL_HANDOFF.md` whenever durable implementation/integration status changes.
