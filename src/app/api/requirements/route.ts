import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { generateSystemId } from "@/lib/sequence";
import { requirementSchema } from "@/lib/validators";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page     = parseInt(searchParams.get("page")     || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const search   = searchParams.get("search") || "";
  const taskId   = searchParams.get("taskId");

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { systemId: { contains: search } },
    ];
  }
  if (taskId) {
    where.taskId = parseInt(taskId);
  }

  const [data, total] = await Promise.all([
    prisma.requirement.findMany({
      where,
      include: {
        _count: { select: { screens: true, userStories: true } },
        screens: {
          include: { _count: { select: { areas: true } } },
        },
        task: { select: { taskId: true, systemId: true, name: true } },
      },
      orderBy: { systemId: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.requirement.count({ where }),
  ]);

  const enriched = data.map((r) => ({
    ...r,
    screenCount:    r._count.screens,
    functionCount:  r.screens.reduce((sum, s) => sum + s._count.areas, 0),
    userStoryCount: r._count.userStories,
    screens: undefined,
    _count:  undefined,
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
    const parsed = requirementSchema.parse(body);

    const systemId = await generateSystemId("RQ");

    const data = await prisma.requirement.create({
      data: {
        systemId,
        name:            parsed.name,
        originalContent: parsed.originalContent ?? null,
        currentContent:  parsed.currentContent  ?? null,
        detailSpec:      parsed.detailSpec       ?? null,
        priority:        parsed.priority         ?? null,
        taskId:          parsed.taskId           ?? null,
        source:          parsed.source,
        discussionMd:    parsed.discussionMd     ?? null,
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
