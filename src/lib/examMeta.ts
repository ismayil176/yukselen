import type { CategoryKey } from "@/lib/exams";

export function getExamMeta(category: CategoryKey) {
  if (category === "general") {
    return {
      durationLabel: "120 dəqiqə həll vaxtı + 18 dəqiqə fasilə",
      examCountLabel: "4 blok · 100 sual",
    };
  }

  if (category === "analytic") {
    return {
      durationLabel: "185 dəqiqə həll vaxtı + 12 dəqiqə fasilə",
      examCountLabel: "3 bölmə · 75 sual",
    };
  }

  return {
    durationLabel: "",
    examCountLabel: "",
  };
}
