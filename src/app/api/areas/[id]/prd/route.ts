/**
 * GET /api/areas/[id]/prd
 *
 * 영역 + 소속 기능 전체 데이터를 조합해 개발 PRD.md 마크다운을 반환한다.
 * Content-Disposition 헤더로 파일 다운로드를 유도한다.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateAreaPrd } from "@/lib/prd/area/v1";
import { PRD_VERSIONS } from "@/lib/prd";
import { phaseToStatus } from "@/lib/constants";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const numId = parseInt(id);

  if (isNaN(numId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const area = await prisma.area.findUnique({
    where: { areaId: numId },
    include: {
      screen: {
        select: { systemId: true, name: true },
      },
      functions: {
        select: {
          functionId: true,
          systemId: true,
          displayCode: true,
          name: true,
          phase: true,
          phaseStatus: true,
          confirmed: true,
          priority: true,
          sortOrder: true,
          spec: true,
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!area) {
    return NextResponse.json({ error: "영역을 찾을 수 없습니다." }, { status: 404 });
  }

  // 기능 ID 목록으로 AiTask 일괄 조회
  const funcIds = area.functions.map((f) => f.functionId);
  const aiTasks = funcIds.length
    ? await prisma.aiTask.findMany({
        where: {
          refTableName: "tb_function",
          refPkId: { in: funcIds },
          taskType: { in: ["DESIGN", "REVIEW", "INSPECT"] },
          taskStatus: { in: ["SUCCESS", "AUTO_FIXED"] },
        },
        orderBy: { completedAt: "desc" },
        select: { refPkId: true, taskType: true, feedback: true },
      })
    : [];

  // funcId → { DESIGN: feedback, REVIEW: feedback }
  const aiByFunc = new Map<number, Record<string, string>>();
  for (const t of aiTasks) {
    if (!t.feedback) continue;
    const existing = aiByFunc.get(t.refPkId) ?? {};
    if (!(t.taskType in existing)) existing[t.taskType] = t.feedback;
    aiByFunc.set(t.refPkId, existing);
  }

  const markdown = generateAreaPrd(
    {
      areaCode: area.areaCode,
      name: area.name,
      areaType: area.areaType,
      spec: area.spec,
      designData: area.designData,
      functions: area.functions.map((fn) => {
        const ai = aiByFunc.get(fn.functionId) ?? {};
        return {
          systemId: fn.systemId,
          displayCode: fn.displayCode,
          name: fn.name,
          status: phaseToStatus(fn.phase, fn.phaseStatus, fn.confirmed),
          priority: fn.priority,
          spec: fn.spec,
          aiDesignContent: ai["DESIGN"] ?? null,
          aiInspFeedback:  ai["REVIEW"] ?? ai["INSPECT"] ?? null,
        };
      }),
    },
    {
      screenSystemId: area.screen?.systemId ?? null,
      screenName: area.screen?.name ?? null,
    },
  );

  const filename = `PRD_area-${PRD_VERSIONS.area}_${area.areaCode}_${area.name}.md`;
  const encodedFilename = encodeURIComponent(filename);

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodedFilename}`,
    },
  });
}
