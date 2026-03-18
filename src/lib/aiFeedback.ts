/**
 * aiFeedback.ts — AiTask 피드백 조회 헬퍼
 *
 * AI 결과 컬럼(aiDesignContent 등)이 제거되고 AiTask.feedback이
 * 단일 결과 저장소가 된 이후, 기능 목록의 AI 피드백을 일괄 조회한다.
 */
import prisma from "@/lib/prisma";

/**
 * 기능 ID 목록으로 taskType별 최신 성공 AI 피드백을 조회한다.
 *
 * @returns Map<functionId, Record<taskType, feedback>>
 */
export async function getFuncAiFeedback(
  funcIds: number[],
  taskTypes: string[]
): Promise<Map<number, Record<string, string>>> {
  if (funcIds.length === 0) return new Map();

  const tasks = await prisma.aiTask.findMany({
    where: {
      refTableName: "tb_function",
      refPkId: { in: funcIds },
      taskType: { in: taskTypes },
      taskStatus: { in: ["SUCCESS", "AUTO_FIXED"] },
    },
    orderBy: { completedAt: "desc" },
    select: { refPkId: true, taskType: true, feedback: true },
  });

  const result = new Map<number, Record<string, string>>();
  for (const t of tasks) {
    if (!t.feedback) continue;
    const existing = result.get(t.refPkId) ?? {};
    if (!(t.taskType in existing)) existing[t.taskType] = t.feedback;
    result.set(t.refPkId, existing);
  }
  return result;
}
