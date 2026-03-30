import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { ResultCheckClient } from "./ResultCheckClient";

export const metadata: Metadata = pageMetadata({ title: "Nəticənizi Yoxlayın", description: "Telefon nömrənizi daxil edib iştirak etdiyiniz imtahanların nəticələrini yoxlayın.", path: "/neticeni-yoxla" });

export default function ResultCheckPage() { return <ResultCheckClient />; }
