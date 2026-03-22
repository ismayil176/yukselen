import { requireAdminApiRequest } from "@/lib/adminAuth";
import { noStoreJson } from "@/lib/apiSecurity";
import { deleteMessage } from "@/lib/messagesStore";

export const runtime = "nodejs";

export async function DELETE(req: Request, ctx: { params: { id: string } }) {
  const denied = requireAdminApiRequest(req, { requireSameOrigin: true });
  if (denied) return denied;
  const ok = await deleteMessage(ctx.params.id);
  if (!ok) return noStoreJson({ ok: false, error: "Not found" }, { status: 404 });
  return noStoreJson({ ok: true });
}
