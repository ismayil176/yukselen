import { NextResponse } from "next/server";
import { requireAdminApiRequest } from "@/lib/adminAuth";
import { saveImage } from "@/lib/imageStore";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const denied = requireAdminApiRequest(req, { requireSameOrigin: true });
  if (denied) return denied;
  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("multipart/form-data")) return NextResponse.json({ error: "multipart/form-data lazımdır" }, { status: 400 });
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Bad form" }, { status: 400 });
  const file = form.get("file");
  if (!file || typeof file === "string") return NextResponse.json({ error: "file tapılmadı" }, { status: 400 });
  const f = file as File;
  const bytes = await f.arrayBuffer();
  if (bytes.byteLength > 5 * 1024 * 1024) return NextResponse.json({ error: "Şəkil çox böyükdür (max 5MB)." }, { status: 400 });
  try {
    const saved = await saveImage({ bytes, contentType: f.type || "application/octet-stream" });
    const proxiedUrl = `/api/images/${encodeURIComponent(saved.imageKey)}`;
    return NextResponse.json({ ok: true, imageKey: saved.imageKey, imageUrl: proxiedUrl });
  } catch (e: any) {
    return NextResponse.json({ error: typeof e?.message === "string" ? e.message : "Şəkil yüklənmədi" }, { status: 400 });
  }
}
