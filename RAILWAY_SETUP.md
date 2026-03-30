# Railway deploy

This project includes a `Dockerfile` and `railway.toml`, so Railway should deploy it as a Node/Next.js app instead of the broken auto-detected `npm ci` plus `gunicorn` path.

## Expected behavior
- Builder: Dockerfile
- Internal port: `3000`

## Environment variables
Recommended production set:

- `NEXT_PUBLIC_SITE_URL=https://www.yukselen.az`
- `DATABASE_URL` = Railway private Postgres URL
- `DATABASE_PUBLIC_URL` = Railway public Postgres URL fallback
- `APP_SESSION_SECRET` = random secret with at least 32 characters
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

This app tries `DATABASE_URL` first and automatically falls back to `DATABASE_PUBLIC_URL` if the private hostname cannot be resolved.

## Custom domain setup
Use `www.yukselen.az` as the Railway custom domain.
Keep apex (`yukselen.az`) in Cloudflare only for the redirect rule.

## Included runtime protections
- fallback redirect from apex host to `https://www.yukselen.az`
- `X-Robots-Tag: noindex` on `*.up.railway.app`
- resilient Postgres connection handling with fallback from `DATABASE_URL` to `DATABASE_PUBLIC_URL`
- auto-create for `app_kv` and `images` tables if they do not exist yet
- local filesystem fallback storage when Postgres is temporarily unreachable

## Mandatory production checklist
- Add Railway PostgreSQL and confirm `DATABASE_URL` is set on the web service
- Also set `DATABASE_PUBLIC_URL` so app can recover if private DNS is unavailable
- Set `APP_SESSION_SECRET` to a random secret with at least 32 characters
- Set `ADMIN_USERNAME` and a strong `ADMIN_PASSWORD` before first production login
- After first login, optionally rotate credentials from `/dag-goy/security`
- Enable 2FA with `ADMIN_TOTP_ENABLED=true` and `ADMIN_TOTP_SECRET` if you want stronger admin protection
- After domain attach, test `/api/dag-goy/me`, public pages, and exam start flow
