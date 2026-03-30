import { z } from "zod";
import { getExamSession } from "@/lib/examSession";
import { getAttemptById, getAttemptResult, finishAttempt, saveAttemptResult } from "@/lib/attempts";
import { assertSameOrigin, noStoreJson } from "@/lib/apiSecurity";
import { readDb, type SectionKey } from "@/lib/store";
import { isCategoryKey, isSectionAllowedForCategory } from "@/lib/examStructure";
import { getCanonicalBlockOrder, getOrderedQuestions, getResultBlockKey, getResultBlockTitle, gradeSection, type ResultBlock } from "@/lib/resultGrading";
import { getCurrentAzDateTimeStorage } from "@/lib/time";

export const runtime = "nodejs";

const AnswerSchema = z.object({
  questionId: z.string().min(1),
  selectedIndex: z.number().int().min(0).max(4).nullable(),
  orderIndex: z.number().int().min(1),
});
const SectionSchema = z.object({ section: z.string().min(1), title: z.string().min(1), answers: z.array(AnswerSchema) });
const FinishSchema = z.object({ attemptId: z.string().min(1), examId: z.string().min(1), sections: z.array(SectionSchema).min(1) });

type SubmittedAnswer = { selectedIndex: number | null; orderIndex: number };

function validateSubmittedSections(category: string, sections: Array<z.infer<typeof SectionSchema>>) {
  if (!isCategoryKey(category)) return "Kateqoriya yanlışdır.";

  const seenSections = new Set<string>();
  const seenQuestionIds = new Set<string>();

  for (const section of sections) {
    if (seenSections.has(section.section)) return "Eyni bölmə birdən çox dəfə göndərilib.";
    seenSections.add(section.section);

    if (!isSectionAllowedForCategory(category, section.section as SectionKey)) {
      return "Göndərilən bölmələr imtahan kateqoriyasına uyğun deyil.";
    }

    for (const answer of section.answers) {
      if (seenQuestionIds.has(answer.questionId)) return "Eyni sual birdən çox dəfə göndərilib.";
      seenQuestionIds.add(answer.questionId);
    }
  }

  return null;
}

export async function POST(req: Request) {
  const originCheck = assertSameOrigin(req);
  if (!originCheck.ok) return originCheck.response;
  try {
    const body = await req.json().catch(() => null);
    const parsed = FinishSchema.safeParse(body);
    if (!parsed.success) return noStoreJson({ ok: false, error: "Bad request" }, { status: 400 });
    const { attemptId, examId, sections } = parsed.data;
    const session = getExamSession();
    if (!session || session.examId !== examId || session.attemptId !== attemptId) {
      return noStoreJson({ ok: false, error: "İmtahan sessiyası etibarsızdır. Zəhmət olmasa yenidən başlayın." }, { status: 401 });
    }

    const attempt = await getAttemptById(attemptId);
    if (!attempt || attempt.examId !== examId) return noStoreJson({ ok: false, error: "Attempt tapılmadı" }, { status: 404 });
    if (attempt.status === "FINISHED") {
      const existingResult = await getAttemptResult(attemptId);
      if (existingResult) {
        return noStoreJson({ ok: true, result: { attempt, summary: existingResult.summary, blocks: existingResult.blocks, details: existingResult.details } });
      }
      return noStoreJson({ ok: false, error: "Bu cəhd artıq tamamlanıb." }, { status: 409 });
    }

    const submissionError = validateSubmittedSections(attempt.category, sections);
    if (submissionError) return noStoreJson({ ok: false, error: submissionError }, { status: 400 });

    const db = await readDb();
    const examQuestions = getOrderedQuestions(db.questions.filter((q) => q.examId === examId));
    if (!examQuestions.length) {
      return noStoreJson({ ok: false, error: "Bu imtahan üçün sual tapılmadı." }, { status: 400 });
    }

    const submittedTitles = new Map<string, string>();
    const submittedAnswers = new Map<string, SubmittedAnswer>();
    for (const section of sections) {
      submittedTitles.set(section.section, section.title);
      for (const answer of section.answers) {
        if (!submittedAnswers.has(answer.questionId)) {
          submittedAnswers.set(answer.questionId, {
            selectedIndex: typeof answer.selectedIndex === "number" ? answer.selectedIndex : null,
            orderIndex: answer.orderIndex,
          });
        }
      }
    }

    const fallbackSections = Array.from(new Set(examQuestions.map((q) => q.section)));
    const canonicalBlocks = getCanonicalBlockOrder(attempt.category, fallbackSections);

    const details = [] as ReturnType<typeof gradeSection>["details"];
    let globalOrderIndex = 0;

    const blocks: ResultBlock[] = canonicalBlocks.map((blockKey) => {
      const blockSections = examQuestions
        .filter((question) => getResultBlockKey(question.section) === blockKey)
        .map((question) => question.section)
        .filter((section, index, arr) => arr.indexOf(section) === index);

      if (blockSections.length === 1) {
        const graded = gradeSection({
          questions: examQuestions,
          section: blockSections[0],
          submittedAnswers,
          submittedTitle: submittedTitles.get(blockSections[0]) || getResultBlockTitle(blockKey),
          startOrderIndex: globalOrderIndex,
        });
        globalOrderIndex = graded.endOrderIndex;
        details.push(...graded.details);
        return {
          blockId: blockKey,
          title: getResultBlockTitle(blockKey),
          total: graded.total,
          correct: graded.correct,
          totalPoints: graded.totalPoints,
          earnedPoints: graded.earnedPoints,
          percent: graded.percent,
        };
      }

      let total = 0;
      let correct = 0;
      let totalPoints = 0;
      let earnedPoints = 0;
      for (const section of blockSections) {
        const graded = gradeSection({
          questions: examQuestions,
          section,
          submittedAnswers,
          submittedTitle: submittedTitles.get(section),
          startOrderIndex: globalOrderIndex,
        });
        globalOrderIndex = graded.endOrderIndex;
        details.push(...graded.details);
        total += graded.total;
        correct += graded.correct;
        totalPoints += graded.totalPoints;
        earnedPoints += graded.earnedPoints;
      }

      return {
        blockId: blockKey,
        title: getResultBlockTitle(blockKey),
        total,
        correct,
        totalPoints,
        earnedPoints,
        percent: totalPoints === 0 ? 0 : Math.round((earnedPoints / totalPoints) * 100),
      };
    });

    details.sort((a, b) => a.orderIndex - b.orderIndex || a.questionId.localeCompare(b.questionId));

    const summary = details.reduce(
      (acc, item) => {
        acc.score += item.earnedPoints;
        acc.totalQuestions += 1;
        if (item.isCorrect) acc.correctCount += 1;
        else if (item.selectedOption == null) acc.unansweredCount += 1;
        else acc.wrongCount += 1;
        return acc;
      },
      { score: 0, totalQuestions: 0, correctCount: 0, wrongCount: 0, unansweredCount: 0 }
    );

    const updated = await finishAttempt({
      id: attemptId,
      score: summary.score,
      totalQuestions: summary.totalQuestions,
      correctCount: summary.correctCount,
      wrongCount: summary.wrongCount,
      unansweredCount: summary.unansweredCount,
    });

    await saveAttemptResult({
      attemptId,
      examId,
      category: attempt.category,
      generatedAt: new Date().toISOString(),
      generatedAtAz: getCurrentAzDateTimeStorage(),
      summary,
      blocks,
      details,
    });

    return noStoreJson({ ok: true, result: { attempt: updated ?? attempt, summary, blocks, details } });
  } catch (e: any) {
    return noStoreJson({ ok: false, error: e?.message ?? "Server xətası" }, { status: 500 });
  }
}
