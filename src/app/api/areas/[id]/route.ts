import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { generateSystemId } from "@/lib/sequence";
import { apiSuccess, apiError } from "@/lib/utils";
import { saveContentVersion } from "@/lib/contentVersion";

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

  // polymorphic AiTask + Attachment 조회
  const [tasks, attachments] = await Promise.all([
    prisma.aiTask.findMany({
      where: { refTableName: "tb_area", refPkId: numId },
      orderBy: { requestedAt: "desc" },
    }),
    prisma.attachment.findMany({
      where: { refTableName: "tb_area", refPkId: numId, delYn: "N" },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return apiSuccess({ ...data, tasks, attachments });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const numId = parseInt(id);
    const body = await request.json();
    const { saveVersionLog, ...updateBody } = body;

    const existing = await prisma.area.findUnique({
      where: { areaId: numId },
      select: { spec: true },
    });
    if (!existing) return apiError("NOT_FOUND", "영역을 찾을 수 없습니다.", 404);

    // 버전 이력 저장 (saveVersionLog=true 일 때만)
    if (saveVersionLog && updateBody.spec !== undefined && updateBody.spec !== existing.spec) {
      await saveContentVersion({
        refTableName: "tb_area",
        refPkId: numId,
        fieldName: "spec",
        currentContent: existing.spec,
        changedBy: "user",
      });
    }

    const data = await prisma.area.update({
      where: { areaId: numId },
      data: {
        name: updateBody.name ?? undefined,
        screenId: updateBody.screenId !== undefined ? updateBody.screenId : undefined,
        areaType: updateBody.areaType ?? undefined,
        sortOrder: updateBody.sortOrder ?? undefined,
        spec: updateBody.spec !== undefined ? (updateBody.spec || null) : undefined,
        layoutData: updateBody.layoutData !== undefined ? (updateBody.layoutData || null) : undefined,
        designData: updateBody.designData !== undefined ? (updateBody.designData || null) : undefined,
        reqComment: updateBody.reqComment !== undefined ? (updateBody.reqComment || null) : undefined,
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

  // ── 구현 요청 (상태 변경 없음, AiTask만 생성) ─────────────
  if (body.action === "IMPL_REQ") {
    const area = await prisma.area.findUnique({
      where: { areaId: numId },
      select: {
        areaCode: true,
        name: true,
        spec: true,
        functions: {
          select: { functionId: true, name: true, spec: true, aiDesignContent: true, refContent: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!area) return apiError("NOT_FOUND", "영역을 찾을 수 없습니다.", 404);

    // spec 조합: 영역 설명 + 각 기능
    const specParts: string[] = [];
    if (area.spec) specParts.push(`# 영역: ${area.name} (${area.areaCode})\n\n## 영역 설명\n\n${area.spec}`);
    for (const f of area.functions) {
      const fParts: string[] = [`## 기능: ${f.name}`];
      if (f.spec) fParts.push(`\n### 기본 설계 내용\n\n${f.spec}`);
      if (f.aiDesignContent) fParts.push(`\n### 상세설계\n\n${f.aiDesignContent}`);
      if (fParts.length > 1) specParts.push(fParts.join("\n"));
    }

    const taskSystemId = await generateSystemId("ATK");
    await prisma.aiTask.create({
      data: {
        systemId: taskSystemId,
        refTableName: "tb_area",
        refPkId: numId,
        taskType: "IMPLEMENT",
        taskStatus: "NONE",
        spec: specParts.join("\n\n---\n\n") || null,
        contextSnapshot: JSON.stringify({
          area: { spec: area.spec || "" },
          functions: area.functions.map((f) => ({
            functionId: f.functionId,
            name: f.name,
            spec: f.spec || "",
            aiDesignContent: f.aiDesignContent || "",
            refContent: f.refContent || "",
          })),
        }),
        changeNote: body.changeNote?.trim() || null,
      },
    });

    return apiSuccess({ requested: true });
  }

  // ── 상태 변경 ──────────────────────────────────────────────
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
        spec: body.aiSpec ?? area.spec,
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
