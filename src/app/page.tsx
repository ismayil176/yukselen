import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/Container";
import { absoluteUrl } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Yüksələn.az | Yüksəliş müsabiqəsinə hazırlıq",
  absoluteTitle: true,
  description: "Yüksəliş müsabiqəsinə hazırlıq üçün onlayn sınaq imtahanlarına başlayın, mərhələləri tanıyın və rəsmi yönləndirmələri bir yerdə görün.",
  path: "/",
  keywords: ["Yüksəliş müsabiqəsinə hazırlıq", "onlayn sınaq imtahanı", "Yüksələn.az", "Yukselen.az", "yukselen.az"],
});

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "EducationalOrganization",
      "@id": absoluteUrl("/#organization"),
      name: "Yüksələn.az",
      alternateName: "Yukselen.az",
      url: absoluteUrl("/"),
      logo: absoluteUrl("/logo.jpg"),
      description: "Yüksəliş müsabiqəsinə hazırlıq üçün onlayn sınaq imtahanları, mərhələ məlumatları və namizədlər üçün yönləndirici resurslar.",
    },
    {
      "@type": "WebSite",
      "@id": absoluteUrl("/#website"),
      url: absoluteUrl("/"),
      name: "Yüksələn.az",
      alternateName: "Yukselen.az",
      inLanguage: "az-AZ",
      description: "Yüksəliş müsabiqəsinə hazırlıq üçün onlayn sınaq imtahanları, mərhələ məlumatları və namizədlər üçün yönləndirici resurslar.",
      publisher: {
        "@id": absoluteUrl("/#organization"),
      },
    },
  ],
};

export default function HomePage() {
  return (
    <main className="min-h-[calc(100vh-72px)] bg-[url('/homepage-bg.avif')] bg-cover bg-center bg-no-repeat">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <div className="relative min-h-[calc(100vh-72px)] overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-white/56 backdrop-blur-[2px]" />
        <Container>
          <div className="relative mx-auto flex min-h-[calc(100vh-72px)] max-w-3xl flex-col items-center justify-center px-4 pb-16 pt-24 text-center sm:pt-28 md:pt-32">
            <div className="-translate-y-6 md:-translate-y-10">
              <div className="mx-auto inline-flex rounded-[26px] bg-white px-6 py-3 shadow-lg shadow-black/10 ring-1 ring-black/5">
                <h1 className="text-lg font-extrabold tracking-wide text-sky-950 sm:text-2xl md:text-3xl">Yüksəliş Müsabiqəsinə Hazırlıq</h1>
              </div>
              <div className="mt-4 md:mt-5">
                <p className="mx-auto inline-flex rounded-[26px] bg-sky-950 px-6 py-3 text-base font-bold text-white shadow-lg shadow-black/10 sm:text-xl md:text-2xl">
                  Onlayn İmtahan Platforması
                </p>
              </div>
              <div className="mt-9 flex flex-wrap justify-center gap-3">
                <Link href="/start" className="rounded-2xl bg-white px-10 py-4 text-base font-bold text-purple-950 shadow-lg shadow-black/10 hover:bg-white">
                  Sınağa başla
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </div>
    </main>
  );
}
