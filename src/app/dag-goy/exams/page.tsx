"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/Container";
import type { CategoryKey, Exam } from "@/lib/exams";

const categories: { key: CategoryKey; label: string }[] = [
  { key: "general", label: "Ümumi Biliklər" },
  { key: "analytic", label: "Analitik Təhlil" },
  { key: "detail", label: "İdarəetmə Bacarıqları" },
];

export default function AdminExamsPage() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [category, setCategory] = useState<CategoryKey>("general");
  const [title, setTitle] = useState("Sınaq 1");
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => exams.filter((e) => e.category === category), [exams, category]);

  // Optimistic UI update helpers.
  // This avoids needing a full page refresh (and helps with any eventual-consistency delays in storage reads).
  function upsertExam(next: Exam) {
    setExams((prev) => {
      const idx = prev.findIndex((e) => e.id === next.id);
      const merged = idx === -1 ? [next, ...prev] : prev.map((e) => (e.id === next.id ? next : e));
      return merged.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    });
  }

  function removeExam(id: string) {
    setExams((prev) => prev.filter((e) => e.id !== id));
  }

  async function safeJson(res: Response) {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  }

  async function load() {
    const [meRes, jRes] = await Promise.all([
      fetch("/api/dag-goy/me", { cache: "no-store" }),
      fetch("/api/dag-goy/exams", { cache: "no-store" }),
    ]);
    const [me, j] = await Promise.all([safeJson(meRes), safeJson(jRes)]);
    if (!me?.isAdmin) {
      router.replace("/dag-goy/login");
      return;
    }
    setExams(j?.exams ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-[calc(100vh-72px)] py-10">
      <Container>
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-bold">Admin · Sınaqlar</h1>
            <div className="flex flex-wrap gap-2">
              <a
                className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:bg-white"
                href="/dag-goy/attempts"
              >
                İştirakçılar
              </a>
              <a
                className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:bg-white"
                href="/dag-goy/messages"
              >
                Mesajlar
              </a>
              <a
                className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:bg-white"
                href="/dag-goy/2fa"
              >
                2FA
              </a>
              <a
                className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:bg-white"
                href="/dag-goy/security"
              >
                Təhlükəsizlik
              </a>
              <button
                className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:bg-white"
                onClick={async () => {
                  await fetch("/api/dag-goy/logout", { method: "POST" });
                  router.replace("/dag-goy/login");
                }}
              >
                Çıxış
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 rounded-2xl border border-black/10 bg-white p-6 sm:grid-cols-3 backdrop-blur">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">Kateqoriya</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CategoryKey)}
                className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-purple-950"
              >
                {categories.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">Yeni sınaq adı</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-purple-950"
              />
            </label>

            <button
              className="sm:col-span-3 rounded-xl bg-white px-5 py-3 text-sm font-bold text-purple-950 hover:bg-white disabled:opacity-60"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  const res = await fetch("/api/dag-goy/exams", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ category, title }),
                  });
                  const j = await safeJson(res);
                  if (!res.ok || !j?.ok) throw new Error(j?.error || "Xəta");
                  if (j?.exam) upsertExam(j.exam);
                  setTitle("Sınaq " + (filtered.length + 2));
                } catch (e) {
                  alert((e as any)?.message ?? "Xəta");
                } finally {
                  setLoading(false);
                }
              }}
            >
              Sınaq əlavə et
            </button>
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-bold">Siyahı</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((e) => (
                <ExamCard key={e.id} exam={e} onUpdated={upsertExam} onDeleted={removeExam} />
              ))}
              {filtered.length === 0 ? (
                <div className="rounded-2xl border border-black/10 bg-white p-6 text-slate-700">Bu kateqoriyada sınaq yoxdur.</div>
              ) : null}
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}

function ExamCard({
  exam,
  onUpdated,
  onDeleted,
}: {
  exam: Exam;
  onUpdated: (exam: Exam) => void;
  onDeleted: (examId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(exam.instructions);
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(exam.title);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setText(exam.instructions);
    setTitle(exam.title);
  }, [exam.id, exam.instructions, exam.title]);

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6 backdrop-blur">
      {!editingTitle ? (
        <div className="text-lg font-extrabold">{exam.title}</div>
      ) : (
        <div className="grid gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm text-purple-950"
          />
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:bg-white disabled:opacity-60"
              disabled={busy || !title.trim()}
              onClick={async () => {
                setBusy(true);
                try {
                  const res = await fetch("/api/dag-goy/exams", {
                    method: "PATCH",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ examId: exam.id, title }),
                  });
                  const j = await res.json().catch(() => null);
                  if (!res.ok || !j?.ok) throw new Error(j?.error || "Xəta");
                  if (j?.exam) onUpdated(j.exam);
                  setEditingTitle(false);
                } catch (e: any) {
                  alert(e?.message ?? "Xəta");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Yadda saxla
            </button>
            <button
              className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:bg-white"
              disabled={busy}
              onClick={() => {
                setTitle(exam.title);
                setEditingTitle(false);
              }}
            >
              Ləğv et
            </button>
          </div>
        </div>
      )}
      <div className="mt-2 text-xs text-slate-700">ID: {exam.id}</div>

      <div className="mt-5 flex flex-wrap gap-3">
        <a className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-purple-950 hover:bg-white" href={`/dag-goy/exams/${exam.id}`}>
          Suallar
        </a>
        <button
          className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:bg-white"
          onClick={() => setEditingTitle((p) => !p)}
        >
          {editingTitle ? "Adı bağla" : "Adı dəyiş"}
        </button>
        <button
          className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:bg-white"
          onClick={() => setOpen((p) => !p)}
        >
          Təlimatı düzəlt
        </button>
        <button
          className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-white disabled:opacity-60"
          disabled={busy}
          onClick={async () => {
            if (!confirm(`Sınaq silinsin?\n\n${exam.title}\nID: ${exam.id}`)) return;
            setBusy(true);
            try {
              const res = await fetch("/api/dag-goy/exams", {
                method: "DELETE",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ examId: exam.id }),
              });
              const j = await res.json().catch(() => null);
              if (!res.ok || !j?.ok) throw new Error(j?.error || "Xəta");
              onDeleted(exam.id);
            } catch (e: any) {
              alert(e?.message ?? "Xəta");
            } finally {
              setBusy(false);
            }
          }}
        >
          Sil
        </button>
      </div>

      {open ? (
        <div className="mt-4 grid gap-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[140px] rounded-xl border border-black/10 bg-white p-4 text-sm text-slate-900"
          />
          <button
            className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:bg-white"
            onClick={async () => {
              const res = await fetch("/api/dag-goy/exams", {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ examId: exam.id, instructions: text }),
              });
              const textBody = await res.text();
              const j = (() => {
                try {
                  return textBody ? JSON.parse(textBody) : null;
                } catch {
                  return null;
                }
              })();
              if (!res.ok || !j.ok) {
                alert(j?.error || "Xəta");
                return;
              }
              if (j?.exam) onUpdated(j.exam);
              setOpen(false);
            }}
          >
            Yadda saxla
          </button>
        </div>
      ) : null}

      <div className="mt-6 text-sm text-slate-700">
        Link: <span className="font-mono">/{exam.category}/{exam.id}/candidate</span>
      </div>
    </div>
  );
}
