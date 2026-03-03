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

  const recentActivity = await prisma.aiTask.findMany({
    take: 10,
    orderBy: { requestedAt: "desc" },
    select: {
      aiTaskId: true,
      functionId: true,
      taskType: true,
      taskStatus: true,
      requestedAt: true,
      completedAt: true,
      feedback: true,
      function: {
        select: { systemId: true, name: true },
      },
    },
  });

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
