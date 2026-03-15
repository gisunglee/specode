import prisma from "@/lib/prisma";
import { apiSuccess } from "@/lib/utils";

export async function GET() {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  // ─── 1. 프로세스 퍼널 카운트 ─────────────────────────────────────
  const [taskCount, reqCount, storyCount, planCount, screenCount, areaCount, funcCount] =
    await Promise.all([
      prisma.task.count(),
      prisma.requirement.count(),
      prisma.userStory.count(),
      prisma.planningDraft.count(),
      prisma.screen.count(),
      prisma.area.count(),
      prisma.function.count(),
    ]);

  // ─── 2. 요구사항 우선순위별 ─────────────────────────────────────
  const reqByPriorityRaw = await prisma.requirement.groupBy({
    by: ["priority"],
    _count: true,
  });
  const reqByPriority: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, NONE: 0 };
  for (const r of reqByPriorityRaw) {
    const key = r.priority ?? "NONE";
    reqByPriority[key] = (reqByPriority[key] ?? 0) + r._count;
  }

  // ─── 3. 기능 상태별 ────────────────────────────────────────────
  const funcByStatusRaw = await prisma.function.groupBy({
    by: ["status"],
    _count: true,
  });
  const funcByStatus: Record<string, number> = {};
  for (const f of funcByStatusRaw) {
    funcByStatus[f.status] = f._count;
  }

  // ─── 4. AI 태스크 통계 ─────────────────────────────────────────
  const [aiTotal, aiByStatusRaw, aiByTableRaw, aiByTypeRaw, aiWeeklyRaw] = await Promise.all([
    prisma.aiTask.count(),
    prisma.aiTask.groupBy({ by: ["taskStatus"], _count: true }),
    prisma.aiTask.groupBy({ by: ["refTableName"], _count: true }),
    prisma.aiTask.groupBy({ by: ["taskType"], _count: true }),
    prisma.aiTask.findMany({
      where: { requestedAt: { gte: sevenDaysAgo } },
      select: { requestedAt: true, taskStatus: true },
      orderBy: { requestedAt: "asc" },
    }),
  ]);

  const aiByStatus: Record<string, number> = {};
  for (const r of aiByStatusRaw) aiByStatus[r.taskStatus] = r._count;

  const aiByTable: Record<string, number> = {};
  for (const r of aiByTableRaw) aiByTable[r.refTableName] = r._count;

  const aiByType: Record<string, number> = {};
  for (const r of aiByTypeRaw) aiByType[r.taskType] = r._count;

  // 일별 AI 요청 (최근 7일)
  const aiDailyMap: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    aiDailyMap[d.toISOString().slice(0, 10)] = 0;
  }
  for (const t of aiWeeklyRaw) {
    const day = t.requestedAt.toISOString().slice(0, 10);
    if (day in aiDailyMap) aiDailyMap[day]++;
  }

  // ─── 5. DB 스키마 신선도 ───────────────────────────────────────
  const dbAll = await prisma.dbSchema.findMany({
    select: { schemaId: true, tableName: true, entityName: true, tableComment: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
  const dbTotal = dbAll.length;
  const dbLastModified = dbAll[0]?.updatedAt ?? null;
  const dbRecentItems = dbAll.filter((d) => d.updatedAt >= thirtyDaysAgo);
  const dbStaleCount = dbTotal - dbRecentItems.length;

  // ─── 6. 변경 이력 활동 (최근 7일) ─────────────────────────────
  const cvRecent = await prisma.contentVersion.findMany({
    where: { createdAt: { gte: sevenDaysAgo } },
    select: { createdAt: true, changedBy: true, refTableName: true },
  });

  const cvByTable: Record<string, number> = {};
  const cvByChangedBy: Record<string, number> = {};
  const cvDailyMap: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    cvDailyMap[d.toISOString().slice(0, 10)] = 0;
  }
  for (const cv of cvRecent) {
    cvByTable[cv.refTableName] = (cvByTable[cv.refTableName] ?? 0) + 1;
    cvByChangedBy[cv.changedBy] = (cvByChangedBy[cv.changedBy] ?? 0) + 1;
    const day = cv.createdAt.toISOString().slice(0, 10);
    if (day in cvDailyMap) cvDailyMap[day]++;
  }

  // ─── 7. 주간 신규 추가 (최근 7일) ─────────────────────────────
  const [newReqs, newScreens, newAreas, newFuncs, newStories] = await Promise.all([
    prisma.requirement.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.screen.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.area.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.function.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.userStory.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
  ]);

  // ─── 8. 최근 편집 활동 상위 ────────────────────────────────────
  const recentEditsRaw = await prisma.contentVersion.findMany({
    take: 8,
    orderBy: { createdAt: "desc" },
    select: {
      versionId: true,
      refTableName: true,
      refPkId: true,
      fieldName: true,
      changedBy: true,
      createdAt: true,
    },
  });
  const recentEdits = recentEditsRaw.map((e) => ({ ...e, versionId: e.versionId.toString() }));

  return apiSuccess({
    funnel: { taskCount, reqCount, storyCount, planCount, screenCount, areaCount, funcCount },
    requirements: { byPriority: reqByPriority },
    functions: { byStatus: funcByStatus },
    ai: {
      total: aiTotal,
      byStatus: aiByStatus,
      byTable: aiByTable,
      byType: aiByType,
      weeklyCount: aiWeeklyRaw.length,
      dailyMap: aiDailyMap,
    },
    db: {
      total: dbTotal,
      lastModified: dbLastModified,
      recentCount: dbRecentItems.length,
      staleCount: dbStaleCount,
      recentItems: dbRecentItems.slice(0, 5),
    },
    editActivity: {
      weeklyCount: cvRecent.length,
      byTable: cvByTable,
      byChangedBy: cvByChangedBy,
      dailyMap: cvDailyMap,
    },
    weeklyNew: { reqs: newReqs, screens: newScreens, areas: newAreas, funcs: newFuncs, stories: newStories },
    recentEdits,
  });
}
