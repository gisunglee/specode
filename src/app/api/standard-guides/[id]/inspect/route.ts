/**
 * POST /api/standard-guides/[id]/inspect
 *
 * 표준 가이드 AI 점검 요청
 *   - tb_ai_task에 INSPECT 태스크 등록 (refTableName="tb_standard_guide")
 *   - tb_standard_guide.ai_feedback_status = "NONE" (대기 중)으로 업데이트
 *   - AI가 폴링으로 가져가서 가이드 내용을 점검하고 feedback을 채움
 */
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { generateSystemId } from "@/lib/sequence";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const numId = parseInt(id);
    const body = await request.json().catch(() => ({}));

    const guide = await prisma.standardGuide.findUnique({
      where: { guideId: numId },
      select: { guideId: true, content: true, title: true },
    });

    if (!guide) {
      return apiError("NOT_FOUND", "가이드를 찾을 수 없습니다.", 404);
    }

    const taskSystemId = await generateSystemId("ATK");

    /* 트랜잭션: 태스크 생성 + 가이드 상태 갱신 */
    const [task] = await prisma.$transaction([
      prisma.aiTask.create({
        data: {
          systemId: taskSystemId,
          refTableName: "tb_standard_guide",
          refPkId: numId,
          taskType: "INSPECT",
          taskStatus: "NONE",
          spec: guide.content,               // 점검 시점 내용 스냅샷
          comment: body.comment?.trim() || null,
        },
      }),
      prisma.standardGuide.update({
        where: { guideId: numId },
        data: {
          status: "REVIEW_REQ",              // 검토 요청 상태로 표시
          aiFeedbackAt: new Date(),
        },
      }),
    ]);

    return apiSuccess(task);
  } catch (error) {
    console.error(error);
    return apiError("SERVER_ERROR", "점검 요청에 실패했습니다.", 500);
  }
}
