"use client";

import { useMemo, useState } from "react";
import { Container } from "@/components/Container";
import { ResultContent, type ResultPayload } from "@/components/result/ResultContent";
import { normalizeAzerbaijanPhone } from "@/lib/phone";

type AttemptHistoryItem = { attemptId: string; examId: string; examTitle: string; category: string; score: number; startedAt: string; startedAtAz?: string; finishedAt?: string; finishedAtAz?: string; meta?: { totalQuestions?: number; correctCount?: number; wrongCount?: number; unansweredCount?: number } | null; resultAvailable: boolean; };
type SearchResponse = { phone: string; attempts: AttemptHistoryItem[] };
type SelectedResult = { attempt: AttemptHistoryItem & { examTitle: string }; summary: ResultPayload["summary"]; blocks: ResultPayload["blocks"]; details: ResultPayload["details"]; generatedAt?: string; generatedAtAz?: string; };
const CATEGORY_LABELS: Record<string, string> = { general: "Ümumi biliklər", analytic: "Analitik təhlil", detail: "İdarəetmə bacarıqları" };

export function ResultCheckClient() {
  const [phone, setPhone] = useState("");
  const [normalizedPhone, setNormalizedPhone] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [loadingResultId, setLoadingResultId] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);
  const [history, setHistory] = useState<AttemptHistoryItem[]>([]);
  const [selected, setSelected] = useState<SelectedResult | null>(null);

  const selectedPayload = useMemo<ResultPayload | null>(() => selected ? { summary: selected.summary, blocks: selected.blocks, details: selected.details } : null, [selected]);

  async function searchHistory() {
    if (searching) return;
    const safePhone = normalizeAzerbaijanPhone(phone);
    if (!safePhone) { setSearchError("Telefon nömrəsini düzgün daxil edin."); return; }
    try {
      setSearching(true);
      setSearchError(null);
      setResultError(null);
      setSelected(null);
      const res = await fetch("/api/result-check/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone: safePhone }) });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? "Nəticələr yüklənmədi.");
      const payload = json as SearchResponse & { ok: true };
      setNormalizedPhone(payload.phone);
      setHistory(Array.isArray(payload.attempts) ? payload.attempts : []);
    } catch (e: any) {
      setHistory([]);
      setNormalizedPhone(safePhone);
      setSearchError(e?.message ?? "Nəticələr yüklənmədi.");
    } finally {
      setSearching(false);
    }
  }

  async function openResult(item: AttemptHistoryItem) {
    if (!normalizedPhone || loadingResultId) return;
    try {
      setLoadingResultId(item.attemptId);
      setResultError(null);
      const res = await fetch("/api/result-check/result", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ attemptId: item.attemptId, phone: normalizedPhone }) });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok || !json?.result) throw new Error(json?.error ?? "Nəticə yüklənmədi.");
      setSelected(json.result as SelectedResult);
      requestAnimationFrame(() => { document.getElementById("result-detail")?.scrollIntoView({ behavior: "smooth", block: "start" }); });
    } catch (e: any) {
      setSelected(null);
      setResultError(e?.message ?? "Nəticə yüklənmədi.");
    } finally {
      setLoadingResultId(null);
    }
  }

  return (
    <main className="min-h-[calc(100vh-72px)] py-10">
      <Container>
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-black/10 bg-white p-6 sm:p-8">
            <h1 className="text-2xl font-bold text-purple-950">Nəticənizi Yoxlayın</h1>
            <p className="mt-2 text-slate-700">Telefon nömrənizi daxil edin. İştirak etdiyiniz imtahanlar burada görünəcək.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="055 555 55 55 və ya +99455 555 55 55" inputMode="tel" autoComplete="tel" className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:border-purple-300" />
              <button type="button" onClick={() => void searchHistory()} disabled={searching} className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-purple-950 disabled:cursor-not-allowed disabled:opacity-60">{searching ? "Yoxlanılır..." : "Nəticənizi Yoxlayın"}</button>
            </div>
            {searchError ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{searchError}</div> : null}
            {normalizedPhone ? <div className="mt-6 rounded-2xl border border-black/10 bg-slate-50 p-4 text-sm text-slate-700"><div className="font-semibold text-purple-950">Telefon:</div><div className="mt-1">{normalizedPhone}</div></div> : null}
            {normalizedPhone && !searchError && history.length === 0 ? <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Bu nömrə ilə tamamlanmış imtahan tapılmadı.</div> : null}
            {history.length > 0 ? (
              <div className="mt-8">
                <h2 className="text-xl font-bold text-purple-950">İştirak etdiyiniz imtahanlar</h2>
                <div className="mt-4 grid gap-3">
                  {history.map((item) => {
                    const isSelected = selected?.attempt.attemptId === item.attemptId;
                    return <button key={item.attemptId} type="button" onClick={() => void openResult(item)} disabled={!item.resultAvailable || Boolean(loadingResultId)} className={`rounded-2xl border p-5 text-left transition ${isSelected ? "border-purple-300 bg-purple-50" : "border-black/10 bg-white"} disabled:cursor-not-allowed disabled:opacity-60`}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div><div className="text-lg font-bold text-purple-950">{item.examTitle}</div><div className="mt-1 text-sm text-slate-700">{CATEGORY_LABELS[item.category] ?? item.category}</div></div>
                        <div className="rounded-full bg-purple-100 px-3 py-1 text-sm font-bold text-purple-950">{item.score} bal</div>
                      </div>
                      <div className="mt-4 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                        <div><span className="font-semibold text-purple-950">Başlama vaxtı:</span> {item.startedAtAz ?? item.startedAt}</div>
                        <div><span className="font-semibold text-purple-950">Bitmə vaxtı:</span> {item.finishedAtAz ?? item.finishedAt ?? "—"}</div>
                      </div>
                      {item.meta ? <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-700"><span className="rounded-full bg-slate-100 px-3 py-1">Düz: {item.meta.correctCount ?? 0}</span><span className="rounded-full bg-slate-100 px-3 py-1">Səhv: {item.meta.wrongCount ?? 0}</span><span className="rounded-full bg-slate-100 px-3 py-1">Boş: {item.meta.unansweredCount ?? 0}</span></div> : null}
                      <div className="mt-4 text-sm font-semibold text-purple-950">{loadingResultId === item.attemptId ? "Nəticə açılır..." : item.resultAvailable ? "Tarixə klikləyin və nəticəni açın" : "Nəticə hazır deyil"}</div>
                    </button>;
                  })}
                </div>
              </div>
            ) : null}
          </div>
          {resultError ? <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{resultError}</div> : null}
          {selected && selectedPayload ? <div id="result-detail" className="mt-8 rounded-2xl border border-black/10 bg-white p-6 sm:p-8"><h2 className="text-2xl font-bold text-purple-950">Nəticə</h2><p className="mt-2 text-slate-700">{selected.attempt.examTitle} · {CATEGORY_LABELS[selected.attempt.category] ?? selected.attempt.category}</p><div className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2"><div><span className="font-semibold text-purple-950">Bitmə vaxtı:</span> {selected.attempt.finishedAtAz ?? selected.attempt.finishedAt ?? "—"}</div><div><span className="font-semibold text-purple-950">Result yaradıldı:</span> {selected.generatedAtAz ?? selected.generatedAt ?? "—"}</div></div><ResultContent category={selected.attempt.category} payload={selectedPayload} /></div> : null}
        </div>
      </Container>
    </main>
  );
}
