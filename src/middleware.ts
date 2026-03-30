import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const DEV_FALLBACK_SECRET = "dev-secret-change-me-immediately-1234567890";
const PROD_MIN_SECRET_LENGTH = 32;
const ADMIN_COOKIE = "admin_session";
const DEFAULT_SITE_URL = "https://www.yukselen.az";

type AdminSessionPayload = { u?: string; exp?: number };

function getCanonicalSiteUrl() {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || process.env.NEXT_PUBLIC_APP_URL || DEFAULT_SITE_URL).trim();
  try {
    return new URL(raw);
  } catch {
    return new URL(DEFAULT_SITE_URL);
  }
}

function shouldNoIndexHost(host: string) {
  return host.endsWith('.up.railway.app');
}

function buildCsp() {
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "media-src 'self' blob:",
    "style-src 'self' 'unsafe-inline'",
    process.env.NODE_ENV === "development" ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self' 'unsafe-inline'",
    process.env.NODE_ENV === "development" ? "connect-src 'self' ws: wss: http: https:" : "connect-src 'self' https:",
    "upgrade-insecure-requests",
  ];
  return directives.join("; ");
}

function applySecurityHeaders(res: NextResponse, req?: NextRequest) {
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  res.headers.set("Content-Security-Policy", buildCsp());
  if (process.env.NODE_ENV === "production") {
    res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
  const host = req?.headers.get("host")?.toLowerCase() || "";
  if (host && shouldNoIndexHost(host)) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  return res;
}

function originAllowed(req: NextRequest) {
  const site = (req.headers.get("sec-fetch-site") || "").toLowerCase();
  if (site && !["same-origin", "same-site", "none"].includes(site)) return false;
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

function normalizeSecret(value: string) {
  return value.trim();
}

function getSessionSecret() {
  const explicit = normalizeSecret(
    process.env.APP_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET || process.env.NEXTAUTH_SECRET || ""
  );
  if (explicit) {
    if (process.env.NODE_ENV === "production" && explicit.length < PROD_MIN_SECRET_LENGTH) {
      return null;
    }
    return explicit;
  }
  if (process.env.NODE_ENV === "production") return null;
  return DEV_FALLBACK_SECRET;
}

function base64UrlToBytes(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const base64 = normalized + pad;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function verifyAdminCookie(token: string | undefined): Promise<AdminSessionPayload | null> {
  const secret = getSessionSecret();
  if (!token || !secret) return null;

  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const expected = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
    const received = base64UrlToBytes(sig);
    if (!bytesEqual(expected, received)) return null;

    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(body))) as AdminSessionPayload;
    if (!payload?.u || !payload?.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const canonicalSiteUrl = getCanonicalSiteUrl();
  const requestHost = (req.headers.get("host") || "").toLowerCase();
  const requestProto = req.headers.get("x-forwarded-proto") || req.nextUrl.protocol.replace(":", "") || canonicalSiteUrl.protocol.replace(":", "");
  const canonicalHost = canonicalSiteUrl.host.toLowerCase();
  const apexHost = canonicalHost.startsWith('www.') ? canonicalHost.slice(4) : canonicalHost;

  if (requestHost === apexHost && canonicalHost !== apexHost) {
    const redirectUrl = new URL(req.url);
    redirectUrl.protocol = canonicalSiteUrl.protocol;
    redirectUrl.host = canonicalHost;
    return applySecurityHeaders(NextResponse.redirect(redirectUrl, 308), req);
  }

  if (requestProto === "http" && canonicalSiteUrl.protocol === "https:" && requestHost === canonicalHost) {
    const httpsUrl = new URL(req.url);
    httpsUrl.protocol = "https:";
    return applySecurityHeaders(NextResponse.redirect(httpsUrl, 308), req);
  }

  const pathname = req.nextUrl.pathname;
  const isMutating = !["GET", "HEAD", "OPTIONS"].includes(req.method);
  const isApi = pathname.startsWith("/api/");

  if (pathname.startsWith("/dag-goy") && !pathname.startsWith("/dag-goy/login")) {
    const payload = await verifyAdminCookie(req.cookies.get(ADMIN_COOKIE)?.value);
    if (!payload) {
      const loginUrl = new URL("/dag-goy/login", req.url);
      return applySecurityHeaders(NextResponse.redirect(loginUrl), req);
    }
  }

  if (isApi && isMutating && !originAllowed(req)) {
    return applySecurityHeaders(NextResponse.json({ ok: false, error: "Cross-site request rədd edildi." }, { status: 403 }), req);
  }

  return applySecurityHeaders(NextResponse.next(), req);
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
