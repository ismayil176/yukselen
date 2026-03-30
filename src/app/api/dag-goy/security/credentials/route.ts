import crypto from "node:crypto";
import { requireAdminApiRequest } from "@/lib/adminAuth";
import { getAdminCredentials, pbkdf2, setAdminCredentials } from "@/lib/adminCredentials";
import { noStoreJson } from "@/lib/apiSecurity";

export const runtime = "nodejs";

function safeCompareText(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export async function POST(req: Request) {
  const denied = requireAdminApiRequest(req, { requireSameOrigin: true });
  if (denied) return denied;
  const body = (await req.json().catch(() => null)) as { username?: string; password?: string; currentPassword?: string } | null;
  const username = String(body?.username ?? "").trim();
  const password = String(body?.password ?? "");
  const currentPassword = String(body?.currentPassword ?? "");
  if (!currentPassword) return noStoreJson({ ok: false, error: "Cari şifrə tələb olunur." }, { status: 400 });
  const stored = await getAdminCredentials();
  const expectedHash = stored?.passwordHash ?? process.env.ADMIN_PASSWORD_HASH ?? "";
  const expectedSalt = stored?.passwordSalt ?? process.env.ADMIN_PASSWORD_SALT ?? "";
  const expectedPass = process.env.ADMIN_PASSWORD ?? "admin";
  const currentOk = expectedHash && expectedSalt ? safeCompareText(pbkdf2(currentPassword, expectedSalt), expectedHash) : safeCompareText(currentPassword, expectedPass);
  if (!currentOk) return noStoreJson({ ok: false, error: "Cari şifrə yanlışdır." }, { status: 401 });
  try {
    const saved = await setAdminCredentials({ username, password });
    return noStoreJson({ ok: true, username: saved.username, updated: true });
  } catch (e: any) {
    return noStoreJson({ ok: false, error: e?.message ?? "Xəta" }, { status: 400 });
  }
}
