import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/Container";
import { ANALYTIC_OVERVIEW_INSTRUCTION } from "@/lib/instructionText";
import { listExams, type CategoryKey } from "@/lib/exams";
import { pageMetadata } from "@/lib/seo";

type RouteCat = "umumi-bilikler" | "analitik-tehlil" | "idareetme-bacariqlari";

const mapToDb: Record<RouteCat, CategoryKey> = {
  "umumi-bilikler": "general",
  "analitik-tehlil": "analytic",
  "idareetme-bacariqlari": "detail",
};

const titles: Record<RouteCat, string> = {
  "umumi-bilikler": "Ümumi Biliklər",
  "analitik-tehlil": "Analitik Təhlil",
  "idareetme-bacariqlari": "İdarəetmə Bacarıqları",
};

const descriptions: Record<RouteCat, string> = {
  "umumi-bilikler": "Ümumi Biliklər sınaqları, imtahan qaydaları və mövcud test seçimləri.",
  "analitik-tehlil": "Analitik Təhlil sınaqları, verbal, abstrakt və rəqəmsal bölmələr üzrə təlimatlar.",
  "idareetme-bacariqlari": "İdarəetmə Bacarıqları mərhələsi üçün gələcəkdə əlavə olunacaq sınaqlar haqqında məlumat.",
};

export async function generateMetadata({ params }: { params: { category: string } }): Promise<Metadata> {
  const cat = params.category as RouteCat;
  if (!mapToDb[cat]) return { title: "Səhifə tapılmadı", robots: { index: false, follow: false } };
  if (cat === "idareetme-bacariqlari") {
    return {
      title: titles[cat],
      description: descriptions[cat],
      robots: { index: false, follow: false },
      alternates: { canonical: `/start/${cat}` },
    };
  }
  return pageMetadata({ title: titles[cat], description: descriptions[cat], path: `/start/${cat}` });
}

export default async function StartCategoryPage({ params }: { params: { category: string } }) {
  const cat = params.category as RouteCat;
  if (!mapToDb[cat]) return notFound();

  if (cat === "idareetme-bacariqlari") {
    return (
      <main className="min-h-[calc(100vh-72px)] py-10">
        <Container>
          <div className="mx-auto max-w-3xl rounded-2xl border border-black/10 bg-white p-4 sm:p-6 lg:p-8">
            <h1 className="text-2xl font-bold">{titles[cat]}</h1>
            <p className="mt-3 text-slate-700">Bu bölmə hələ hazır deyil. Gələcəkdə əlavə olunacaq.</p>
            <div className="mt-6">
              <Link href="/start" className="text-sm underline">
                ← Geri
              </Link>
            </div>
          </div>
        </Container>
      </main>
    );
  }

  const dbCat = mapToDb[cat];
  const exams = await listExams(dbCat);

  const rulesGeneral = (
    <div className="mt-6 rounded-2xl border border-black/10 bg-white p-6">
      <h2 className="text-lg font-bold">İmtahan qaydaları</h2>
      <p className="mt-3 text-slate-700">
        Ümumi Biliklər üzrə sınaq imtahanında iştirakçılar 4 blokun hər birində 25 sual olmaqla toplam 100 sualla qarşılaşırlar.
        Hər bloka 30 dəqiqə vaxt ayrılır. Ümumi həll vaxtı 120 dəqiqədir. Bloklar arasında 3 dəfə 6 dəqiqə fasilə olur
        (toplam 18 dəqiqə).
      </p>
      <p className="mt-3 text-slate-700">
        Qeyd: fasiləni ötürərək digər bloka keçə bilərsiniz. “Digər bloka keç” seçimini etdikdən sonra əvvəlki bloklara
        qayıtmaq mümkün deyil.
      </p>
      <p className="mt-3 text-slate-700">Suallar 1 balla (2 cavab variantı olan suallar isə 0,5 və 1 balla) qiymətləndirilir.</p>
    </div>
  );

  const rulesAnalytic = (
    <div className="mt-6 rounded-2xl border border-black/10 bg-white p-6">
      <h2 className="text-lg font-bold">Analitik Təhlil üzrə ümumi təlimat</h2>
      <p className="mt-3 text-slate-700">{ANALYTIC_OVERVIEW_INSTRUCTION}</p>
    </div>
  );

  return (
    <main className="min-h-[calc(100vh-72px)] py-10">
      <Container>
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-bold">{titles[cat]}</h1>
          <p className="mt-2 text-slate-700">Sınaq seç.</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {exams.map((exam) => (
              <Link key={exam.id} href={`/${dbCat}/${exam.id}/candidate`} className="rounded-2xl border border-black/10 bg-white p-6 hover:bg-white">
                <div className="text-lg font-extrabold">{exam.title}</div>
                <div className="mt-5 inline-flex rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-bold text-purple-950">
                  Daxil ol
                </div>
              </Link>
            ))}
            {exams.length === 0 ? (
              <div className="rounded-2xl border border-black/10 bg-white p-6 text-slate-700">Hələ sınaq əlavə edilməyib.</div>
            ) : null}
          </div>

          <div className="mt-8">
            <Link href="/start" className="text-sm underline">
              ← Kateqoriyalar
            </Link>
          </div>

          {cat === "umumi-bilikler" ? rulesGeneral : null}
          {cat === "analitik-tehlil" ? rulesAnalytic : null}
        </div>
      </Container>
    </main>
  );
}

