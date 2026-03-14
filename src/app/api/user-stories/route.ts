import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { generateSystemId } from "@/lib/sequence";
import { userStorySchema } from "@/lib/validators";
import { apiSuccess, apiError } from "@/lib/utils";

/**
 * GET /api/user-stories
 *
 * 사용자 스토리 목록 조회.
 * Query:
 *   - requirementId?: 요구사항 필터
 *   - search?: 이름/페르소나 검색
 *   - page?: 페이지 번호 (기본: 1)
 *   - pageSize?: 페이지 크기 (기본: 20)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const search = searchParams.get("search") || "";
  const requirementId = searchParams.get("requirementId");

  const where: Record<string, unknown> = {};

  // 요구사항 필터
  if (requirementId) {
    where.requirementId = parseInt(requirementId);
  }

  // 이름 또는 페르소나 검색
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { persona: { contains: search, mode: "insensitive" } },
      { systemId: { contains: search, mode: "insensitive" } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.userStory.findMany({
      where,
      include: {
        _count: { select: { screenMaps: true } },
        requirement: { select: { systemId: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.userStory.count({ where }),
  ]);

  // AC 항목 수 계산 후 응답 정형화
  const enriched = data.map((s) => ({
    ...s,
    screenMapCount: s._count.screenMaps,
    // acceptanceCriteria가 배열이면 length, 아니면 0
    acCount: Array.isArray(s.acceptanceCriteria) ? s.acceptanceCriteria.length : 0,
    _count: undefined,
  }));

  return apiSuccess(enriched, {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
}

/**
 * POST /api/user-stories
 *
 * 사용자 스토리 등록.
 * systemId는 US-00001 형식으로 자동 생성.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = userStorySchema.parse(body);

    const systemId = await generateSystemId("US");

    const data = await prisma.userStory.create({
      data: {
        systemId,
        requirementId: parsed.requirementId,
        name: parsed.name,
        persona: parsed.persona ?? null,
        scenario: parsed.scenario ?? null,
        // Prisma Json 타입: null 처리 포함
        acceptanceCriteria: parsed.acceptanceCriteria
          ? (parsed.acceptanceCriteria as object[])
          : null,
      },
    });

    return apiSuccess(data);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return apiError("VALIDATION_ERROR", "입력값이 올바르지 않습니다.");
    }
    return apiError("SERVER_ERROR", "서버 오류가 발생했습니다.", 500);
  }
}
