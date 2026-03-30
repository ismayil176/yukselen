import type { MetadataRoute } from "next";
import { absoluteUrl, getSiteUrl } from "@/lib/site";
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: ["/", "/elaqe", "/fealiyyetimiz", "/sinaq-imtahanlarimiz", "/yukselis-musabiqesi", "/neticeni-yoxla", "/start"], disallow: ["/dag-goy/", "/api/", "/exam/", "/result/"] }], sitemap: absoluteUrl("/sitemap.xml"), host: new URL(getSiteUrl()).host };
}
