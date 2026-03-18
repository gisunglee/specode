import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { generateSystemId } from "@/lib/sequence";
import { apiSuccess, apiError } from "@/lib/utils";
import { statusToPhase, phaseToStatus } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const screenId   = searchParams.get("screenId");
  const unitWorkId = searchParams.get("unitWorkId");
  const status = searchParams.get("status");
  const search = searchParams.get("search") || "";

  const where: Record<string, unknown> = {};
  if (screenId) {
    where.screenId = parseInt(screenId);
  } else if (unitWorkId) {
    where.screen = { unitWorkId: parseInt(unitWorkId) };
  }
  if (status) {
    // 구 status 문자열을 phase/phaseStatus로 변환하여 필터
    const phaseFilter = statusToPhase(status);
    where.phase = phaseFilter.phase;
    where.phaseStatus = phaseFilter.phaseStatus;
    if (phaseFilter.confirmed) where.confirmed = true;
  }
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { areaCode: { contains: search } },
    ];
  }

  const [areas, total] = await Promise.all([
    prisma.area.findMany({
      where,
      include: {
        screen: { select: { name: true, systemId: true } },
        _count: { select: { functions: true } },
      },
      orderBy: [
        { screen: { unitWork: { sortOrder: "asc" } } },
        { screen: { sortOrder: "asc" } },
        { sortOrder: "asc" },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.area.count({ where }),
  ]);

  const areaIds = areas.map((a) => a.areaId);
  const latestTasks = areaIds.length
    ? await prisma.aiTask.findMany({
        where: { refTableName: "tb_area", refPkId: { in: areaIds } },
        orderBy: { requestedAt: "desc" },
      })
    : [];
  const taskByAreaId = new Map<number, (typeof latestTasks)[0]>();
  for (const t of latestTasks) {
    if (!taskByAreaId.has(t.refPkId)) taskByAreaId.set(t.refPkId, t);
  }

  const enriched = areas.map((a) => ({
    ...a,
    status: phaseToStatus(a.phase, a.phaseStatus, a.confirmed ?? false),
    latestTask: taskByAreaId.get(a.areaId) ?? null,
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
    const body = await request.json();

    if (!body.name || !body.screenId || !body.areaType) {
      return apiError("VALIDATION_ERROR", "name, screenId, areaType은 필수입니다.");
    }

    const areaCode = await generateSystemId("AR");

    const data = await prisma.area.create({
      data: {
        areaCode,
        screenId: body.screenId,
        name: body.name,
        sortOrder: body.sortOrder ?? 1,
        areaType: body.areaType,
        spec: body.spec ?? null,
        reqComment: body.reqComment ?? null,
      },
      include: {
        screen: { select: { name: true, systemId: true } },
      },
    });

    return apiSuccess(data);
  } catch (error) {
    console.error(error);
    return apiError("SERVER_ERROR", "서버 오류가 발생했습니다.", 500);
  }
}
