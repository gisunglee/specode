import prisma from "@/lib/prisma";
import { apiSuccess } from "@/lib/utils";
import { FUNC_STATUS } from "@/lib/constants";

export async function GET() {
  const allStatuses = Object.values(FUNC_STATUS);

  const counts = await prisma.function.groupBy({
    by: ["status"],
    _count: true,
  });

  const byStatus: Record<string, number> = {};
  for (const s of allStatuses) {
    byStatus[s] = 0;
  }
  for (const c of counts) {
    byStatus[c.status] = c._count;
  }

  const totalFunctions = Object.values(byStatus).reduce((a, b) => a + b, 0);

  const rawActivity = await prisma.aiTask.findMany({
    take: 10,
    orderBy: { requestedAt: "desc" },
    select: {
      aiTaskId: true,
      refTableName: true,
      refPkId: true,
      taskType: true,
      taskStatus: true,
      requestedAt: true,
      completedAt: true,
      feedback: true,
    },
  });

  // 폴리모픽 관계: tb_function인 경우 함수 정보 조회
  const funcIds = rawActivity
    .filter((a) => a.refTableName === "tb_function")
    .map((a) => a.refPkId);

  const functions = funcIds.length
    ? await prisma.function.findMany({
        where: { functionId: { in: funcIds } },
        select: { functionId: true, systemId: true, name: true },
      })
    : [];

  const funcMap = new Map(functions.map((f) => [f.functionId, f]));

  const recentActivity = rawActivity.map((a) => ({
    ...a,
    function: a.refTableName === "tb_function" ? (funcMap.get(a.refPkId) ?? null) : null,
  }));

  return apiSuccess({
    summary: {
      totalFunctions,
      byStatus,
      pendingConfirm: byStatus.REVIEW_DONE || 0,
      aiRunning:
        (byStatus.AI_REVIEWING || 0) + (byStatus.AI_IMPLEMENTING || 0),
    },
    recentActivity,
  });
}
