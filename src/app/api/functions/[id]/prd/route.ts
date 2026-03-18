/**
 * GET /api/functions/[id]/prd
 *
 * 기능 데이터를 조합해 개발 PRD.md 마크다운을 반환한다.
 * Content-Disposition 헤더로 파일 다운로드를 유도한다.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateFunctionPrd } from "@/lib/prd/function/v1";
import { PRD_VERSIONS } from "@/lib/prd";
import { generateSystemId } from "@/lib/sequence";
import { phaseToStatus } from "@/lib/constants";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const numId = parseInt(id);

  if (isNaN(numId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const fn = await prisma.function.findUnique({
    where: { functionId: numId },
    include: {
      area: {
        select: {
          areaCode: true,
          name: true,
          screen: {
            select: { systemId: true, name: true },
          },
        },
      },
    },
  });

  if (!fn) {
    return NextResponse.json({ error: "기능을 찾을 수 없습니다." }, { status: 404 });
  }

  // AiTask에서 AI 피드백 조회
  const aiTasks = await prisma.aiTask.findMany({
    where: {
      refTableName: "tb_function",
      refPkId: numId,
      taskStatus: { in: ["SUCCESS", "AUTO_FIXED"] },
    },
    orderBy: { completedAt: "desc" },
    select: { taskType: true, feedback: true },
  });

  const getTaskFeedback = (...types: string[]) =>
    types.reduce<string | null>((acc, t) => {
      if (acc) return acc;
      return aiTasks.find((task) => task.taskType === t)?.feedback ?? null;
    }, null);

  const aiDesignContent = getTaskFeedback("DESIGN");
  const aiInspFeedback  = getTaskFeedback("REVIEW", "INSPECT");
  const status          = phaseToStatus(fn.phase, fn.phaseStatus, fn.confirmed);

  // PRD 다운로드 이벤트를 이력으로 기록 (비동기, 실패해도 다운로드는 진행)
  generateSystemId("ATK").then((systemId) =>
    prisma.aiTask.create({
      data: {
        systemId,
        refTableName: "tb_function",
        refPkId: numId,
        taskType: "PRD_EXPORT",
        taskStatus: "SUCCESS",
        contextSnapshot: JSON.stringify({
          spec: fn.spec || "",
          aiDesignContent: aiDesignContent || "",
          refContent: fn.refContent || "",
        }),
        completedAt: new Date(),
      },
    })
  ).catch(() => {/* 이력 기록 실패는 무시 */});

  const markdown = generateFunctionPrd(
    {
      systemId: fn.systemId,
      displayCode: fn.displayCode,
      name: fn.name,
      status,
      priority: fn.priority,
      spec: fn.spec,
      aiDesignContent,
      aiInspFeedback,
    },
    {
      areaCode: fn.area?.areaCode ?? null,
      areaName: fn.area?.name ?? null,
      screenSystemId: fn.area?.screen?.systemId ?? null,
      screenName: fn.area?.screen?.name ?? null,
    },
  );

  const filename = `PRD_func-${PRD_VERSIONS.function}_${fn.systemId}_${fn.name}.md`;
  const encodedFilename = encodeURIComponent(filename);

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodedFilename}`,
    },
  });
}
