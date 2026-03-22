import { getImageBytes } from "@/lib/imageStore";

export const runtime = "nodejs";
const IMAGE_KEY_RE = /^[A-Za-z0-9_.-]{1,200}$/;

export async function GET(_req: Request, ctx: { params: { imageKey: string } }) {
  let key = "";
  try { key = decodeURIComponent(ctx.params.imageKey || ""); } catch { return new Response("Bad request", { status: 400 }); }
  if (!IMAGE_KEY_RE.test(key)) return new Response("Bad request", { status: 400 });
  const meta = await getImageBytes(key);
  if (!meta) return new Response("Not found", { status: 404 });
  const body = new Uint8Array(meta.bytes);
  return new Response(body, { status: 200, headers: { "content-type": meta.contentType || "application/octet-stream", "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff", "content-disposition": "inline" } });
}
