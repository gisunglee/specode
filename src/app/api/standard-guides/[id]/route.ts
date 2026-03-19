/**
 * /api/standard-guides/[id] — 표준 가이드 단건 API
 *
 * GET    — 단건 조회 (최근 AiTask 5건 포함)
 * PUT    — 전체 수정. status가 REVIEW_REQ로 변경되면 AiTask 자동 생성
 * PATCH  — is_active 토글
 * DELETE — 물리 삭제
 */
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { generateSystemId } from "@/lib/sequence";
import { saveContentVersion } from "@/lib/contentVersion";
import { statusToPhase, phaseToStatus } from "@/lib/constants";

type RouteParams = { params: Promise<{ id: string }> };

const VALID_CATEGORIES = ["UI", "DATA", "AUTH", "API", "COMMON", "SECURITY", "FILE", "ERROR", "BATCH", "REPORT"];

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const numId = parseInt(id);

  const data = await prisma.standardGuide.findUnique({
    where: { guideId: numId },
  });

  if (!data) {
    return apiError("NOT_FOUND", "가이드를 찾을 수 없습니다.", 404);
  }

  /* 최근 점검 이력 (최신 5건) */
  const tasks = await prisma.aiTask.findMany({
    where: { refTableName: "tb_standard_guide", refPkId: numId },
    orderBy: { requestedAt: "desc" },
    take: 5,
  });

  /* 최신 성공 AI 피드백 */
  const latestFeedback = tasks.find(
    (t) => t.taskStatus === "SUCCESS" || t.taskStatus === "AUTO_FIXED"
  )?.feedback ?? null;

  return apiSuccess({
    ...data,
    status: phaseToStatus(data.phase, data.phaseStatus, false),
    aiFeedbackContent: latestFeedback,
    tasks,
  });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const numId = parseInt(id);
    const body = await request.json();
    const { saveVersionLog, category, title, content, isActive, relatedFiles, status } = body;

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return apiError("VALIDATION_ERROR", "유효하지 않은 카테고리입니다.");
    }
    if (!title?.trim()) {
      return apiError("VALIDATION_ERROR", "제목은 필수입니다.");
    }

    /* 현재 상태 조회 */
    const existing = await prisma.standardGuide.findUnique({
      where: { guideId: numId },
      select: { phase: true, phaseStatus: true, content: true },
    });

    if (!existing) {
      return apiError("NOT_FOUND", "가이드를 찾을 수 없습니다.", 404);
    }

    // 버전 이력 저장 (saveVersionLog=true 일 때만)
    const newContent = content?.trim() || null;
    if (saveVersionLog && newContent !== undefined && newContent !== existing.content) {
      await saveContentVersion({
        refTableName: "tb_standard_guide",
        refPkId: numId,
        fieldName: "content",
        currentContent: existing.content,
        changedBy: "user",
      });
    }

    // status → REVIEW_REQ 변경 감지
    const currentStatus = phaseToStatus(existing.phase, existing.phaseStatus, false);
    const statusChanged = status === "REVIEW_REQ" && currentStatus !== "REVIEW_REQ";

    // phase 업데이트 데이터 (StandardGuide에는 confirmed 컬럼 없음 → 제외)
    const { confirmed: _confirmed, ...phaseData } = status !== undefined ? statusToPhase(status) : { confirmed: false };

    const updateData = {
      category,
      title: title.trim(),
      content: newContent,
      isActive: isActive === "N" ? "N" : "Y",
      relatedFiles: relatedFiles !== undefined ? (relatedFiles?.trim() || null) : undefined,
      ...phaseData,
    };

    if (statusChanged) {
      /* status → REVIEW_REQ 변경 시: AiTask 생성 + 가이드 업데이트 트랜잭션 */
      const taskSystemId = await generateSystemId("ATK");
      await prisma.$transaction([
        prisma.standardGuide.update({
          where: { guideId: numId },
          data: updateData,
        }),
        prisma.aiTask.create({
          data: {
            systemId: taskSystemId,
            refTableName: "tb_standard_guide",
            refPkId: numId,
            taskType: "REVIEW",
            taskStatus: "NONE",
            spec: newContent || existing.content,
          },
        }),
      ]);

      const data = await prisma.standardGuide.findUnique({ where: { guideId: numId } });
      if (!data) return apiError("NOT_FOUND", "가이드를 찾을 수 없습니다.", 404);
      return apiSuccess({
        ...data,
        status: phaseToStatus(data.phase, data.phaseStatus, false),
      });
    }

    const data = await prisma.standardGuide.update({
      where: { guideId: numId },
      data: updateData,
    });

    return apiSuccess({
      ...data,
      status: phaseToStatus(data.phase, data.phaseStatus, false),
    });
  } catch (error) {
    console.error(error);
    return apiError("SERVER_ERROR", "수정에 실패했습니다.", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    /* is_active 토글만 허용 */
    if (body.isActive !== "Y" && body.isActive !== "N") {
      return apiError("VALIDATION_ERROR", "isActive는 Y 또는 N이어야 합니다.");
    }

    const data = await prisma.standardGuide.update({
      where: { guideId: parseInt(id) },
      data: { isActive: body.isActive },
    });

    return apiSuccess({
      ...data,
      status: phaseToStatus(data.phase, data.phaseStatus, false),
    });
  } catch (error) {
    console.error(error);
    return apiError("SERVER_ERROR", "수정에 실패했습니다.", 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const existing = await prisma.standardGuide.findUnique({
    where: { guideId: parseInt(id) },
    select: { guideId: true },
  });

  if (!existing) {
    return apiError("NOT_FOUND", "가이드를 찾을 수 없습니다.", 404);
  }

  await prisma.standardGuide.delete({ where: { guideId: parseInt(id) } });

  return apiSuccess({ deleted: true });
}
