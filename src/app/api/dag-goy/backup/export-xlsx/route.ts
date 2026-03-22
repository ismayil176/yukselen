export const runtime = "nodejs";

import { requireAdminApiRequest } from "@/lib/adminAuth";
import { readDb } from "@/lib/store";
import { getImageBytes } from "@/lib/imageStore";
import ExcelJS from "exceljs";

function bufToBase64(buf: ArrayBuffer | Buffer) {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(new Uint8Array(buf));
  return b.toString("base64");
}

export async function GET(req: Request) {
  const denied = requireAdminApiRequest(req);
  if (denied) return denied;

  const db = await readDb();

  const wb = new ExcelJS.Workbook();
  wb.creator = "Yukselis Exam";
  wb.created = new Date();

  const wsMeta = wb.addWorksheet("Meta");
  wsMeta.addRow(["version", "2"]);
  wsMeta.addRow(["exportedAt", new Date().toISOString()]);

  const wsExams = wb.addWorksheet("Exams");
  wsExams.addRow(["id", "category", "title", "instructions", "passScore", "createdAt", "updatedAt"]);
  for (const e of db.exams) {
    wsExams.addRow([e.id, e.category, e.title, e.instructions, e.passScore, e.createdAt, e.updatedAt]);
  }

  const wsPass = wb.addWorksheet("VerbalPassages");
  wsPass.addRow(["id", "examId", "section", "text"]);
  for (const p of db.verbalPassages) {
    wsPass.addRow([p.id, p.examId, p.section, p.text]);
  }

  const wsQ = wb.addWorksheet("Questions");
  wsQ.addRow(["id", "examId", "section", "text", "score", "imageKey", "optA", "optB", "optC", "optD", "optE", "correctIndex"]);
  for (const q of db.questions) {
    wsQ.addRow([q.id, q.examId, q.section, q.text, q.score, q.imageKey ?? "", q.options?.[0] ?? "", q.options?.[1] ?? "", q.options?.[2] ?? "", q.options?.[3] ?? "", q.options?.[4] ?? "", q.correctIndex]);
  }

  const wsImg = wb.addWorksheet("Images");
  wsImg.addRow(["imageKey", "contentType", "base64"]);

  const uniqueKeys = Array.from(new Set(db.questions.map((q) => (q.imageKey ?? "").trim()).filter(Boolean)));
  for (const key of uniqueKeys) {
    try {
      const img = await getImageBytes(key);
      if (!img) continue;
      wsImg.addRow([key, img.contentType || "application/octet-stream", bufToBase64(img.bytes)]);
    } catch {}
  }

  for (const ws of [wsExams, wsPass, wsQ, wsImg, wsMeta]) {
    ws.views = [{ state: "frozen", ySplit: 1 }];
    ws.columns?.forEach((c) => {
      if (!c.width) c.width = 24;
    });
  }
  wsQ.getColumn(4).width = 60;
  wsPass.getColumn(4).width = 80;
  wsImg.getColumn(3).width = 80;

  const out = await wb.xlsx.writeBuffer();

  return new Response(out as any, {
    status: 200,
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="questions-backup-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      "cache-control": "no-store, no-cache, must-revalidate, private",
    },
  });
}
