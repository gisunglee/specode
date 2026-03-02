/**
 * /api/screens/[id] — 화면 상세 API
 *
 * 📌 역할:
 *   GET    — 화면 상세 조회 (requirement, functions, attachments 포함)
 *   PUT    — 화면 정보 수정 (name, displayCode, screenType, requirementId, spec, layoutData)
 *   DELETE — 화면 삭제 (하위 기능 존재 시 차단)
 */
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { screenSchema } from "@/lib/validators";
import { apiSuccess, apiError } from "@/lib/utils";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const numId = parseInt(id);

  const data = await prisma.screen.findUnique({
    where: { screenId: numId },
    include: {
      requirement: true,
      functions: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!data) {
    return apiError("NOT_FOUND", "화면을 찾을 수 없습니다.", 404);
  }

  /* 📌 polymorphic 첨부파일 조회 (tb_attachment.ref_table_name = 'tb_screen') */
  const attachments = await prisma.attachment.findMany({
    where: { refTableName: "tb_screen", refPkId: numId, delYn: "N" },
    orderBy: { createdAt: "asc" },
  });

  return apiSuccess({ ...data, attachments });
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
        spec: parsed.spec ?? null,
        layoutData: parsed.layoutData ?? null,
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
