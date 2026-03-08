/**
 * /api/standard-guides — 표준 가이드 목록 API
 *
 * GET  — 목록 조회 (category 필터, 검색, 페이지네이션)
 * POST — 신규 등록 (system_id 자동 채번: GID-00001)
 */
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

const VALID_CATEGORIES = ["UI", "DATA", "AUTH", "API", "COMMON", "SECURITY", "FILE", "ERROR", "BATCH", "REPORT"];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page     = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "50");
  const category = searchParams.get("category") || "";
  const search   = searchParams.get("search") || "";

  const where: Record<string, unknown> = {};
  if (category && VALID_CATEGORIES.includes(category)) {
    where.category = category;
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { systemId: { contains: search, mode: "insensitive" } },
    ];
  }

  const [guides, total] = await Promise.all([
    prisma.standardGuide.findMany({
      where,
      orderBy: [{ category: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.standardGuide.count({ where }),
  ]);

  /* 최근 AiTask 1건씩 매핑 */
  const guideIds = guides.map((g) => g.guideId);
  const latestTasks = guideIds.length
    ? await prisma.aiTask.findMany({
        where: { refTableName: "tb_standard_guide", refPkId: { in: guideIds } },
        orderBy: { requestedAt: "desc" },
      })
    : [];

  const taskByGuideId = new Map<number, (typeof latestTasks)[0]>();
  for (const t of latestTasks) {
    if (!taskByGuideId.has(t.refPkId)) taskByGuideId.set(t.refPkId, t);
  }

  const data = guides.map((g) => ({ ...g, latestTask: taskByGuideId.get(g.guideId) ?? null }));

  return apiSuccess(data, {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, title, content, isActive } = body;

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return apiError("VALIDATION_ERROR", "유효하지 않은 카테고리입니다.");
    }
    if (!title?.trim()) {
      return apiError("VALIDATION_ERROR", "제목은 필수입니다.");
    }

    /* 📌 GID sequence — tb_sequence에 'GID' row가 없으면 자동 초기화 */
    const seq = await prisma.$transaction(async (tx) => {
      return tx.sequence.upsert({
        where: { prefix: "GID" },
        create: { prefix: "GID", lastValue: 1 },
        update: { lastValue: { increment: 1 } },
      });
    });
    const systemId = `GID-${String(seq.lastValue).padStart(5, "0")}`;

    const data = await prisma.standardGuide.create({
      data: {
        systemId,
        category,
        title: title.trim(),
        content: content?.trim() || null,
        isActive: isActive === "N" ? "N" : "Y",
      },
    });

    return apiSuccess(data);
  } catch (error) {
    console.error(error);
    return apiError("SERVER_ERROR", "등록에 실패했습니다.", 500);
  }
}
