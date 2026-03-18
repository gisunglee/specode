import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { generateSystemId } from "@/lib/sequence";
import { screenSchema } from "@/lib/validators";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const requirementId = searchParams.get("requirementId");
  const search = searchParams.get("search") || "";

  const where: Record<string, unknown> = {};
  if (requirementId) where.requirementId = parseInt(requirementId);
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { systemId: { contains: search } },
      { displayCode: { contains: search } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.screen.findMany({
      where,
      include: {
        requirement: { select: { name: true, systemId: true } },
        _count: { select: { areas: true } },
        areas: { select: { functions: { select: { confirmed: true } } } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.screen.count({ where }),
  ]);

  const screenIds = data.map((s) => s.screenId);
  const latestTasks = screenIds.length
    ? await prisma.aiTask.findMany({
        where: { refTableName: "tb_screen", refPkId: { in: screenIds } },
        orderBy: { requestedAt: "desc" },
      })
    : [];
  const taskByScreenId = new Map<number, (typeof latestTasks)[0]>();
  for (const t of latestTasks) {
    if (!taskByScreenId.has(t.refPkId)) taskByScreenId.set(t.refPkId, t);
  }

  const processed = data.map((screen) => {
    const funcCount = screen.areas.reduce((acc, a) => acc + a.functions.length, 0);
    const confirmedCount = screen.areas.reduce(
      (acc, a) => acc + a.functions.filter((f) => f.confirmed).length,
      0
    );
    const { areas, ...rest } = screen;
    return { ...rest, funcCount, confirmedCount, latestTask: taskByScreenId.get(screen.screenId) ?? null };
  });

  return apiSuccess(processed, {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = screenSchema.parse(body);

    const systemId = await generateSystemId("PID");

    const data = await prisma.screen.create({
      data: {
        systemId,
        name: parsed.name,
        displayCode: parsed.displayCode ?? null,
        screenType: parsed.screenType ?? null,
        requirementId: parsed.requirementId,
      },
      include: {
        requirement: { select: { name: true, systemId: true } },
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
