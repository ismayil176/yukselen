import { z } from "zod";
import { createMessage } from "@/lib/messagesStore";
import { assertSameOrigin, getClientIp, hitRateLimit, noStoreJson } from "@/lib/apiSecurity";

export const runtime = "nodejs";

const Schema = z.object({
  name: z.string().trim().min(2, "Ad yaz").max(120),
  phone: z.string().trim().max(50).optional().nullable(),
  message: z.string().trim().min(3, "Mesaj yaz").max(2000),
  page: z.string().trim().max(300).optional().nullable(),
});

export async function POST(req: Request) {
  const originCheck = assertSameOrigin(req);
  if (!originCheck.ok) return originCheck.response;
  const ip = getClientIp(req);
  const rl = hitRateLimit(`contact:${ip}`, 8);
  if (rl.limited) return noStoreJson({ ok: false, error: "Çox tez-tez mesaj göndərilir. Bir az sonra yenidən yoxlayın." }, { status: 429 });
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return noStoreJson({ ok: false, error: parsed.error.issues?.[0]?.message ?? "Xəta" }, { status: 400 });
  try {
    const msg = await createMessage({ name: parsed.data.name, phone: parsed.data.phone ?? null, message: parsed.data.message, page: parsed.data.page ?? null });
    return noStoreJson({ ok: true, message: msg });
  } catch (e: any) {
    return noStoreJson({ ok: false, error: e?.message ?? "Mesaj saxlanmadı" }, { status: 500 });
  }
}
