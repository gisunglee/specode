import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { userStorySchema } from "@/lib/validators";
import { apiSuccess, apiError } from "@/lib/utils";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/user-stories/[id]
 *
 * 사용자 스토리 단건 조회.
 * 소속 요구사항 정보 포함.
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const data = await prisma.userStory.findUnique({
    where: { userStoryId: parseInt(id) },
    include: {
      requirement: { select: { requirementId: true, systemId: true, name: true } },
      _count: { select: { screenMaps: true } },
    },
  });

  if (!data) return apiError("NOT_FOUND", "사용자 스토리를 찾을 수 없습니다.", 404);
  return apiSuccess(data);
}

/**
 * PUT /api/user-stories/[id]
 *
 * 사용자 스토리 수정.
 * updatedAt은 Prisma @updatedAt으로 자동 갱신.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const parsed = userStorySchema.parse(body);

    const updated = await prisma.userStory.update({
      where: { userStoryId: parseInt(id) },
      data: {
        requirementId: parsed.requirementId,
        name: parsed.name,
        persona: parsed.persona ?? null,
        scenario: parsed.scenario ?? null,
        acceptanceCriteria: parsed.acceptanceCriteria
          ? (parsed.acceptanceCriteria as object[])
          : null,
      },
    });

    return apiSuccess(updated);
  } catch {
    return apiError("SERVER_ERROR", "수정에 실패했습니다.", 500);
  }
}

/**
 * DELETE /api/user-stories/[id]
 *
 * 사용자 스토리 삭제.
 * tb_screen_story_map은 ON DELETE CASCADE로 자동 삭제됨.
 */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const numId = parseInt(id);

  const story = await prisma.userStory.findUnique({ where: { userStoryId: numId } });
  if (!story) return apiError("NOT_FOUND", "사용자 스토리를 찾을 수 없습니다.", 404);

  await prisma.$transaction([
    prisma.screenStoryMap.deleteMany({ where: { userStoryId: numId } }),
    prisma.userStory.delete({ where: { userStoryId: numId } }),
  ]);
  return apiSuccess({ deleted: true });
}
