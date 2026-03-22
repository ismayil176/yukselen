import { noStoreJson } from "@/lib/apiSecurity";
import { requireAdminApiRequest } from "@/lib/adminAuth";
import { deleteQuestion, updateQuestion } from "@/lib/questions";
import { getExam } from "@/lib/exams";
import { readDb } from "@/lib/store";
import { isSectionAllowedForCategory, isSectionKey } from "@/lib/examStructure";
import { sanitizeQuestionImage } from "@/lib/dbValidation";

export const runtime = "nodejs";

export async function PUT(req: Request, ctx: { params: { examId: string; questionId: string } }) {
  const denied = requireAdminApiRequest(req, { requireSameOrigin: true });
  if (denied) return denied;

  const exam = await getExam(ctx.params.examId);
  if (!exam) return noStoreJson({ ok: false, error: "İmtahan tapılmadı" }, { status: 404 });

  const db = await readDb();
  const existing = db.questions.find((q) => q.id === ctx.params.questionId);
  if (!existing || existing.examId !== ctx.params.examId) {
    return noStoreJson({ ok: false, error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return noStoreJson({ ok: false, error: "Bad JSON" }, { status: 400 });

  const patch: any = {};
  if (typeof body.text === "string") patch.text = body.text.trim();
  if (Array.isArray(body.options) && body.options.length === 5 && body.options.every((v: unknown) => String(v ?? "").trim())) {
    patch.options = body.options.map((v: unknown) => String(v));
  }
  if (body.correctIndex !== undefined) patch.correctIndex = Number(body.correctIndex);
  if (body.score !== undefined) patch.score = Number(body.score);
  if (body.imageKey !== undefined) patch.imageKey = String(body.imageKey ?? "").trim() || null;
  if (body.imageUrl !== undefined || body.image !== undefined) {
    const sanitizedImage = sanitizeQuestionImage(body.imageUrl ?? body.image ?? null);
    patch.imageUrl = sanitizedImage;
    patch.image = sanitizedImage;
  }
  if (typeof body.section === "string") {
    const nextSection = body.section.trim();
    if (!isSectionKey(nextSection)) {
      return noStoreJson({ ok: false, error: "section yanlışdır" }, { status: 400 });
    }
    if (!isSectionAllowedForCategory(exam.category, nextSection)) {
      return noStoreJson({ ok: false, error: "Bu bölmə seçilmiş imtahan kateqoriyasına aid deyil." }, { status: 400 });
    }
    patch.section = nextSection;
  }

  const updated = await updateQuestion(ctx.params.questionId, patch);
  if (!updated || updated.examId !== ctx.params.examId) return noStoreJson({ ok: false, error: "Not found" }, { status: 404 });

  return noStoreJson({ ok: true, question: updated });
}

export async function DELETE(req: Request, ctx: { params: { examId: string; questionId: string } }) {
  const denied = requireAdminApiRequest(req, { requireSameOrigin: true });
  if (denied) return denied;

  try {
    const db = await readDb();
    const q = db.questions.find((x) => x.id === ctx.params.questionId && x.examId === ctx.params.examId);
    if (!q) return noStoreJson({ ok: false, error: "Not found" }, { status: 404 });
    const key = (q as any)?.imageKey as string | undefined;
    if (key) {
      const mod: any = await import("@/lib/imageStore");
      if (typeof mod.deleteImage === "function") {
        await mod.deleteImage(key);
      }
    }
  } catch (error) {
    if (error instanceof Response) return error;
  }

  const ok = await deleteQuestion(ctx.params.questionId);
  if (!ok) return noStoreJson({ ok: false, error: "Not found" }, { status: 404 });
  return noStoreJson({ ok: true });
}
