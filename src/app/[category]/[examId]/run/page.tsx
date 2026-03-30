import { notFound } from "next/navigation";
import { Container } from "@/components/Container";
import { getExam } from "@/lib/exams";
import { ANALYTIC_BREAK_MINUTES, GENERAL_BREAK_MINUTES } from "@/lib/instructionText";
import { isCanonicalExamCategoryRoute } from "@/lib/routeCategory";
import { RunClient } from "./run-client";

export default async function RunPage({ params }: { params: { category: string; examId: string } }) {
  const exam = await getExam(params.examId);
  if (!exam || !isCanonicalExamCategoryRoute(params.category, exam.category)) return notFound();

  const breakSeconds =
    exam.category === "general"
      ? GENERAL_BREAK_MINUTES * 60
      : exam.category === "analytic"
        ? ANALYTIC_BREAK_MINUTES * 60
        : 0;

  return (
    <main className="py-10">
      <Container>
        <RunClient exam={exam} breakSeconds={breakSeconds} />
      </Container>
    </main>
  );
}
