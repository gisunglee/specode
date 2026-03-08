/**
 * POST /api/ai/tasks/[id]/complete
 *
 * AI가 처리 완료 후 결과를 제출합니다.
 * 1. AiTask 업데이트: taskStatus, feedback, resultFiles, completedAt
 * 2. 비즈니스 로직 훅: taskType에 따라 대상 엔티티(tb_function, tb_standard_guide) 자동 반영
 *
 * Headers:
 *   X-API-Key: {AI_API_KEY}
 *   Content-Type: application/json
 *
 * Body:
 *   taskStatus   string  (필수) SUCCESS | AUTO_FIXED | NEEDS_CHECK | WARNING | FAILED
 *   feedback     string  (선택) AI 결과 내용 (마크다운)
 *   resultFiles  string  (선택) 수정된 파일 목록 (줄바꿈 구분)
 *
 * Response: 업데이트된 AiTask
 */
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { validateApiKey } from "../../../_lib/auth";
import { onTaskComplete } from "../../../_lib/onTaskComplete";

type RouteParams = { params: Promise<{ id: string }> };

const VALID_TERMINAL_STATUSES = [
  "SUCCESS",
  "AUTO_FIXED",
  "NEEDS_CHECK",
  "WARNING",
  "FAILED",
] as const;

export async function POST(request: NextRequest, { params }: RouteParams) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  const { id } = await params;
  const numId = parseInt(id);

  if (isNaN(numId)) {
    return apiError("VALIDATION_ERROR", "유효하지 않은 태스크 ID입니다.");
  }

  const body = await request.json();
  const { taskStatus, feedback, resultFiles } = body as {
    taskStatus: string;
    feedback?: string;
    resultFiles?: string;
  };

  // taskStatus 유효성 검사
  if (!taskStatus || !(VALID_TERMINAL_STATUSES as readonly string[]).includes(taskStatus)) {
    return apiError(
      "VALIDATION_ERROR",
      `taskStatus는 ${VALID_TERMINAL_STATUSES.join(" | ")} 중 하나여야 합니다.`
    );
  }

  const task = await prisma.aiTask.findUnique({
    where: { aiTaskId: numId },
    select: { aiTaskId: true, systemId: true, taskStatus: true, refTableName: true, refPkId: true, taskType: true },
  });

  if (!task) {
    return apiError("NOT_FOUND", "태스크를 찾을 수 없습니다.", 404);
  }

  if (task.taskStatus !== "RUNNING") {
    return apiError(
      "INVALID_STATE",
      `처리중(RUNNING) 상태의 태스크만 완료 처리할 수 있습니다. 현재 상태: ${task.taskStatus}`
    );
  }

  const completedAt = new Date();

  // 1. AiTask 결과 저장
  await prisma.aiTask.update({
    where: { aiTaskId: numId },
    data: {
      taskStatus,
      feedback: feedback ?? null,
      resultFiles: resultFiles ?? null,
      completedAt,
    },
  });

  // 2. 비즈니스 로직 훅 — 대상 엔티티 자동 반영
  await onTaskComplete({
    aiTaskId: numId,
    refTableName: task.refTableName,
    refPkId: task.refPkId,
    taskType: task.taskType,
    taskStatus,
    feedback: feedback ?? null,
    resultFiles: resultFiles ?? null,
  });

  return apiSuccess({ aiTaskId: numId, systemId: task.systemId, taskStatus, completedAt });
}
