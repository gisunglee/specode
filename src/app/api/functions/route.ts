import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { generateSystemId } from "@/lib/sequence";
import { apiSuccess, apiError } from "@/lib/utils";
import { phaseToStatus } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get("ids"); // "ALL" | "1,2,3" — AI 워커용 벌크 조회

  // ── ids 파라미터: AI 워커용 벌크 조회 (페이지네이션 없음) ──────────────
  if (idsParam !== null) {
    const where: Record<string, unknown> = {};
    if (idsParam !== "ALL") {
      const ids = idsParam.split(",").map((s) => parseInt(s.trim())).filter((n) => !isNaN(n));
      if (ids.length === 0) return apiError("VALIDATION_ERROR", "유효한 ids 값이 없습니다.");
      where.functionId = { in: ids };
    }

    const functions = await prisma.function.findMany({
      where,
      include: {
        area: {
          select: {
            name: true,
            areaCode: true,
            screen: { select: { name: true, systemId: true, categoryL: true, categoryM: true, categoryS: true } },
          },
        },
      },
      orderBy: [{ area: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    });

    return apiSuccess(functions);
  }

  // ── 기존 페이지네이션 조회 (웹 UI용) ─────────────────────────────────
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const status = searchParams.get("status");
  const areaId     = searchParams.get("areaId");
  const screenId   = searchParams.get("screenId");
  const unitWorkId = searchParams.get("unitWorkId");
  const priority   = searchParams.get("priority");
  const search     = searchParams.get("search") || "";

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (areaId) where.areaId = parseInt(areaId);
  if (priority) where.priority = priority;
  if (screenId) {
    where.area = { screenId: parseInt(screenId) };
  } else if (!areaId && unitWorkId) {
    where.area = { screen: { unitWorkId: parseInt(unitWorkId) } };
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
            areaId: true,
            name: true,
            areaCode: true,
            sortOrder: true,
            screen: {
              select: {
                screenId: true,
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
        { area: { screen: { unitWork: { sortOrder: "asc" } } } },
        { area: { screen: { sortOrder: "asc" } } },
        { area: { sortOrder: "asc" } },
        { sortOrder: "asc" },
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

  const data = functions.map((f) => ({
    ...f,
    status: phaseToStatus(f.phase, f.phaseStatus, f.confirmed),
    latestTask: taskByFuncId.get(f.functionId) ?? null,
  }));

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
