import "server-only";

import { NextResponse } from "next/server";

const WINDOW_MS = 10 * 60 * 1000;
const buckets = new Map<string, { count: number; resetAt: number }>();

function firstNonEmpty(values: Array<string | null | undefined>) {
  for (const value of values) {
    const trimmed = String(value ?? "").trim();
    if (trimmed) return trimmed;
  }
  return "";
}

export function noStoreJson(body: unknown, init?: ResponseInit) {
  const res = NextResponse.json(body, init);
  res.headers.set("cache-control", "no-store, no-cache, must-revalidate, private");
  return res;
}

export function getClientIp(req: Request): string {
  const raw = firstNonEmpty([
    req.headers.get("cf-connecting-ip"),
    req.headers.get("x-real-ip"),
    req.headers.get("x-forwarded-for")?.split(",")[0],
  ]);
  const normalized = raw.replace(/[^a-fA-F0-9:.,]/g, "").slice(0, 80);
  return normalized || "unknown";
}

function isTrustedFetchSite(req: Request) {
  const site = (req.headers.get("sec-fetch-site") || "").toLowerCase();
  return !site || site === "same-origin" || site === "same-site" || site === "none";
}

export function assertSameOrigin(req: Request): { ok: true } | { ok: false; response: Response } {
  if (!isTrustedFetchSite(req)) {
    return {
      ok: false,
      response: noStoreJson({ ok: false, error: "Cross-site request rədd edildi." }, { status: 403 }),
    };
  }
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return { ok: true };
  try {
    const originUrl = new URL(origin);
    if (originUrl.host !== host) {
      return {
        ok: false,
        response: noStoreJson({ ok: false, error: "Cross-site request rədd edildi." }, { status: 403 }),
      };
    }
  } catch {
    return {
      ok: false,
      response: noStoreJson({ ok: false, error: "Origin header yanlışdır." }, { status: 403 }),
    };
  }
  return { ok: true };
}

export function hitRateLimit(key: string, limit: number, windowMs: number = WINDOW_MS) {
  const now = Date.now();
  const safeKey = key.slice(0, 200);
  const current = buckets.get(safeKey);
  if (!current || current.resetAt <= now) {
    const next = { count: 1, resetAt: now + windowMs };
    buckets.set(safeKey, next);
    return { limited: false, remaining: Math.max(limit - 1, 0), resetAt: next.resetAt };
  }
  current.count += 1;
  buckets.set(safeKey, current);
  return { limited: current.count > limit, remaining: Math.max(limit - current.count, 0), resetAt: current.resetAt };
}

export function passwordStrengthError(password: string): string | null {
  const trimmed = String(password ?? "");
  if (trimmed.length < 12) return "Şifrə ən azı 12 simvol olmalıdır.";
  let classes = 0;
  if (/[a-z]/.test(trimmed)) classes += 1;
  if (/[A-Z]/.test(trimmed)) classes += 1;
  if (/\d/.test(trimmed)) classes += 1;
  if (/[^A-Za-z0-9]/.test(trimmed)) classes += 1;
  if (classes < 3) {
    return "Şifrə ən azı 3 növ simvol saxlamalıdır: kiçik hərf, böyük hərf, rəqəm, xüsusi simvol.";
  }
  return null;
}
