"use client";

import { useEffect, useMemo, useState } from "react";

type AttemptRow = {
  id: string;
  category: string;
  status: string;
  score: number;
  startedAt: string;
  finishedAt?: string;
  seen?: boolean;
  seenAt?: string;
  student: {
    firstName: string;
    lastName: string;
    fatherName: string;
    phone: string;
  };
};

export default function AdminAttempts() {
  const [data, setData] = useState<{ attempts?: AttemptRow[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [updatingSeenId, setUpdatingSeenId] = useState<string | null>(null);

  async function safeJson(res: Response) {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  }

  async function load() {
    setErr(null);
    const [meRes, res] = await Promise.all([
      fetch("/api/dag-goy/me", { cache: "no-store" }),
      fetch("/api/dag-goy/attempts?take=100", { cache: "no-store" }),
    ]);

    const me = await safeJson(meRes);
    if (!me?.isAdmin) {
      window.location.href = "/dag-goy/login";
      return;
    }

    const json = await safeJson(res);
    if (!res.ok) {
      setErr(json?.error || "Xəta");
      return;
    }

    const attempts = Array.isArray(json?.attempts) ? json.attempts : [];
    setData({ attempts });
    setSelectedIds((prev) => prev.filter((id) => attempts.some((item: AttemptRow) => item.id === id)));
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  const attempts = data?.attempts ?? [];
  const allSelected = attempts.length > 0 && selectedIds.length === attempts.length;
  const selectedCount = selectedIds.length;

  function toggleOne(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  function toggleAll() {
    setSelectedIds((prev) => (prev.length === attempts.length ? [] : attempts.map((item) => item.id)));
  }

  async function updateSeen(id: string, seen: boolean) {
    setUpdatingSeenId(id);
    const previousAttempts = data?.attempts ?? [];

    setData((prev) => ({
      attempts: (prev?.attempts ?? []).map((item) => (
        item.id === id
          ? {
              ...item,
              seen,
              seenAt: seen ? new Date().toISOString() : undefined,
            }
          : item
      )),
    }));

    try {
      const res = await fetch("/api/dag-goy/attempts", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, seen }),
      });
      const json = await safeJson(res);
      if (!res.ok || !json?.ok) {
        setData({ attempts: previousAttempts });
        alert(json?.error || "Yadda saxlanmadı");
        return;
      }

      setData((prev) => ({
        attempts: (prev?.attempts ?? []).map((item) => (item.id === id ? json.attempt : item)),
      }));
    } catch {
      setData({ attempts: previousAttempts });
      alert("Yadda saxlanmadı");
    } finally {
      setUpdatingSeenId(null);
    }
  }

  async function deleteSelected() {
    if (selectedIds.length === 0) {
      alert("Silmək üçün ən azı 1 istifadəçi seçin.");
      return;
    }

    const confirmed = confirm(`${selectedIds.length} istifadəçi silinsin?`);
    if (!confirmed) return;

    setDeleting(true);
    try {
      const idsToDelete = [...selectedIds];
      const res = await fetch("/api/dag-goy/attempts", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: idsToDelete }),
      });
      const json = await safeJson(res);
      if (!res.ok || !json?.ok) {
        alert(json?.error || "Silinmədi");
        return;
      }

      setData((prev) => ({
        attempts: (prev?.attempts ?? []).filter((item) => !idsToDelete.includes(item.id)),
      }));
      setSelectedIds([]);
    } finally {
      setDeleting(false);
    }
  }

  const actionLabel = useMemo(() => {
    if (deleting) return "Silinir...";
    if (selectedCount === 0) return "İstifadəçiləri sil";
    return `Seçilənləri sil (${selectedCount})`;
  }, [deleting, selectedCount]);

  return (
    <main className="min-h-[calc(100vh-72px)]">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-purple-950">İştirakçılar</h2>
            <p className="text-sm text-purple-900/70">Son imtahan cəhdləri və nəticələr.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:bg-white" href="/dag-goy/exams">Sınaqlar</a>
            <a className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:bg-white" href="/dag-goy/messages">Mesajlar</a>
            <button className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-60" onClick={deleteSelected} disabled={deleting || selectedCount === 0}>{actionLabel}</button>
            <button className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:bg-white" onClick={load}>Yenilə</button>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm backdrop-blur sm:p-5">
          {err && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>}
          {!data && !err && <div className="text-sm text-purple-900/70">Yüklənir...</div>}
          {data && attempts.length === 0 && <div className="text-sm text-purple-900/70">Hələ iştirakçı yoxdur.</div>}

          {attempts.length > 0 ? (
            <>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/10 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <label className="inline-flex items-center gap-3 font-medium text-purple-950">
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded border border-black/20 accent-purple-700"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Hamısını seç"
                  />
                  Hamısını seç
                </label>
                <div>{selectedCount === 0 ? "Silmək üçün soldakı quşu qoyun, ayrıca Gördüm bölməsi ilə baxdıqlarınızı işarələyə bilərsiniz." : `${selectedCount} istifadəçi seçildi.`}</div>
              </div>

              <div className="mt-4 grid gap-3 md:hidden">
                {attempts.map((a) => {
                  const checked = selectedIds.includes(a.id);
                  return (
                    <div key={a.id} className={`rounded-2xl border p-4 ${checked ? "border-purple-300 bg-purple-50/60" : "border-black/10 bg-slate-50"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <label className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            className="mt-1 h-5 w-5 rounded border border-black/20 accent-purple-700"
                            checked={checked}
                            onChange={() => toggleOne(a.id)}
                            aria-label={`${a.student.firstName} ${a.student.lastName} seç`}
                          />
                          <div>
                            <div className="font-semibold text-purple-950">{a.student.firstName} {a.student.lastName}</div>
                            <div className="mt-1 text-xs text-slate-600">Ata adı: {a.student.fatherName}</div>
                            <div className="mt-1 text-xs text-slate-600">Telefon: {a.student.phone}</div>
                          </div>
                        </label>
                        <div className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-950">{a.score} bal</div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm text-slate-700">
                        <label className="inline-flex items-center gap-2 font-medium text-purple-950">
                          <input
                            type="checkbox"
                            className="h-5 w-5 rounded border border-black/20 accent-emerald-600"
                            checked={Boolean(a.seen)}
                            disabled={updatingSeenId === a.id}
                            onChange={(e) => updateSeen(a.id, e.target.checked)}
                            aria-label={`${a.student.firstName} ${a.student.lastName} görüldü`}
                          />
                          Gördüm
                        </label>
                        <div className="text-xs text-slate-500">{a.seen ? "Baxılıb" : "Yeni"}</div>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm text-slate-700">
                        <div><span className="font-medium">Kateqoriya:</span> {a.category}</div>
                        <div><span className="font-medium">Status:</span> {a.status}</div>
                        <div><span className="font-medium">Başladı:</span> {new Date(a.startedAt).toLocaleString("az-AZ")}</div>
                        <div><span className="font-medium">Bitdi:</span> {a.finishedAt ? new Date(a.finishedAt).toLocaleString("az-AZ") : "—"}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 hidden overflow-x-auto md:block">
                <table className="w-full min-w-[960px] text-sm">
                  <thead className="text-left text-purple-900/70">
                    <tr>
                      <th className="py-2 pr-3">
                        <input
                          type="checkbox"
                          className="h-5 w-5 rounded border border-black/20 accent-purple-700"
                          checked={allSelected}
                          onChange={toggleAll}
                          aria-label="Hamısını seç"
                        />
                      </th>
                      <th className="py-2 pr-3">Tələbə</th>
                      <th className="py-2 pr-3">Gördüm</th>
                      <th className="py-2 pr-3">Telefon</th>
                      <th className="py-2 pr-3">Kateqoriya</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">Bal</th>
                      <th className="py-2 pr-3">Başladı</th>
                      <th className="py-2">Bitdi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.map((a) => {
                      const checked = selectedIds.includes(a.id);
                      return (
                        <tr key={a.id} className={`border-t align-top ${checked ? "border-purple-200 bg-purple-50/60" : "border-black/10"}`}>
                          <td className="py-3 pr-3">
                            <input
                              type="checkbox"
                              className="h-5 w-5 rounded border border-black/20 accent-purple-700"
                              checked={checked}
                              onChange={() => toggleOne(a.id)}
                              aria-label={`${a.student.firstName} ${a.student.lastName} seç`}
                            />
                          </td>
                          <td className="py-3 pr-3">{a.student.firstName} {a.student.lastName} ({a.student.fatherName})</td>
                          <td className="py-3 pr-3">
                            <label className="inline-flex items-center gap-2 font-medium text-purple-950">
                              <input
                                type="checkbox"
                                className="h-5 w-5 rounded border border-black/20 accent-emerald-600"
                                checked={Boolean(a.seen)}
                                disabled={updatingSeenId === a.id}
                                onChange={(e) => updateSeen(a.id, e.target.checked)}
                                aria-label={`${a.student.firstName} ${a.student.lastName} görüldü`}
                              />
                              <span className={`text-xs ${a.seen ? "text-emerald-700" : "text-slate-500"}`}>{a.seen ? "Baxıldı" : "Yeni"}</span>
                            </label>
                          </td>
                          <td className="py-3 pr-3">{a.student.phone}</td>
                          <td className="py-3 pr-3">{a.category}</td>
                          <td className="py-3 pr-3">{a.status}</td>
                          <td className="py-3 pr-3 font-semibold">{a.score}</td>
                          <td className="py-3 pr-3">{new Date(a.startedAt).toLocaleString("az-AZ")}</td>
                          <td className="py-3">{a.finishedAt ? new Date(a.finishedAt).toLocaleString("az-AZ") : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </main>
  );
}
