/**
 * GET /api/functions/[id]/baseline
 *
 * 기능의 마지막 구현(IMPLEMENT) 또는 PRD_EXPORT AI 태스크를 조회하여
 * contextSnapshot과 함께 반환한다.
 *
 * 프론트에서 IMPL_REQ 다이얼로그 표시 시 호출하여
 * "이전 구현 이후 무엇이 바뀌었는지" diff를 표시하는 데 사용한다.
 */
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const numId = parseInt(id);

  if (isNaN(numId)) {
    return apiError("VALIDATION_ERROR", "유효하지 않은 ID입니다.");
  }

  // 마지막 IMPLEMENT 또는 PRD_EXPORT 태스크 중 가장 최근 것
  const lastImplTask = await prisma.aiTask.findFirst({
    where: {
      refTableName: "tb_function",
      refPkId: numId,
      taskType: { in: ["IMPLEMENT", "PRD_EXPORT"] },
      contextSnapshot: { not: null },
    },
    orderBy: { requestedAt: "desc" },
    select: {
      aiTaskId: true,
      systemId: true,
      taskType: true,
      taskStatus: true,
      contextSnapshot: true,
      requestedAt: true,
    },
  });

  if (!lastImplTask) {
    return apiSuccess(null);
  }

  return apiSuccess(lastImplTask);
}
