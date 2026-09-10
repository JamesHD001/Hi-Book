# Hi!Book Deployment Security

Hi!Book uses layered protection. The reverse proxy or hosting edge is a perimeter control; it does not replace application authorization, PostgreSQL RLS, input validation, or server-side rate limits.

## Current deployment target: Vercel

The web application is designed for Vercel + Supabase. Vercel provides the public edge/reverse-proxy layer, so an additional Nginx server should **not** be placed in front of the normal Vercel deployment merely for security theater.

Production requirements:

- Use HTTPS only and a controlled production domain.
- Keep Supabase credentials server-safe; never expose a service-role key to the browser.
- Keep PostgreSQL RLS enabled on protected tables.
- Keep authorization decisions in PostgreSQL/application code rather than relying on edge rules.
- Apply platform WAF/rate-limit controls where available and appropriate to the production plan.
- Keep request-size validation in the application as well as any edge limit.
- Do not expose a separate Node/Next.js origin or management port directly to the public internet.
- Preserve forwarded-proxy information only from the trusted hosting platform; do not trust arbitrary client-supplied forwarding headers for authorization decisions.
- Monitor authentication, moderation, payment, and other security-sensitive routes separately from ordinary traffic.

The Next.js application also emits baseline security response headers from `web/next.config.ts`.

## Self-hosted deployment

For a VPS or container deployment, use `infra/nginx/nginx.conf` as the starting reverse-proxy configuration.

The public flow should be:

```text
Internet
  -> Nginx (TLS, request limits, rate limits, headers, timeouts)
  -> Next.js on 127.0.0.1:3000
  -> Supabase
```

Before production:

1. Replace `example.com` with the real hostname.
2. Install valid TLS certificates and update the certificate paths.
3. Keep Next.js bound to localhost/private networking; do not publish port 3000 directly.
4. Review the request-rate limit against expected traffic and authenticated/API behavior.
5. Keep application/database authorization enabled even when Nginx is present.
6. Review proxy trust behavior before using `X-Forwarded-*` values for logging, auditing, throttling, or security decisions.
7. Put a managed load balancer/WAF in front of Nginx if the deployment needs additional DDoS protection.

## Why both layers matter

Nginx/Vercel can reject oversized requests, throttle abusive traffic, terminate TLS, and reduce exposure of the application origin. It cannot determine whether a user may read a private post, message another user, execute a moderation action, or modify a financial record. Those decisions remain server/database authorization responsibilities.
