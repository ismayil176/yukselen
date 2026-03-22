"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Container } from "@/components/Container";
import { Logo } from "@/components/Logo";

const tabs = [
  { href: "/yukselis-musabiqesi", label: "Yüksəliş Müsabiqəsi" },
  { href: "/fealiyyetimiz", label: "Fəaliyyətimiz" },
  { href: "/sinaq-imtahanlarimiz", label: "Sınaq imtahanlarımız" },
  { href: "/elaqe", label: "Əlaqə" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the menu on route changes (mobile)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-30 border-b border-black/10 bg-gray-100/90 backdrop-blur">
      <Container>
        <div className="flex h-[72px] items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <Logo size={42} />
            <div className="leading-tight">
              <div className="text-base font-extrabold italic text-purple-950">yüksələn.az</div>
            </div>
          </Link>

          <nav className="hidden items-center justify-end gap-2 md:flex md:flex-wrap">
            {tabs.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className={
                  "rounded-2xl bg-white px-4 py-2 text-xs font-bold text-purple-950 shadow-sm shadow-black/10 hover:bg-white hover:shadow-md sm:text-sm" +
                  (pathname === t.href ? " ring-2 ring-purple-950/20" : "")
                }
              >
                {t.label}
              </Link>
            ))}
          </nav>

          <div className="md:hidden">
            <button
              type="button"
              aria-label={open ? "Menyunu bağla" : "Menyunu aç"}
              aria-expanded={open}
              onClick={() => setOpen((p) => !p)}
              className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-purple-950"
            >
              {open ? "Bağla" : "Menyu"}
            </button>
          </div>
        </div>

        {open ? (
          <div className="md:hidden">
            {/* Backdrop */}
            <button
              aria-label="Menyunu bağla"
              className="fixed inset-0 z-40 bg-black/20"
              onClick={() => setOpen(false)}
            />

            {/* Panel */}
            <div className="fixed left-0 right-0 top-[72px] z-50 border-b border-black/10 bg-gray-100/95 backdrop-blur">
              <Container>
                <nav className="grid gap-2 py-4">
                  {tabs.map((t) => (
                    <Link
                      key={t.href}
                      href={t.href}
                      className={
                        "rounded-2xl bg-white px-4 py-3 text-sm font-bold text-purple-950 shadow-sm shadow-black/10" +
                        (pathname === t.href ? " ring-2 ring-purple-950/20" : "")
                      }
                      onClick={() => setOpen(false)}
                    >
                      {t.label}
                    </Link>
                  ))}
                </nav>
              </Container>
            </div>
          </div>
        ) : null}
      </Container>
    </header>
  );
}
