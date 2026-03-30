export const runtime = "nodejs";

import { requireAdminApiRequest } from "@/lib/adminAuth";
import { readDb } from "@/lib/store";

export async function GET(req: Request) {
  const denied = requireAdminApiRequest(req);
  if (denied) return denied;

  const db = await readDb();
  const payload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    db,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="questions-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      "cache-control": "no-store, no-cache, must-revalidate, private",
    },
  });
}
