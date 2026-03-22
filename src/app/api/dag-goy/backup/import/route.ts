export const runtime = "nodejs";

import { requireAdminApiRequest } from "@/lib/adminAuth";
import { noStoreJson } from "@/lib/apiSecurity";
import { readDb, writeDb } from "@/lib/store";
import { sanitizeDbPayload } from "@/lib/dbValidation";

const MAX_JSON_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request) {
  const denied = requireAdminApiRequest(req, { requireSameOrigin: true });
  if (denied) return denied;

  let raw: unknown = null;
  const ct = req.headers.get("content-type") || "";
  try {
    if (ct.includes("multipart/form-data")) {
      const fd = await req.formData();
      const file = fd.get("file");
      if (!(file instanceof File)) throw new Error("Fayl tapılmadı");
      if (file.size > MAX_JSON_BYTES) throw new Error("JSON backup çox böyükdür (max 10MB)");
      const txt = await file.text();
      raw = JSON.parse(txt);
    } else {
      const txt = await req.text();
      if (Buffer.byteLength(txt, "utf8") > MAX_JSON_BYTES) throw new Error("JSON backup çox böyükdür (max 10MB)");
      raw = txt ? JSON.parse(txt) : null;
    }
  } catch (e: any) {
    return noStoreJson({ ok: false, error: e?.message ?? "Backup faylı oxunmadı (JSON)" }, { status: 400 });
  }

  const candidate = raw && typeof raw === "object" && !Array.isArray(raw) && "db" in (raw as any) ? (raw as any).db : raw;
  const next = sanitizeDbPayload(candidate);
  if (!next.exams.length) return noStoreJson({ ok: false, error: "Backup daxilində etibarlı exams tapılmadı" }, { status: 400 });

  try {
    const prev = await readDb();
    await writeDb(next);
    return noStoreJson({
      ok: true,
      restored: { exams: next.exams.length, questions: next.questions.length, verbalPassages: next.verbalPassages.length },
      previous: { exams: prev.exams.length, questions: prev.questions.length, verbalPassages: prev.verbalPassages.length },
    });
  } catch (e: any) {
    return noStoreJson({ ok: false, error: e?.message ?? "DB yazılmadı" }, { status: 500 });
  }
}
