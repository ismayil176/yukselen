"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Container } from "@/components/Container";
import { ResultContent, type ResultPayload } from "@/components/result/ResultContent";
import { readBrowserJson, readBrowserValue, writeBrowserJson } from "@/lib/browserExamStorage";

const backMap: Record<string, string> = {
  general: "umumi-bilikler",
  analytic: "analitik-tehlil",
  detail: "idareetme-bacariqlari",
};

type StoredResult = { result: ResultPayload };

export function ResultClient({ category, examId }: { category: string; examId: string }) {
  const back = backMap[category] ?? "";
  const resultKey = useMemo(() => `result:${category}:${examId}`, [category, examId]);
  const attemptKey = useMemo(() => `attempt:${category}:${examId}`, [category, examId]);
  const [payload, setPayload] = useState<ResultPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadResult() {
      setLoading(true);
      setError(null);
      const stored = readBrowserJson<StoredResult>(resultKey);
      if (stored?.result) {
        setPayload(stored.result);
        setLoading(false);
        return;
      }
      const attemptId = readBrowserValue(attemptKey);
      if (!attemptId) {
        setPayload(null);
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/attempts/result?attemptId=${encodeURIComponent(attemptId)}&examId=${encodeURIComponent(examId)}`, { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok || !json?.result) throw new Error(json?.error ?? "Nəticə yüklənmədi.");
        if (cancelled) return;
        writeBrowserJson(resultKey, { finishedAt: new Date().toISOString(), result: json.result });
        setPayload(json.result);
      } catch (e: any) {
        if (cancelled) return;
        setPayload(null);
        setError(e?.message ?? "Nəticə yüklənmədi.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadResult();
    return () => { cancelled = true; };
  }, [attemptKey, examId, resultKey]);

  return (
    <main className="py-10">
      <Container>
        <div className="mx-auto max-w-4xl rounded-2xl border border-black/10 bg-white p-4 sm:p-6 lg:p-8">
          <h1 className="text-2xl font-bold">Nəticə</h1>
          <p className="mt-2 text-slate-700">Blok nəticələri və düzgün-səhv cavabların müqayisəsi</p>
          {loading ? (
            <div className="mt-6 rounded-2xl bg-white p-5 text-sm text-slate-700">Nəticə yüklənir...</div>
          ) : !payload ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">{error ?? "Nəticə tapılmadı. İmtahanı yenidən başlada bilərsiniz."}</div>
          ) : (
            <ResultContent category={category} payload={payload} />
          )}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href={`/start/${back || category}`} className="w-full rounded-xl bg-white px-5 py-3 text-sm font-semibold text-purple-950 hover:bg-white sm:w-auto">Yeni sınaq seç</Link>
            <Link href="/neticeni-yoxla" className="w-full rounded-xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-purple-950 hover:bg-white sm:w-auto">Nəticənizi Yoxlayın</Link>
            <Link href="/" className="w-full rounded-xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-purple-950 hover:bg-white sm:w-auto">Əsas səhifə</Link>
          </div>
        </div>
      </Container>
    </main>
  );
}
