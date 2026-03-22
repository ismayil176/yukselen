import { requireAdminApiRequest } from "@/lib/adminAuth";
import { noStoreJson } from "@/lib/apiSecurity";
import { getExam } from "@/lib/exams";
import { getVerbalPassage, upsertVerbalPassage } from "@/lib/questions";
import { isSectionAllowedForCategory, isSectionKey } from "@/lib/examStructure";

export const runtime = "nodejs";

async function validateExamAndSection(examId: string, section: string) {
  if (!section || !isSectionKey(section) || !section.startsWith("VERBAL_")) {
    return { ok: false as const, response: noStoreJson({ ok: false, error: "section lazımdır" }, { status: 400 }) };
  }
  const exam = await getExam(examId);
  if (!exam) {
    return { ok: false as const, response: noStoreJson({ ok: false, error: "İmtahan tapılmadı" }, { status: 404 }) };
  }
  if (!isSectionAllowedForCategory(exam.category, section)) {
    return { ok: false as const, response: noStoreJson({ ok: false, error: "Bu bölmə seçilmiş imtahan kateqoriyasına aid deyil." }, { status: 400 }) };
  }
  return { ok: true as const };
}

export async function GET(req: Request, ctx: { params: { examId: string } }) {
  const denied = requireAdminApiRequest(req);
  if (denied) return denied;
  const url = new URL(req.url);
  const section = (url.searchParams.get("section") || "").trim();
  const valid = await validateExamAndSection(ctx.params.examId, section);
  if (!valid.ok) return valid.response;

  const passage = await getVerbalPassage(ctx.params.examId, section as any);
  return noStoreJson({ ok: true, passage });
}

export async function PUT(req: Request, ctx: { params: { examId: string } }) {
  const denied = requireAdminApiRequest(req, { requireSameOrigin: true });
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const section = String(body?.section ?? "").trim();
  const text = String(body?.text ?? "").trim();
  const valid = await validateExamAndSection(ctx.params.examId, section);
  if (!valid.ok) return valid.response;
  if (!text) return noStoreJson({ ok: false, error: "Mətn boş ola bilməz" }, { status: 400 });

  const passage = await upsertVerbalPassage(ctx.params.examId, section as any, text);
  return noStoreJson({ ok: true, passage });
}
