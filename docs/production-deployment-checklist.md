# Hi!Book 2.0 — Controlled Production Deployment Checklist

## Purpose

This checklist is the release gate for deploying Hi!Book to a real hosting and Supabase environment. Repository and disposable-CI controls are verified automatically; production-environment controls require evidence from the deployed service and its infrastructure.

## 1. Pre-deployment application gate

- [ ] Confirm the release commit is on `main` and reviewed.
- [ ] Confirm the latest web CI run is green: lint + production build.
- [ ] Confirm the latest disposable-Supabase E2E run is green.
- [ ] Confirm the database pgTAP suite is green against a clean migration reset.
- [ ] Confirm no production secrets are committed to the repository.
- [ ] Confirm browser configuration contains only the public Supabase URL and publishable key.

## 2. Supabase production gate

- [ ] Confirm the production project is the intended Supabase project.
- [ ] Confirm production migrations match the release commit.
- [ ] Confirm database backups are enabled and record the retention policy.
- [ ] Perform a restore drill into a non-production project/database and record the result.
- [ ] Confirm Storage policies and bucket configuration match the migration-defined access model.
- [ ] Confirm Realtime is enabled only for the required tables/channels.
- [ ] Confirm Auth provider configuration, redirect URLs, email settings, and rate limits.
- [ ] Confirm production service-role credentials are stored only as protected server-side secrets where required.

## 3. Hosting/deployment gate

- [ ] Confirm the production deployment uses the intended Next.js hosting platform.
- [ ] Configure all required environment variables in the hosting platform; do not place secrets in client-exposed variables.
- [ ] Confirm the production domain uses HTTPS and valid TLS.
- [ ] Confirm the deployment serves the application's security headers, including HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy`.
- [ ] Confirm the deployment platform/reverse proxy provides IP-level throttling or an equivalent edge abuse-control mechanism.
- [ ] Confirm deployment protection, preview access controls, and branch-to-environment mapping.
- [ ] Confirm the deployment can be rolled back to the previous known-good release.

## 4. Liveness and monitoring gate

The application exposes `GET /api/health` as a non-cached liveness endpoint. A production monitor should poll this endpoint without authentication.

- [ ] Configure an external/hosting uptime check against `/api/health`.
- [ ] Confirm a healthy response is HTTP 200 with `status: "ok"`.
- [ ] Confirm the endpoint is not cached by an intermediary.
- [ ] Confirm application errors are retained in a durable, searchable log sink.
- [ ] Confirm database/auth/storage failures are observable.
- [ ] Configure alerts for sustained 5xx responses, authentication failures, database failures, storage failures, and sustained rate-limit rejections.

## 5. Abuse-control gate

Database-level authenticated mutation limits are already covered by the repository security suite. Production must additionally protect the deployment boundary and authentication surface.

- [ ] Verify reverse-proxy/CDN/IP throttling for anonymous traffic.
- [ ] Verify Supabase Auth limits for sign-up, sign-in, password recovery, email verification, and related abuse-sensitive operations.
- [ ] Verify production rate-limit responses are surfaced cleanly to users without leaking internal details.
- [ ] Confirm monitoring can distinguish ordinary application errors from repeated abuse-control rejection.

## 6. Recovery and rollback gate

- [ ] Name the incident-response owner and escalation path.
- [ ] Record the production Supabase project and hosting project identifiers in the private operational record.
- [ ] Perform a controlled rollback rehearsal.
- [ ] Perform or schedule a database restore rehearsal independently of the application rollback.
- [ ] Verify that rollback does not require destructive database changes that cannot be reversed.
- [ ] Document the recovery sequence for application outage, database outage, storage outage, and authentication outage.

## 7. Controlled release sequence

1. Freeze the release commit.
2. Run database CI and web CI.
3. Run the disposable-Supabase E2E suite.
4. Apply migrations to the production Supabase project according to the approved migration procedure.
5. Deploy the exact verified application commit.
6. Run `/api/health` and smoke-test authentication, community, discovery, profile, messaging, notifications, and sign-out.
7. Verify production security headers and TLS.
8. Verify monitoring/alerts are receiving events.
9. Observe the deployment before opening general access.
10. Keep the previous release available for rollback until the release is accepted.

## Current evidence boundary

The repository can verify application behavior, migrations, database security, web lint/build, browser journeys, liveness behavior, and configured application security headers. It cannot verify the actual production Supabase backup/restore state, hosting-provider configuration, external monitoring, IP throttling, authentication-provider limits, or production rollback until those systems are connected and inspected.

**Do not mark the operational-readiness gate complete without production evidence for those external controls.**
