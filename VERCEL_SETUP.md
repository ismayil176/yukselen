# Vercel Setup (Storage)

Bu layihə Vercel-də işləmək üçün bu iki storage istifadə edir:

1) **Redis (Upstash)** (exams/questions/attempts/messages/admin credentials)
2) **Vercel Blob** (şəkilli suallar)

## Addım-addım

1. Repo-nu Vercel-ə import et (New Project → Import Git Repository).
2. Project açıldıqdan sonra:
   - Vercel Dashboard → **Storage → Marketplace → Redis (Upstash) yarat (Project-ə bağla)
   - Vercel Dashboard → **Storage** → **Blob** yarat (Project-ə bağla)
3. Vercel storage qoşduqda lazımi ENV-lər avtomatik əlavə olunur.

## Əlavə tövsiyə (vacib)

Admin session üçün bu ENV-i təyin et:
- `APP_SESSION_SECRET` (və ya `ADMIN_SESSION_SECRET`) = minimum 32 simvolluq uzun random string

Vercel → Project → Settings → Environment Variables.
