# Audit report

Bu paket üçün əlavə audit və sərtləşdirmə tətbiq olundu.

## Bu mərhələdə düzəldilən əsas problemlər

- **Saxta `admin_session` cookie ilə admin UI shell açılması bağlandı.**
  Əvvəl middleware yalnız cookie-nin mövcudluğunu yoxlayırdı; indi signature və expiry də yoxlanılır.
- **`/dag-goy` root route düzəldildi.**
  Loginə kor-koranə yönləndirmə əvəzinə etibarlı session varsa `/dag-goy/exams`-ə keçir.
- **Admin question route integrity sərtləşdirildi.**
  `PUT/DELETE /api/dag-goy/exams/[examId]/questions/[questionId]` artıq URL-dəki `examId` ilə real `question.examId` uyğun gəlməyəndə əməliyyatı rədd edir.
- **Kateqoriya–section uyğunsuzluğu bağlandı.**
  Məsələn, `general` imtahana `VERBAL_*` section əlavə etmək artıq mümkün deyil.
- **Verbal passage route-ları da kateqoriya baxımından sərtləşdirildi.**
  Verbal bölmə yalnız uyğun imtahanda işləyir.

## Əvvəldən paketdə mövcud olan və yoxlanmış sərtləşdirmələr

- `POST /api/attempts/finish` server-side scoring edir; client cavablarına kor-koranə güvənmir.
- `POST /api/attempts` serverdə `examId` və `category` uyğunluğunu yoxlayır.
- Admin mutasiya endpoint-lərində same-origin / CSRF sərtləşdirməsi var.
- JSON və Excel import route-larında payload sanitization, ölçü limiti və struktur validasiyası var.
- Sual / şəkil input-larında sanitization var.
- Legacy işləməyən endpoint-lər təhlükəsiz `410 Gone` fallback ilə söndürülüb.
- Security header-lər: CSP, HSTS (prod), X-Frame-Options, nosniff, COOP, CORP və s.

## Audit zamanı yoxlanmış əsas sahələr

- Admin auth və session cookie axını
- Admin CRUD route-ları
- Attempt create / finish flow
- Backup import/export
- Verbal passage və question management
- Public image route və upload flow
- Legacy/broken route-lar
- UI yönləndirmələri və route consistency

## Test nəticələri

- `GET /dag-goy/exams` cookie olmadan → login redirect
- **Saxta** `admin_session` cookie ilə `GET /dag-goy/exams` → artıq login redirect
- `GET /api/dag-goy/exams` saxta cookie ilə → `401 Unauthorized`
- `POST /api/attempts` cross-site `Origin` ilə → `403 Forbidden`
- `POST /api/dag-goy/login` cross-site `Origin` ilə → `403 Forbidden`
- Yanlış exam path ilə question delete → `404 Not found`
- Uyğunsuz section ilə question create → `400 Bad Request`

## Vacib deploy qeydləri

Production-a çıxmazdan əvvəl bunlar **mütləq** olmalıdır:

- `APP_SESSION_SECRET` ən azı **32 simvol** olsun
- `DATABASE_URL` düzgün bağlı olsun
- Default admin credential ilə production-a çıxma
- Mümkünsə 2FA aktiv et
- Railway-də Node 20 Docker build istifadə et (bu paketdə Dockerfile artıq var)

## Qeyd

Bu audit nəticəsində tətbiq səviyyəsində kritik görünən boşluqlar bağlanıb, amma “100% heç vaxt sındırıla bilməz” kimi zəmanət real deyil. Xüsusən rate limit hazırda tətbiq instansiyası səviyyəsində in-memory işləyir; gələcəkdə multi-instance və ya daha sərt brute-force qoruması istəsən, DB/Redis-backed limiter əlavə etmək yaxşı olar.


## Son əlavə qeydlər

- `DATABASE_URL` yenə də production üçün tövsiyə olunur.
- Son yeniləmədə app lokal fallback storage ilə də işləyir: imtahan cəhdləri, mesajlar və sual bazası DB olmasa belə lokal storage-a yazıla bilir.
- Bu fallback deploy-u bloklamır, amma redeploy/restart sonrası davamlılıq üçün PostgreSQL daha təhlükəsizdir.

## Son performans və sabitlik düzəlişləri

- Server-side JSON/KV oxunuşlarına qısaömürlü in-memory cache əlavə olundu; eyni axında təkrarlanan disk/DB oxunuşları azaldıldı.
- `db.json` bazası üçün server-side in-memory cache əlavə olundu; admin yazısından sonra cache dərhal yenilənir.
- İmtahanın verbal mərhələsində suallar və mətn artıq ardıcıl deyil, paralel yüklənir.
- Admin siyahı səhifələrində (`sınaqlar`, `iştirakçılar`, `mesajlar`) auth yoxlaması və əsas data fetch daha paralel davranışa gətirildi.

## Son smoke test nəticələri

- Public attempt yaratma → işləyir
- Exam session cookie ilə sualları alma → işləyir
- Finish flow → işləyir
- Admin login → işləyir
- Admin attempts API → işləyir
- TypeScript check (`npx tsc --noEmit`) → keçdi
