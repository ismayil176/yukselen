import "server-only";

import crypto from "node:crypto";
import { delKey, getJSON, setJSON } from "@/lib/railwayDb";
import type { DetailItem, ResultBlock } from "@/lib/resultGrading";
import { getCurrentAzDateTimeStorage, resolveAzDateTime } from "@/lib/time";

export type StudentInfo = {
  firstName: string;
  lastName: string;
  fatherName: string;
  phone: string;
};

export type AttemptStatus = "IN_PROGRESS" | "FINISHED";

export type AttemptResult = {
  attemptId: string;
  examId: string;
  category: string;
  generatedAt: string;
  generatedAtAz?: string;
  summary: {
    score: number;
    totalQuestions: number;
    correctCount: number;
    wrongCount: number;
    unansweredCount: number;
  };
  blocks: ResultBlock[];
  details: DetailItem[];
};

export type Attempt = {
  id: string;
  examId: string;
  category: string;
  student: StudentInfo;
  status: AttemptStatus;
  score: number;
  startedAt: string;
  startedAtAz?: string;
  finishedAt?: string;
  finishedAtAz?: string;
  seen?: boolean;
  seenAt?: string;
  seenAtAz?: string;
  meta?: {
    totalQuestions?: number;
    correctCount?: number;
    wrongCount?: number;
    unansweredCount?: number;
  };
};

type AttemptsDb = { attempts: Attempt[] };
const ATTEMPTS_KEY = "attempts.json";

function normalizeAttempt(attempt: Attempt): Attempt {
  return {
    ...attempt,
    startedAtAz: resolveAzDateTime(attempt.startedAtAz, attempt.startedAt),
    finishedAtAz: resolveAzDateTime(attempt.finishedAtAz, attempt.finishedAt),
    seenAtAz: resolveAzDateTime(attempt.seenAtAz, attempt.seenAt),
  };
}

function normalizeAttemptResult(result: AttemptResult): AttemptResult {
  return {
    ...result,
    generatedAtAz: resolveAzDateTime(result.generatedAtAz, result.generatedAt),
  };
}

async function safeRead(): Promise<AttemptsDb> {
  const db = await getJSON<AttemptsDb>(ATTEMPTS_KEY, { attempts: [] });
  return { attempts: (db.attempts ?? []).map((attempt) => normalizeAttempt(attempt as Attempt)) };
}

async function safeWrite(next: AttemptsDb): Promise<void> {
  await setJSON(ATTEMPTS_KEY, { attempts: (next.attempts ?? []).map((attempt) => normalizeAttempt(attempt)) });
}

export async function createAttempt(input: { examId: string; category: string; student: StudentInfo }) {
  const db = await safeRead();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const nowAz = getCurrentAzDateTimeStorage();
  const attempt: Attempt = {
    id,
    examId: input.examId,
    category: input.category,
    student: input.student,
    status: "IN_PROGRESS",
    score: 0,
    startedAt: now,
    startedAtAz: nowAz,
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
    finishedAtAz: getCurrentAzDateTimeStorage(),
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
  return db.attempts.slice(0, n).map((attempt) => normalizeAttempt(attempt));
}

export async function listAttemptsByPhone(phone: string) {
  const normalizedPhone = String(phone ?? "").trim();
  if (!normalizedPhone) return [];
  const db = await safeRead();
  return db.attempts
    .filter((attempt) => attempt.student.phone === normalizedPhone && attempt.status === "FINISHED")
    .sort((a, b) => {
      const left = Date.parse(String(a.finishedAt ?? a.startedAt));
      const right = Date.parse(String(b.finishedAt ?? b.startedAt));
      return Number.isFinite(right - left) ? right - left : 0;
    })
    .map((attempt) => normalizeAttempt(attempt));
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
    seenAtAz: input.seen ? getCurrentAzDateTimeStorage() : undefined,
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
    await Promise.all(uniqueIds.map((id) => deleteAttemptResult(id)));
  }

  return { deletedCount };
}

function getAttemptResultKey(attemptId: string) {
  return `attempt-result:${attemptId}.json`;
}

export async function saveAttemptResult(result: AttemptResult) {
  const normalized = normalizeAttemptResult(result);
  await setJSON(getAttemptResultKey(result.attemptId), normalized);
  return normalized;
}

export async function getAttemptResult(attemptId: string) {
  const result = await getJSON<AttemptResult | null>(getAttemptResultKey(attemptId), null);
  return result ? normalizeAttemptResult(result) : null;
}

export async function deleteAttemptResult(attemptId: string) {
  await delKey(getAttemptResultKey(attemptId));
}
