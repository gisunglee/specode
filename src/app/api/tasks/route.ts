/**
 * GET  /api/tasks  — 과업 목록 (페이징 + 검색)
 * POST /api/tasks  — 과업 등록
 */
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { taskSchema } from "@/lib/validators";
import { apiSuccess, apiError } from "@/lib/utils";
import { generateSystemId } from "@/lib/sequence";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page     = parseInt(searchParams.get("page")     || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const search   = searchParams.get("search") || "";

  const where = search
    ? { OR: [{ name: { contains: search } }, { systemId: { contains: search } }] }
    : {};

  const [data, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: { _count: { select: { requirements: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.task.count({ where }),
  ]);

  const enriched = data.map((t) => ({
    ...t,
    requirementCount: t._count.requirements,
  }));

  return apiSuccess(enriched, {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body   = await request.json();
    const parsed = taskSchema.parse(body);

    // T-00001 형식으로 채번
    const systemId = await generateSystemId("T");

    const data = await prisma.task.create({
      data: {
        systemId,
        name:       parsed.name,
        category:   parsed.category   ?? null,
        definition: parsed.definition ?? null,
        outputInfo: parsed.outputInfo ?? null,
        rfpPage:    parsed.rfpPage    ?? null,
        content:    parsed.content    ?? null,
      },
    });

    return apiSuccess(data);
  } catch {
    return apiError("SERVER_ERROR", "과업 등록에 실패했습니다.", 500);
  }
}
