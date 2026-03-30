import { requireAdminApiRequest } from "@/lib/adminAuth";
import { noStoreJson } from "@/lib/apiSecurity";
import { getExam } from "@/lib/exams";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const denied = requireAdminApiRequest(req);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const examId = searchParams.get("examId");
  if (!examId) return noStoreJson({ ok: false, error: "examId required" }, { status: 400 });

  const exam = await getExam(examId);
  if (!exam) return noStoreJson({ ok: false, error: "Not found" }, { status: 404 });

  return noStoreJson({ ok: true, exam });
}
