# Hi!Book 2.0 — Operational Readiness Audit

## Scope

This audit separates operational controls that can be verified from the repository and disposable CI environment from controls that require access to the actual production hosting/Supabase environments.

## Repository/CI findings

| Area | Status | Evidence / action |
|---|---|---|
| Application error boundary | 🟢 | `web/app/error.tsx`, `loading.tsx`, and `not-found.tsx` provide user-facing failure/loading boundaries. |
| Production liveness probe | 🟢 | `GET /api/health` returns a non-cached `200` liveness response without authentication. The Playwright production-readiness suite verifies it in E2E run 53. |
| Authentication secret separation | 🟢 | `web/.env.example` contains only the public Supabase URL and publishable key; service-role credentials are not part of browser configuration. |
| Server-authoritative authorization | 🟢 | Security-sensitive workflows use PostgreSQL RPCs/RLS; the web README explicitly prohibits client-side reproduction of authorization rules. |
| Database CI | 🟢 | Local Supabase reset plus the full pgTAP suite passes after the abuse-control implementation. |
| Browser CI | 🟢 | Disposable local-Supabase Playwright suite passes after the abuse-control and liveness changes. |
| Web lint/build | 🟢 | Web checks run 136 passed both lint and the production Next.js build for the liveness changes. |
| Durable error reporting | 🟠 | Current global error boundary logs to the browser console. No external error-reporting sink is configured in the repository. Production deployment must provide durable error collection/alerting. |
| Backups | 🔴 | Backup configuration and restore evidence are not represented in the repository. Must be verified in the production Supabase project and documented with an actual restore test. |
| Restore/disaster recovery | 🔴 | No repository-backed restore runbook or verified recovery drill is present. |
| Deployment configuration | 🟠 | Application configuration is environment-driven, but the actual hosting project, environment-variable configuration, domains, and deployment protection must be verified outside the repository. |
| Deployment-boundary rate limiting | 🟠 | Authenticated mutation limits are enforced at PostgreSQL. IP-level, authentication-provider, and reverse-proxy limits still require production-like verification. |
| Monitoring/alerting | 🔴 | No durable production monitoring or alerting integration is configured in the repository. |

## Required production verification

Before public launch, complete these checks against the real deployment:

1. Confirm production Supabase backups are enabled for the deployed database and record the retention policy.
2. Perform and document a restore drill into a non-production project/database.
3. Confirm application and database error logs are retained and searchable.
4. Configure alerts for elevated 5xx responses, database failures, authentication failures, storage failures, and sustained rate-limit rejections.
5. Confirm production environment variables contain only the intended public values in the browser and protected server-side values where applicable.
6. Verify custom-domain TLS, security headers, deployment protection, and reverse-proxy/IP throttling.
7. Verify Supabase Auth/provider rate limits for sign-up, sign-in, password recovery, and verification traffic.
8. Confirm the liveness endpoint is used by the hosting platform or external uptime monitor.
9. Document the incident-response owner, escalation path, and recovery runbook.
10. Run a final controlled deployment and rollback rehearsal before public launch.

## Current conclusion

The repository has a verified application/database security foundation, automated browser coverage, and a production liveness probe. **Operational readiness is not yet complete** because backups/restore, durable observability, production deployment configuration, and deployment-boundary abuse controls require verification in the actual hosting environment.
