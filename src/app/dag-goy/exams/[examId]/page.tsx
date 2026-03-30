"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Container } from "@/components/Container";
import type { Exam, SectionKey } from "@/lib/store";

type Q = {
  id: string;
  examId: string;
  section: SectionKey;
  text: string;
  score: number;
  imageKey?: string | null;
  image?: string | null;
  imageUrl?: string | null;
  options: [string, string, string, string, string];
  correctIndex: number;
};

function sectionLabel(section: SectionKey) {
  if (section.startsWith("BLOK_")) return section.replace("BLOK_", "Blok ");
  if (section.startsWith("VERBAL_")) return section.replace("VERBAL_", "Verbal · Mətn ");
  if (section === "ABSTRACT") return "Abstrakt";
  if (section === "NUMERIC") return "Rəqəmsal";
  return section;
}

function expectedCount(examCategory: Exam["category"], section: SectionKey) {
  if (examCategory === "general") return 25;
  if (examCategory === "analytic") {
    if (section.startsWith("VERBAL_")) return 5;
    if (section === "ABSTRACT") return 25;
    if (section === "NUMERIC") return 25;
  }
  return 0;
}

export default function AdminExamDetailPage() {
  const router = useRouter();
  const params = useParams<{ examId: string }>();
  const examId = params.examId;

  const [exam, setExam] = useState<Exam | null>(null);
  const [section, setSection] = useState<SectionKey>("BLOK_1");
  const [questions, setQuestions] = useState<Q[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // passage (only for VERBAL)
  const [passage, setPassage] = useState<string>("");
  const [passageLoaded, setPassageLoaded] = useState(false);

  // new question form
  const [qText, setQText] = useState("");
  const [opts, setOpts] = useState<string[]>(["", "", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [score, setScore] = useState<number>(1);
  const [imageKey, setImageKey] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const sections = useMemo<SectionKey[]>(() => {
    if (!exam) return ["BLOK_1", "BLOK_2", "BLOK_3", "BLOK_4"];
    if (exam.category === "general") return ["BLOK_1", "BLOK_2", "BLOK_3", "BLOK_4"];
    if (exam.category === "analytic")
      return ["VERBAL_1", "VERBAL_2", "VERBAL_3", "VERBAL_4", "VERBAL_5", "ABSTRACT", "NUMERIC"];
    return [];
  }, [exam]);

  useEffect(() => {
    fetch("/api/dag-goy/me", { cache: "no-store" })
      .then(async (r) => {
        const j = await r.json().catch(() => null);
        if (!j?.isAdmin) router.replace("/dag-goy/login");
      })
      .catch(() => {
        router.replace("/dag-goy/login");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function safeJson(res: Response) {
    const t = await res.text();
    try {
      return t ? JSON.parse(t) : null;
    } catch {
      return null;
    }
  }

  async function loadExam() {
    const res = await fetch(`/api/dag-goy/exam?examId=${encodeURIComponent(examId)}`, { cache: "no-store" });
    const j = await safeJson(res);
    if (!res.ok) throw new Error(j?.error || "Exam yüklənmədi");
    setExam(j.exam);
  }

  async function loadQuestions(selectedSection: SectionKey) {
    setLoading(true);
    setErr(null);
    setMsg(null);

    const res = await fetch(
      `/api/dag-goy/exams/${encodeURIComponent(examId)}/questions?section=${encodeURIComponent(selectedSection)}`,
      { cache: "no-store" }
    );
    const j = await safeJson(res);
    setLoading(false);

    if (!res.ok) {
      setErr(j?.error || "Suallar yüklənmədi");
      setQuestions([]);
      return;
    }
    setQuestions(j.questions || []);
  }

  async function loadPassage(selectedSection: SectionKey) {
    if (!selectedSection.startsWith("VERBAL_")) {
      setPassage("");
      setPassageLoaded(false);
      return;
    }

    const res = await fetch(
      `/api/dag-goy/exams/${encodeURIComponent(examId)}/passage?section=${encodeURIComponent(selectedSection)}`,
      { cache: "no-store" }
    );
    const j = await safeJson(res);
    if (!res.ok) {
      setPassage("");
      setPassageLoaded(true);
      return;
    }
    setPassage(j?.passage?.text ?? "");
    setPassageLoaded(true);
  }

  async function loadAll(selectedSection: SectionKey) {
    try {
      await loadExam();
      await Promise.all([loadQuestions(selectedSection), loadPassage(selectedSection)]);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  }

  useEffect(() => {
    // initial load: first section depends on category (after exam loads)
    (async () => {
      try {
        await loadExam();
      } catch (e: any) {
        setErr(e?.message ?? String(e));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  useEffect(() => {
    if (!exam) return;
    const initial = sections[0];
    setSection(initial);
    loadAll(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam?.id]);

  async function savePassage() {
    if (!section.startsWith("VERBAL_")) return;
    const res = await fetch(`/api/dag-goy/exams/${encodeURIComponent(examId)}/passage`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ section, text: passage }),
    });
    const j = await safeJson(res);
    if (!res.ok) {
      alert(j?.error || "Yadda saxlanmadı");
      return;
    }
    setMsg("Mətn yadda saxlanıldı ✅");
  }

  async function addOrUpdateQuestion() {
    setMsg(null);
    setErr(null);

    const cleanText = qText.trim();
    const cleanOpts = opts.map((x) => x.trim());

    if (!cleanText) {
      setErr("Sual mətni boş ola bilməz");
      return;
    }
    if (cleanOpts.some((x) => !x)) {
      setErr("5 cavab variantını doldur");
      return;
    }
    if (!Number.isFinite(score) || score <= 0) {
      setErr("Bal 0-dan böyük olmalıdır");
      return;
    }

    const isEdit = Boolean(editingId);
    const url = isEdit
      ? `/api/dag-goy/exams/${encodeURIComponent(examId)}/questions/${encodeURIComponent(editingId!)}`
      : `/api/dag-goy/exams/${encodeURIComponent(examId)}/questions`;

    const res = await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        section,
        text: cleanText,
        options: cleanOpts,
        correctIndex,
        score,
        imageKey,
        imageUrl: imagePreviewUrl,
      }),
    });
    const j = await safeJson(res);
    if (!res.ok) {
      setErr(j?.error || (isEdit ? "Yadda saxlanmadı" : "Əlavə olunmadı"));
      return;
    }

    // Optimistic UI update (avoid waiting for eventual-consistency reads)
    if (j?.question) {
      const nextQ = j.question as Q;
      setQuestions((prev) => {
        const idx = prev.findIndex((x) => x.id === nextQ.id);
        const merged = idx === -1 ? [nextQ, ...prev] : prev.map((x) => (x.id === nextQ.id ? nextQ : x));
        return merged;
      });
    }

    setQText("");
    setOpts(["", "", "", "", ""]);
    setCorrectIndex(0);
    setScore(1);
    setImageKey(null);
    setImagePreviewUrl(null);
    setEditingId(null);
    setMsg(isEdit ? "Sual yeniləndi ✅" : "Sual əlavə olundu ✅");
    // Keep a background refresh just in case, but UI is already updated.
    loadQuestions(section).catch(() => void 0);
  }

  function startEdit(q: Q) {
    setEditingId(q.id);
    setQText(q.text);
    setOpts([...q.options]);
    setCorrectIndex(q.correctIndex);
    setScore(q.score ?? 1);
    const k = (q as any).imageKey ?? null;
    setImageKey(k);
    setImagePreviewUrl(q.imageUrl ?? q.image ?? null);
    setMsg(null);
    setErr(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setQText("");
    setOpts(["", "", "", "", ""]);
    setCorrectIndex(0);
    setScore(1);
    setImageKey(null);
    setImagePreviewUrl(null);
  }

  async function onPickImage(file: File | null) {
    if (!file) {
      setImageKey(null);
      setImagePreviewUrl(null);
      return;
    }

    setMsg(null);
    setErr(null);

    // Client-side compress/convert to WEBP to keep payloads small.
    async function toWebpBlob(input: File): Promise<Blob> {
      const img = document.createElement("img");
      const url = URL.createObjectURL(input);
      img.src = url;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Şəkil oxunmadı"));
      });

      const maxW = 1400;
      const scale = img.width > maxW ? maxW / img.width : 1;
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas error");
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);

      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
      if (!blob) throw new Error("WEBP çevrilmədi");
      return blob;
    }

    try {
      const webp = await toWebpBlob(file);
      const fd = new FormData();
      fd.append("file", new File([webp], "question.webp", { type: "image/webp" }));

      const res = await fetch("/api/dag-goy/images", { method: "POST", body: fd });
      const j = await safeJson(res);
      if (!res.ok) throw new Error(j?.error || "Şəkil yüklənmədi");

      setImageKey(j.imageKey);
      setImagePreviewUrl(j.imageUrl);
      setMsg("Şəkil əlavə olundu ✅");
    } catch (e: any) {
      setErr(e?.message || "Şəkil yüklənmədi");
    }
  }

  async function removeQuestion(id: string) {
    if (!confirm("Bu sual silinsin?")) return;
    const res = await fetch(`/api/dag-goy/exams/${encodeURIComponent(examId)}/questions/${id}`, { method: "DELETE" });
    const j = await safeJson(res);
    if (!res.ok) {
      alert(j?.error || "Silinmədi");
      return;
    }
    setMsg("Sual silindi ✅");
    setQuestions((prev) => prev.filter((x) => x.id !== id));
    loadQuestions(section).catch(() => void 0);
  }

  if (!exam) {
    return (
      <main className="min-h-[calc(100vh-72px)] py-10">
        <Container>
          <div className="mx-auto max-w-5xl rounded-2xl border border-black/10 bg-white p-8">
            <div className="text-slate-700">Yüklənir...</div>
            {err ? <div className="mt-3 text-red-700 text-sm">{err}</div> : null}
          </div>
        </Container>
      </main>
    );
  }

  const expected = expectedCount(exam.category, section);

  return (
    <main className="min-h-[calc(100vh-72px)] py-10">
      <Container>
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold">{exam.title} · Suallar</h1>
              <div className="mt-1 text-sm text-slate-700">
                Kateqoriya: <span className="font-semibold">{exam.category}</span> · ID: <span className="font-mono">{exam.id}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <a className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:bg-white" href="/dag-goy/exams">
                ← Sınaqlar
              </a>
              <a
                className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-purple-950 hover:bg-white"
                href={`/${exam.category}/${exam.id}/candidate`}
                target="_blank"
                rel="noreferrer"
              >
                Candidate link
              </a>
            </div>
          </div>

          <div className="mt-6 grid gap-4 rounded-2xl border border-black/10 bg-white p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">Bölmə</span>
                <select
                  className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-purple-950"
                  value={section}
                  onChange={async (e) => {
                    const s = e.target.value as SectionKey;
                    setSection(s);
                    setMsg(null);
                    setErr(null);
                    await Promise.all([loadQuestions(s), loadPassage(s)]);
                  }}
                >
                  {sections.map((s) => (
                    <option key={s} value={s}>
                      {sectionLabel(s)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-2xl bg-white px-5 py-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">Say</div>
                <div className="mt-1 text-lg font-extrabold">
                  {questions.length}
                  {expected ? <span className="text-slate-700"> / {expected}</span> : null}
                </div>
              </div>
            </div>

            {err ? <div className="text-red-700 text-sm">{err}</div> : null}
            {msg ? <div className="text-emerald-700 text-sm font-semibold">{msg}</div> : null}

            {section.startsWith("VERBAL_") ? (
              <div className="rounded-2xl border border-black/10 bg-white p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="font-bold">Verbal Mətn</div>
                  <button
                    className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-purple-950 hover:bg-white"
                    onClick={savePassage}
                    disabled={!passageLoaded}
                  >
                    Mətni yadda saxla
                  </button>
                </div>
                <textarea
                  className="mt-3 min-h-[140px] w-full rounded-xl border border-black/10 bg-white p-4 text-sm text-slate-900"
                  value={passage}
                  onChange={(e) => setPassage(e.target.value)}
                  placeholder="Bu mətni imtahanda suallardan əvvəl göstərəcəyik…"
                />
              </div>
            ) : null}

            <div className="grid gap-3 rounded-2xl border border-black/10 bg-white p-5">
              <div className="font-bold">Yeni sual əlavə et</div>
              <div className="grid gap-2">
                <textarea
                  className="min-h-[120px] w-full rounded-xl border border-black/10 bg-white p-4 text-sm text-slate-900"
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  placeholder="Sual mətni…"
                />
                <div className="text-xs text-slate-600">Enter ilə yazdığın sətirlər qorunur və saytda alt-alta görünəcək.</div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-xs text-slate-700">Bal (hər sual üçün)</span>
                  <input
                    type="number"
                    min={1}
                    className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-purple-950"
                    value={score}
                    onChange={(e) => setScore(Number(e.target.value))}
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs text-slate-700">Şəkil </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-purple-950"
                    onChange={(e) => onPickImage(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              {imagePreviewUrl ? (
                <div className="rounded-2xl border border-black/10 bg-white p-4">
                  <div className="text-xs text-slate-700">Ön baxış</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreviewUrl} alt="question" className="mt-2 max-h-56 w-auto rounded-xl" />
                  <button
                    type="button"
                    className="mt-3 rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-purple-950 hover:bg-white"
                    onClick={() => {
                      setImageKey(null);
                      setImagePreviewUrl(null);
                    }}
                  >
                    Şəkli sil
                  </button>
                </div>
              ) : null}

              <div className="grid gap-2 sm:grid-cols-2">
                {opts.map((v, i) => (
                  <label key={i} className="grid gap-1">
                    <span className="text-xs text-slate-700">Variant {String.fromCharCode(65 + i)}</span>
                    <input
                      className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-purple-950"
                      value={v}
                      onChange={(e) => {
                        const next = [...opts];
                        next[i] = e.target.value;
                        setOpts(next);
                      }}
                    />
                  </label>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">Düzgün cavab</span>
                  <select
                    className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-purple-950"
                    value={correctIndex}
                    onChange={(e) => setCorrectIndex(Number(e.target.value))}
                  >
                    {[0, 1, 2, 3, 4].map((i) => (
                      <option key={i} value={i}>
                        {String.fromCharCode(65 + i)}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-purple-950 hover:bg-white"
                  onClick={addOrUpdateQuestion}
                >
                  {editingId ? "Yadda saxla" : "Əlavə et"}
                </button>

                {editingId ? (
                  <button
                    type="button"
                    className="rounded-xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-purple-950 hover:bg-white"
                    onClick={cancelEdit}
                  >
                    Ləğv et
                  </button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3">
              <div className="font-bold">Bu bölmənin sualları</div>
              {loading ? (
                <div className="text-sm text-slate-700">Yüklənir…</div>
              ) : questions.length === 0 ? (
                <div className="rounded-2xl bg-white p-5 text-sm text-slate-700">Hələ sual yoxdur.</div>
              ) : (
                questions.map((q, idx) => (
                  <div key={q.id} className="rounded-2xl border border-black/10 bg-white p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="space-y-2">
                          <div className="inline-flex rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-950">{q.score} bal</div>
                          <div className="whitespace-pre-wrap text-sm font-semibold leading-relaxed text-purple-950">{idx + 1}. {q.text}</div>
                        </div>

                        {q.imageUrl || q.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={(q.imageUrl ?? q.image) as string}
                            alt="question"
                            className="mt-3 max-h-56 w-auto rounded-xl border border-black/10"
                          />
                        ) : null}

                        <div className="mt-3 grid gap-2">
                          {q.options.map((o, oi) => (
                            <div
                              key={oi}
                              className={`rounded-xl border px-4 py-2 text-sm ${
                                oi === q.correctIndex
                                  ? "border-emerald-400/40 bg-emerald-400/10"
                                  : "border-black/10 bg-white"
                              }`}
                            >
                              <span className="mr-2 text-slate-700">{String.fromCharCode(65 + oi)}.</span>
                              <span className="whitespace-pre-wrap">{o}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="shrink-0 flex flex-col gap-2">
                        <button
                          className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-purple-950 hover:bg-white"
                          onClick={() => startEdit(q)}
                        >
                          Edit
                        </button>
                        <button
                          className="rounded-xl border border-red-500/30 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 active:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-300"
                          onClick={() => removeQuestion(q.id)}
                        >
                          Sil
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}
