import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

let _lastWorkingUrl: string | null = null;
const _pools = new Map<string, Pool>();
const _schemaReady = new Set<string>();

const LOCAL_DATA_DIR = path.join(process.cwd(), "data");
const LOCAL_KV_FILE = path.join(LOCAL_DATA_DIR, "kv-fallback.json");
const LOCAL_IMAGES_DIR = path.join(LOCAL_DATA_DIR, "images");
const LOCAL_IMAGES_META_FILE = path.join(LOCAL_IMAGES_DIR, "_meta.json");
const KV_CACHE_TTL_MS = 1500;

type JsonCacheEntry = { value: unknown; expiresAt: number };

const jsonCache = new Map<string, JsonCacheEntry>();
let localKvCache: Record<string, unknown> | null = null;
let localImagesMetaCache: Record<string, { contentType: string; createdAt: string }> | null = null;

function normalizeUrl(input: string | undefined | null): string | null {
  const value = String(input ?? "").trim();
  return value ? value : null;
}

function listDatabaseUrls(): string[] {
  const values = [normalizeUrl(process.env.DATABASE_URL), normalizeUrl(process.env.DATABASE_PUBLIC_URL)].filter(Boolean) as string[];
  const unique: string[] = [];
  for (const value of values) {
    if (!unique.includes(value)) unique.push(value);
  }
  if (_lastWorkingUrl && unique.includes(_lastWorkingUrl)) {
    return [_lastWorkingUrl, ...unique.filter((value) => value !== _lastWorkingUrl)];
  }
  return unique;
}

function shouldUseSsl(connectionString: string): boolean {
  return /railway|rlwy|sslmode=require/i.test(connectionString);
}

function getPoolFor(connectionString: string): Pool {
  const existing = _pools.get(connectionString);
  if (existing) return existing;

  const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
  });

  _pools.set(connectionString, pool);
  return pool;
}

async function ensureLocalStorage(): Promise<void> {
  await fs.mkdir(LOCAL_DATA_DIR, { recursive: true });
  await fs.mkdir(LOCAL_IMAGES_DIR, { recursive: true });
}

function getCachedJson<T>(key: string): T | null {
  const entry = jsonCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    jsonCache.delete(key);
    return null;
  }
  return entry.value as T;
}

function setCachedJson<T>(key: string, value: T): void {
  jsonCache.set(key, { value, expiresAt: Date.now() + KV_CACHE_TTL_MS });
}

function clearCachedJson(key: string): void {
  jsonCache.delete(key);
}

async function readLocalKv(): Promise<Record<string, unknown>> {
  if (localKvCache) return localKvCache;
  try {
    const txt = await fs.readFile(LOCAL_KV_FILE, "utf8");
    const parsed = JSON.parse(txt);
    localKvCache = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    return localKvCache;
  } catch {
    localKvCache = {};
    return localKvCache;
  }
}

async function writeLocalKv(next: Record<string, unknown>): Promise<void> {
  await ensureLocalStorage();
  localKvCache = next;
  await fs.writeFile(LOCAL_KV_FILE, JSON.stringify(next, null, 2), "utf8");
}

async function readLocalImagesMeta(): Promise<Record<string, { contentType: string; createdAt: string }>> {
  if (localImagesMetaCache) return localImagesMetaCache;
  try {
    const txt = await fs.readFile(LOCAL_IMAGES_META_FILE, "utf8");
    const parsed = JSON.parse(txt);
    localImagesMetaCache = parsed && typeof parsed === "object"
      ? (parsed as Record<string, { contentType: string; createdAt: string }>)
      : {};
    return localImagesMetaCache;
  } catch {
    localImagesMetaCache = {};
    return localImagesMetaCache;
  }
}

async function writeLocalImagesMeta(next: Record<string, { contentType: string; createdAt: string }>): Promise<void> {
  await ensureLocalStorage();
  localImagesMetaCache = next;
  await fs.writeFile(LOCAL_IMAGES_META_FILE, JSON.stringify(next, null, 2), "utf8");
}

function isRetryableDbError(error: unknown): boolean {
  const code = typeof error === "object" && error && "code" in error ? String((error as any).code || "") : "";
  return ["ENOTFOUND", "ECONNREFUSED", "ETIMEDOUT", "ECONNRESET", "EAI_AGAIN", "57P01"].includes(code);
}

async function ensureSchema(connectionString: string, pool: Pool): Promise<void> {
  if (_schemaReady.has(connectionString)) return;

  await pool.query(`
    create table if not exists public.app_kv (
      key text primary key,
      value jsonb not null,
      updated_at timestamptz not null default now()
    )
  `);

  await pool.query(`
    create table if not exists public.images (
      image_key text primary key,
      content_type text not null,
      bytes bytea not null,
      created_at timestamptz not null default now()
    )
  `);

  _schemaReady.add(connectionString);
}

async function withDatabase<T>(action: (pool: Pool, connectionString: string) => Promise<T>): Promise<{ ok: true; value: T } | { ok: false; error: unknown }> {
  const urls = listDatabaseUrls();
  if (urls.length === 0) {
    return { ok: false, error: new Error("Database not configured") };
  }

  let lastError: unknown = null;

  for (const connectionString of urls) {
    try {
      const pool = getPoolFor(connectionString);
      await ensureSchema(connectionString, pool);
      const value = await action(pool, connectionString);
      _lastWorkingUrl = connectionString;
      return { ok: true, value };
    } catch (error) {
      lastError = error;
      const code = typeof error === "object" && error && "code" in error ? String((error as any).code || "") : "";
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[railwayDb] connection failed for ${connectionString}: ${code || message}`);
      if (!isRetryableDbError(error)) break;
    }
  }

  return { ok: false, error: lastError };
}

export function hasDatabase(): boolean {
  return listDatabaseUrls().length > 0;
}

export async function getJSON<T>(key: string, fallback: T): Promise<T> {
  const cached = getCachedJson<T>(key);
  if (cached !== null) return cached;

  const db = await withDatabase(async (pool) => {
    const res = await pool.query<{ value: T }>("select value from public.app_kv where key = $1", [key]);
    if (res.rowCount && res.rows[0]?.value !== undefined && res.rows[0]?.value !== null) {
      return res.rows[0].value;
    }
    return fallback;
  });

  if (db.ok) {
    setCachedJson(key, db.value);
    return db.value;
  }

  const local = await readLocalKv();
  const value = local[key] !== undefined && local[key] !== null ? (local[key] as T) : fallback;
  setCachedJson(key, value);
  return value;
}

export async function setJSON<T>(key: string, value: T): Promise<void> {
  const db = await withDatabase(async (pool) => {
    await pool.query(
      `insert into public.app_kv (key, value, updated_at)
       values ($1, $2::jsonb, now())
       on conflict (key)
       do update set value = excluded.value, updated_at = now()`,
      [key, JSON.stringify(value)]
    );
  });

  setCachedJson(key, value);

  if (db.ok) return;

  const local = await readLocalKv();
  local[key] = value as unknown;
  await writeLocalKv(local);
}

export async function delKey(key: string): Promise<void> {
  const db = await withDatabase(async (pool) => {
    await pool.query("delete from public.app_kv where key = $1", [key]);
  });

  clearCachedJson(key);

  if (db.ok) return;

  const local = await readLocalKv();
  delete local[key];
  await writeLocalKv(local);
}

export type DbImageRow = {
  image_key: string;
  content_type: string;
  bytes: Buffer;
  created_at: string;
};

export async function putImage(opts: { imageKey: string; contentType: string; bytes: Buffer }): Promise<void> {
  const db = await withDatabase(async (pool) => {
    await pool.query(
      `insert into public.images (image_key, content_type, bytes, created_at)
       values ($1, $2, $3, now())
       on conflict (image_key)
       do update set content_type = excluded.content_type, bytes = excluded.bytes`,
      [opts.imageKey, opts.contentType, opts.bytes]
    );
  });

  if (db.ok) return;

  await ensureLocalStorage();
  await fs.writeFile(path.join(LOCAL_IMAGES_DIR, opts.imageKey), opts.bytes);
  const meta = await readLocalImagesMeta();
  meta[opts.imageKey] = { contentType: opts.contentType, createdAt: new Date().toISOString() };
  await writeLocalImagesMeta(meta);
}

export async function getImage(imageKey: string): Promise<DbImageRow | null> {
  const db = await withDatabase(async (pool) => {
    const res = await pool.query<DbImageRow>(
      "select image_key, content_type, bytes, created_at from public.images where image_key = $1",
      [imageKey]
    );
    return res.rowCount ? (res.rows[0] as DbImageRow) : null;
  });

  if (db.ok) return db.value;

  try {
    const bytes = await fs.readFile(path.join(LOCAL_IMAGES_DIR, imageKey));
    const meta = await readLocalImagesMeta();
    return {
      image_key: imageKey,
      content_type: meta[imageKey]?.contentType || "application/octet-stream",
      bytes,
      created_at: meta[imageKey]?.createdAt || new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

export async function deleteImageRow(imageKey: string): Promise<void> {
  const db = await withDatabase(async (pool) => {
    await pool.query("delete from public.images where image_key = $1", [imageKey]);
  });

  if (db.ok) return;

  try {
    await fs.unlink(path.join(LOCAL_IMAGES_DIR, imageKey));
  } catch {}
  const meta = await readLocalImagesMeta();
  delete meta[imageKey];
  await writeLocalImagesMeta(meta);
}
