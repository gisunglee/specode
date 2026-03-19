/**
 * GET /api/functions/[id]/prd
 *
 * 기능 데이터를 조합해 개발 PRD.md 마크다운을 반환한다.
 * Content-Disposition 헤더로 파일 다운로드를 유도한다.
 * 직전 PRD 다운로드 이후 변경사항을 자동으로 PRD 상단에 추가한다.
 *
 * ai_design_content는 Prisma 스키마 외부 컬럼이므로 raw SQL로 조회.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateFunctionPrd } from "@/lib/prd/function/v1";
import { PRD_VERSIONS } from "@/lib/prd";
import { generateSystemId } from "@/lib/sequence";
import { phaseToStatus } from "@/lib/constants";
import { diffFromBaseline, buildChangeNoteDraft } from "@/lib/implBaseline";
import type { ContextSnapshot } from "@/lib/implBaseline";

type RouteParams = { params: Promise<{ id: string }> };

interface FuncRawRow {
  function_id:       number;
  system_id:         string;
  display_code:      string | null;
  name:              string;
  phase:             string;
  phase_status:      string;
  confirmed:         boolean;
  priority:          string;
  spec:              string | null;
  ref_content:       string | null;
  ai_design_content: string | null;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const numId = parseInt(id);

  if (isNaN(numId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  // ai_design_content 포함하여 raw SQL로 조회 (Prisma 스키마에 없는 컬럼)
  const fnRows = await prisma.$queryRaw<FuncRawRow[]>`
    SELECT f.function_id, f.system_id, f.display_code, f.name,
           f.phase, f.phase_status, f.confirmed, f.priority,
           f.spec, f.ref_content, f.ai_design_content
    FROM tb_function f
    WHERE f.function_id = ${numId}
  `;

  if (!fnRows.length) {
    return NextResponse.json({ error: "기능을 찾을 수 없습니다." }, { status: 404 });
  }

  const fn = fnRows[0];

  // 상위 컨텍스트 (영역·화면) 조회
  const fnWithArea = await prisma.function.findUnique({
    where: { functionId: numId },
    select: {
      area: {
        select: {
          areaCode: true,
          name: true,
          screen: { select: { systemId: true, name: true } },
        },
      },
    },
  });

  // AiTask에서 INSPECT/REVIEW 피드백 조회
  const aiTasks = await prisma.aiTask.findMany({
    where: {
      refTableName: "tb_function",
      refPkId: numId,
      taskType: { in: ["REVIEW", "INSPECT"] },
      taskStatus: { in: ["SUCCESS", "AUTO_FIXED"] },
    },
    orderBy: { completedAt: "desc" },
    select: { taskType: true, feedback: true },
  });

  const aiInspFeedback = aiTasks.find((t) => t.taskType === "REVIEW")?.feedback
    ?? aiTasks.find((t) => t.taskType === "INSPECT")?.feedback
    ?? null;

  const aiDesignContent = fn.ai_design_content || null;
  const status = phaseToStatus(fn.phase, fn.phase_status, fn.confirmed);

  // ── PRD_EXPORT diff 계산 ────────────────────────────────────────────
  const lastExport = await prisma.aiTask.findFirst({
    where: { taskType: "PRD_EXPORT", refTableName: "tb_function", refPkId: numId },
    orderBy: { requestedAt: "desc" },
    select: { contextSnapshot: true },
  });

  const currentSnapshot: ContextSnapshot = {
    spec: fn.spec || "",
    aiDesignContent: aiDesignContent || "",
    refContent: fn.ref_content || "",
  };

  let changeNote = "";
  if (lastExport?.contextSnapshot) {
    try {
      const baseline = JSON.parse(lastExport.contextSnapshot) as ContextSnapshot;
      changeNote = buildChangeNoteDraft(diffFromBaseline(baseline, currentSnapshot));
    } catch { /* 파싱 실패 시 diff 없이 계속 */ }
  }

  // PRD_EXPORT 이력 저장
  const exportSystemId = await generateSystemId("ATK");
  prisma.aiTask.create({
    data: {
      systemId:        exportSystemId,
      refTableName:    "tb_function",
      refPkId:         numId,
      taskType:        "PRD_EXPORT",
      taskStatus:      "SUCCESS",
      contextSnapshot: JSON.stringify(currentSnapshot),
      completedAt:     new Date(),
    },
  }).catch(() => {/* 이력 기록 실패는 무시 */});

  let markdown = generateFunctionPrd(
    {
      systemId:        fn.system_id,
      displayCode:     fn.display_code,
      name:            fn.name,
      status,
      priority:        fn.priority,
      spec:            fn.spec,
      refContent:      fn.ref_content,
      aiDesignContent,
      aiInspFeedback,
    },
    {
      areaCode:       fnWithArea?.area?.areaCode ?? null,
      areaName:       fnWithArea?.area?.name ?? null,
      screenSystemId: fnWithArea?.area?.screen?.systemId ?? null,
      screenName:     fnWithArea?.area?.screen?.name ?? null,
    },
  );

  if (changeNote) {
    markdown = changeNote + "\n\n---\n\n" + markdown;
  }

  const filename = `PRD_func-${PRD_VERSIONS.function}_${fn.system_id}_${fn.name}.md`;
  const encodedFilename = encodeURIComponent(filename);

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodedFilename}`,
    },
  });
}
