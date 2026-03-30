export const DEFAULT_SITE_URL = "https://www.yukselen.az";
function trimTrailingSlash(value: string) { return value.endsWith("/") ? value.slice(0, -1) : value; }
export function getSiteUrl() {
  const fromEnv = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "").trim();
  if (!fromEnv) return DEFAULT_SITE_URL;
  try { return trimTrailingSlash(new URL(fromEnv).toString()); } catch { return DEFAULT_SITE_URL; }
}
export function absoluteUrl(path = "/") {
  const base = getSiteUrl();
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
