import "server-only";
import crypto from "node:crypto";

const DEV_FALLBACK_SECRET = "dev-secret-change-me-immediately-1234567890";
const PROD_MIN_SECRET_LENGTH = 32;

function normalizeSecret(value: string) {
  return value.trim();
}

export function getAppSessionSecret(): string | null {
  const explicit = normalizeSecret(
    process.env.APP_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET || process.env.NEXTAUTH_SECRET || ""
  );
  if (explicit) {
    if (process.env.NODE_ENV === "production" && explicit.length < PROD_MIN_SECRET_LENGTH) {
      throw new Error(`APP_SESSION_SECRET production-da ən azı ${PROD_MIN_SECRET_LENGTH} simvol olmalıdır.`);
    }
    return explicit;
  }
  if (process.env.NODE_ENV === "production") return null;
  return DEV_FALLBACK_SECRET;
}

export function signPayload(payload: Record<string, unknown>): string {
  const secret = getAppSessionSecret();
  if (!secret) throw new Error("Session secret tapılmadı. Production üçün APP_SESSION_SECRET və ya ADMIN_SESSION_SECRET təyin edin.");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySignedPayload<T>(token: string | undefined): T | null {
  const secret = getAppSessionSecret();
  if (!token || !secret) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = crypto.createHmac("sha256", secret).update(body).digest();
  const received = Buffer.from(sig, "base64url");
  if (expected.length !== received.length) return null;
  if (!crypto.timingSafeEqual(expected, received)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}
