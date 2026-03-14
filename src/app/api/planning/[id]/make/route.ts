import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { generateSystemId } from "@/lib/sequence";
import { apiSuccess, apiError } from "@/lib/utils";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const numId = parseInt(id);

  const draft = await prisma.planningDraft.findUnique({
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
              originalContent: true,
              currentContent:  true,
            },
          },
        },
      },
    },
  });

  if (!draft) {
    return apiError("NOT_FOUND", "기획을 찾을 수 없습니다.", 404);
  }

  // 이전 기획 컨텍스트 (3순위)
  const prevDraft = await prisma.planningDraft.findFirst({
    where: {
      groupUuid: draft.groupUuid,
      sortOrd: { lt: draft.sortOrd },
    },
    select: { planNm: true, resultContent: true, resultType: true },
    orderBy: { sortOrd: "desc" },
  });

  const systemId = await generateSystemId("ATK");

  const spec = JSON.stringify({
    planType:   draft.planType,
    manualInfo: draft.manualInfo,   // 1순위: 사용자 상세 아이디어
    comment:    draft.comment,       // 사용자 지시
    requirements: draft.reqMaps.map((m) => ({
      systemId:     m.requirement.systemId,
      name:         m.requirement.name,
      discussionMd: m.requirement.discussionMd, // 2순위: 상세 협의 내용
      content:      m.requirement.currentContent ?? m.requirement.originalContent,
    })),
    prevContext: prevDraft
      ? {
          planNm:        prevDraft.planNm,
          resultType:    prevDraft.resultType,
          resultContent: prevDraft.resultContent, // 3순위: 이전 화면
        }
      : null,
  });

  const aiTask = await prisma.aiTask.create({
    data: {
      systemId,
      refTableName: "tb_planning_draft",
      refPkId:      numId,
      taskType:     "PLANNING",
      taskStatus:   "NONE",
      spec,
    },
  });

  return apiSuccess({ aiTaskId: aiTask.aiTaskId, taskStatus: aiTask.taskStatus });
}
