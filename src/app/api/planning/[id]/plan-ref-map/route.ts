import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const planSn = parseInt(id);
  if (isNaN(planSn)) return apiError("INVALID_ID", "유효하지 않은 ID입니다.");

  const body = await request.json();
  const refPlanSn = parseInt(body.refPlanSn);
  if (isNaN(refPlanSn)) return apiError("INVALID_ID", "참조 기획 ID가 올바르지 않습니다.");
  if (refPlanSn === planSn) return apiError("INVALID", "자기 자신을 참조할 수 없습니다.");

  try {
    const map = await prisma.planningDraftRefMap.create({
      data: { planSn, refPlanSn },
    });
    return apiSuccess(map);
  } catch {
    return apiError("CONFLICT", "이미 추가된 기획입니다.", 409);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const planSn = parseInt(id);
  const { searchParams } = new URL(request.url);
  const refPlanSn = parseInt(searchParams.get("refPlanSn") ?? "");

  if (isNaN(planSn) || isNaN(refPlanSn)) return apiError("INVALID_ID", "유효하지 않은 ID입니다.");

  await prisma.planningDraftRefMap.deleteMany({
    where: { planSn, refPlanSn },
  });

  return apiSuccess({ deleted: true });
}
