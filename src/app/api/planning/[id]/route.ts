import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { planningDraftSchema } from "@/lib/validators";
import { apiSuccess, apiError } from "@/lib/utils";
import { saveContentVersion } from "@/lib/contentVersion";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const numId = parseInt(id);

  const data = await prisma.planningDraft.findUnique({
    where: { planSn: numId },
    include: {
      reqMaps: {
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
              detailSpec:      true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      planRefMaps: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  // planRefMaps에서 참조 기획 상세 조회
  let refPlanDetails: { planSn: number; planNm: string; planType: string | null; manualInfo: string | null; resultContent: string | null; resultType: string | null }[] = [];
  if (data && data.planRefMaps.length > 0) {
    const refPlanSns = data.planRefMaps.map((m) => m.refPlanSn);
    refPlanDetails = await prisma.planningDraft.findMany({
      where: { planSn: { in: refPlanSns } },
      select: { planSn: true, planNm: true, planType: true, manualInfo: true, resultContent: true, resultType: true },
    });
  }

  if (!data) {
    return apiError("NOT_FOUND", "기획을 찾을 수 없습니다.", 404);
  }

  // 이전 기획 컨텍스트 (같은 groupUuid, 낮은 sortOrd)
  const prevDraft = await prisma.planningDraft.findFirst({
    where: {
      groupUuid: data.groupUuid,
      sortOrd: { lt: data.sortOrd },
    },
    select: { planSn: true, planNm: true, resultContent: true, resultType: true },
    orderBy: { sortOrd: "desc" },
  });

  // 최신 AiTask
  const latestAiTask = await prisma.aiTask.findFirst({
    where: { refTableName: "tb_planning_draft", refPkId: numId },
    orderBy: { requestedAt: "desc" },
  });

  return apiSuccess({ ...data, prevDraft: prevDraft ?? null, latestAiTask: latestAiTask ?? null, refPlanDetails });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const numId = parseInt(id);
    const body = await request.json();
    const parsed = planningDraftSchema.parse(body);

    // resultContent 변경 시 버전 이력 저장
    if (parsed.resultContent !== undefined) {
      const current = await prisma.planningDraft.findUnique({
        where: { planSn: numId },
        select: { resultContent: true },
      });
      if (current) {
        await saveContentVersion({
          refTableName: "tb_planning_draft",
          refPkId: numId,
          fieldName: "result_content",
          currentContent: current.resultContent,
          changedBy: "ai",
        });
      }
    }

    const data = await prisma.planningDraft.update({
      where: { planSn: numId },
      data: {
        planNm:        parsed.planNm,
        planType:      parsed.planType      ?? null,
        manualInfo:    parsed.manualInfo    ?? null,
        comment:       parsed.comment       ?? null,
        resultContent: parsed.resultContent ?? undefined,
        resultType:    parsed.resultType    ?? undefined,
        sortOrd:       parsed.sortOrd       ?? undefined,
        isPicked:      parsed.isPicked      ?? undefined,
      },
    });

    return apiSuccess(data);
  } catch {
    return apiError("SERVER_ERROR", "수정에 실패했습니다.", 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const numId = parseInt(id);

  // CASCADE로 tb_planning_req_map 자동 삭제
  await prisma.planningDraft.delete({ where: { planSn: numId } });

  return apiSuccess({ deleted: true });
}
