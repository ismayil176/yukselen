import { requireAdminApiRequest } from "@/lib/adminAuth";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { noStoreJson } from "@/lib/apiSecurity";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const denied = requireAdminApiRequest(req, { requireSameOrigin: true });
  if (denied) return denied;

  const secret = authenticator.generateSecret();
  const issuer = process.env.ADMIN_TOTP_ISSUER ?? "Yukselis Exam";
  const label = process.env.ADMIN_TOTP_LABEL ?? (process.env.ADMIN_USERNAME ?? "admin");
  const otpauth = authenticator.keyuri(label, issuer, secret);
  const qrDataUrl = await QRCode.toDataURL(otpauth, { margin: 1, width: 256 });

  return noStoreJson({
    ok: true,
    secretBase32: secret,
    otpauth,
    qrDataUrl,
    env: {
      ADMIN_TOTP_SECRET: secret,
      ADMIN_TOTP_ENABLED: "true",
    },
  });
}
