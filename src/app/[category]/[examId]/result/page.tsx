import { notFound } from "next/navigation";
import { getExam } from "@/lib/exams";
import { isCanonicalExamCategoryRoute } from "@/lib/routeCategory";
import { ResultClient } from "./ResultClient";

export default async function ResultPage({ params }: { params: { category: string; examId: string } }) {
  const exam = await getExam(params.examId);
  if (!exam || !isCanonicalExamCategoryRoute(params.category, exam.category)) return notFound();
  return <ResultClient category={params.category} examId={params.examId} />;
}
