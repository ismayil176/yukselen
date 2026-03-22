import { NextResponse } from "next/server";
import { listExams, type CategoryKey } from "@/lib/exams";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") as CategoryKey | null;
  const exams = await listExams(category ?? undefined);
  return NextResponse.json({ exams });
}
