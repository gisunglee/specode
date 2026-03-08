/**
 * PATCH /api/ai/tasks/[id]/start
 *
 * AI가 태스크 처리를 시작할 때 호출합니다.
 * taskStatus: NONE → RUNNING, startedAt 기록
 *
 * Headers:
 *   X-API-Key: {AI_API_KEY}
 *
 * Response: 업데이트된 AiTask
 */
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { validateApiKey } from "../../../_lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  const { id } = await params;
  const numId = parseInt(id);

  if (isNaN(numId)) {
    return apiError("VALIDATION_ERROR", "유효하지 않은 태스크 ID입니다.");
  }

  const task = await prisma.aiTask.findUnique({
    where: { aiTaskId: numId },
    select: { aiTaskId: true, systemId: true, taskStatus: true },
  });

  if (!task) {
    return apiError("NOT_FOUND", "태스크를 찾을 수 없습니다.", 404);
  }

  if (task.taskStatus !== "NONE") {
    return apiError(
      "INVALID_STATE",
      `대기(NONE) 상태의 태스크만 시작할 수 있습니다. 현재 상태: ${task.taskStatus}`
    );
  }

  const now = new Date();
  await prisma.aiTask.update({
    where: { aiTaskId: numId },
    data: { taskStatus: "RUNNING", startedAt: now },
  });

  // 📌 비즈니스 로직 확장 포인트
  // 작업 시작 시 추가 처리 필요 시 onTaskStart 훅을 _lib에 추가하세요.

  return apiSuccess({ aiTaskId: numId, systemId: task.systemId ?? undefined, taskStatus: "RUNNING", startedAt: now });
}
