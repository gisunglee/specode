import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

type RouteParams = { params: Promise<{ id: string }> };

// 요구사항 매핑 추가
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const numId = parseInt(id);
  const body = await request.json();
  const requirementId = parseInt(body.requirementId);

  if (!requirementId) {
    return apiError("VALIDATION_ERROR", "requirementId가 필요합니다.");
  }

  try {
    const data = await prisma.planningReqMap.create({
      data: { planSn: numId, requirementId },
      include: {
        requirement: {
          select: {
            requirementId: true,
            systemId: true,
            name: true,
            discussionMd: true,
            priority: true,
            originalContent: true,
            currentContent:  true,
          },
        },
      },
    });
    return apiSuccess(data);
  } catch {
    // 중복 매핑 시 무시
    return apiError("DUPLICATE", "이미 매핑된 요구사항입니다.");
  }
}

// 요구사항 매핑 제거 (쿼리 파라미터: ?requirementId=N)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const numId = parseInt(id);
  const { searchParams } = new URL(request.url);
  const requirementId = parseInt(searchParams.get("requirementId") || "0");

  if (!requirementId) {
    return apiError("VALIDATION_ERROR", "requirementId가 필요합니다.");
  }

  await prisma.planningReqMap.deleteMany({
    where: { planSn: numId, requirementId },
  });

  return apiSuccess({ deleted: true });
}
