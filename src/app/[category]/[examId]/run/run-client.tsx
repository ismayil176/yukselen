"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Exam } from "@/lib/exams";
import { removeBrowserValue, readBrowserValue, writeBrowserJson } from "@/lib/browserExamStorage";
import { ExamRunner, type SectionSubmission } from "@/components/exam/ExamRunner";

export function RunClient({ exam, breakSeconds }: { exam: Exam; breakSeconds: number }) {
  const router = useRouter();
  const resultKey = useMemo(() => `result:${exam.category}:${exam.id}`, [exam.category, exam.id]);
  const attemptKey = useMemo(() => `attempt:${exam.category}:${exam.id}`, [exam.category, exam.id]);
  const progressKey = useMemo(() => `progress:${exam.category}:${exam.id}`, [exam.category, exam.id]);

  return (
    <ExamRunner
      exam={exam}
      breakSeconds={breakSeconds}
      onFinish={async (sections: SectionSubmission[]) => {
        const attemptId = readBrowserValue(attemptKey);
        if (!attemptId) throw new Error("İmtahan sessiyası tapılmadı. Zəhmət olmasa yenidən başlayın.");

        const res = await fetch("/api/attempts/finish", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ attemptId, examId: exam.id, sections }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok || !json?.result) {
          throw new Error(json?.error ?? "Nəticə hesablanmadı. İnternet bağlantısını yoxlayıb yenidən cəhd edin.");
        }

        removeBrowserValue(progressKey);
        writeBrowserJson(resultKey, { finishedAt: new Date().toISOString(), result: json.result });
        router.replace(`/${exam.category}/${exam.id}/result`);
      }}
    />
  );
}
