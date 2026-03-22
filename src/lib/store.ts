import "server-only";

import { getJSON, setJSON } from "@/lib/railwayDb";
import fs from "node:fs/promises";
import path from "node:path";

export type CategoryKey = "general" | "analytic" | "detail";

export type Exam = {
  id: string;
  category: CategoryKey;
  title: string;
  instructions: string;
  passScore: number;
  createdAt: string;
  updatedAt: string;
};

export type SectionKey =
  | "BLOK_1"
  | "BLOK_2"
  | "BLOK_3"
  | "BLOK_4"
  | "VERBAL_1"
  | "VERBAL_2"
  | "VERBAL_3"
  | "VERBAL_4"
  | "VERBAL_5"
  | "ABSTRACT"
  | "NUMERIC";

export type Question = {
  id: string;
  examId: string;
  section: SectionKey;
  text: string;
  score: number;
  imageKey?: string | null;
  image?: string | null;
  imageUrl?: string | null;
  options: [string, string, string, string, string];
  correctIndex: number;
};

export type VerbalPassage = {
  id: string;
  examId: string;
  section: "VERBAL_1" | "VERBAL_2" | "VERBAL_3" | "VERBAL_4" | "VERBAL_5";
  text: string;
};

export type Db = {
  exams: Exam[];
  questions: Question[];
  verbalPassages: VerbalPassage[];
};

const BLOBS_KEY = "db.json";
const DB_CACHE_TTL_MS = 1500;

let bundledDbCache: Db | null = null;
let memoryDbCache: { value: Db; expiresAt: number } | null = null;

function cloneDb<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function migrateDb(parsed: Partial<Db>): Db {
  const exams = (parsed.exams ?? []) as Exam[];
  const questions = ((parsed.questions ?? []) as any[]).map((q) => {
    const score = Number(q.score);
    const imageKey = (q.imageKey ?? q.image_key ?? null) as string | null;
    const legacyImage = q.image ?? q.imageUrl ?? q.image_url ?? null;
    const computedUrl = imageKey ? `/api/images/${encodeURIComponent(imageKey)}` : null;
    return {
      ...q,
      score: Number.isFinite(score) && score > 0 ? score : 1,
      imageKey,
      image: legacyImage,
      imageUrl: computedUrl ?? q.imageUrl ?? q.image_url ?? legacyImage ?? null,
    } as Question;
  });
  const verbalPassages = (parsed.verbalPassages ?? []) as VerbalPassage[];
  return { exams, questions, verbalPassages };
}

async function readBundledDb(): Promise<Db> {
  if (bundledDbCache) return cloneDb(bundledDbCache);
  try {
    const p = path.join(process.cwd(), "data", "db.json");
    const txt = await fs.readFile(p, "utf8");
    const parsed = JSON.parse(txt) as Partial<Db>;
    bundledDbCache = migrateDb(parsed);
    return cloneDb(bundledDbCache);
  } catch {
    bundledDbCache = migrateDb({ exams: [], questions: [], verbalPassages: [] });
    return cloneDb(bundledDbCache);
  }
}

export async function readDb(): Promise<Db> {
  if (memoryDbCache && memoryDbCache.expiresAt > Date.now()) {
    return cloneDb(memoryDbCache.value);
  }

  const bundledFallback = await readBundledDb();
  const parsed = await getJSON<Partial<Db>>(BLOBS_KEY, bundledFallback);
  const db = migrateDb(parsed);
  memoryDbCache = { value: cloneDb(db), expiresAt: Date.now() + DB_CACHE_TTL_MS };
  return cloneDb(db);
}

export async function writeDb(db: Db) {
  const normalized = migrateDb(db);
  memoryDbCache = { value: cloneDb(normalized), expiresAt: Date.now() + DB_CACHE_TTL_MS };
  await setJSON(BLOBS_KEY, normalized);
}
