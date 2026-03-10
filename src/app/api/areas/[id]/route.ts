import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { generateSystemId } from "@/lib/sequence";
import { apiSuccess, apiError } from "@/lib/utils";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const numId = parseInt(id);

  const data = await prisma.area.findUnique({
    where: { areaId: numId },
    include: {
      screen: { select: { name: true, systemId: true } },
      functions: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!data) {
    return apiError("NOT_FOUND", "영역을 찾을 수 없습니다.", 404);
  }

  // polymorphic AiTask 조회
  const tasks = await prisma.aiTask.findMany({
    where: { refTableName: "tb_area", refPkId: numId },
    orderBy: { requestedAt: "desc" },
  });

  return apiSuccess({ ...data, tasks });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const numId = parseInt(id);
    const body = await request.json();

    const existing = await prisma.area.findUnique({ where: { areaId: numId } });
    if (!existing) return apiError("NOT_FOUND", "영역을 찾을 수 없습니다.", 404);

    const data = await prisma.area.update({
      where: { areaId: numId },
      data: {
        name: body.name ?? undefined,
        screenId: body.screenId !== undefined ? body.screenId : undefined,
        areaType: body.areaType ?? undefined,
        sortOrder: body.sortOrder ?? undefined,
        spec: body.spec !== undefined ? (body.spec || null) : undefined,
        displayFields: body.displayFields !== undefined ? (body.displayFields || null) : undefined,
        reqComment: body.reqComment !== undefined ? (body.reqComment || null) : undefined,
        aiDetailDesign: body.aiDetailDesign !== undefined ? (body.aiDetailDesign || null) : undefined,
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

  const area = await prisma.area.findUnique({
    where: { areaId: numId },
    select: { spec: true, status: true },
  });

  if (!area) return apiError("NOT_FOUND", "영역을 찾을 수 없습니다.", 404);

  const data = await prisma.area.update({
    where: { areaId: numId },
    data: { status: body.status },
  });

  // DESIGN_REQ 전환 시 AiTask 자동 생성
  if (body.status === "DESIGN_REQ") {
    const taskSystemId = await generateSystemId("ATK");
    await prisma.aiTask.create({
      data: {
        systemId: taskSystemId,
        refTableName: "tb_area",
        refPkId: numId,
        taskType: "DESIGN",
        taskStatus: "NONE",
        spec: area.spec,
        comment: body.comment?.trim() || null,
      },
    });
  }

  return apiSuccess(data);
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const numId = parseInt(id);
  const mode = new URL(request.url).searchParams.get("mode");

  const area = await prisma.area.findUnique({ where: { areaId: numId } });
  if (!area) return apiError("NOT_FOUND", "영역을 찾을 수 없습니다.", 404);

  const funcCount = await prisma.function.count({ where: { areaId: numId } });

  if (funcCount > 0 && !mode) {
    return apiError("HAS_CHILDREN", `하위 기능 ${funcCount}건이 존재합니다.`, 409);
  }

  if (mode === "cascade") {
    await prisma.function.deleteMany({ where: { areaId: numId } });
  } else if (mode === "detach") {
    await prisma.function.updateMany({
      where: { areaId: numId },
      data: { areaId: null },
    });
  }

  await prisma.area.delete({ where: { areaId: numId } });
  return apiSuccess({ deleted: true });
}
