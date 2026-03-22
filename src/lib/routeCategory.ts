import type { CategoryKey } from "@/lib/exams";

const CATEGORY_ROUTE_BY_KEY: Record<CategoryKey, string> = {
  general: "general",
  analytic: "analytic",
  detail: "detail",
};

export function isCanonicalExamCategoryRoute(routeCategory: string, examCategory: CategoryKey): boolean {
  return routeCategory === CATEGORY_ROUTE_BY_KEY[examCategory];
}
