# Deployment

No deployment or platform mutation was performed during consolidation.

## Known web demo

```text
canonical local/Git source
  → Vercel demo configuration (`DEMO_ROOT_V2=1`)
  → https://visium-demo.vercel.app/
```

The founder confirms the URL. Repository evidence supports the mapping: `next.config.mjs` explicitly describes the `visium-demo` project and rewrites `/` to `/v2` when `DEMO_ROOT_V2=1`. The linked local `.vercel/repo.json` names `visium-web`, so a future owner should verify exact project/repository linkage in Vercel before changing or deploying anything.

The hash fragment `#insights` is client-side navigation within the demo page, not a server route.

## Web release outline

1. Start from a reviewed clean commit with lint, typecheck, tests, and build passing.
2. Confirm the intended Vercel project, root directory, branch, domain, and environment variables through an authorized read-only review.
3. Review lead-delivery configuration and log/privacy behavior.
4. Deploy the exact commit only after explicit approval.
5. Verify `/`, `/v2`, the tracked GLB, lead forms in non-sending mode, and static assets.

## Spatial service

No deployed FastAPI service is evidenced. Its Dockerfile describes a possible container runtime but is not infrastructure state. Before deployment, define artifact storage, upload limits, authentication, network isolation, timeouts, resource limits, job persistence, observability, cost controls, and safe handling/deletion of property files.

## Scoring and dashboard

Neither is deployed as a standalone service. Scoring is a library; the dashboard is a prototype. Do not publish the prototype as a production lead system.

## Protected operations

Do not casually alter Vercel linkage, domains, provider keys, lead recipients, spatial infrastructure, asset storage, or customer property inputs.
