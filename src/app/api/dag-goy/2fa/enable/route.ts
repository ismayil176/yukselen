import { requireAdminApiRequest } from "@/lib/adminAuth";
import { authenticator } from "otplib";
import { noStoreJson } from "@/lib/apiSecurity";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const denied = requireAdminApiRequest(req, { requireSameOrigin: true });
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as { otpCode?: string; secret?: string } | null;
  const otpCode = String(body?.otpCode ?? "").trim();
  const secret = String(body?.secret ?? "").trim();

  if (!secret) {
    return noStoreJson({ ok: false, error: "Secret yoxdur. Əvvəl Setup et (QR yarat)." }, { status: 400 });
  }
  if (!/^\d{6}$/.test(otpCode)) {
    return noStoreJson({ ok: false, error: "OTP 6 rəqəm olmalıdır" }, { status: 400 });
  }

  const ok = authenticator.check(otpCode, secret);
  if (!ok) {
    return noStoreJson({ ok: false, error: "OTP səhvdir" }, { status: 401 });
  }

  return noStoreJson({
    ok: true,
    message:
      "OTP təsdiqləndi. İndi Railway → Service → Variables bölməsində ADMIN_TOTP_SECRET və ADMIN_TOTP_ENABLED=true təyin edib redeploy et.",
  });
}
