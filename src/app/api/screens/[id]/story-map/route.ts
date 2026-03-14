import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/screens/[id]/story-map
 *
 * 현재 화면에 매핑된 스토리 목록과
 * 같은 요구사항에 속한 전체 스토리 목록을 함께 반환.
 *
 * 응답:
 *   - mapped: 현재 화면에 매핑된 항목 (isMainStory 포함)
 *   - available: 같은 요구사항에 속한 전체 사용자 스토리
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const screenId = parseInt(id);

  const screen = await prisma.screen.findUnique({
    where: { screenId },
    include: {
      storyMaps: {
        include: {
          userStory: {
            select: {
              userStoryId: true,
              systemId: true,
              name: true,
              persona: true,
              scenario: true,
            },
          },
        },
        orderBy: [{ isMainStory: "desc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!screen) return apiError("NOT_FOUND", "화면을 찾을 수 없습니다.", 404);

  // 같은 요구사항에 속한 전체 스토리 조회 (매핑 선택 화면에서 표시)
  const available = await prisma.userStory.findMany({
    where: { requirementId: screen.requirementId },
    select: {
      userStoryId: true,
      systemId: true,
      name: true,
      persona: true,
      scenario: true,
    },
    orderBy: { systemId: "asc" },
  });

  return apiSuccess({
    mapped: screen.storyMaps,
    available,
  });
}

/** 매핑 항목 입력 스키마 */
const storyMapSchema = z.object({
  maps: z.array(
    z.object({
      userStoryId: z.number(),
      isMainStory: z.boolean().default(false),
    })
  ),
});

/**
 * PUT /api/screens/[id]/story-map
 *
 * 화면-스토리 매핑을 교체(replace).
 * 기존 매핑 전체 삭제 후 새 목록으로 재생성.
 * 트랜잭션으로 원자성 보장.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const screenId = parseInt(id);
    const body = await request.json();
    const { maps } = storyMapSchema.parse(body);

    await prisma.$transaction([
      // 기존 매핑 전체 삭제
      prisma.screenStoryMap.deleteMany({ where: { screenId } }),
      // 새 매핑 일괄 생성
      prisma.screenStoryMap.createMany({
        data: maps.map((m) => ({
          screenId,
          userStoryId: m.userStoryId,
          isMainStory: m.isMainStory,
        })),
        skipDuplicates: true,
      }),
    ]);

    return apiSuccess({ updated: true });
  } catch {
    return apiError("SERVER_ERROR", "매핑 저장에 실패했습니다.", 500);
  }
}
