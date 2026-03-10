/**
 * /api/screens/[id] — 화면 상세 API
 *
 * GET    — 화면 상세 조회 (requirement, areas + functions, attachments 포함)
 * PUT    — 화면 정보 수정
 * DELETE — 화면 삭제
 *   mode=cascade  → 영역 + 기능 모두 삭제 후 화면 삭제
 *   mode=detach   → 영역의 screenId를 null 처리 (영역·기능 유지), 화면만 삭제
 *   mode 없음     → 영역이 없으면 그냥 삭제, 있으면 409
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
      areas: {
        orderBy: { sortOrder: "asc" },
        include: {
          functions: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  if (!data) {
    return apiError("NOT_FOUND", "화면을 찾을 수 없습니다.", 404);
  }

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
        categoryL: parsed.categoryL ?? null,
        categoryM: parsed.categoryM ?? null,
        categoryS: parsed.categoryS ?? null,
        menuOrder: parsed.menuOrder ?? null,
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

  const screen = await prisma.screen.findUnique({ where: { screenId: numId } });
  if (!screen) return apiError("NOT_FOUND", "화면을 찾을 수 없습니다.", 404);

  const areaCount = await prisma.area.count({ where: { screenId: numId } });
  if (areaCount > 0) {
    return apiError(
      "HAS_CHILDREN",
      `연결된 영역 ${areaCount}건이 있습니다. 영역에서 화면 연결을 해제 후 삭제하세요.`,
      409
    );
  }

  await prisma.screen.delete({ where: { screenId: numId } });
  return apiSuccess({ deleted: true });
}
