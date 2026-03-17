/**
 * GET /api/areas/[id]/baseline
 *
 * 영역의 마지막 구현(IMPLEMENT) AI 태스크를 조회하여 contextSnapshot과 함께 반환한다.
 * 프론트에서 ImplRequestDialog 표시 시 호출하여 "이전 구현 이후 무엇이 바뀌었는지" diff에 사용한다.
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

  const lastImplTask = await prisma.aiTask.findFirst({
    where: {
      refTableName: "tb_area",
      refPkId: numId,
      taskType: "IMPLEMENT",
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

  return apiSuccess(lastImplTask ?? null);
}
