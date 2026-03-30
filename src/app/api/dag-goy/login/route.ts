import crypto from "node:crypto";
import { setAdminCookie } from "@/lib/adminAuth";
import { authenticator } from "otplib";
import { getAdminCredentials, pbkdf2 } from "@/lib/adminCredentials";
import { assertSameOrigin, getClientIp, hitRateLimit, noStoreJson } from "@/lib/apiSecurity";

export const runtime = "nodejs";

function safeCompareText(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export async function POST(req: Request) {
  const originCheck = assertSameOrigin(req);
  if (!originCheck.ok) return originCheck.response;
  const ip = getClientIp(req);
  const rl = hitRateLimit(`admin-login:${ip}`, 5);
  if (rl.limited) return noStoreJson({ ok: false, error: "Çox sayda login cəhdi oldu. Zəhmət olmasa bir az sonra yenidən yoxlayın." }, { status: 429 });
  const body = (await req.json().catch(() => null)) as { username?: string; password?: string; otp?: string } | null;
  const username = String(body?.username ?? "").trim();
  const pass = String(body?.password ?? "");
  const otp = String(body?.otp ?? "").trim();
  if (!username || !pass) return noStoreJson({ ok: false, error: "İstifadəçi adı və şifrə tələb olunur." }, { status: 400 });
  const stored = await getAdminCredentials();
  const expectedUser = stored?.username ?? process.env.ADMIN_USERNAME ?? "admin";
  const expectedHash = stored?.passwordHash ?? process.env.ADMIN_PASSWORD_HASH ?? "";
  const expectedSalt = stored?.passwordSalt ?? process.env.ADMIN_PASSWORD_SALT ?? "";
  const expectedPass = process.env.ADMIN_PASSWORD ?? "admin";
  const usingDefaultCreds = !stored && !process.env.ADMIN_PASSWORD_HASH && !process.env.ADMIN_PASSWORD && !process.env.ADMIN_USERNAME;
  if (process.env.NODE_ENV === "production" && usingDefaultCreds) {
    return noStoreJson({ ok: false, error: "Production-da admin üçün default (admin/admin) istifadə etmək olmaz. Railway → Service → Variables bölməsində ADMIN_USERNAME + güclü ADMIN_PASSWORD (və ya ADMIN_PASSWORD_HASH/ADMIN_PASSWORD_SALT) təyin edin." }, { status: 500 });
  }
  const passOk = expectedHash && expectedSalt ? safeCompareText(pbkdf2(pass, expectedSalt), expectedHash) : safeCompareText(pass, expectedPass);
  const userOk = safeCompareText(username, expectedUser);
  if (!userOk || !passOk) return noStoreJson({ ok: false, error: "İstifadəçi adı və ya şifrə yanlışdır" }, { status: 401 });
  const totpSecret = process.env.ADMIN_TOTP_SECRET ?? "";
  const totpEnabled = (process.env.ADMIN_TOTP_ENABLED ?? "").toLowerCase() === "true";
  if (totpEnabled && totpSecret) {
    const ok = authenticator.check(otp, totpSecret);
    if (!ok) return noStoreJson({ ok: false, error: "2FA kod yanlışdır" }, { status: 401 });
  }
  try {
    setAdminCookie(username);
  } catch (e: any) {
    return noStoreJson({ ok: false, error: e?.message ?? "Admin session yaradıla bilmədi" }, { status: 500 });
  }
  return noStoreJson({ ok: true });
}
