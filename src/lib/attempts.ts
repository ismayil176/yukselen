import "server-only";

import crypto from "node:crypto";
import { getJSON, setJSON } from "@/lib/railwayDb";

export type StudentInfo = {
  firstName: string;
  lastName: string;
  fatherName: string;
  phone: string;
};

export type AttemptStatus = "IN_PROGRESS" | "FINISHED";

export type Attempt = {
  id: string;
  examId: string;
  category: string;
  student: StudentInfo;
  status: AttemptStatus;
  score: number;
  startedAt: string;
  finishedAt?: string;
  seen?: boolean;
  seenAt?: string;
  meta?: {
    totalQuestions?: number;
    correctCount?: number;
    wrongCount?: number;
    unansweredCount?: number;
  };
};

type AttemptsDb = { attempts: Attempt[] };
const ATTEMPTS_KEY = "attempts.json";

async function safeRead(): Promise<AttemptsDb> {
  return await getJSON<AttemptsDb>(ATTEMPTS_KEY, { attempts: [] });
}

async function safeWrite(next: AttemptsDb): Promise<void> {
  await setJSON(ATTEMPTS_KEY, next);
}

export async function createAttempt(input: { examId: string; category: string; student: StudentInfo }) {
  const db = await safeRead();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const attempt: Attempt = {
    id,
    examId: input.examId,
    category: input.category,
    student: input.student,
    status: "IN_PROGRESS",
    score: 0,
    startedAt: now,
    seen: false,
  };
  db.attempts.unshift(attempt);
  await safeWrite(db);
  return attempt;
}

export async function getAttemptById(id: string) {
  const db = await safeRead();
  return db.attempts.find((a) => a.id === id) ?? null;
}

export async function finishAttempt(input: { id: string; score: number; totalQuestions?: number; correctCount?: number; wrongCount?: number; unansweredCount?: number }) {
  const db = await safeRead();
  const idx = db.attempts.findIndex((a) => a.id === input.id);
  if (idx === -1) return null;
  const current = db.attempts[idx];
  const updated: Attempt = {
    ...current,
    status: "FINISHED",
    score: Number.isFinite(input.score) ? input.score : current.score,
    finishedAt: new Date().toISOString(),
    meta: {
      ...(current.meta ?? {}),
      totalQuestions: input.totalQuestions ?? current.meta?.totalQuestions,
      correctCount: input.correctCount ?? current.meta?.correctCount,
      wrongCount: input.wrongCount ?? current.meta?.wrongCount,
      unansweredCount: input.unansweredCount ?? current.meta?.unansweredCount,
    },
  };
  db.attempts[idx] = updated;
  await safeWrite(db);
  return updated;
}

export async function listAttempts(take: number) {
  const n = Math.max(1, Math.min(1000, take));
  const db = await safeRead();
  return db.attempts.slice(0, n);
}

export async function setAttemptSeen(input: { id: string; seen: boolean }) {
  const db = await safeRead();
  const idx = db.attempts.findIndex((a) => a.id === input.id);
  if (idx === -1) return null;

  const current = db.attempts[idx];
  const updated: Attempt = {
    ...current,
    seen: input.seen,
    seenAt: input.seen ? new Date().toISOString() : undefined,
  };

  db.attempts[idx] = updated;
  await safeWrite(db);
  return updated;
}

export async function deleteAttempts(ids: string[]) {
  const uniqueIds = Array.from(new Set(ids.map((id) => String(id).trim()).filter(Boolean)));
  if (uniqueIds.length === 0) return { deletedCount: 0 };

  const db = await safeRead();
  const idSet = new Set(uniqueIds);
  const before = db.attempts.length;
  db.attempts = db.attempts.filter((attempt) => !idSet.has(attempt.id));
  const deletedCount = before - db.attempts.length;

  if (deletedCount > 0) {
    await safeWrite(db);
  }

  return { deletedCount };
}
