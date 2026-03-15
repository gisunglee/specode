import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const numId = parseInt(id);

  const task = await prisma.aiTask.findUnique({ where: { aiTaskId: numId } });
  if (!task) return apiError("NOT_FOUND", "작업을 찾을 수 없습니다.", 404);

  return apiSuccess(task);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const numId = parseInt(id);
  const body = await request.json();
  const { taskStatus } = body;

  const ALLOWED = ["CANCELLED", "NONE", "FAILED"];
  if (!ALLOWED.includes(taskStatus)) {
    return apiError("VALIDATION_ERROR", "지원하지 않는 상태 변경입니다.");
  }

  const task = await prisma.aiTask.findUnique({ where: { aiTaskId: numId } });
  if (!task) return apiError("NOT_FOUND", "작업을 찾을 수 없습니다.", 404);

  if (taskStatus === "CANCELLED" && task.taskStatus !== "NONE") {
    return apiError("INVALID_STATE", "대기(NONE) 상태의 작업만 취소할 수 있습니다.");
  }

  const RETRYABLE = ["FAILED", "NEEDS_CHECK", "WARNING", "CANCELLED", "RUNNING"];
  if (taskStatus === "NONE" && !RETRYABLE.includes(task.taskStatus)) {
    return apiError("INVALID_STATE", "재실행할 수 없는 상태입니다.");
  }

  if (taskStatus === "FAILED" && task.taskStatus !== "RUNNING") {
    return apiError("INVALID_STATE", "진행중(RUNNING) 상태의 작업만 강제 종료할 수 있습니다.");
  }

  const updateData =
    taskStatus === "NONE"
      ? { taskStatus: "NONE", startedAt: null, completedAt: null, feedback: null, requestedAt: new Date() }
      : taskStatus === "FAILED"
      ? { taskStatus: "FAILED", completedAt: new Date(), feedback: "강제 종료됨" }
      : { taskStatus: "CANCELLED" };

  const updated = await prisma.aiTask.update({
    where: { aiTaskId: numId },
    data: updateData,
  });

  return apiSuccess(updated);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const numId = parseInt(id);

  const task = await prisma.aiTask.findUnique({ where: { aiTaskId: numId } });
  if (!task) return apiError("NOT_FOUND", "작업을 찾을 수 없습니다.", 404);

  await prisma.aiTask.delete({
    where: { aiTaskId: numId },
  });

  return apiSuccess({ deleted: true });
}
