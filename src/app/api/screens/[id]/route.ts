/**
 * /api/screens/[id] — 화면 상세 API
 *
 * GET    — 화면 상세 조회 (requirement, areas + functions, attachments 포함)
 * PUT    — 화면 정보 수정
 * DELETE — 화면 삭제
 *   mode=cascade  → 영역 + 기능 모두 삭제 후 화면 삭제
 *   mode=detach   → 영역의 screenId를 null 처리 (영역·기능 유지), 화면만 삭제
 *   mode 없음     → 영역이 없으면 그냥 삭제, 있으면 409
 */
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { screenSchema } from "@/lib/validators";
import { apiSuccess, apiError } from "@/lib/utils";
import { generateSystemId } from "@/lib/sequence";
import { getFuncAiFeedback } from "@/lib/aiFeedback";
import { saveContentVersion } from "@/lib/contentVersion";
import {
  diffFromScreenBaseline,
  buildScreenChangeNoteDraft,
} from "@/lib/implBaseline";
import type { ScreenSnapshot } from "@/lib/implBaseline";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const numId = parseInt(id);

  const data = await prisma.screen.findUnique({
    where: { screenId: numId },
    include: {
      requirement: true,
      unitWork: { select: { unitWorkId: true, systemId: true, name: true } },
      areas: {
        orderBy: { sortOrder: "asc" },
        include: {
          functions: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  if (!data) {
    return apiError("NOT_FOUND", "화면을 찾을 수 없습니다.", 404);
  }

  const [attachments, latestMockupTask] = await Promise.all([
    prisma.attachment.findMany({
      where: { refTableName: "tb_screen", refPkId: numId, delYn: "N" },
      orderBy: { createdAt: "asc" },
    }),
    prisma.aiTask.findFirst({
      where: { refTableName: "tb_screen", refPkId: numId, taskType: "MOCKUP" },
      orderBy: { requestedAt: "desc" },
      select: { aiTaskId: true, taskStatus: true, feedback: true, requestedAt: true },
    }),
  ]);

  return apiSuccess({ ...data, attachments, latestMockupTask: latestMockupTask ?? null });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = screenSchema.parse(body);

    // spec 변경 전 이력 저장
    const existingScreen = await prisma.screen.findUnique({
      where: { screenId: parseInt(id) },
      select: { spec: true },
    });
    if (existingScreen) {
      await saveContentVersion({
        refTableName: "tb_screen",
        refPkId: parseInt(id),
        fieldName: "spec",
        currentContent: existingScreen.spec,
        changedBy: "user",
      });
    }

    const data = await prisma.screen.update({
      where: { screenId: parseInt(id) },
      data: {
        name: parsed.name,
        displayCode: parsed.displayCode ?? null,
        screenType: parsed.screenType ?? null,
        ...(parsed.requirementId !== undefined && parsed.requirementId !== null && {
          requirementId: parsed.requirementId,
        }),
        unitWorkId: body.unitWorkId !== undefined
          ? (body.unitWorkId ? parseInt(body.unitWorkId) : null)
          : undefined,
        spec: parsed.spec ?? null,
        layoutData: parsed.layoutData ?? null,
        categoryL: parsed.categoryL ?? null,
        categoryM: parsed.categoryM ?? null,
        categoryS: parsed.categoryS ?? null,
        sortOrder: parsed.sortOrder ?? null,
      },
    });

    return apiSuccess(data);
  } catch {
    return apiError("SERVER_ERROR", "수정에 실패했습니다.", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const numId = parseInt(id);
  const body = await request.json();

  if (body.action !== "IMPL_REQ" && body.action !== "MOCKUP_REQ") {
    return apiError("VALIDATION_ERROR", "지원하지 않는 action입니다.");
  }

  const screen = await prisma.screen.findUnique({
    where: { screenId: numId },
    select: {
      systemId: true,
      name: true,
      spec: true,
      areas: {
        orderBy: { sortOrder: "asc" },
        select: {
          areaId: true,
          areaCode: true,
          name: true,
          spec: true,
          functions: {
            select: { functionId: true, displayCode: true, name: true, spec: true, refContent: true },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });
  if (!screen) return apiError("NOT_FOUND", "화면을 찾을 수 없습니다.", 404);

  // 전체 기능 ID 수집 후 AiTask 피드백 일괄 조회
  const allFuncIds = screen.areas.flatMap((a) => a.functions.map((f) => f.functionId));
  const aiFeedbackMap = await getFuncAiFeedback(allFuncIds, ["DESIGN", "IMPLEMENT"]);

  if (body.action === "IMPL_REQ") {
    // 마지막 성공 구현 요청과 diff 계산
    const lastImpl = await prisma.aiTask.findFirst({
      where: { refTableName: "tb_screen", refPkId: numId, taskType: "IMPLEMENT", taskStatus: { in: ["SUCCESS", "AUTO_FIXED"] } },
      orderBy: { completedAt: "desc" },
      select: { contextSnapshot: true },
    });
    const currentSnap: ScreenSnapshot = {
      screen: { spec: screen.spec || "" },
      areas: screen.areas.map((a) => ({
        areaId: a.areaId,
        name: a.name,
        spec: a.spec || "",
        functions: a.functions.map((f) => {
          const ai = aiFeedbackMap.get(f.functionId) ?? {};
          return { functionId: f.functionId, name: f.name, spec: f.spec || "", aiDesignContent: ai["DESIGN"] || "", refContent: f.refContent || "" };
        }),
      })),
    };
    let implChangeNote = "";
    if (lastImpl?.contextSnapshot) {
      try {
        const baseline = JSON.parse(lastImpl.contextSnapshot) as ScreenSnapshot;
        implChangeNote = buildScreenChangeNoteDraft(diffFromScreenBaseline(baseline, currentSnap));
      } catch { /* 파싱 실패 무시 */ }
    }

    // spec 조합: 화면 설명 + 영역 + 기능
    const specParts: string[] = [];
    if (screen.spec) specParts.push(`# 화면: ${screen.name} (${screen.systemId})\n\n## 화면 설명\n\n${screen.spec}`);
    for (const area of screen.areas) {
      const areaParts: string[] = [`# 영역: ${area.name}`];
      if (area.spec) areaParts.push(`\n## 영역 설명\n\n${area.spec}`);
      for (const f of area.functions) {
        const ai = aiFeedbackMap.get(f.functionId) ?? {};
        const fParts: string[] = [`\n## 기능: ${f.name}`];
        if (f.spec) fParts.push(`\n### 기본 설계 내용\n\n${f.spec}`);
        if (ai["DESIGN"]) fParts.push(`\n### 상세설계\n\n${ai["DESIGN"]}`);
        if (fParts.length > 1) areaParts.push(fParts.join("\n"));
      }
      specParts.push(areaParts.join("\n"));
    }

    const taskSystemId = await generateSystemId("ATK");
    const implSpec = specParts.join("\n\n---\n\n") || null;
    await prisma.aiTask.create({
      data: {
        systemId: taskSystemId,
        refTableName: "tb_screen",
        refPkId: numId,
        taskType: "IMPLEMENT",
        taskStatus: "NONE",
        spec: implChangeNote && implSpec ? implChangeNote + "\n\n---\n\n" + implSpec : implSpec,
        contextSnapshot: JSON.stringify({
          screen: { spec: screen.spec || "" },
          areas: screen.areas.map((a) => ({
            areaId: a.areaId,
            name: a.name,
            spec: a.spec || "",
            functions: a.functions.map((f) => {
              const ai = aiFeedbackMap.get(f.functionId) ?? {};
              return {
                functionId: f.functionId,
                name: f.name,
                spec: f.spec || "",
                aiDesignContent: ai["DESIGN"] || "",
                refContent: f.refContent || "",
              };
            }),
          })),
        }),
        changeNote: body.changeNote?.trim() || null,
      },
    });
    return apiSuccess({ requested: true });
  }

  // MOCKUP_REQ
  const specParts: string[] = [];
  if (screen.spec) specParts.push(`# 화면: ${screen.name} (${screen.systemId})\n\n## 화면 설명\n\n${screen.spec}`);
  for (const area of screen.areas) {
    const areaParts: string[] = [`# 영역: ${area.areaCode} ${area.name}`];
    if (area.spec) areaParts.push(`\n## 영역 설계\n\n${area.spec}`);
    for (const f of area.functions) {
      const ai = aiFeedbackMap.get(f.functionId) ?? {};
      const code = f.displayCode ? `[${f.displayCode}] ` : "";
      const fParts: string[] = [`\n## 기능: ${code}${f.name}`];
      if (f.spec) fParts.push(`\n### 기본 설계\n\n${f.spec}`);
      if (ai["DESIGN"])    fParts.push(`\n### 상세 설계\n\n${ai["DESIGN"]}`);
      if (ai["IMPLEMENT"]) fParts.push(`\n### 구현 가이드\n\n${ai["IMPLEMENT"]}`);
      if (fParts.length > 1) areaParts.push(fParts.join("\n"));
    }
    specParts.push(areaParts.join("\n"));
  }

  const taskSystemId = await generateSystemId("ATK");
  await prisma.aiTask.create({
    data: {
      systemId: taskSystemId,
      refTableName: "tb_screen",
      refPkId: numId,
      taskType: "MOCKUP",
      taskStatus: "NONE",
      spec: specParts.join("\n\n---\n\n") || null,
      comment: body.comment?.trim() || null,
      contextSnapshot: JSON.stringify({
        screen: { systemId: screen.systemId, name: screen.name, spec: screen.spec || "" },
        areas: screen.areas.map((a) => ({
          areaId: a.areaId,
          areaCode: a.areaCode,
          name: a.name,
          spec: a.spec || "",
          functions: a.functions.map((f) => ({
            functionId: f.functionId,
            displayCode: f.displayCode || "",
            name: f.name,
            spec: f.spec || "",
          })),
        })),
      }),
    },
  });
  return apiSuccess({ requested: true });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const numId = parseInt(id);

  const screen = await prisma.screen.findUnique({ where: { screenId: numId } });
  if (!screen) return apiError("NOT_FOUND", "화면을 찾을 수 없습니다.", 404);

  const areaCount = await prisma.area.count({ where: { screenId: numId } });
  if (areaCount > 0) {
    return apiError(
      "HAS_CHILDREN",
      `연결된 영역 ${areaCount}건이 있습니다. 영역에서 화면 연결을 해제 후 삭제하세요.`,
      409
    );
  }

  await prisma.screen.delete({ where: { screenId: numId } });
  return apiSuccess({ deleted: true });
}
