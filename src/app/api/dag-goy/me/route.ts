import { getAdminUsername, isAdminRequest } from "@/lib/adminAuth";
import { noStoreJson } from "@/lib/apiSecurity";

export const runtime = "nodejs";

export async function GET() {
  return noStoreJson({ ok: true, isAdmin: isAdminRequest(), username: getAdminUsername() });
}
