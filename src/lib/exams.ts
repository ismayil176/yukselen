import "server-only";
import { randomUUID } from "crypto";
import { readDb, writeDb, type CategoryKey, type Exam } from "@/lib/store";
import { getDefaultExamInstructions } from "@/lib/examStructure";

export type { CategoryKey, Exam };

export async function listExams(category?: CategoryKey): Promise<Exam[]> {
  const db = await readDb();
  const items = category ? db.exams.filter((e) => e.category === category) : db.exams;
  return items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getExam(examId: string): Promise<Exam | null> {
  const db = await readDb();
  return db.exams.find((e) => e.id === examId) ?? null;
}

export async function createExam({ category, title }: { category: CategoryKey; title: string }): Promise<Exam> {
  const now = new Date().toISOString();
  const instructions = getDefaultExamInstructions(category);

  const db = await readDb();
  const exam: Exam = {
    id: randomUUID(),
    category,
    title,
    passScore: 60,
    instructions,
    createdAt: now,
    updatedAt: now,
  };
  db.exams.push(exam);
  await writeDb(db);
  return exam;
}

export async function updateExamInstructions(examId: string, instructions: string): Promise<Exam | null> {
  const db = await readDb();
  const idx = db.exams.findIndex((e) => e.id === examId);
  if (idx === -1) return null;
  db.exams[idx] = { ...db.exams[idx], instructions, updatedAt: new Date().toISOString() };
  await writeDb(db);
  return db.exams[idx];
}

export async function updateExamTitle(examId: string, title: string): Promise<Exam | null> {
  const t = title.trim();
  if (!t) return null;
  const db = await readDb();
  const idx = db.exams.findIndex((e) => e.id === examId);
  if (idx === -1) return null;
  db.exams[idx] = { ...db.exams[idx], title: t, updatedAt: new Date().toISOString() };
  await writeDb(db);
  return db.exams[idx];
}

export async function deleteExam(examId: string): Promise<boolean> {
  const db = await readDb();
  const before = db.exams.length;
  db.exams = db.exams.filter((e) => e.id !== examId);
  if (db.exams.length === before) return false;

  db.questions = db.questions.filter((q) => q.examId !== examId);
  db.verbalPassages = db.verbalPassages.filter((p) => p.examId !== examId);

  await writeDb(db);
  return true;
}
