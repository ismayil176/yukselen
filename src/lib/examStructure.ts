import type { CategoryKey } from "@/lib/exams";
import type { SectionKey } from "@/lib/store";
import { ANALYTIC_OVERVIEW_INSTRUCTION, GENERAL_BREAK_MINUTES } from "@/lib/instructionText";

export const SECTION_ORDER: SectionKey[] = [
  "BLOK_1",
  "BLOK_2",
  "BLOK_3",
  "BLOK_4",
  "VERBAL_1",
  "VERBAL_2",
  "VERBAL_3",
  "VERBAL_4",
  "VERBAL_5",
  "ABSTRACT",
  "NUMERIC",
];

export const DEFAULT_SECTION_TITLES: Record<SectionKey, string> = {
  BLOK_1: "Blok 1 (25 sual)",
  BLOK_2: "Blok 2 (25 sual)",
  BLOK_3: "Blok 3 (25 sual)",
  BLOK_4: "Blok 4 (25 sual)",
  VERBAL_1: "Verbal · Mətn 1 (5 sual)",
  VERBAL_2: "Verbal · Mətn 2 (5 sual)",
  VERBAL_3: "Verbal · Mətn 3 (5 sual)",
  VERBAL_4: "Verbal · Mətn 4 (5 sual)",
  VERBAL_5: "Verbal · Mətn 5 (5 sual)",
  ABSTRACT: "Abstrakt (25 sual)",
  NUMERIC: "Rəqəmsal (25 sual)",
};

export function isCategoryKey(value: string): value is CategoryKey {
  return value === "general" || value === "analytic" || value === "detail";
}

export function isSectionKey(value: string): value is SectionKey {
  return SECTION_ORDER.includes(value as SectionKey);
}

export function sectionLabel(section: SectionKey) {
  return DEFAULT_SECTION_TITLES[section] ?? section;
}

export function isSectionAllowedForCategory(category: CategoryKey, section: SectionKey): boolean {
  return getCategorySections(category).includes(section);
}

export function getCategorySections(category: CategoryKey): SectionKey[] {
  if (category === "general") return ["BLOK_1", "BLOK_2", "BLOK_3", "BLOK_4"];
  if (category === "analytic") return ["VERBAL_1", "VERBAL_2", "VERBAL_3", "VERBAL_4", "VERBAL_5", "ABSTRACT", "NUMERIC"];
  return [];
}

export function getDefaultExamInstructions(category: CategoryKey): string {
  if (category === "general") {
    return `Ümumi biliklər imtahanı. 4 blok, hər blokda 25 sual. Hər blok üçün 30 dəqiqə vaxt verilir. Timer imtahan boyu görünür. Bloklar arasında ${GENERAL_BREAK_MINUTES} dəqiqə fasilə var və istəyirsinizsə, fasiləni gözləmədən növbəti bloka keçə bilərsiniz.`;
  }
  if (category === "analytic") {
    return ANALYTIC_OVERVIEW_INSTRUCTION;
  }
  return "Bu bölmə hələ hazır deyil. Gələcəkdə əlavə olunacaq.";
}
