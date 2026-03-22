"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Exam } from "@/lib/exams";
import {
  ANALYTIC_ABSTRACT_INSTRUCTION,
  ANALYTIC_NUMERIC_INSTRUCTION,
  ANALYTIC_VERBAL_INSTRUCTION,
} from "@/lib/instructionText";
import type { Question, SectionKey } from "@/lib/store";

type PublicQuestion = Omit<Question, "correctIndex">;

export type SectionSubmission = {
  section: SectionKey;
  title: string;
  answers: Array<{ questionId: string; selectedIndex: number | null; orderIndex: number }>;
};

type Props = {
  exam: Exam;
  breakSeconds: number;
  onFinish: (sections: SectionSubmission[]) => void | Promise<void>;
};

type SectionScoreSummary = {
  section: SectionKey;
  title: string;
  earnedPoints: number;
  totalPoints: number;
  percent: number;
};

type Step =
  | { kind: "SECTION"; section: SectionKey; title: string; durationSeconds: number }
  | { kind: "BREAK"; title: string; durationSeconds: number };

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getSectionInstruction(section: SectionKey) {
  if (section.startsWith("VERBAL_")) {
    return {
      title: "Verbal bölmənin təlimatı",
      body: ANALYTIC_VERBAL_INSTRUCTION,
      buttonLabel: "Verbal bölməsinə başla",
    };
  }

  if (section === "ABSTRACT") {
    return {
      title: "Abstrakt bölmənin təlimatı",
      body: ANALYTIC_ABSTRACT_INSTRUCTION,
      buttonLabel: "Abstrakt bölməsinə başla",
    };
  }

  if (section === "NUMERIC") {
    return {
      title: "Rəqəmsal bölmənin təlimatı",
      body: ANALYTIC_NUMERIC_INSTRUCTION,
      buttonLabel: "Rəqəmsal bölməsinə başla",
    };
  }

  return null;
}

function shouldShowAnalyticIntro(section: SectionKey) {
  return section === "VERBAL_1" || section === "ABSTRACT" || section === "NUMERIC";
}

function getSteps(exam: Exam, breakSeconds: number): Step[] {
  if (exam.category === "general") {
    return [
      { kind: "SECTION", section: "BLOK_1", title: "Blok 1 (25 sual)", durationSeconds: 30 * 60 },
      { kind: "BREAK", title: "Fasilə", durationSeconds: breakSeconds },
      { kind: "SECTION", section: "BLOK_2", title: "Blok 2 (25 sual)", durationSeconds: 30 * 60 },
      { kind: "BREAK", title: "Fasilə", durationSeconds: breakSeconds },
      { kind: "SECTION", section: "BLOK_3", title: "Blok 3 (25 sual)", durationSeconds: 30 * 60 },
      { kind: "BREAK", title: "Fasilə", durationSeconds: breakSeconds },
      { kind: "SECTION", section: "BLOK_4", title: "Blok 4 (25 sual)", durationSeconds: 30 * 60 },
    ];
  }

  if (exam.category === "analytic") {
    return [
      { kind: "SECTION", section: "VERBAL_1", title: "Verbal · Mətn 1 (5 sual)", durationSeconds: 12 * 60 },
      { kind: "SECTION", section: "VERBAL_2", title: "Verbal · Mətn 2 (5 sual)", durationSeconds: 12 * 60 },
      { kind: "SECTION", section: "VERBAL_3", title: "Verbal · Mətn 3 (5 sual)", durationSeconds: 12 * 60 },
      { kind: "SECTION", section: "VERBAL_4", title: "Verbal · Mətn 4 (5 sual)", durationSeconds: 12 * 60 },
      { kind: "SECTION", section: "VERBAL_5", title: "Verbal · Mətn 5 (5 sual)", durationSeconds: 12 * 60 },
      { kind: "BREAK", title: "Fasilə", durationSeconds: breakSeconds },
      { kind: "SECTION", section: "ABSTRACT", title: "Abstrakt (25 sual)", durationSeconds: 50 * 60 },
      { kind: "BREAK", title: "Fasilə", durationSeconds: breakSeconds },
      { kind: "SECTION", section: "NUMERIC", title: "Rəqəmsal (25 sual)", durationSeconds: 75 * 60 },
    ];
  }

  return [];
}

export function ExamRunner({ exam, breakSeconds, onFinish }: Props) {
  const steps = useMemo(() => getSteps(exam, breakSeconds), [exam, breakSeconds]);
  const [idx, setIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(() => steps[0]?.durationSeconds ?? 0);
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [passage, setPassage] = useState<string | null>(null);
  const [qIdx, setQIdx] = useState(0);
  const [guardMsg, setGuardMsg] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sectionResults, setSectionResults] = useState<Record<string, SectionScoreSummary>>({});
  const [seenSectionIntros, setSeenSectionIntros] = useState<Record<string, true>>({});

  const attemptStorageKey = useMemo(() => `attempt:${exam.category}:${exam.id}`, [exam.category, exam.id]);
  const timerRef = useRef<number | null>(null);
  const questionAnchorRef = useRef<HTMLDivElement | null>(null);
  const sectionResultsRef = useRef<SectionSubmission[]>([]);

  const step = steps[idx];
  const protectionEnabled = step?.kind === "SECTION";
  const showSectionIntro = Boolean(
    exam.category === "analytic" &&
      step?.kind === "SECTION" &&
      shouldShowAnalyticIntro(step.section) &&
      !seenSectionIntros[step.section]
  );

  useEffect(() => {
    if (!protectionEnabled) {
      document.body.classList.remove("exam-mode");
      setGuardMsg(null);
      return;
    }

    document.body.classList.add("exam-mode");
    setGuardMsg(null);

    const keydownOpts: AddEventListenerOptions = { capture: true };
    const onContextMenu = (e: Event) => e.preventDefault();
    const onCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      setGuardMsg("Kopyalama bu mərhələdə deaktivdir.");
    };

    const onKeyDown = async (e: KeyboardEvent) => {
      const key = (e.key || "").toLowerCase();
      const isPrintScreen = key === "printscreen";
      const isDevTools = (e.ctrlKey || e.metaKey) && e.shiftKey && ["i", "j", "c"].includes(key);
      const isSave = (e.ctrlKey || e.metaKey) && key === "s";
      const isPrint = (e.ctrlKey || e.metaKey) && key === "p";

      if (isPrintScreen || isDevTools || isSave || isPrint) {
        e.preventDefault();
        setGuardMsg("İmtahan zamanı ekran görüntüsü / çıxarış almaq məhdudlaşdırılıb.");
        try {
          if (isPrintScreen && navigator.clipboard?.writeText) await navigator.clipboard.writeText("");
        } catch {}
      }
    };

    const onVisibility = () => {
      if (document.hidden) setGuardMsg("İmtahan aktivdir. Zəhmət olmasa bu səhifəni tərk etmə.");
    };

    const onBeforePrint = () => setGuardMsg("Çap etmək məhdudlaşdırılıb.");

    window.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("copy", onCopy);
    window.addEventListener("cut", onCopy);
    window.addEventListener("keydown", onKeyDown, keydownOpts);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeprint", onBeforePrint);

    return () => {
      document.body.classList.remove("exam-mode");
      window.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("copy", onCopy);
      window.removeEventListener("cut", onCopy);
      window.removeEventListener("keydown", onKeyDown, keydownOpts);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeprint", onBeforePrint);
    };
  }, [protectionEnabled]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!step || step.kind !== "SECTION") {
        setQuestions([]);
        setAnswers({});
        setPassage(null);
        setQIdx(0);
        setLoadErr(null);
        return;
      }

      setLoadErr(null);

      try {
        const questionsUrl = `/api/questions?examId=${encodeURIComponent(exam.id)}&section=${encodeURIComponent(step.section)}`;
        const passageUrl = `/api/verbal?examId=${encodeURIComponent(exam.id)}&section=${encodeURIComponent(step.section)}`;
        const [qRes, pRes] = await Promise.all([
          fetch(questionsUrl, { cache: "no-store" }),
          step.section.startsWith("VERBAL_") ? fetch(passageUrl, { cache: "no-store" }) : Promise.resolve(null),
        ]);

        const qJson = await qRes.json().catch(() => null);
        if (!qRes.ok) throw new Error(qJson?.error ?? "Suallar yüklənmədi");

        const qs = (qJson?.questions ?? []) as PublicQuestion[];
        const pJson = pRes ? await pRes.json().catch(() => null) : null;
        if (pRes && !pRes.ok) throw new Error(pJson?.error ?? "Mətn yüklənmədi");

        if (cancelled) return;
        setQuestions(qs);
        setAnswers({});
        setQIdx(0);
        setPassage(pJson?.passage ?? null);
      } catch (e: any) {
        if (cancelled) return;
        setQuestions([]);
        setAnswers({});
        setPassage(null);
        setQIdx(0);
        setLoadErr(e?.message ?? "Məlumatlar yüklənmədi");
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [exam.id, step]);

  useEffect(() => {
    if (!step) return;
    setTimeLeft(step.durationSeconds);
  }, [step]);

  useEffect(() => {
    if (!step) return;
    if (timerRef.current) window.clearInterval(timerRef.current);

    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [showSectionIntro, step]);

  useEffect(() => {
    if (!step || timeLeft > 0) return;
    if (step.kind === "BREAK") {
      goNext();
      return;
    }
    void finalizeSection(step.section, step.title);
  }, [step, timeLeft]);

  useEffect(() => {
    if (!step || step.kind !== "SECTION") return;
    const el = questionAnchorRef.current;
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 108;
    window.scrollTo({ top: Math.max(y, 0), behavior: "smooth" });
  }, [qIdx, step]);

  function buildSectionSubmission(section: SectionKey, title: string): SectionSubmission {
    return {
      section,
      title,
      answers: questions.map((q, index) => ({
        questionId: q.id,
        selectedIndex: typeof answers[q.id] === "number" ? answers[q.id] : null,
        orderIndex: index + 1,
      })),
    };
  }

  async function fetchSectionResult(submission: SectionSubmission): Promise<SectionScoreSummary | null> {
    const attemptId = sessionStorage.getItem(attemptStorageKey);
    if (!attemptId) return null;

    const res = await fetch("/api/attempts/section-result", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ attemptId, examId: exam.id, section: submission }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok || !json?.sectionResult) return null;

    return {
      section: submission.section,
      title: json.sectionResult.title ?? submission.title,
      earnedPoints: json.sectionResult.earnedPoints ?? 0,
      totalPoints: json.sectionResult.totalPoints ?? 0,
      percent: json.sectionResult.percent ?? 0,
    };
  }

  async function finalizeSection(section: SectionKey, title: string) {
    const submission = buildSectionSubmission(section, title);
    const nextSections = [...sectionResultsRef.current, submission];
    sectionResultsRef.current = nextSections;

    if (exam.category === "general") {
      const summary = await fetchSectionResult(submission).catch(() => null);
      if (summary) {
        setSectionResults((prev) => ({ ...prev, [section]: summary }));
      }
    }

    const isLastStep = idx >= steps.length - 1;

    if (isLastStep) {
      setSubmitting(true);
      try {
        await onFinish(nextSections);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    goNext();
  }

  function goNext() {
    setIdx((prev) => (prev + 1 >= steps.length ? prev : prev + 1));
  }

  function nextSectionLabel() {
    if (!step || step.kind !== "SECTION") return "Digər bloka keç";
    if (step.section.startsWith("VERBAL_") && step.section !== "VERBAL_5") return "Digər mətnə keç";
    if (idx >= steps.length - 1) return "İmtahanı bitir";
    if (exam.category === "analytic") {
      if (step.section === "VERBAL_5") return "Abstrakt bölməsinə keç";
      if (step.section === "ABSTRACT") return "Rəqəmsal bölməyə keç";
      return "Digər bölməyə keç";
    }
    return "Digər bloka keç";
  }

  if (!step) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-black/10 bg-white p-4 sm:p-6 lg:p-8">
        <div className="text-lg font-bold">İmtahan tapılmadı</div>
      </div>
    );
  }

  const timerPanel = (
    <div className="sticky top-3 z-20 mb-6 rounded-2xl border border-black/10 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm text-slate-700">{exam.title}</div>
          <div className="mt-1 text-xl font-extrabold text-purple-950">{step.title}</div>
        </div>
        <div className="rounded-2xl bg-purple-100 px-4 py-3 text-left sm:px-5 sm:text-right">
          <div className="text-xs font-semibold uppercase tracking-wide text-purple-950/70">Vaxt</div>
          <div className="mt-1 text-2xl font-extrabold tabular-nums text-purple-950">{formatTime(timeLeft)}</div>
        </div>
      </div>
    </div>
  );

  if (step.kind === "BREAK") {
    const mins = Math.max(0, Math.round((breakSeconds || step.durationSeconds) / 60));
    const isAnalytic = exam.category === "analytic";
    const previousStep = idx > 0 ? steps[idx - 1] : null;
    const previousSummary = !isAnalytic && previousStep?.kind === "SECTION" ? sectionResults[previousStep.section] : null;
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-black/10 bg-white p-4 sm:p-6 lg:p-8">
        {timerPanel}
        <div className="rounded-2xl bg-white p-5 text-sm text-slate-700">
          <div className="text-base font-extrabold text-purple-950">{isAnalytic ? "Bölmələrarası fasilə" : "Bloklararası fasilə"}</div>
          <div className="mt-3 leading-7">
            Bu fasilə {mins} dəqiqədir. İstəyirsinizsə, gözləmədən dərhal növbəti {isAnalytic ? "bölməyə" : "bloka"} keçə bilərsiniz.
          </div>
        </div>
        {previousSummary ? (
          <div className="mt-4 rounded-2xl border border-purple-100 bg-purple-50 p-5">
            <div className="text-sm font-semibold uppercase tracking-wide text-purple-950/70">Blok nəticəsi</div>
            <div className="mt-2 text-lg font-extrabold text-purple-950">{previousSummary.title}</div>
            <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="rounded-full bg-white px-4 py-2 text-base font-extrabold text-purple-950 ring-1 ring-purple-100">
                {previousSummary.earnedPoints} / {previousSummary.totalPoints} bal
              </div>
              <div className="text-3xl font-black tabular-nums text-purple-950">{previousSummary.percent}%</div>
            </div>
          </div>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-purple-950 hover:bg-white"
            onClick={() => goNext()}
          >
            {isAnalytic ? "Növbəti bölməyə keç" : "Növbəti bloka keç"}
          </button>
        </div>
      </div>
    );
  }

  const sectionInstruction = getSectionInstruction(step.section);

  if (showSectionIntro && sectionInstruction) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-black/10 bg-white p-4 sm:p-6 lg:p-8">
        {timerPanel}
        <div className="rounded-2xl border border-black/10 bg-white p-5 text-sm leading-7 text-slate-700">
          <div className="text-base font-extrabold text-purple-950">{sectionInstruction.title}</div>
          <p className="mt-3 whitespace-pre-wrap">{sectionInstruction.body}</p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-purple-950 hover:bg-white"
            onClick={() => setSeenSectionIntros((prev) => ({ ...prev, [step.section]: true }))}
          >
            {sectionInstruction.buttonLabel}
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[qIdx];
  const totalQ = questions.length;
  const canPrev = qIdx > 0;
  const canNext = qIdx < totalQ - 1;

  return (
    <div className="relative mx-auto max-w-3xl rounded-2xl border border-black/10 bg-white p-4 sm:p-6 lg:p-8">
      {guardMsg ? (
        <div className="mb-4 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-purple-950">
          {guardMsg}
          <button
            type="button"
            className="ml-3 inline-flex rounded-xl border border-black/10 bg-white px-3 py-1 text-xs font-bold"
            onClick={() => setGuardMsg(null)}
          >
            Bağla
          </button>
        </div>
      ) : null}

      {timerPanel}

      <div className="space-y-4">
        {passage ? (
          <div className="rounded-2xl border border-black/10 bg-white p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">Mətn</div>
            <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{passage}</div>
          </div>
        ) : null}

        {loadErr ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{loadErr}</div>
        ) : questions.length === 0 ? (
          <div className="rounded-2xl bg-white p-5 text-sm text-slate-700">Bu bölmə üçün sual əlavə edilməyib.</div>
        ) : (
          <div className="rounded-2xl bg-white p-4 sm:p-5">
            <div ref={questionAnchorRef} className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="inline-flex rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-950">
                  {(currentQ?.score ?? 1) as number} bal
                </div>
                <div className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-purple-950 sm:text-base">
                  {qIdx + 1}. {currentQ?.text}
                </div>
              </div>
              <div className="shrink-0 text-xs font-semibold text-slate-700">Sual {qIdx + 1} / {totalQ}</div>
            </div>

            {(currentQ as PublicQuestion & { image?: string })?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={(currentQ as PublicQuestion & { image?: string }).image as string}
                alt="question"
                className="mt-3 max-h-72 w-auto max-w-full rounded-xl border border-black/10"
              />
            ) : null}

            <div className="mt-4 grid gap-2">
              {currentQ?.options.map((opt, optionIndex) => (
                <label
                  key={optionIndex}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 hover:bg-white"
                >
                  <input
                    type="radio"
                    name={currentQ.id}
                    checked={answers[currentQ.id] === optionIndex}
                    onChange={() => setAnswers((prev) => ({ ...prev, [currentQ.id]: optionIndex }))}
                    className="mt-1"
                  />
                  <span className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{opt}</span>
                </label>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                className="w-full rounded-xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-purple-950 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                disabled={!canPrev}
                onClick={() => setQIdx((prev) => Math.max(0, prev - 1))}
              >
                Əvvəlki
              </button>
              <button
                type="button"
                className="w-full rounded-xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-purple-950 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                disabled={!canNext}
                onClick={() => setQIdx((prev) => Math.min(totalQ - 1, prev + 1))}
              >
                İrəli
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          className="w-full rounded-xl bg-white px-5 py-3 text-sm font-semibold text-purple-950 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          onClick={() => void finalizeSection(step.section, step.title)}
          disabled={submitting}
        >
          {submitting ? "Yekunlaşdırılır..." : nextSectionLabel()}
        </button>
      </div>
    </div>
  );
}
