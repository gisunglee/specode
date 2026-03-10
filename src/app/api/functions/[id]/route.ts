import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { apiSuccess, apiError, isValidStatus } from "@/lib/utils";
import { generateSystemId } from "@/lib/sequence";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const data = await prisma.function.findUnique({
    where: { functionId: parseInt(id) },
    include: {
      area: {
        include: {
          screen: {
            include: {
              requirement: { select: { name: true, systemId: true } },
            },
          },
        },
      },
    },
  });

  if (!data) {
    return apiError("NOT_FOUND", "기능을 찾을 수 없습니다.", 404);
  }

  const [attachments, tasks] = await Promise.all([
    prisma.attachment.findMany({
      where: { refTableName: "tb_function", refPkId: parseInt(id), delYn: "N" },
      orderBy: { createdAt: "asc" },
    }),
    prisma.aiTask.findMany({
      where: { refTableName: "tb_function", refPkId: parseInt(id) },
      orderBy: { requestedAt: "desc" },
    }),
  ]);

  return apiSuccess({ ...data, attachments, tasks });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const numId = parseInt(id);
    const body = await request.json();

    const existing = await prisma.function.findUnique({
      where: { functionId: numId },
      select: { spec: true },
    });

    if (!existing) {
      return apiError("NOT_FOUND", "기능을 찾을 수 없습니다.", 404);
    }

    const data = await prisma.function.update({
      where: { functionId: numId },
      data: {
        name: body.name,
        displayCode: body.displayCode ?? undefined,
        areaId: body.areaId !== undefined ? (body.areaId || null) : undefined,
        spec: body.spec ?? undefined,
        aiDesignContent: body.aiDesignContent !== undefined ? body.aiDesignContent : undefined,
        relatedFiles: body.relatedFiles !== undefined ? (body.relatedFiles || null) : undefined,
        refContent: body.refContent !== undefined ? (body.refContent || null) : undefined,
        dataFlow: body.dataFlow ?? undefined,
        changeReason: body.changeReason ?? undefined,
        priority: body.priority ?? undefined,
      },
    });

    return apiSuccess(data);
  } catch (error) {
    console.error(error);
    return apiError("SERVER_ERROR", "수정에 실패했습니다.", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const numId = parseInt(id);
  const body = await request.json();

  if (!body.status) {
    return apiError("VALIDATION_ERROR", "상태값은 필수입니다.");
  }

  const func = await prisma.function.findUnique({
    where: { functionId: numId },
    select: { status: true, spec: true },
  });

  if (!func) {
    return apiError("NOT_FOUND", "기능을 찾을 수 없습니다.", 404);
  }

  if (!isValidStatus(body.status)) {
    return apiError(
      "INVALID_STATUS",
      `"${body.status}"는 유효하지 않은 상태값입니다.`
    );
  }

  const data = await prisma.function.update({
    where: { functionId: numId },
    data: { status: body.status },
  });

  // Auto-create AI task on certain transitions
  if (body.status === "REVIEW_REQ" || body.status === "DESIGN_REQ" || body.status === "IMPL_REQ") {
    const taskType =
      body.status === "IMPL_REQ" ? "IMPLEMENT" :
      body.status === "DESIGN_REQ" ? "DESIGN" :
      "INSPECT";

    const taskSystemId = await generateSystemId("ATK");
    await prisma.aiTask.create({
      data: {
        systemId: taskSystemId,
        refTableName: "tb_function",
        refPkId: numId,
        taskType,
        taskStatus: "NONE",
        spec: func.spec,
        comment: body.comment?.trim() || null,
      },
    });
  }

  return apiSuccess(data);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const numId = parseInt(id);

  const func = await prisma.function.findUnique({
    where: { functionId: numId },
    select: { status: true },
  });

  if (!func) {
    return apiError("NOT_FOUND", "기능을 찾을 수 없습니다.", 404);
  }

  if (func.status === "IMPL_DONE") {
    return apiError(
      "CANNOT_DELETE",
      "구현완료 상태의 기능은 삭제할 수 없습니다."
    );
  }

  await prisma.function.delete({ where: { functionId: numId } });

  return apiSuccess({ deleted: true });
}
