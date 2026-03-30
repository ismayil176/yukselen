import { getExamSession } from "@/lib/examSession";
import { getAttemptById, getAttemptResult } from "@/lib/attempts";
import { assertSameOrigin, noStoreJson } from "@/lib/apiSecurity";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const originCheck = assertSameOrigin(req);
  if (!originCheck.ok) return originCheck.response;

  try {
    const url = new URL(req.url);
    const attemptId = url.searchParams.get("attemptId")?.trim() || "";
    const examId = url.searchParams.get("examId")?.trim() || "";

    if (!attemptId || !examId) {
      return noStoreJson({ ok: false, error: "Bad request" }, { status: 400 });
    }

    const session = getExamSession();
    if (!session || session.examId !== examId || session.attemptId !== attemptId) {
      return noStoreJson({ ok: false, error: "İmtahan sessiyası etibarsızdır." }, { status: 401 });
    }

    const attempt = await getAttemptById(attemptId);
    if (!attempt || attempt.examId !== examId) {
      return noStoreJson({ ok: false, error: "Attempt tapılmadı" }, { status: 404 });
    }

    const result = await getAttemptResult(attemptId);
    if (!result) {
      return noStoreJson({ ok: false, error: "Nəticə tapılmadı" }, { status: 404 });
    }

    return noStoreJson({ ok: true, result: { attempt, summary: result.summary, blocks: result.blocks, details: result.details } });
  } catch (e: any) {
    return noStoreJson({ ok: false, error: e?.message ?? "Server xətası" }, { status: 500 });
  }
}
