# Security and privacy

## Repository boundary

Tracked source may contain code, safe configuration names, synthetic fixtures, and authorized distributable assets. The following stay outside Git:

- `.env*` values, provider/API credentials, local Vercel metadata;
- lead/customer personal data and operational exports;
- proprietary property captures, plans, raw videos, large splats, and generated processing output;
- Python virtual environments/caches, Node dependencies/build output, logs, screenshots, and agent/tool state.

Only `.env.example` is tracked. `RESEND_API_KEY` is server-only. `LEAD_ALERT_EMAIL` is operational server configuration. `DEMO_ROOT_V2` is a non-secret deployment switch. No variable currently belongs in a `NEXT_PUBLIC_` namespace.

## Credential incident outside Git

An excluded local boardroom experiment contained a hardcoded Anthropic credential in `ANTHROPIC_API_KEY`. The experiment is not product runtime, is ignored, and the value is absent from Git history and the consolidated commit. The founder must still revoke/rotate that credential externally; repository cleanup cannot invalidate it.

## Lead data

Lead forms accept names, email addresses, companies, property addresses, and directions. Treat these as personal/operational data. Missing-provider/error fallbacks do not intentionally log submitted fields, but provider behavior and production logs still require review. Before production use, define consent, purpose, access, retention/deletion, redaction, and incident handling; avoid broad log retention.

## Spatial/property data

Property models, plans, photos, videos, and derived geometry may be proprietary or privacy-sensitive. Process only authorized inputs. A future spatial-service deployment must authenticate requests, isolate jobs, validate type/size, prevent path/archive abuse, encrypt transport/storage, set retention, and delete temporary files.

## External effects

Email delivery, deployment, provider configuration, external asset storage, spatial processing of real property data, and telemetry collection are approval-gated. Do not use the confirmed demo deployment as a test target without authorization.

## Reporting

Report vulnerabilities privately with file/surface and remediation guidance, never reusable credentials or real lead/property contents.
