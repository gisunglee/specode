/**
 * GET /api/screens/[id]/prd
 *
 * 화면 + 영역 + 기능 전체 데이터를 조합해 개발 PRD.md 마크다운을 반환한다.
 * Content-Disposition 헤더로 파일 다운로드를 유도한다.
 * 직전 PRD 다운로드 이후 변경사항을 자동으로 PRD 상단에 추가한다.
 */
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { generateScreenPrd, PRD_VERSIONS } from "@/lib/prd";
import { phaseToStatus } from "@/lib/constants";
import {
  diffFromScreenBaseline,
  buildScreenChangeNoteDraft,
} from "@/lib/implBaseline";
import type { ScreenSnapshot } from "@/lib/implBaseline";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const numId = parseInt(id);

  if (isNaN(numId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const screen = await prisma.screen.findUnique({
    where: { screenId: numId },
    include: {
      requirement: {
        select: { systemId: true, name: true },
      },
      areas: {
        orderBy: { sortOrder: "asc" },
        include: {
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
      },
    },
  });

  if (!screen) {
    return NextResponse.json({ error: "화면을 찾을 수 없습니다." }, { status: 404 });
  }

  // 화면 내 전체 기능 ID 수집 후 ai_design_content(raw) + AiTask 피드백 일괄 조회
  const funcIds = screen.areas.flatMap((a) => a.functions.map((f) => f.functionId));

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
    where: { refTableName: "tb_screen", refPkId: numId, baselineType: "PRD" },
    orderBy: { createdAt: "desc" },
    select: { contextSnapshot: true },
  });

  // 현재 상태 스냅샷 구성 (aiDesignContent는 aiByFunc에서)
  const currentSnapshot: ScreenSnapshot = {
    screen: { spec: screen.spec ?? "" },
    areas: screen.areas.map((a) => ({
      areaId: a.areaId,
      name: a.name,
      spec: a.spec ?? "",
      functions: a.functions.map((f) => ({
        functionId: f.functionId,
        name: f.name,
        spec: f.spec ?? "",
        aiDesignContent: aiDesignMap.get(f.functionId) ?? "",
        refContent: f.refContent ?? "",
      })),
    })),
  };

  let changeNote = "";
  if (lastSnapshot?.contextSnapshot) {
    try {
      const baseline = JSON.parse(lastSnapshot.contextSnapshot) as ScreenSnapshot;
      changeNote = buildScreenChangeNoteDraft(diffFromScreenBaseline(baseline, currentSnapshot));
    } catch { /* 파싱 실패 시 diff 없이 계속 */ }
  }

  // 새 PRD baseline 저장
  await prisma.prdBaseline.create({
    data: {
      refTableName:    "tb_screen",
      refPkId:         numId,
      baselineType:    "PRD",
      contextSnapshot: JSON.stringify(currentSnapshot),
    },
  });

  let markdown = generateScreenPrd({
    systemId: screen.systemId,
    displayCode: screen.displayCode,
    name: screen.name,
    screenType: screen.screenType,
    spec: screen.spec,
    categoryL: screen.categoryL,
    categoryM: screen.categoryM,
    categoryS: screen.categoryS,
    requirement: screen.requirement,
    areas: screen.areas.map((area) => ({
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
    })),
  });

  if (changeNote) {
    markdown = changeNote + "\n\n---\n\n" + markdown;
  }

  const filename = `PRD_screen-${PRD_VERSIONS.screen}_${screen.systemId}_${screen.name}.md`;
  const encodedFilename = encodeURIComponent(filename);

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodedFilename}`,
    },
  });
}
