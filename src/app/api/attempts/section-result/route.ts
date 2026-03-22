import { z } from "zod";
import { getExamSession } from "@/lib/examSession";
import { getAttemptById } from "@/lib/attempts";
import { assertSameOrigin, noStoreJson } from "@/lib/apiSecurity";
import { readDb, type SectionKey } from "@/lib/store";
import { isCategoryKey, isSectionAllowedForCategory } from "@/lib/examStructure";
import { getOrderedQuestions, gradeSection } from "@/lib/resultGrading";

export const runtime = "nodejs";

const AnswerSchema = z.object({
  questionId: z.string().min(1),
  selectedIndex: z.number().int().min(0).max(4).nullable(),
  orderIndex: z.number().int().min(1),
});
const SectionSchema = z.object({ section: z.string().min(1), title: z.string().min(1), answers: z.array(AnswerSchema) });
const RequestSchema = z.object({ attemptId: z.string().min(1), examId: z.string().min(1), section: SectionSchema });

export async function POST(req: Request) {
  const originCheck = assertSameOrigin(req);
  if (!originCheck.ok) return originCheck.response;
  try {
    const body = await req.json().catch(() => null);
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) return noStoreJson({ ok: false, error: "Bad request" }, { status: 400 });

    const { attemptId, examId, section } = parsed.data;
    const session = getExamSession();
    if (!session || session.examId !== examId || session.attemptId !== attemptId) {
      return noStoreJson({ ok: false, error: "İmtahan sessiyası etibarsızdır." }, { status: 401 });
    }

    const attempt = await getAttemptById(attemptId);
    if (!attempt || attempt.examId !== examId) {
      return noStoreJson({ ok: false, error: "Attempt tapılmadı" }, { status: 404 });
    }

    if (!isCategoryKey(attempt.category) || !isSectionAllowedForCategory(attempt.category, section.section as SectionKey)) {
      return noStoreJson({ ok: false, error: "Bu bölmə seçilmiş imtahana aid deyil." }, { status: 400 });
    }

    const db = await readDb();
    const examQuestions = getOrderedQuestions(db.questions.filter((q) => q.examId === examId));
    const sectionQuestions = examQuestions.filter((q) => q.section === section.section);
    if (!sectionQuestions.length) {
      return noStoreJson({ ok: false, error: "Bu bölmə üçün sual tapılmadı." }, { status: 404 });
    }

    const submittedAnswers = new Map(
      section.answers.map((answer) => [
        answer.questionId,
        { selectedIndex: typeof answer.selectedIndex === "number" ? answer.selectedIndex : null, orderIndex: answer.orderIndex },
      ])
    );

    const graded = gradeSection({
      questions: examQuestions,
      section: section.section,
      submittedAnswers,
      submittedTitle: section.title,
      startOrderIndex: 0,
    });

    return noStoreJson({
      ok: true,
      sectionResult: {
        section: graded.blockId,
        title: graded.title,
        total: graded.total,
        correct: graded.correct,
        totalPoints: graded.totalPoints,
        earnedPoints: graded.earnedPoints,
        percent: graded.percent,
      },
    });
  } catch (e: any) {
    return noStoreJson({ ok: false, error: e?.message ?? "Server xətası" }, { status: 500 });
  }
}
