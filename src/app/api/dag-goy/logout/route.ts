import { clearAdminCookie, requireAdminApiRequest } from "@/lib/adminAuth";
import { noStoreJson } from "@/lib/apiSecurity";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const denied = requireAdminApiRequest(req, { requireSameOrigin: true });
  if (denied) return denied;
  clearAdminCookie();
  return noStoreJson({ ok: true });
}
