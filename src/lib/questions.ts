import "server-only";
import { randomUUID } from "crypto";
import { readDb, writeDb, type Question, type SectionKey, type VerbalPassage } from "@/lib/store";

function mapQuestionRow(row: any): Question {
  const imageKey = (row.imageKey ?? row.image_key ?? null) as string | null;
  const computedUrl = imageKey ? `/api/images/${encodeURIComponent(imageKey)}` : null;
  const legacyImage = (row.image ?? row.image_url ?? row.imageUrl ?? null) as string | null;
  // If imageKey exists, always prefer our proxied URL (works for PRIVATE blob stores).
  // Otherwise fall back to whatever was stored previously.
  const finalUrl = (computedUrl ?? row.imageUrl ?? row.image_url ?? row.image ?? legacyImage ?? null) as string | null;
  return {
    id: String(row.id),
    examId: String(row.exam_id ?? row.examId),
    section: row.section as SectionKey,
    text: String(row.text ?? ""),
    score: Number(row.score ?? 1),
    options: (Array.isArray(row.options) ? row.options : (row.options ?? [])) as any,
    correctIndex: Number(row.correct_index ?? row.correctIndex ?? 0),
    imageKey,
    // Compatibility: some UIs use `image`, some use `imageUrl`.
    image: finalUrl,
    imageUrl: finalUrl,
  };
}

function mapPassageRow(row: any): VerbalPassage {
  return {
    id: String(row.id),
    examId: String(row.exam_id ?? row.examId),
    section: row.section as any,
    text: String(row.text ?? ""),
  };
}

export async function listQuestions(examId: string, section?: SectionKey): Promise<Question[]> {
  const db = await readDb();
  const qs = db.questions.filter((q) => q.examId === examId && (!section || q.section === section));
  // normalize imageUrl for new imageKey-based storage
  return qs.map((q) => {
    const imageKey = (q as any).imageKey ?? null;
    const computedUrl = imageKey ? `/api/images/${encodeURIComponent(imageKey)}` : null;
    const legacyImage = (q as any).image ?? (q as any).imageUrl ?? null;
    const finalUrl = computedUrl ?? (q as any).imageUrl ?? (q as any).image ?? legacyImage ?? null;
    return {
      ...q,
      imageKey,
      // Keep both fields consistent so all pages render images.
      image: finalUrl,
      imageUrl: finalUrl,
    };
  });
}

export async function createQuestion(input: Omit<Question, "id">): Promise<Question> {
  const db = await readDb();
  const q: Question = {
    ...input,
    id: randomUUID(),
    imageKey: input.imageKey ?? null,
    image: input.image ?? input.imageUrl ?? null,
    imageUrl:
      input.imageUrl ?? (input.imageKey ? `/api/images/${encodeURIComponent(input.imageKey)}` : null) ?? input.image ?? null,
  };
  db.questions.push(q);
  await writeDb(db);
  return q;
}

export async function updateQuestion(id: string, patch: Partial<Omit<Question, "id" | "examId">>): Promise<Question | null> {
  const db = await readDb();
  const idx = db.questions.findIndex((q) => q.id === id);
  if (idx === -1) return null;

  const nextImageKey = (patch as any).imageKey !== undefined ? (patch as any).imageKey : (db.questions[idx] as any).imageKey;
  const computedUrl = nextImageKey ? `/api/images/${encodeURIComponent(nextImageKey)}` : null;

  db.questions[idx] = {
    ...db.questions[idx],
    ...patch,
    imageKey: nextImageKey ?? null,
    image: (patch as any).image ?? (patch as any).imageUrl ?? db.questions[idx].image ?? null,
    // If imageKey exists, force proxied URL; otherwise fall back to any provided url.
    imageUrl: computedUrl ?? (patch as any).imageUrl ?? (patch as any).image ?? db.questions[idx].imageUrl ?? null,
  };
  await writeDb(db);
  return db.questions[idx];
}

export async function deleteQuestion(id: string): Promise<boolean> {
  const db = await readDb();
  const before = db.questions.length;
  db.questions = db.questions.filter((q) => q.id !== id);
  await writeDb(db);
  return db.questions.length !== before;
}

export async function getVerbalPassage(examId: string, section: VerbalPassage["section"]): Promise<VerbalPassage | null> {
  const db = await readDb();
  return db.verbalPassages.find((p) => p.examId === examId && p.section === section) ?? null;
}

export async function upsertVerbalPassage(examId: string, section: VerbalPassage["section"], text: string): Promise<VerbalPassage> {
  const db = await readDb();
  const idx = db.verbalPassages.findIndex((p) => p.examId === examId && p.section === section);
  if (idx === -1) {
    const p: VerbalPassage = { id: randomUUID(), examId, section, text };
    db.verbalPassages.push(p);
    await writeDb(db);
    return p;
  }
  db.verbalPassages[idx] = { ...db.verbalPassages[idx], text };
  await writeDb(db);
  return db.verbalPassages[idx];
}
