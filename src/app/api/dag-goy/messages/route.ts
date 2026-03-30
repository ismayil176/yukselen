import { requireAdminApiRequest } from "@/lib/adminAuth";
import { noStoreJson } from "@/lib/apiSecurity";
import { listMessages } from "@/lib/messagesStore";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const denied = requireAdminApiRequest(req);
  if (denied) return denied;
  const msgs = await listMessages(500);
  return noStoreJson({ ok: true, messages: msgs });
}
