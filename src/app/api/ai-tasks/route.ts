import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { apiSuccess } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const taskStatus = searchParams.get("taskStatus");
  const taskType = searchParams.get("taskType");
  const refTableName = searchParams.get("refTableName");
  const search = searchParams.get("search")?.trim() || "";

  const where: Record<string, unknown> = {};
  if (taskStatus) where.taskStatus = taskStatus;
  if (taskType) where.taskType = taskType;
  if (refTableName) where.refTableName = refTableName;

  /* ── 대상 이름 검색: 각 엔티티 테이블에서 매칭 ID 조회 ─────── */
  if (search) {
    const tables = refTableName
      ? [refTableName]
      : ["tb_function", "tb_standard_guide", "tb_area", "tb_screen", "tb_planning_draft"];

    const [fnMatches, gMatches, areaMatches, screenMatches, planMatches] = await Promise.all([
      tables.includes("tb_function")
        ? prisma.function.findMany({
            where: { OR: [{ name: { contains: search } }, { systemId: { contains: search } }] },
            select: { functionId: true },
          })
        : Promise.resolve([]),
      tables.includes("tb_standard_guide")
        ? prisma.standardGuide.findMany({
            where: { OR: [{ title: { contains: search } }, { systemId: { contains: search } }] },
            select: { guideId: true },
          })
        : Promise.resolve([]),
      tables.includes("tb_area")
        ? prisma.area.findMany({
            where: { OR: [{ name: { contains: search } }, { areaCode: { contains: search } }] },
            select: { areaId: true },
          })
        : Promise.resolve([]),
      tables.includes("tb_screen")
        ? prisma.screen.findMany({
            where: { OR: [{ name: { contains: search } }, { systemId: { contains: search } }] },
            select: { screenId: true },
          })
        : Promise.resolve([]),
      tables.includes("tb_planning_draft")
        ? prisma.planningDraft.findMany({
            where: { planNm: { contains: search } },
            select: { planSn: true },
          })
        : Promise.resolve([]),
    ]);

    const orConditions: unknown[] = [
      ...(fnMatches.length     ? [{ refTableName: "tb_function",       refPkId: { in: fnMatches.map(m => m.functionId) } }] : []),
      ...(gMatches.length      ? [{ refTableName: "tb_standard_guide", refPkId: { in: gMatches.map(m => m.guideId) } }] : []),
      ...(areaMatches.length   ? [{ refTableName: "tb_area",           refPkId: { in: areaMatches.map(m => m.areaId) } }] : []),
      ...(screenMatches.length ? [{ refTableName: "tb_screen",         refPkId: { in: screenMatches.map(m => m.screenId) } }] : []),
      ...(planMatches.length   ? [{ refTableName: "tb_planning_draft", refPkId: { in: planMatches.map(m => m.planSn) } }] : []),
    ];

    if (orConditions.length === 0) {
      return apiSuccess([], { page, pageSize, total: 0, totalPages: 0 });
    }
    where.OR = orConditions;
    // refTableName이 이미 where에 있으면 중복 조건이 되지만 결과는 동일
  }

  const [tasks, total] = await Promise.all([
    prisma.aiTask.findMany({
      where,
      orderBy: { requestedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.aiTask.count({ where }),
  ]);

  /* ── 대상 엔티티 정보를 refTableName별로 일괄 조회 ─────────── */
  const fnIds      = tasks.filter(t => t.refTableName === "tb_function").map(t => t.refPkId);
  const gIds       = tasks.filter(t => t.refTableName === "tb_standard_guide").map(t => t.refPkId);
  const areaIds    = tasks.filter(t => t.refTableName === "tb_area").map(t => t.refPkId);
  const planIds    = tasks.filter(t => t.refTableName === "tb_planning_draft").map(t => t.refPkId);
  const screenIds  = tasks.filter(t => t.refTableName === "tb_screen").map(t => t.refPkId);

  const [functions, guides, areas, plans, screens] = await Promise.all([
    fnIds.length
      ? prisma.function.findMany({
          where: { functionId: { in: fnIds } },
          select: { functionId: true, systemId: true, name: true, displayCode: true },
        })
      : Promise.resolve([]),
    gIds.length
      ? prisma.standardGuide.findMany({
          where: { guideId: { in: gIds } },
          select: { guideId: true, systemId: true, title: true, category: true },
        })
      : Promise.resolve([]),
    areaIds.length
      ? prisma.area.findMany({
          where: { areaId: { in: areaIds } },
          select: { areaId: true, areaCode: true, name: true },
        })
      : Promise.resolve([]),
    planIds.length
      ? prisma.planningDraft.findMany({
          where: { planSn: { in: planIds } },
          select: { planSn: true, planNm: true, planType: true },
        })
      : Promise.resolve([]),
    screenIds.length
      ? prisma.screen.findMany({
          where: { screenId: { in: screenIds } },
          select: { screenId: true, systemId: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  const fnMap     = new Map(functions.map(f => [f.functionId, f]));
  const gMap      = new Map(guides.map(g => [g.guideId, g]));
  const areaMap   = new Map(areas.map(a => [a.areaId, a]));
  const planMap   = new Map(plans.map(p => [p.planSn, p]));
  const screenMap = new Map(screens.map(s => [s.screenId, s]));

  const data = tasks.map(t => ({
    ...t,
    target:
      t.refTableName === "tb_function"
        ? (fnMap.get(t.refPkId) ?? null)
        : t.refTableName === "tb_standard_guide"
          ? (gMap.get(t.refPkId) ?? null)
          : t.refTableName === "tb_area"
            ? (areaMap.get(t.refPkId) ?? null)
            : t.refTableName === "tb_planning_draft"
              ? (planMap.get(t.refPkId) ?? null)
              : t.refTableName === "tb_screen"
                ? (screenMap.get(t.refPkId) ?? null)
                : null,
  }));

  return apiSuccess(data, {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
}
