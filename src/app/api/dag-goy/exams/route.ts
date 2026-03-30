import { requireAdminApiRequest } from "@/lib/adminAuth";
import { noStoreJson } from "@/lib/apiSecurity";
import { createExam, deleteExam, listExams, updateExamInstructions, updateExamTitle, type CategoryKey } from "@/lib/exams";
import { isCategoryKey } from "@/lib/examStructure";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const denied = requireAdminApiRequest(req);
    if (denied) return denied;
    const { searchParams } = new URL(req.url);
    const categoryParam = searchParams.get("category") || "";
    const category = categoryParam && isCategoryKey(categoryParam) ? categoryParam : null;
    const exams = await listExams(category ?? undefined);
    return noStoreJson({ ok: true, exams });
  } catch (e: any) {
    return noStoreJson({ ok: false, error: e?.message ?? "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const denied = requireAdminApiRequest(req, { requireSameOrigin: true });
    if (denied) return denied;
    const body = (await req.json().catch(() => null)) as { category?: CategoryKey; title?: string } | null;
    const category = String(body?.category ?? "").trim();
    const title = String(body?.title ?? "").trim();
    if (!isCategoryKey(category) || !title) return noStoreJson({ ok: false, error: "category/title required" }, { status: 400 });
    const exam = await createExam({ category, title });
    return noStoreJson({ ok: true, exam });
  } catch (e: any) {
    return noStoreJson({ ok: false, error: e?.message ?? "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const denied = requireAdminApiRequest(req, { requireSameOrigin: true });
    if (denied) return denied;
    const body = (await req.json().catch(() => null)) as { examId?: string; instructions?: string; title?: string } | null;
    const examId = String(body?.examId ?? "").trim();
    if (!examId) return noStoreJson({ ok: false, error: "examId required" }, { status: 400 });

    let updated: any = null;
    if (typeof body?.instructions === "string") {
      updated = await updateExamInstructions(examId, body.instructions);
    }
    if (typeof body?.title === "string") {
      updated = await updateExamTitle(examId, body.title);
    }

    if (!updated) return noStoreJson({ ok: false, error: "Not found" }, { status: 404 });
    return noStoreJson({ ok: true, exam: updated });
  } catch (e: any) {
    return noStoreJson({ ok: false, error: e?.message ?? "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const denied = requireAdminApiRequest(req, { requireSameOrigin: true });
    if (denied) return denied;
    const body = (await req.json().catch(() => null)) as { examId?: string } | null;
    const examId = String(body?.examId ?? "").trim();
    if (!examId) return noStoreJson({ ok: false, error: "examId required" }, { status: 400 });
    const ok = await deleteExam(examId);
    if (!ok) return noStoreJson({ ok: false, error: "Not found" }, { status: 404 });
    return noStoreJson({ ok: true });
  } catch (e: any) {
    return noStoreJson({ ok: false, error: e?.message ?? "Server error" }, { status: 500 });
  }
}
