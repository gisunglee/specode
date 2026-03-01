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
      screen: {
        include: {
          requirement: { select: { name: true, systemId: true } },
        },
      },
      references: { orderBy: { createdAt: "asc" } },
      relations: {
        include: {
          targetFunction: {
            select: { systemId: true, displayCode: true, name: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      relatedBy: {
        include: {
          sourceFunction: {
            select: { systemId: true, displayCode: true, name: true },
          },
        },
      },
      /* 기능 레벨 파일 (aiTaskId가 null인 것만 — AI 태스크 소속이 아닌 파일) */
      files: {
        where: { aiTaskId: null },
        orderBy: { createdAt: "asc" },
      },
      /* AI 작업 이력 — 최신순 정렬, 각 태스크의 파일 목록 포함 */
      tasks: {
        include: {
          files: { orderBy: { createdAt: "asc" } },
        },
        orderBy: { requestedAt: "desc" },
      },
    },
  });

  if (!data) {
    return apiError("NOT_FOUND", "기능을 찾을 수 없습니다.", 404);
  }

  return apiSuccess(data);
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

    // Update references if provided
    if (body.references) {
      await prisma.funcReference.deleteMany({ where: { functionId: numId } });
      if (body.references.length > 0) {
        await prisma.funcReference.createMany({
          data: body.references.map(
            (r: { refType: string; refValue: string; description?: string }) => ({
              functionId: numId,
              refType: r.refType,
              refValue: r.refValue,
              description: r.description ?? null,
            })
          ),
        });
      }
    }

    // Update relations if provided
    if (body.relations) {
      await prisma.funcRelation.deleteMany({
        where: { sourceFunctionId: numId },
      });
      if (body.relations.length > 0) {
        await prisma.funcRelation.createMany({
          data: body.relations.map(
            (r: {
              targetFunctionId: number;
              relationType: string;
              params?: string;
              description?: string;
            }) => ({
              sourceFunctionId: numId,
              targetFunctionId: r.targetFunctionId,
              relationType: r.relationType,
              params: r.params ?? null,
              description: r.description ?? null,
            })
          ),
        });
      }
    }

    const data = await prisma.function.update({
      where: { functionId: numId },
      data: {
        name: body.name,
        displayCode: body.displayCode ?? undefined,
        screenId: body.screenId ?? undefined,
        spec: body.spec ?? undefined,
        dataFlow: body.dataFlow ?? undefined,
        changeReason: body.changeReason ?? undefined,
        requestType: body.requestType ?? undefined,
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
  if (body.status === "REVIEW_REQ" || body.status === "IMPL_REQ") {
    const taskType = body.status === "IMPL_REQ" ? "IMPLEMENT" : "REVIEW";

    /*
     * 📌 AI 태스크 생성
     *    - spec: 현재 시점의 기능 설계 내용을 스냅샷으로 저장
     *    - comment: GS 코멘트가 있으면 함께 저장 (AI에게 추가 메시지로 전달됨)
     *    - AI가 폴링으로 이 태스크를 가져가서 spec + comment를 프롬프트에 포함
     */
    const taskSystemId = await generateSystemId("ATK");
    await prisma.aiTask.create({
      data: {
        systemId: taskSystemId,
        functionId: numId,
        taskType,
        taskStatus: "PENDING",
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
