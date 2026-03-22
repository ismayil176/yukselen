import { requireAdminApiRequest } from "@/lib/adminAuth";
import { noStoreJson } from "@/lib/apiSecurity";
import { deleteAttempts, listAttempts, setAttemptSeen } from "@/lib/attempts";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const denied = requireAdminApiRequest(req);
    if (denied) return denied;

    const url = new URL(req.url);
    const take = Math.min(1000, Math.max(1, Number(url.searchParams.get("take") ?? "100")));

    const attempts = await listAttempts(take);
    return noStoreJson({ ok: true, attempts });
  } catch (e: any) {
    return noStoreJson({ ok: false, error: e?.message ?? "Server xətası" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const denied = requireAdminApiRequest(req, { requireSameOrigin: true });
    if (denied) return denied;

    const body = await req.json().catch(() => null);
    const ids = Array.isArray(body?.ids) ? body.ids : [];
    const result = await deleteAttempts(ids);

    if (result.deletedCount === 0) {
      return noStoreJson({ ok: false, error: "Silinəcək istifadəçi seçilmədi" }, { status: 400 });
    }

    return noStoreJson({ ok: true, deletedCount: result.deletedCount });
  } catch (e: any) {
    return noStoreJson({ ok: false, error: e?.message ?? "Server xətası" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const denied = requireAdminApiRequest(req, { requireSameOrigin: true });
    if (denied) return denied;

    const body = await req.json().catch(() => null);
    const id = String(body?.id ?? "").trim();
    const seen = Boolean(body?.seen);

    if (!id) {
      return noStoreJson({ ok: false, error: "İstifadəçi seçilmədi" }, { status: 400 });
    }

    const updated = await setAttemptSeen({ id, seen });
    if (!updated) {
      return noStoreJson({ ok: false, error: "İstifadəçi tapılmadı" }, { status: 404 });
    }

    return noStoreJson({ ok: true, attempt: updated });
  } catch (e: any) {
    return noStoreJson({ ok: false, error: e?.message ?? "Server xətası" }, { status: 500 });
  }
}
