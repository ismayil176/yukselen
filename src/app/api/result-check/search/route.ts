import { z } from "zod";
import { getAttemptResult, listAttemptsByPhone } from "@/lib/attempts";
import { assertSameOrigin, getClientIp, hitRateLimit, noStoreJson } from "@/lib/apiSecurity";
import { getExam } from "@/lib/exams";
import { normalizeAzerbaijanPhone } from "@/lib/phone";

export const runtime = "nodejs";

const RequestSchema = z.object({ phone: z.string().trim().min(7).max(40) });

export async function POST(req: Request) {
  const originCheck = assertSameOrigin(req);
  if (!originCheck.ok) return originCheck.response;
  const ip = getClientIp(req);
  const rl = hitRateLimit(`result-check-search:${ip}`, 20);
  if (rl.limited) return noStoreJson({ ok: false, error: "Çox tez-tez sorğu göndərildi. Bir az sonra yenidən yoxlayın." }, { status: 429 });
  try {
    const body = await req.json().catch(() => null);
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) return noStoreJson({ ok: false, error: "Telefon nömrəsini düzgün daxil edin." }, { status: 400 });
    const phone = normalizeAzerbaijanPhone(parsed.data.phone);
    if (!phone) return noStoreJson({ ok: false, error: "Telefon nömrəsini düzgün daxil edin." }, { status: 400 });
    const attempts = await listAttemptsByPhone(phone);
    const items = await Promise.all(attempts.map(async (attempt) => {
      const [exam, result] = await Promise.all([getExam(attempt.examId), getAttemptResult(attempt.id)]);
      return {
        attemptId: attempt.id,
        examId: attempt.examId,
        examTitle: exam?.title ?? "İmtahan",
        category: attempt.category,
        score: attempt.score,
        startedAt: attempt.startedAt,
        startedAtAz: attempt.startedAtAz,
        finishedAt: attempt.finishedAt,
        finishedAtAz: attempt.finishedAtAz,
        meta: attempt.meta ?? null,
        resultAvailable: Boolean(result),
      };
    }));
    return noStoreJson({ ok: true, phone, attempts: items });
  } catch (e: any) {
    return noStoreJson({ ok: false, error: e?.message ?? "Server xətası" }, { status: 500 });
  }
}
