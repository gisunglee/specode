import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const numId = parseInt(id);
  const body = await request.json();
  const { taskStatus } = body;

  if (taskStatus !== "CANCELLED") {
    return apiError("VALIDATION_ERROR", "지원하지 않는 상태 변경입니다.");
  }

  const task = await prisma.aiTask.findUnique({ where: { aiTaskId: numId } });
  if (!task) return apiError("NOT_FOUND", "작업을 찾을 수 없습니다.", 404);

  if (task.taskStatus !== "NONE") {
    return apiError("INVALID_STATE", "대기(NONE) 상태의 작업만 취소할 수 있습니다.");
  }

  const updated = await prisma.aiTask.update({
    where: { aiTaskId: numId },
    data: { taskStatus: "CANCELLED" },
  });

  return apiSuccess(updated);
}
