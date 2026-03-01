import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { screenSchema } from "@/lib/validators";
import { apiSuccess, apiError } from "@/lib/utils";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const data = await prisma.screen.findUnique({
    where: { screenId: parseInt(id) },
    include: {
      requirement: true,
      functions: true,
    },
  });

  if (!data) {
    return apiError("NOT_FOUND", "화면을 찾을 수 없습니다.", 404);
  }

  return apiSuccess(data);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = screenSchema.parse(body);

    const data = await prisma.screen.update({
      where: { screenId: parseInt(id) },
      data: {
        name: parsed.name,
        displayCode: parsed.displayCode ?? null,
        screenType: parsed.screenType ?? null,
        requirementId: parsed.requirementId,
      },
    });

    return apiSuccess(data);
  } catch {
    return apiError("SERVER_ERROR", "수정에 실패했습니다.", 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const numId = parseInt(id);

  const funcCount = await prisma.function.count({
    where: { screenId: numId },
  });

  if (funcCount > 0) {
    return apiError(
      "HAS_CHILDREN",
      `하위 기능 ${funcCount}건이 존재합니다. 먼저 삭제해주세요.`
    );
  }

  await prisma.screen.delete({ where: { screenId: numId } });

  return apiSuccess({ deleted: true });
}
