import { noStoreJson } from "@/lib/apiSecurity";
import { requireAdminApiRequest } from "@/lib/adminAuth";
import { createQuestion, listQuestions } from "@/lib/questions";
import { getExam } from "@/lib/exams";
import type { SectionKey } from "@/lib/store";
import { isSectionAllowedForCategory, isSectionKey } from "@/lib/examStructure";
import { sanitizeQuestionImage } from "@/lib/dbValidation";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: { examId: string } }) {
  const denied = requireAdminApiRequest(req);
  if (denied) return denied;

  const url = new URL(req.url);
  const sectionParam = (url.searchParams.get("section") || "").trim();
  if (sectionParam && !isSectionKey(sectionParam)) {
    return noStoreJson({ ok: false, error: "section yanlışdır" }, { status: 400 });
  }

  const qs = await listQuestions(ctx.params.examId, (sectionParam || undefined) as SectionKey | undefined);
  return noStoreJson({ ok: true, questions: qs });
}

export async function POST(req: Request, ctx: { params: { examId: string } }) {
  const denied = requireAdminApiRequest(req, { requireSameOrigin: true });
  if (denied) return denied;

  const exam = await getExam(ctx.params.examId);
  if (!exam) return noStoreJson({ ok: false, error: "İmtahan tapılmadı" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return noStoreJson({ ok: false, error: "Bad JSON" }, { status: 400 });

  const section = String(body.section ?? "").trim();
  const text = String(body.text ?? "").trim();
  const options = body.options as string[];
  const correctIndex = Number(body.correctIndex);
  const score = Number(body.score ?? 1);
  const imageKey = String(body.imageKey ?? "").trim() || null;
  const imageUrl = sanitizeQuestionImage(body.imageUrl ?? body.image ?? null);

  if (!isSectionKey(section)) return noStoreJson({ ok: false, error: "section lazımdır" }, { status: 400 });
  if (!isSectionAllowedForCategory(exam.category, section)) {
    return noStoreJson({ ok: false, error: "Bu bölmə seçilmiş imtahan kateqoriyasına aid deyil." }, { status: 400 });
  }
  if (!text) return noStoreJson({ ok: false, error: "Sual mətni boş ola bilməz" }, { status: 400 });
  if (!Array.isArray(options) || options.length !== 5 || options.some((x) => !String(x ?? "").trim())) {
    return noStoreJson({ ok: false, error: "5 cavab variantı lazımdır" }, { status: 400 });
  }
  if (!Number.isFinite(correctIndex) || correctIndex < 0 || correctIndex > 4) {
    return noStoreJson({ ok: false, error: "correctIndex 0-4 olmalıdır" }, { status: 400 });
  }
  if (!Number.isFinite(score) || score <= 0) {
    return noStoreJson({ ok: false, error: "score 0-dan böyük olmalıdır" }, { status: 400 });
  }

  const q = await createQuestion({
    examId: ctx.params.examId,
    section,
    text,
    score,
    imageKey,
    imageUrl: imageKey ? `/api/images/${encodeURIComponent(imageKey)}` : imageUrl,
    image: imageKey ? null : imageUrl,
    options: [String(options[0]), String(options[1]), String(options[2]), String(options[3]), String(options[4])],
    correctIndex,
  });

  return noStoreJson({ ok: true, question: q });
}
