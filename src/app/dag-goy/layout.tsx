import type { Metadata } from "next";
import { noIndexMetadata } from "@/lib/seo";
export const metadata: Metadata = { ...noIndexMetadata, title: "İdarəetmə paneli" };
export default function HiddenAdminLayout({ children }: { children: React.ReactNode }) { return children; }
