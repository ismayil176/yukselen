import { z } from "zod";
import { getAttemptById, getAttemptResult } from "@/lib/attempts";
import { assertSameOrigin, getClientIp, hitRateLimit, noStoreJson } from "@/lib/apiSecurity";
import { getExam } from "@/lib/exams";
import { normalizeAzerbaijanPhone } from "@/lib/phone";

export const runtime = "nodejs";

const RequestSchema = z.object({ attemptId: z.string().trim().min(1), phone: z.string().trim().min(7).max(40) });

export async function POST(req: Request) {
  const originCheck = assertSameOrigin(req);
  if (!originCheck.ok) return originCheck.response;
  const ip = getClientIp(req);
  const rl = hitRateLimit(`result-check-result:${ip}`, 30);
  if (rl.limited) return noStoreJson({ ok: false, error: "Çox tez-tez sorğu göndərildi. Bir az sonra yenidən yoxlayın." }, { status: 429 });
  try {
    const body = await req.json().catch(() => null);
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) return noStoreJson({ ok: false, error: "Sorğu natamamdır." }, { status: 400 });
    const phone = normalizeAzerbaijanPhone(parsed.data.phone);
    if (!phone) return noStoreJson({ ok: false, error: "Telefon nömrəsini düzgün daxil edin." }, { status: 400 });
    const attempt = await getAttemptById(parsed.data.attemptId);
    if (!attempt || attempt.student.phone !== phone) return noStoreJson({ ok: false, error: "Bu nömrə ilə nəticə tapılmadı." }, { status: 404 });
    if (attempt.status !== "FINISHED") return noStoreJson({ ok: false, error: "Bu imtahanın nəticəsi hələ hazır deyil." }, { status: 400 });
    const [result, exam] = await Promise.all([getAttemptResult(attempt.id), getExam(attempt.examId)]);
    if (!result) return noStoreJson({ ok: false, error: "Nəticə tapılmadı." }, { status: 404 });
    return noStoreJson({ ok: true, result: { attempt: { ...attempt, attemptId: attempt.id, examTitle: exam?.title ?? "İmtahan" }, summary: result.summary, blocks: result.blocks, details: result.details, generatedAt: result.generatedAt, generatedAtAz: result.generatedAtAz } });
  } catch (e: any) {
    return noStoreJson({ ok: false, error: e?.message ?? "Server xətası" }, { status: 500 });
  }
}
