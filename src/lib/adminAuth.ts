import { cookies } from "next/headers";
import { signPayload, verifySignedPayload } from "@/lib/appSession";
import { assertSameOrigin, noStoreJson } from "@/lib/apiSecurity";

const COOKIE = "admin_session";
const MAX_AGE = 60 * 60 * 8;

type SessionPayload = { u: string; exp: number };

function getSession() {
  const token = cookies().get(COOKIE)?.value;
  const payload = verifySignedPayload<SessionPayload>(token);
  if (!payload?.u || !payload?.exp) return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export function getAdminUsername() {
  return getSession()?.u ?? null;
}

export function isAdminRequest() {
  return Boolean(getSession());
}

export function requireAdminApiRequest(req?: Request, opts?: { requireSameOrigin?: boolean }) {
  if (opts?.requireSameOrigin && req) {
    const originCheck = assertSameOrigin(req);
    if (!originCheck.ok) return originCheck.response;
  }
  if (!isAdminRequest()) {
    return noStoreJson({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export function setAdminCookie(username: string) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const token = signPayload({ u: username, exp });
  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
    priority: "high",
  });
}

export function clearAdminCookie() {
  cookies().set(COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    priority: "high",
  });
}
