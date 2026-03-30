export const runtime = "nodejs";

import { requireAdminApiRequest } from "@/lib/adminAuth";
import { noStoreJson } from "@/lib/apiSecurity";
import { readDb, writeDb, type Db } from "@/lib/store";
import { saveImage } from "@/lib/imageStore";
import { sanitizeDbPayload } from "@/lib/dbValidation";
import ExcelJS from "exceljs";

const MAX_XLSX_BYTES = 20 * 1024 * 1024;

function asStr(v: any) {
  if (v == null) return "";
  return String(v);
}

function asNum(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function POST(req: Request) {
  const denied = requireAdminApiRequest(req, { requireSameOrigin: true });
  if (denied) return denied;

  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("multipart/form-data")) {
    return noStoreJson({ ok: false, error: "Fayl upload edin (multipart/form-data)" }, { status: 400 });
  }

  const fd = await req.formData();
  const file = fd.get("file");
  if (!(file instanceof File)) {
    return noStoreJson({ ok: false, error: "Fayl tapılmadı" }, { status: 400 });
  }
  if (file.size > MAX_XLSX_BYTES) {
    return noStoreJson({ ok: false, error: "Excel backup çox böyükdür (max 20MB)" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(bytes);
  } catch {
    return noStoreJson({ ok: false, error: "Excel faylı oxunmadı (.xlsx)" }, { status: 400 });
  }

  const wsExams = wb.getWorksheet("Exams");
  const wsQ = wb.getWorksheet("Questions");
  const wsPass = wb.getWorksheet("VerbalPassages");
  const wsImg = wb.getWorksheet("Images");

  if (!wsExams || !wsQ || !wsPass) {
    return noStoreJson({ ok: false, error: "Excel formatı yanlışdır (sheet-lər tapılmadı)" }, { status: 400 });
  }

  const imageKeyMap = new Map<string, string>();
  if (wsImg) {
    for (let r = 2; r <= wsImg.rowCount; r++) {
      const row = wsImg.getRow(r);
      const oldKey = asStr(row.getCell(1).value).trim();
      const contentType = asStr(row.getCell(2).value).trim() || "application/octet-stream";
      const b64 = asStr(row.getCell(3).value).trim();
      if (!oldKey || !b64) continue;
      try {
        const ab = Buffer.from(b64, "base64");
        const saved = await saveImage({ bytes: ab.buffer.slice(ab.byteOffset, ab.byteOffset + ab.byteLength), contentType });
        imageKeyMap.set(oldKey, saved.imageKey);
      } catch {
        // ignore broken image row
      }
    }
  }

  const rawDb: Db = { exams: [], questions: [], verbalPassages: [] };

  for (let r = 2; r <= wsExams.rowCount; r++) {
    const row = wsExams.getRow(r);
    const id = asStr(row.getCell(1).value).trim();
    if (!id) continue;
    rawDb.exams.push({
      id,
      category: asStr(row.getCell(2).value).trim() as any,
      title: asStr(row.getCell(3).value),
      instructions: asStr(row.getCell(4).value),
      passScore: asNum(row.getCell(5).value, 60),
      createdAt: asStr(row.getCell(6).value) || new Date().toISOString(),
      updatedAt: asStr(row.getCell(7).value) || new Date().toISOString(),
    });
  }

  for (let r = 2; r <= wsPass.rowCount; r++) {
    const row = wsPass.getRow(r);
    const id = asStr(row.getCell(1).value).trim();
    if (!id) continue;
    rawDb.verbalPassages.push({
      id,
      examId: asStr(row.getCell(2).value).trim(),
      section: asStr(row.getCell(3).value).trim() as any,
      text: asStr(row.getCell(4).value),
    });
  }

  for (let r = 2; r <= wsQ.rowCount; r++) {
    const row = wsQ.getRow(r);
    const id = asStr(row.getCell(1).value).trim();
    if (!id) continue;
    const oldKey = asStr(row.getCell(6).value).trim();
    const mappedKey = oldKey ? imageKeyMap.get(oldKey) ?? oldKey : null;
    rawDb.questions.push({
      id,
      examId: asStr(row.getCell(2).value).trim(),
      section: asStr(row.getCell(3).value).trim() as any,
      text: asStr(row.getCell(4).value),
      score: Math.max(1, asNum(row.getCell(5).value, 1)),
      imageKey: mappedKey || null,
      image: null,
      imageUrl: mappedKey ? `/api/images/${encodeURIComponent(mappedKey)}` : null,
      options: [
        asStr(row.getCell(7).value),
        asStr(row.getCell(8).value),
        asStr(row.getCell(9).value),
        asStr(row.getCell(10).value),
        asStr(row.getCell(11).value),
      ],
      correctIndex: asNum(row.getCell(12).value, 0),
    });
  }

  const next = sanitizeDbPayload(rawDb);
  if (!next.exams.length || !next.questions.length) {
    return noStoreJson({ ok: false, error: "Excel daxilində etibarlı exams/questions tapılmadı" }, { status: 400 });
  }

  try {
    const prev = await readDb();
    await writeDb(next);
    return noStoreJson({
      ok: true,
      restored: { exams: next.exams.length, questions: next.questions.length, verbalPassages: next.verbalPassages.length, images: imageKeyMap.size },
      previous: { exams: prev.exams.length, questions: prev.questions.length, verbalPassages: prev.verbalPassages.length },
    });
  } catch (e: any) {
    return noStoreJson({ ok: false, error: e?.message ?? "DB yazılmadı" }, { status: 500 });
  }
}
