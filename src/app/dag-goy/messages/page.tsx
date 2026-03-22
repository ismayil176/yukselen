"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/Container";
import type { ContactMessage } from "@/lib/messagesStore";

export default function AdminMessagesPage() {
  const router = useRouter();
  const [items, setItems] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);

  async function safeJson(res: Response) {
    const t = await res.text();
    try {
      return t ? JSON.parse(t) : null;
    } catch {
      return null;
    }
  }

  async function load() {
    setLoading(true);
    const [meRes, res] = await Promise.all([
      fetch("/api/dag-goy/me", { cache: "no-store" }),
      fetch("/api/dag-goy/messages", { cache: "no-store" }),
    ]);
    const [me, j] = await Promise.all([safeJson(meRes), safeJson(res)]);
    if (!me?.isAdmin) {
      router.replace("/dag-goy/login");
      return;
    }
    setItems(j?.messages ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // auto refresh every 10s so admin doesn't need manual refresh
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-[calc(100vh-72px)] py-10">
      <Container>
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-purple-950">Admin · Mesajlar</h1>
            <div className="flex flex-wrap gap-2">
              <a className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:bg-white" href="/dag-goy/exams">
                Sınaqlar
              </a>
              <a className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:bg-white" href="/dag-goy/attempts">
                İştirakçılar
              </a>
              <button
                className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:bg-white"
                onClick={load}
              >
                Yenilə
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-black/10 bg-white p-6">
            {loading ? <div className="text-purple-900/70">Yüklənir…</div> : null}
            {!loading && items.length === 0 ? <div className="text-purple-900/70">Hələ mesaj yoxdur.</div> : null}

            <div className="mt-4 grid gap-3">
              {items.map((m) => (
                <div key={m.id} className="rounded-2xl border border-black/10 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-extrabold text-purple-950">{m.name}</div>
                      <div className="mt-1 text-xs text-purple-900/70">
                        {new Date(m.createdAt).toLocaleString("az-AZ")}
                        {m.phone ? <span> · {m.phone}</span> : null}
                        {m.page ? <span> · {m.page}</span> : null}
                      </div>
                    </div>

                    <button
                      className="rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-bold text-purple-950 hover:bg-white"
                      onClick={async () => {
                        if (!confirm("Mesaj silinsin?")) return;
                        const res = await fetch(`/api/dag-goy/messages/${encodeURIComponent(m.id)}`, { method: "DELETE" });
                        const j = await safeJson(res);
                        if (!res.ok) {
                          alert(j?.error || "Silinmədi");
                          return;
                        }
                        setItems((prev) => prev.filter((x) => x.id !== m.id));
                      }}
                    >
                      Sil
                    </button>
                  </div>

                  <div className="mt-3 whitespace-pre-wrap text-sm text-purple-950">{m.message}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}
