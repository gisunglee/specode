/**
 * GET /api/ai/tasks
 *
 * OpenClaw 폴링 엔드포인트 — 대기(NONE) 상태의 AI 태스크를 반환합니다.
 * AI는 이 API를 주기적으로 호출하여 처리할 작업을 가져갑니다.
 *
 * Headers:
 *   X-API-Key: {AI_API_KEY}
 *
 * Query Parameters:
 *   limit     number   반환할 최대 건수 (기본 10, 최대 50)
 *   taskType  string   필터: DESIGN | REVIEW | IMPLEMENT | IMPACT | INSPECT
 *
 * Response: AiTask[] (spec, comment 포함)
 */
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { apiSuccess } from "@/lib/utils";
import { validateApiKey } from "../_lib/auth";

export async function GET(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
  const taskType = searchParams.get("taskType") ?? undefined;

  const where: Record<string, unknown> = { taskStatus: "NONE" };
  if (taskType) where.taskType = taskType;

  const tasks = await prisma.aiTask.findMany({
    where,
    orderBy: { requestedAt: "asc" }, // FIFO: 오래된 요청 먼저
    take: limit,
    select: {
      aiTaskId: true,
      systemId: true,
      refTableName: true,
      refPkId: true,
      taskType: true,
      taskStatus: true,
      spec: true,
      comment: true,
      requestedAt: true,
    },
  });

  return apiSuccess(tasks);
}
