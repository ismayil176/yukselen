import type { Metadata } from "next";
import Link from "next/link";
import { noIndexMetadata } from "@/lib/seo";
export const metadata: Metadata = { ...noIndexMetadata, title: "Köhnə imtahan linki" };
export default function LegacyExamPage() { return <main className="min-h-[calc(100vh-72px)] py-10"><div className="mx-auto max-w-2xl rounded-2xl border border-black/10 bg-white p-6"><h1 className="text-2xl font-bold text-purple-950">Köhnə imtahan linki</h1><p className="mt-3 text-slate-700">Bu route əvvəlki versiyadan qalıb və artıq aktiv imtahan axınında istifadə olunmur.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/start" className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold">Yeni imtahana başla</Link><Link href="/" className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold">Ana səhifə</Link></div></div></main>; }
