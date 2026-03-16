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

  const markdown = generateFunctionPrd(
    {
      systemId: fn.systemId,
      displayCode: fn.displayCode,
      name: fn.name,
      status: fn.status,
      priority: fn.priority,
      spec: fn.spec,
      aiDesignContent: fn.aiDesignContent,
      aiInspFeedback: fn.aiInspFeedback,
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
