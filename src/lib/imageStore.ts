import "server-only";
import { randomUUID } from "crypto";
import { deleteImageRow, getImage, putImage } from "@/lib/railwayDb";

const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]);

function toBuffer(bytes: ArrayBuffer | Buffer | Uint8Array): Buffer {
  if (Buffer.isBuffer(bytes)) return bytes;
  if (bytes instanceof Uint8Array) return Buffer.from(bytes);
  return Buffer.from(bytes);
}

function sniffImageType(buf: Buffer): string | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))) return "image/png";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 6) {
    const sig = buf.subarray(0, 6).toString("ascii");
    if (sig === "GIF87a" || sig === "GIF89a") return "image/gif";
  }
  if (buf.length >= 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

export function isAllowedImageType(contentType: string) {
  return ALLOWED_IMAGE_TYPES.has((contentType || "").toLowerCase());
}

function extFromContentType(contentType: string): string {
  const ct = (contentType || "").toLowerCase();
  if (ct.includes("image/webp")) return "webp";
  if (ct.includes("image/png")) return "png";
  if (ct.includes("image/jpeg") || ct.includes("image/jpg")) return "jpg";
  if (ct.includes("image/gif")) return "gif";
  return "bin";
}

export async function saveImage(opts: { bytes: ArrayBuffer | Buffer | Uint8Array; contentType: string }): Promise<{ imageKey: string; url: string }> {
  const fileBuffer = toBuffer(opts.bytes);
  const detectedType = sniffImageType(fileBuffer);
  if (!detectedType || !isAllowedImageType(detectedType)) {
    throw new Error("Yüklənən fayl etibarlı PNG, JPG, WEBP və ya GIF deyil.");
  }
  const ext = extFromContentType(detectedType);
  const imageKey = `img_${randomUUID()}.${ext}`;
  await putImage({ imageKey, contentType: detectedType, bytes: fileBuffer });
  const proxiedUrl = `/api/images/${encodeURIComponent(imageKey)}`;
  return { imageKey, url: proxiedUrl };
}

export async function getImageBytes(imageKey: string): Promise<{ bytes: Buffer; contentType: string } | null> {
  if (!imageKey) return null;
  const row = await getImage(imageKey);
  if (!row) return null;
  return { bytes: row.bytes, contentType: row.content_type || "application/octet-stream" };
}

export async function deleteImage(imageKey: string): Promise<void> {
  if (!imageKey) return;
  try { await deleteImageRow(imageKey); } catch {}
}
