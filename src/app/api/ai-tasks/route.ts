import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { apiSuccess } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const taskStatus = searchParams.get("taskStatus");
  const taskType = searchParams.get("taskType");

  const where: Record<string, unknown> = {};
  if (taskStatus) where.taskStatus = taskStatus;
  if (taskType) where.taskType = taskType;

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
  const fnIds   = tasks.filter(t => t.refTableName === "tb_function").map(t => t.refPkId);
  const gIds    = tasks.filter(t => t.refTableName === "tb_standard_guide").map(t => t.refPkId);
  const areaIds = tasks.filter(t => t.refTableName === "tb_area").map(t => t.refPkId);

  const [functions, guides, areas] = await Promise.all([
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
  ]);

  const fnMap   = new Map(functions.map(f => [f.functionId, f]));
  const gMap    = new Map(guides.map(g => [g.guideId, g]));
  const areaMap = new Map(areas.map(a => [a.areaId, a]));

  const data = tasks.map(t => ({
    ...t,
    target:
      t.refTableName === "tb_function"
        ? (fnMap.get(t.refPkId) ?? null)
        : t.refTableName === "tb_standard_guide"
          ? (gMap.get(t.refPkId) ?? null)
          : t.refTableName === "tb_area"
            ? (areaMap.get(t.refPkId) ?? null)
            : null,
  }));

  return apiSuccess(data, {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
}
