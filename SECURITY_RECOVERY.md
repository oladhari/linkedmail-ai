# Railway incident recovery — LinkedMail AI

Tracking source: https://blog.railway.com/p/security-disclosure-wednesday-october-21st

The backend is linked to Railway project `modest-wonder`, production environment.
Treat credentials stored there as potentially exposed. This code change does not
revoke provider credentials or establish whether this account was affected.
Never paste credentials, environment dumps, or raw provider logs into GitHub.

## Operator recovery

1. Authenticate again with `railway login`, confirm the production project and
   service, and inspect the current variable names in the dashboard. Inventory all
   variables, including credentials beyond those listed here.
2. Create replacement OpenAI API, Stripe secret API, Stripe webhook signing, and
   Turso database authentication credentials in their respective provider consoles.
   Scope credentials to this app where possible. Use Stripe's endpoint-secret
   rotation procedure; coordinate its overlap window with the deployment.
3. Generate a new JWT signing secret with `openssl rand -hex 32`. Replace
   `JWT_SECRET`; do not retain the old key as a verification fallback. This forces
   every existing user session to sign in again once all instances restart.
4. Update Railway variables with the new credentials and set `NODE_ENV=production`.
   Preserve non-secret price IDs, URLs and database address after verifying them.
   Rotate any other secrets actually present (including private registry or CI
   credentials), and revoke exposed old credentials promptly. If active abuse is
   suspected, revoke first and accept temporary downtime.
5. Review Railway's current recovery guidance and reconnect GitHub / recreate
   deployment credentials if required. Deploy the reviewed commit explicitly;
   confirm every production instance restarted with the new variables. Do not
   assume merging the PR proves a successful deployment.
6. Check the root health endpoint; verify an old JWT receives 401 on `/auth/me`;
   sign in afresh, generate an email, and verify Stripe webhook delivery with a
   controlled test. Check persisted user and plan data in Turso. Do not create
   real paid transactions just to test recovery.
7. Confirm old provider credentials are revoked, including any webhook overlap
   credentials. Review provider usage, billing, access logs, database changes and
   Stripe webhook history around October 21, 2026 onward for unexpected activity.
   Store findings privately; record only redacted completion evidence in the issue.

## Code safeguards

Startup rejects weak/missing JWT secrets. With `NODE_ENV=production`, startup
also rejects missing/placeholder provider configuration, local database fallback,
and an insecure application URL. JWT verification accepts only HS256 and valid
positive numeric user IDs. Google access tokens travel in Authorization headers.
Provider exceptions are not written verbatim to application logs or webhook errors.

Run `cd backend && npm ci && npm test` before deploying.

## Completion evidence

Keep the incident issue open until the operator confirms credential rotation,
revocation, production deployment, functional checks, and log review. A merged PR
alone is not incident resolution. Rolling code back must never restore old secrets.

Dependency validation: the lockfile updates compatible dependency versions, and a
`qs` override keeps Express/Stripe on the patched 6.16.x line. Run `npm audit`
again during recovery because advisories can change.
