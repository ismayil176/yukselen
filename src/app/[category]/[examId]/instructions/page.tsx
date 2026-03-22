import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/Container";
import { getExam } from "@/lib/exams";
import { getExamMeta } from "@/lib/examMeta";
import { ANALYTIC_OVERVIEW_INSTRUCTION } from "@/lib/instructionText";
import { isCanonicalExamCategoryRoute } from "@/lib/routeCategory";

const backMap: Record<string, string> = {
  general: "umumi-bilikler",
  analytic: "analitik-tehlil",
  detail: "idareetme-bacariqlari",
};

export default async function InstructionsPage({ params }: { params: { category: string; examId: string } }) {
  const exam = await getExam(params.examId);
  if (!exam || !isCanonicalExamCategoryRoute(params.category, exam.category)) return notFound();

  const meta = getExamMeta(exam.category);
  const back = backMap[exam.category] ?? params.category;
  const isGeneral = exam.category === "general";

  return (
    <main className="py-10">
      <Container>
        <div className="mx-auto max-w-3xl rounded-2xl border border-black/10 bg-white p-4 sm:p-6 lg:p-8">
          <h1 className="text-2xl font-bold text-purple-950">Təlimat</h1>
          <p className="mt-2 text-slate-700">{exam.title}</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Info label="İmtahanın müddəti" value={meta.durationLabel} />
            <Info label="İmtahanın quruluşu" value={meta.examCountLabel} />
          </div>

          {isGeneral ? (
            <div className="mt-6 rounded-2xl border border-purple-200 bg-purple-50 p-5 text-sm leading-7 text-purple-950">
              <div className="text-base font-extrabold">Ümumi Biliklər üçün vacib qaydalar</div>
              <ul className="mt-3 list-disc space-y-1 pl-5">
                <li>4 blokun hər biri üçün ayrıca 30 dəqiqə vaxt ayrılır.</li>
                <li>Ümumi həll vaxtı 120 dəqiqədir.</li>
                <li>Bloklar arasında 3 dəfə, hərəsi 6 dəqiqə olmaqla toplam 18 dəqiqə fasilə verilir.</li>
                <li>Timer imtahan boyu ekranın yuxarı hissəsində həmişə görünür.</li>
                <li>İstəyirsinizsə, fasiləni gözləmədən dərhal növbəti bloka keçə bilərsiniz.</li>
              </ul>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-black/10 bg-slate-50 p-5 text-sm leading-7 text-slate-700">
              <div className="text-base font-extrabold text-purple-950">Analitik Təhlil üzrə ümumi təlimat</div>
              <p className="mt-3 whitespace-pre-wrap">{ANALYTIC_OVERVIEW_INSTRUCTION}</p>
            </div>
          )}

          {isGeneral ? (
            <div className="mt-6 rounded-2xl border border-black/10 bg-slate-50 p-5 text-sm leading-7 text-slate-700">
              <div className="text-base font-extrabold text-purple-950">Sınaq üçün saxlanmış mətn</div>
              <p className="mt-3 whitespace-pre-wrap">{exam.instructions}</p>
            </div>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={`/${exam.category}/${exam.id}/run`}
              className="w-full rounded-xl bg-white px-5 py-3 text-sm font-semibold text-purple-950 hover:bg-white sm:w-auto"
            >
              İmtahana başla
            </Link>
            <Link
              href={`/start/${back}`}
              className="w-full rounded-xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-purple-950 hover:bg-white sm:w-auto"
            >
              Geri
            </Link>
          </div>
        </div>
      </Container>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  if (!value || value === "—") return null;
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">{label}</div>
      <div className="mt-2 text-sm font-bold text-purple-950">{value}</div>
    </div>
  );
}

