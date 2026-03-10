import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { generateSystemId } from "@/lib/sequence";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const status = searchParams.get("status");
  const areaId = searchParams.get("areaId");
  const screenId = searchParams.get("screenId"); // 화면 ID로 필터 (area 경유)
  const priority = searchParams.get("priority");
  const search = searchParams.get("search") || "";

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (areaId) where.areaId = parseInt(areaId);
  if (priority) where.priority = priority;
  if (screenId) {
    // 화면 ID로 필터 시 해당 화면의 영역들을 경유
    where.area = { screenId: parseInt(screenId) };
  }
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { systemId: { contains: search } },
      { displayCode: { contains: search } },
    ];
  }

  const [functions, total] = await Promise.all([
    prisma.function.findMany({
      where,
      include: {
        area: {
          select: {
            name: true,
            areaCode: true,
            sortOrder: true,
            screen: {
              select: {
                name: true,
                systemId: true,
                categoryL: true,
                categoryM: true,
                categoryS: true,
                requirement: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: [
        { area: { screen: { categoryL: "asc" } } },
        { area: { screen: { categoryM: "asc" } } },
        { area: { screen: { categoryS: "asc" } } },
        { area: { sortOrder: "asc" } },
        { sortOrder: "asc" },
        { createdAt: "asc" },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.function.count({ where }),
  ]);

  /* 최근 AiTask 1건씩 매핑 */
  const funcIds = functions.map((f) => f.functionId);
  const latestTasks = funcIds.length
    ? await prisma.aiTask.findMany({
        where: { refTableName: "tb_function", refPkId: { in: funcIds } },
        orderBy: { requestedAt: "desc" },
      })
    : [];

  const taskByFuncId = new Map<number, (typeof latestTasks)[0]>();
  for (const t of latestTasks) {
    if (!taskByFuncId.has(t.refPkId)) taskByFuncId.set(t.refPkId, t);
  }

  const data = functions.map((f) => ({ ...f, latestTask: taskByFuncId.get(f.functionId) ?? null }));

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

    if (!body.name) {
      return apiError("VALIDATION_ERROR", "기능명은 필수입니다.");
    }

    const systemId = await generateSystemId("FID");

    const data = await prisma.function.create({
      data: {
        systemId,
        name: String(body.name),
        displayCode: body.displayCode ? String(body.displayCode) : undefined,
        sortOrder: body.sortOrder ? Number(body.sortOrder) : undefined,
        spec: body.spec ? String(body.spec) : undefined,
        dataFlow: body.dataFlow ? String(body.dataFlow) : undefined,
        priority: body.priority ? String(body.priority) : "MEDIUM",
        ...(body.areaId && !isNaN(Number(body.areaId)) && {
          area: { connect: { areaId: Number(body.areaId) } },
        }),
      },
      include: {
        area: { select: { name: true, areaCode: true } },
      },
    });

    return apiSuccess(data);
  } catch (error) {
    console.error(error);
    return apiError("SERVER_ERROR", "서버 오류가 발생했습니다.", 500);
  }
}
