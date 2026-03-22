import type { Question, SectionKey } from "@/lib/store";
import { getCategorySections, isCategoryKey, sectionLabel, SECTION_ORDER } from "@/lib/examStructure";

export const OPTION_LETTERS = ["A", "B", "C", "D", "E"] as const;
export const VERBAL_BLOCK_KEY = "VERBAL_BLOCK";

export type DetailItem = {
  questionId: string;
  orderIndex: number;
  section: string;
  sectionTitle: string;
  questionText: string;
  selectedOption: string | null;
  selectedText: string | null;
  correctOption: string;
  correctText: string;
  isCorrect: boolean;
  earnedPoints: number;
  possiblePoints: number;
};

export type SubmittedAnswer = { selectedIndex: number | null; orderIndex: number };

export type ResultBlock = {
  blockId: string;
  title: string;
  total: number;
  correct: number;
  totalPoints: number;
  earnedPoints: number;
  percent: number;
};

export function normalizeScore(q: Question) {
  return Number.isFinite(q.score) && q.score > 0 ? q.score : 1;
}

export function getOrderedQuestions(questions: Question[]) {
  return [...questions].sort((a, b) => {
    const sectionCmp = SECTION_ORDER.indexOf(a.section) - SECTION_ORDER.indexOf(b.section);
    if (sectionCmp !== 0) return sectionCmp;
    return a.id.localeCompare(b.id);
  });
}

export function getResultBlockKey(section: string) {
  return section.startsWith("VERBAL_") ? VERBAL_BLOCK_KEY : section;
}

export function getResultBlockTitle(blockKey: string) {
  if (blockKey === VERBAL_BLOCK_KEY) return "Verbal blok (5 mətn, 25 sual)";
  return sectionLabel(blockKey as SectionKey);
}

export function getCanonicalBlockOrder(category: string, fallbackSections: string[]) {
  const sections = isCategoryKey(category)
    ? getCategorySections(category).filter((section) => fallbackSections.includes(section))
    : fallbackSections;

  const seen = new Set<string>();
  const result: string[] = [];
  for (const section of sections) {
    const blockKey = getResultBlockKey(section);
    if (!seen.has(blockKey)) {
      seen.add(blockKey);
      result.push(blockKey);
    }
  }
  return result;
}

export function gradeSection(params: {
  questions: Question[];
  section: string;
  submittedAnswers: Map<string, SubmittedAnswer>;
  submittedTitle?: string;
  startOrderIndex?: number;
}) {
  const blockQuestions = params.questions.filter((question) => question.section === params.section);
  const sectionTitle = params.submittedTitle || sectionLabel(params.section as SectionKey);
  let total = 0;
  let correct = 0;
  let totalPoints = 0;
  let earnedPoints = 0;
  let orderIndex = params.startOrderIndex ?? 0;
  const details: DetailItem[] = [];

  for (const q of blockQuestions) {
    total += 1;
    orderIndex += 1;
    const possiblePoints = normalizeScore(q);
    totalPoints += possiblePoints;
    const submitted = params.submittedAnswers.get(q.id);
    const selectedIndex = typeof submitted?.selectedIndex === "number" ? submitted.selectedIndex : null;
    const isCorrect = selectedIndex === q.correctIndex;
    const earned = isCorrect ? possiblePoints : 0;
    if (isCorrect) {
      correct += 1;
      earnedPoints += earned;
    }
    details.push({
      questionId: q.id,
      orderIndex,
      section: q.section,
      sectionTitle,
      questionText: q.text,
      selectedOption: selectedIndex == null ? null : OPTION_LETTERS[selectedIndex],
      selectedText: selectedIndex == null ? null : q.options[selectedIndex] ?? null,
      correctOption: OPTION_LETTERS[q.correctIndex] ?? "A",
      correctText: q.options[q.correctIndex] ?? "",
      isCorrect,
      earnedPoints: earned,
      possiblePoints,
    });
  }

  return {
    blockId: params.section,
    title: sectionTitle,
    total,
    correct,
    totalPoints,
    earnedPoints,
    percent: totalPoints === 0 ? 0 : Math.round((earnedPoints / totalPoints) * 100),
    details,
    endOrderIndex: orderIndex,
  };
}
