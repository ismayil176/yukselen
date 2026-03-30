import { notFound } from "next/navigation";
import { getExam } from "@/lib/exams";
import { isCanonicalExamCategoryRoute } from "@/lib/routeCategory";
import { CandidateClient } from "./CandidateClient";

export default async function CandidatePage({ params }: { params: { category: string; examId: string } }) {
  const exam = await getExam(params.examId);
  if (!exam || !isCanonicalExamCategoryRoute(params.category, exam.category)) return notFound();
  return <CandidateClient category={params.category} examId={params.examId} examTitle={exam.title} />;
}
