import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { apiSuccess, apiError } from "@/lib/utils";

type RouteParams = { params: Promise<{ id: string }> };

const duplicateSchema = z.object({
  planNm:    z.string().min(1, "기획명은 필수입니다."),
  groupUuid: z.string().min(1),
  sortOrd:   z.number().int().min(1),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const numId = parseInt(id);
    const body = await request.json();
    const parsed = duplicateSchema.parse(body);

    // 원본 조회 (reqMaps 포함)
    const source = await prisma.planningDraft.findUnique({
      where: { planSn: numId },
      include: { reqMaps: { select: { requirementId: true } } },
    });

    if (!source) {
      return apiError("NOT_FOUND", "기획을 찾을 수 없습니다.", 404);
    }

    // 신규 기획 생성 + reqMaps 일괄 복사
    const newDraft = await prisma.planningDraft.create({
      data: {
        planNm:        parsed.planNm,
        planType:      source.planType,
        manualInfo:    source.manualInfo,
        comment:       source.comment,
        resultContent: source.resultContent,
        resultType:    source.resultType,
        groupUuid:     parsed.groupUuid,
        sortOrd:       parsed.sortOrd,
        isPicked:      false,
        reqMaps: {
          create: source.reqMaps.map((m) => ({ requirementId: m.requirementId })),
        },
      },
    });

    return apiSuccess({ planSn: newDraft.planSn });
  } catch {
    return apiError("SERVER_ERROR", "복제에 실패했습니다.", 500);
  }
}
