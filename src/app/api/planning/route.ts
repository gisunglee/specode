import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { planningDraftSchema } from "@/lib/validators";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page     = parseInt(searchParams.get("page")     || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const search   = searchParams.get("search") || "";

  const where: Record<string, unknown> = {};
  if (search) {
    where.planNm = { contains: search };
  }

  const [data, total] = await Promise.all([
    prisma.planningDraft.findMany({
      where,
      include: {
        _count: { select: { reqMaps: true } },
        reqMaps: {
          include: {
            requirement: { select: { requirementId: true, systemId: true, name: true } },
          },
          take: 3,
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: [{ groupUuid: "asc" }, { sortOrd: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.planningDraft.count({ where }),
  ]);

  const planIds = data.map((d) => d.planSn);
  const latestTasks = planIds.length
    ? await prisma.aiTask.findMany({
        where: { refTableName: "tb_planning_draft", refPkId: { in: planIds } },
        orderBy: { requestedAt: "desc" },
      })
    : [];
  const taskByPlanId = new Map<number, (typeof latestTasks)[0]>();
  for (const t of latestTasks) {
    if (!taskByPlanId.has(t.refPkId)) taskByPlanId.set(t.refPkId, t);
  }

  const enriched = data.map((d) => ({
    ...d,
    reqCount: d._count.reqMaps,
    _count: undefined,
    latestTask: taskByPlanId.get(d.planSn) ?? null,
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
    const parsed = planningDraftSchema.parse(body);

    const data = await prisma.planningDraft.create({
      data: {
        planNm:    parsed.planNm,
        planType:  parsed.planType  ?? null,
        manualInfo: parsed.manualInfo ?? null,
        comment:   parsed.comment   ?? null,
        groupUuid: parsed.groupUuid ?? randomUUID(),
        sortOrd:   parsed.sortOrd   ?? 1,
        isPicked:  parsed.isPicked  ?? false,
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
