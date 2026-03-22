import { z } from "zod";
import { createAttempt } from "@/lib/attempts";
import { assertSameOrigin, getClientIp, hitRateLimit, noStoreJson } from "@/lib/apiSecurity";
import { setExamSessionCookie } from "@/lib/examSession";
import { getExam } from "@/lib/exams";
import { isCategoryKey } from "@/lib/examStructure";

export const runtime = "nodejs";

const CreateSchema = z.object({
  examId: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(40),
  student: z.object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    fatherName: z.string().trim().min(1).max(80),
    phone: z.string().trim().min(7).max(40),
  }),
});

export async function POST(req: Request) {
  const originCheck = assertSameOrigin(req);
  if (!originCheck.ok) return originCheck.response;
  const ip = getClientIp(req);
  const rl = hitRateLimit(`attempt-create:${ip}`, 12);
  if (rl.limited) {
    return noStoreJson({ ok: false, error: "Çox tez-tez imtahan başladılır. Bir az sonra yenidən yoxlayın." }, { status: 429 });
  }
  try {
    const body = await req.json().catch(() => null);
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) return noStoreJson({ ok: false, error: "Məlumatlar natamamdır" }, { status: 400 });

    if (!isCategoryKey(parsed.data.category)) {
      return noStoreJson({ ok: false, error: "Kateqoriya yanlışdır." }, { status: 400 });
    }

    const exam = await getExam(parsed.data.examId);
    if (!exam) return noStoreJson({ ok: false, error: "İmtahan tapılmadı." }, { status: 404 });
    if (exam.category !== parsed.data.category) {
      return noStoreJson({ ok: false, error: "İmtahan və kateqoriya uyğun gəlmir." }, { status: 400 });
    }

    const attempt = await createAttempt(parsed.data);
    setExamSessionCookie(attempt.id, attempt.examId);
    return noStoreJson({ ok: true, attemptId: attempt.id });
  } catch (e: any) {
    return noStoreJson({ ok: false, error: e?.message ?? "Server xətası" }, { status: 500 });
  }
}
