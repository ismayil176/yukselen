"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Container } from "@/components/Container";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function safeJson(res: Response) {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  }

  return (
    <main className="min-h-[calc(100vh-72px)] py-10">
      <Container>
        <div className="mx-auto max-w-md rounded-2xl border border-black/10 bg-white p-8 backdrop-blur">
          <h1 className="text-2xl font-bold">Admin giriş</h1>
          <p className="mt-2 text-slate-700">İstifadəçi adı, şifrə və (aktivdirsə) 2FA kodu daxil et.</p>

          <div className="mt-6 grid gap-3">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              type="text"
              placeholder="İstifadəçi adı"
              className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-purple-950 outline-none focus:border-black/10"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Şifrə"
              className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-purple-950 outline-none focus:border-black/10"
            />
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              inputMode="numeric"
              placeholder="2FA kod (6 rəqəm)"
              className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-purple-950 outline-none focus:border-black/10"
            />
            {err ? <div className="text-sm text-red-700">{err}</div> : null}
          </div>

          <button
            className="mt-6 w-full rounded-xl bg-white px-5 py-3 text-sm font-bold text-purple-950 hover:bg-white disabled:opacity-60"
            disabled={loading}
            onClick={async () => {
              setErr(null);
              setLoading(true);
              try {
                const res = await fetch("/api/dag-goy/login", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ username, password, otp }),
                });
                const j = await safeJson(res);
                if (!res.ok || !j?.ok) {
                  const msg = j?.error || `Giriş alınmadı (HTTP ${res.status})`;
                  throw new Error(msg);
                }
                router.replace("/dag-goy/exams");
              } catch (e: any) {
                setErr(e?.message ?? "Xəta");
              } finally {
                setLoading(false);
              }
            }}
          >
            Daxil ol
          </button>
        </div>
      </Container>
    </main>
  );
}
