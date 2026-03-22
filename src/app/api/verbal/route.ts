import { noStoreJson } from "@/lib/apiSecurity";
import { isExamSessionValid } from "@/lib/examSession";
import { isSectionAllowedForCategory, isSectionKey } from "@/lib/examStructure";
import { getExam } from "@/lib/exams";
import { getVerbalPassage } from "@/lib/questions";
import type { VerbalPassage } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const examId = (searchParams.get("examId") || "").trim();
  const section = (searchParams.get("section") || "").trim();

  if (!examId || !section) return noStoreJson({ error: "examId və section tələb olunur" }, { status: 400 });
  if (!isSectionKey(section) || !section.startsWith("VERBAL_")) {
    return noStoreJson({ error: "Verbal section yanlışdır" }, { status: 400 });
  }
  if (!isExamSessionValid(examId)) {
    return noStoreJson({ error: "İmtahan sessiyası tapılmadı. Zəhmət olmasa imtahana yenidən daxil olun." }, { status: 401 });
  }

  const exam = await getExam(examId);
  if (!exam) return noStoreJson({ error: "İmtahan tapılmadı." }, { status: 404 });
  if (!isSectionAllowedForCategory(exam.category, section)) {
    return noStoreJson({ error: "Bu verbal bölmə seçilmiş imtahana aid deyil." }, { status: 400 });
  }

  const passage = await getVerbalPassage(examId, section as VerbalPassage["section"]);
  return noStoreJson({ passage: passage?.text ?? null });
}
