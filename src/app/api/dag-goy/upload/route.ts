import { NextResponse } from "next/server";
import { requireAdminApiRequest } from "@/lib/adminAuth";
import { saveImage } from "@/lib/imageStore";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const denied = requireAdminApiRequest(req, { requireSameOrigin: true });
  if (denied) return denied;
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    const typedFile = file as File;
    const ab = await typedFile.arrayBuffer();
    if (ab.byteLength > 5 * 1024 * 1024) return NextResponse.json({ error: "Şəkil çox böyükdür (max 5MB)." }, { status: 400 });
    const { imageKey, url } = await saveImage({ bytes: ab, contentType: typedFile.type || "application/octet-stream" });
    return NextResponse.json({ ok: true, imageKey, url });
  } catch (e: any) {
    const msg = e?.message || "Upload failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
