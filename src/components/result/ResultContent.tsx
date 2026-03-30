"use client";

import { useMemo } from "react";

export type BlockResult = {
  blockId: string;
  title: string;
  total: number;
  correct: number;
  totalPoints: number;
  earnedPoints: number;
  percent: number;
};

export type DetailResult = {
  questionId: string;
  orderIndex: number;
  section: string;
  sectionTitle: string;
  questionText: string;
  selectedOption: string | null;
  selectedText: string | null;
  correctOption: string;
  correctText: string;
  isCorrect: boolean;
  earnedPoints: number;
  possiblePoints: number;
};

export type ResultPayload = {
  summary: {
    score: number;
    totalQuestions: number;
    correctCount: number;
    wrongCount: number;
    unansweredCount: number;
  };
  blocks: BlockResult[];
  details: DetailResult[];
};

export function ResultContent({ category, payload }: { category: string; payload: ResultPayload }) {
  const totals = useMemo(() => {
    if (!payload?.blocks?.length) return { overallPercent: 0, totalPoints: 0, earnedPoints: 0 };
    const totalPoints = payload.blocks.reduce((sum, block) => sum + block.totalPoints, 0);
    const earnedPoints = payload.blocks.reduce((sum, block) => sum + block.earnedPoints, 0);
    return {
      totalPoints,
      earnedPoints,
      overallPercent: totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0,
    };
  }, [payload]);

  const showGeneralCongrats = category === "general" && totals.overallPercent >= 60;

  return (
    <>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Toplam bal" value={String(payload.summary.score)} />
        <MetricCard label="Doğru" value={String(payload.summary.correctCount)} />
        <MetricCard label="Səhv" value={String(payload.summary.wrongCount)} />
        <MetricCard label="Boş" value={String(payload.summary.unansweredCount)} />
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {payload.blocks.map((block) => (
          <div key={block.blockId} className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
            <div className="text-sm font-semibold">{block.title}</div>
            <div className="mt-3 flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="text-3xl font-bold tabular-nums sm:text-4xl">{block.percent}%</div>
              <div className="rounded-full bg-purple-100 px-3 py-1 text-sm font-bold text-purple-950">{block.earnedPoints} / {block.totalPoints} bal</div>
            </div>
            <div className="mt-3 text-sm text-slate-700">{block.correct} / {block.total} sual</div>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 text-slate-700 ring-1 ring-black/5">
          <div className="text-sm font-semibold uppercase tracking-wide text-slate-600">Orta faiz</div>
          <div className="mt-2 text-4xl font-black tabular-nums text-purple-950 sm:text-5xl">{totals.overallPercent}%</div>
          <div className="mt-4 text-sm">
            <span className="font-semibold">Toplanan bal:</span>{" "}
            <span className="text-base font-extrabold tabular-nums text-purple-950">{totals.earnedPoints} / {totals.totalPoints}</span>
          </div>
        </div>
        {showGeneralCongrats ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-sm text-green-900 ring-1 ring-green-100">
            <div className="text-lg font-extrabold">Təbriklər, siz növbəti mərhələyə keçirsiniz.</div>
          </div>
        ) : null}
      </div>
      <div className="mt-8">
        <h2 className="text-xl font-bold text-purple-950">Cavabların müqayisəsi</h2>
        <div className="mt-4 grid gap-3">
          {payload.details.map((item) => (
            <div key={`${item.section}-${item.questionId}`} className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">{item.sectionTitle}</div>
                  <div className="mt-1 text-sm font-bold text-purple-950 sm:text-base">Sual {item.orderIndex}: <span className="whitespace-pre-wrap">{item.questionText}</span></div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.isCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {item.isCorrect ? "Düzgün" : item.selectedOption ? "Səhv" : "Boş"}
                </span>
              </div>
              <div className="mt-4 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sizin cavabınız</div>
                  <div className="mt-2 font-semibold text-slate-900">{item.selectedOption ? `${item.selectedOption}) ${item.selectedText ?? ""}` : "Cavab verilməyib"}</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Düzgün cavab</div>
                  <div className="mt-2 font-semibold text-slate-900">{item.correctOption}) {item.correctText}</div>
                </div>
              </div>
              <div className="mt-3 text-sm text-slate-700">Qazanılan bal: <span className="font-bold text-purple-950">{item.earnedPoints}</span> / {item.possiblePoints}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">{label}</div>
      <div className="mt-3 text-3xl font-extrabold tabular-nums text-purple-950">{value}</div>
    </div>
  );
}
