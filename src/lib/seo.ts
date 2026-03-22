import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site";

type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  absoluteTitle?: boolean;
};

export function pageMetadata({ title, description, path, keywords, absoluteTitle }: PageMetadataInput): Metadata {
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    keywords,
    alternates: { canonical: absoluteUrl(path) },
    openGraph: { title, description, url: absoluteUrl(path), type: "website" },
    twitter: { title, description },
  };
}

export const noIndexMetadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true, "max-snippet": -1 },
  },
};
