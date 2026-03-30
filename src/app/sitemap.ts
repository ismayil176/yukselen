import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
const now = new Date();
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/start"), lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    { url: absoluteUrl("/start/umumi-bilikler"), lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/start/analitik-tehlil"), lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/neticeni-yoxla"), lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/yukselis-musabiqesi"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/sinaq-imtahanlarimiz"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/fealiyyetimiz"), lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/elaqe"), lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];
}
