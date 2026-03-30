# SEO setup checklist

## 1) Railway variables
Set these in Railway:

- `NEXT_PUBLIC_SITE_URL=https://www.yukselen.az`
- `APP_SESSION_SECRET=...`
- `DATABASE_URL=...`
- `DATABASE_PUBLIC_URL=...`
- `ADMIN_USERNAME=...`
- `ADMIN_PASSWORD=...`

## 2) Canonical domain and Cloudflare
Use `https://www.yukselen.az` as the only canonical version.

Make sure these work:

- `https://www.yukselen.az`
- `https://www.yukselen.az/sitemap.xml`
- `https://www.yukselen.az/robots.txt`

And keep this redirect active in Cloudflare:

- `https://yukselen.az/*` -> `https://www.yukselen.az/${1}` (`301`)

Also keep `Always Use HTTPS` enabled.

## 3) What is already included in this project
This package already includes:

- dynamic `sitemap.xml`
- dynamic `robots.txt`
- canonical metadata for public pages using the `www` host
- Open Graph / Twitter metadata
- home page `WebSite` structured data with brand name + alternate name
- middleware fallback redirect from apex to `www`
- `X-Robots-Tag: noindex` on `*.up.railway.app`
- `noindex` for private exam flow and hidden admin pages
- hidden admin panel at `/dag-goy`
- `/admin` route returns Not Found

## 4) What to submit in Google Search Console
Verify `yukselen.az` as a **Domain property** and submit:

- `https://www.yukselen.az/sitemap.xml`

Then request indexing only for key public pages:

- `https://www.yukselen.az/`
- `https://www.yukselen.az/yukselis-musabiqesi`
- `https://www.yukselen.az/sinaq-imtahanlarimiz`
- `https://www.yukselen.az/fealiyyetimiz`
- `https://www.yukselen.az/elaqe`

Do **not** request indexing for these routes:

- hidden admin routes (`/dag-goy`)
- old admin routes (`/admin`)
- exam session pages (`/general/...`, `/analytic/...`, `/exam/...`)
- result pages (`/result/...`)
- API routes (`/api/...`)
- old `non-www` URLs

## 5) Important note
Google indexing is not instant. Once the redirect, canonical tags, sitemap, and URL inspection are in place, Search Console can still take hours or days to fully reflect the `www` migration.
