/**
 * GET /api/areas/[id]/prd
 *
 * 영역 + 소속 기능 전체 데이터를 조합해 개발 PRD.md 마크다운을 반환한다.
 * Content-Disposition 헤더로 파일 다운로드를 유도한다.
 * 직전 PRD 다운로드 이후 변경사항을 자동으로 PRD 상단에 추가한다.
 */
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { generateAreaPrd } from "@/lib/prd/area/v1";
import { PRD_VERSIONS } from "@/lib/prd";
import { phaseToStatus } from "@/lib/constants";
import {
  diffFromAreaBaseline,
  buildAreaChangeNoteDraft,
} from "@/lib/implBaseline";
import type { AreaSnapshot } from "@/lib/implBaseline";

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
          refContent: true,
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!area) {
    return NextResponse.json({ error: "영역을 찾을 수 없습니다." }, { status: 404 });
  }

  // 기능 ID 목록으로 ai_design_content(raw) + AiTask 피드백 일괄 조회
  const funcIds = area.functions.map((f) => f.functionId);

  interface AiDesignRow { function_id: number; ai_design_content: string | null }
  const [aiDesignRows, aiTasks] = await Promise.all([
    funcIds.length
      ? prisma.$queryRaw<AiDesignRow[]>`
          SELECT function_id, ai_design_content FROM tb_function
          WHERE function_id IN (${Prisma.join(funcIds)})
        `
      : Promise.resolve([] as AiDesignRow[]),
    funcIds.length
      ? prisma.aiTask.findMany({
          where: {
            refTableName: "tb_function",
            refPkId: { in: funcIds },
            taskType: { in: ["REVIEW", "INSPECT"] },
            taskStatus: { in: ["SUCCESS", "AUTO_FIXED"] },
          },
          orderBy: { completedAt: "desc" },
          select: { refPkId: true, taskType: true, feedback: true },
        })
      : Promise.resolve([] as { refPkId: number; taskType: string; feedback: string | null }[]),
  ]);

  // funcId → ai_design_content
  const aiDesignMap = new Map(
    aiDesignRows.map((r) => [Number(r.function_id), r.ai_design_content ?? null])
  );

  // funcId → { REVIEW/INSPECT: feedback }
  const aiByFunc = new Map<number, Record<string, string>>();
  for (const t of aiTasks) {
    if (!t.feedback) continue;
    const existing = aiByFunc.get(t.refPkId) ?? {};
    if (!(t.taskType in existing)) existing[t.taskType] = t.feedback;
    aiByFunc.set(t.refPkId, existing);
  }

  // ── PRD baseline diff 계산 ────────────────────────────────────────────
  const lastSnapshot = await prisma.prdBaseline.findFirst({
    where: { refTableName: "tb_area", refPkId: numId, baselineType: "PRD" },
    orderBy: { createdAt: "desc" },
    select: { contextSnapshot: true },
  });

  // 현재 상태 스냅샷 구성 (aiDesignContent는 aiByFunc에서)
  const currentSnapshot: AreaSnapshot = {
    area: { spec: area.spec ?? "" },
    functions: area.functions.map((f) => ({
      functionId: f.functionId,
      name: f.name,
      spec: f.spec ?? "",
      aiDesignContent: aiDesignMap.get(f.functionId) ?? "",
      refContent: f.refContent ?? "",
    })),
  };

  let changeNote = "";
  if (lastSnapshot?.contextSnapshot) {
    try {
      const baseline = JSON.parse(lastSnapshot.contextSnapshot) as AreaSnapshot;
      changeNote = buildAreaChangeNoteDraft(diffFromAreaBaseline(baseline, currentSnapshot));
    } catch { /* 파싱 실패 시 diff 없이 계속 */ }
  }

  // 새 PRD baseline 저장
  await prisma.prdBaseline.create({
    data: {
      refTableName:    "tb_area",
      refPkId:         numId,
      baselineType:    "PRD",
      contextSnapshot: JSON.stringify(currentSnapshot),
    },
  });

  let markdown = generateAreaPrd(
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
          refContent: fn.refContent ?? null,
          aiDesignContent: aiDesignMap.get(fn.functionId) ?? null,
          aiInspFeedback:  (aiByFunc.get(fn.functionId) ?? {})["REVIEW"]
                        ?? (aiByFunc.get(fn.functionId) ?? {})["INSPECT"]
                        ?? null,
        };
      }),
    },
    {
      screenSystemId: area.screen?.systemId ?? null,
      screenName: area.screen?.name ?? null,
    },
  );

  if (changeNote) {
    markdown = changeNote + "\n\n---\n\n" + markdown;
  }

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
