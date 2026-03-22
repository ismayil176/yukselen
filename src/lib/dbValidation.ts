import "server-only";

import type { CategoryKey, Db, Exam, Question, SectionKey, VerbalPassage } from "@/lib/store";
import { getDefaultExamInstructions, isCategoryKey, isSectionKey } from "@/lib/examStructure";

const SAFE_IMAGE_DATA_RE = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[a-zA-Z0-9+/=\s]+$/;
const SAFE_INTERNAL_IMAGE_RE = /^\/api\/images\/[A-Za-z0-9_.%-]{1,220}$/;

function trimText(value: unknown, maxLen: number) {
  return String(value ?? "").trim().slice(0, maxLen);
}

export function sanitizeQuestionImage(value: unknown): string | null {
  const input = String(value ?? "").trim();
  if (!input) return null;
  if (SAFE_INTERNAL_IMAGE_RE.test(input)) return input;
  if (SAFE_IMAGE_DATA_RE.test(input)) return input.replace(/\s+/g, "");
  return null;
}

function sanitizeOptions(value: unknown): [string, string, string, string, string] | null {
  if (!Array.isArray(value) || value.length !== 5) return null;
  const normalized = value.map((item) => trimText(item, 1000));
  if (normalized.some((item) => !item)) return null;
  return [normalized[0], normalized[1], normalized[2], normalized[3], normalized[4]];
}

export function sanitizeExamInput(item: unknown): Exam | null {
  const exam = item as Partial<Exam> | null;
  const id = trimText(exam?.id, 120);
  const category = trimText(exam?.category, 40);
  const title = trimText(exam?.title, 200);
  if (!id || !title || !isCategoryKey(category)) return null;
  const instructions = trimText(exam?.instructions, 10000) || getDefaultExamInstructions(category as CategoryKey);
  const passScoreRaw = Number(exam?.passScore ?? 60);
  const passScore = Number.isFinite(passScoreRaw) ? Math.max(0, Math.min(1000, passScoreRaw)) : 60;
  const now = new Date().toISOString();
  return {
    id,
    category: category as CategoryKey,
    title,
    instructions,
    passScore,
    createdAt: trimText(exam?.createdAt, 80) || now,
    updatedAt: trimText(exam?.updatedAt, 80) || now,
  };
}

export function sanitizeQuestionInput(item: unknown): Question | null {
  const question = item as Partial<Question> | null;
  const id = trimText(question?.id, 120);
  const examId = trimText(question?.examId, 120);
  const section = trimText(question?.section, 40);
  const text = trimText(question?.text, 10000);
  const options = sanitizeOptions(question?.options);
  const correctIndex = Number(question?.correctIndex);
  const scoreRaw = Number(question?.score ?? 1);
  const imageKey = trimText(question?.imageKey, 220) || null;
  const sanitizedLegacyImage = sanitizeQuestionImage(question?.imageUrl ?? question?.image ?? null);

  if (!id || !examId || !text || !options || !isSectionKey(section)) return null;
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 4) return null;
  const score = Number.isFinite(scoreRaw) && scoreRaw > 0 ? Math.min(scoreRaw, 1000) : 1;

  return {
    id,
    examId,
    section: section as SectionKey,
    text,
    score,
    imageKey,
    image: imageKey ? null : sanitizedLegacyImage,
    imageUrl: imageKey ? `/api/images/${encodeURIComponent(imageKey)}` : sanitizedLegacyImage,
    options,
    correctIndex,
  };
}

export function sanitizePassageInput(item: unknown): VerbalPassage | null {
  const passage = item as Partial<VerbalPassage> | null;
  const id = trimText(passage?.id, 120);
  const examId = trimText(passage?.examId, 120);
  const section = trimText(passage?.section, 40);
  const text = trimText(passage?.text, 50000);
  if (!id || !examId || !text) return null;
  if (!["VERBAL_1", "VERBAL_2", "VERBAL_3", "VERBAL_4", "VERBAL_5"].includes(section)) return null;
  return { id, examId, section: section as VerbalPassage["section"], text };
}

export function sanitizeDbPayload(input: unknown): Db {
  const raw = (input && typeof input === "object" ? input : {}) as Partial<Db>;
  const exams = Array.isArray(raw.exams) ? raw.exams.map(sanitizeExamInput).filter(Boolean) as Exam[] : [];
  const validExamIds = new Set(exams.map((exam) => exam.id));

  const questions = Array.isArray(raw.questions)
    ? raw.questions
        .map(sanitizeQuestionInput)
        .filter((q): q is Question => Boolean(q) && validExamIds.has(q!.examId))
    : [];

  const verbalPassages = Array.isArray(raw.verbalPassages)
    ? raw.verbalPassages
        .map(sanitizePassageInput)
        .filter((p): p is VerbalPassage => Boolean(p) && validExamIds.has(p!.examId))
    : [];

  return { exams, questions, verbalPassages };
}
