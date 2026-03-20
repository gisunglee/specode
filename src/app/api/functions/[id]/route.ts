import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { generateSystemId } from "@/lib/sequence";
import { saveContentVersion } from "@/lib/contentVersion";
import { statusToPhase, phaseToStatus, ALL_STATUSES } from "@/lib/constants";
import { diffFromBaseline, buildChangeNoteDraft } from "@/lib/implBaseline";
import type { ContextSnapshot } from "@/lib/implBaseline";

type RouteParams = { params: Promise<{ id: string }> };

/** 최신 성공 AiTask 결과를 taskType별로 반환하는 헬퍼 */
function getLatestSuccessFeedback(
  tasks: { taskType: string; taskStatus: string; feedback: string | null }[],
  ...taskTypes: string[]
): string | null {
  for (const taskType of taskTypes) {
    const found = tasks.find(
      (t) =>
        t.taskType === taskType &&
        (t.taskStatus === "SUCCESS" || t.taskStatus === "AUTO_FIXED")
    );
    if (found?.feedback) return found.feedback;
  }
  return null;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const data = await prisma.function.findUnique({
    where: { functionId: parseInt(id) },
    include: {
      area: {
        include: {
          screen: {
            include: {
              requirement: { select: { name: true, systemId: true } },
              storyMaps: {
                include: {
                  userStory: {
                    select: {
                      userStoryId: true,
                      systemId: true,
                      name: true,
                      persona: true,
                      scenario: true,
                    },
                  },
                },
                orderBy: [{ isMainStory: "desc" }, { createdAt: "asc" }],
              },
            },
          },
        },
      },
    },
  });

  if (!data) {
    return apiError("NOT_FOUND", "기능을 찾을 수 없습니다.", 404);
  }

  const [attachments, tasks, designRow] = await Promise.all([
    prisma.attachment.findMany({
      where: { refTableName: "tb_function", refPkId: parseInt(id), delYn: "N" },
      orderBy: { createdAt: "asc" },
    }),
    prisma.aiTask.findMany({
      where: { refTableName: "tb_function", refPkId: parseInt(id) },
      orderBy: { requestedAt: "desc" },
    }),
    prisma.$queryRaw<[{ ai_design_content: string | null }]>`
      SELECT ai_design_content FROM tb_function WHERE function_id = ${parseInt(id)}
    `.catch(() => [{ ai_design_content: null }]),
  ]);

  const storedDesignContent = designRow[0]?.ai_design_content ?? null;

  // 호환성: phase → 구 status 문자열 + AI 결과 필드를 tasks에서 계산
  return apiSuccess({
    ...data,
    status:          phaseToStatus(data.phase, data.phaseStatus, data.confirmed),
    aiInspFeedback:  getLatestSuccessFeedback(tasks, "REVIEW", "INSPECT"),
    aiDesignContent: storedDesignContent ?? getLatestSuccessFeedback(tasks, "DESIGN"),
    aiImplFeedback:  getLatestSuccessFeedback(tasks, "IMPLEMENT"),
    attachments,
    tasks,
  });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const numId = parseInt(id);
    const body = await request.json();
    const { saveVersionLog, ...updateBody } = body;

    const existing = await prisma.function.findUnique({
      where: { functionId: numId },
      select: { spec: true, refContent: true },
    });

    if (!existing) {
      return apiError("NOT_FOUND", "기능을 찾을 수 없습니다.", 404);
    }

    // 버전 이력 저장 (spec, refContent 대상)
    if (saveVersionLog) {
      const versionFields = [
        { field: "spec",        prismaKey: "spec"       as const, bodyKey: "spec" },
        { field: "ref_content", prismaKey: "refContent" as const, bodyKey: "refContent" },
      ];
      for (const { field, prismaKey, bodyKey } of versionFields) {
        if (updateBody[bodyKey] !== undefined && updateBody[bodyKey] !== existing[prismaKey]) {
          await saveContentVersion({
            refTableName: "tb_function",
            refPkId: numId,
            fieldName: field,
            currentContent: existing[prismaKey],
            changedBy: "user",
          });
        }
      }
    }

    const data = await prisma.function.update({
      where: { functionId: numId },
      data: {
        name:         updateBody.name,
        displayCode:  updateBody.displayCode  ?? undefined,
        areaId:
          updateBody.areaId !== undefined
            ? updateBody.areaId
              ? isNaN(Number(updateBody.areaId)) ? null : Number(updateBody.areaId)
              : null
            : undefined,
        sortOrder:
          updateBody.sortOrder !== undefined
            ? updateBody.sortOrder !== "" && updateBody.sortOrder !== null && !isNaN(Number(updateBody.sortOrder))
              ? Number(updateBody.sortOrder)
              : null
            : undefined,
        spec:         updateBody.spec         ?? undefined,
        refContent:   updateBody.refContent   !== undefined ? (updateBody.refContent || null) : undefined,
        changeReason: updateBody.changeReason ?? undefined,
        priority:     updateBody.priority     ?? undefined,
      },
    });

    // ai_design_content — Prisma 클라이언트 미지원 컬럼이므로 raw SQL 사용
    if (updateBody.aiDesignContent !== undefined) {
      const val = updateBody.aiDesignContent || null;
      await prisma.$executeRaw`
        UPDATE tb_function SET ai_design_content = ${val} WHERE function_id = ${numId}
      `;
    }

    return apiSuccess({
      ...data,
      status: phaseToStatus(data.phase, data.phaseStatus, data.confirmed),
    });
  } catch (error) {
    console.error(error);
    return apiError("SERVER_ERROR", "수정에 실패했습니다.", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const numId = parseInt(id);
  const body = await request.json();

  if (!body.status) {
    return apiError("VALIDATION_ERROR", "상태값은 필수입니다.");
  }

  if (!(ALL_STATUSES as readonly string[]).includes(body.status)) {
    return apiError("INVALID_STATUS", `"${body.status}"는 유효하지 않은 상태값입니다.`);
  }

  const func = await prisma.function.findUnique({
    where: { functionId: numId },
    select: { spec: true, refContent: true },
  });

  if (!func) {
    return apiError("NOT_FOUND", "기능을 찾을 수 없습니다.", 404);
  }

  // 구 status → 신규 phase/phaseStatus/confirmed 변환
  const newPhase = statusToPhase(body.status);

  const data = await prisma.function.update({
    where: { functionId: numId },
    data: newPhase,
  });

  // REVIEW_REQ / DESIGN_REQ / IMPL_REQ 시 AiTask 자동 생성
  if (body.status === "REVIEW_REQ" || body.status === "DESIGN_REQ" || body.status === "IMPL_REQ") {
    const taskType =
      body.status === "IMPL_REQ"   ? "IMPLEMENT" :
      body.status === "DESIGN_REQ" ? "DESIGN"    :
      "REVIEW";

    // 최신 AI 설계 결과를 context에 포함
    const latestTasks = await prisma.aiTask.findMany({
      where: {
        refTableName: "tb_function",
        refPkId: numId,
        taskStatus: { in: ["SUCCESS", "AUTO_FIXED"] },
      },
      orderBy: { completedAt: "desc" },
      select: { taskType: true, feedback: true },
    });
    const designFeedback = latestTasks.find((t: { taskType: string; feedback: string | null }) => t.taskType === "DESIGN")?.feedback ?? "";

    // diff 계산 — IMPLEMENT는 prdBaseline, DESIGN/REVIEW는 aiTask 이력
    const currentFuncSnap: ContextSnapshot = {
      spec: func.spec || "",
      aiDesignContent: designFeedback,
      refContent: func.refContent || "",
    };
    let funcChangeNote = "";
    if (taskType === "IMPLEMENT") {
      const lastImpl = await prisma.prdBaseline.findFirst({
        where: { refTableName: "tb_function", refPkId: numId, baselineType: "IMPL" },
        orderBy: { createdAt: "desc" },
        select: { contextSnapshot: true },
      });
      if (lastImpl?.contextSnapshot) {
        try {
          const baseline = JSON.parse(lastImpl.contextSnapshot) as ContextSnapshot;
          funcChangeNote = buildChangeNoteDraft(diffFromBaseline(baseline, currentFuncSnap));
        } catch { /* 파싱 실패 무시 */ }
      }
    } else {
      const lastSameType = await prisma.aiTask.findFirst({
        where: { refTableName: "tb_function", refPkId: numId, taskType, taskStatus: { in: ["SUCCESS", "AUTO_FIXED"] } },
        orderBy: { completedAt: "desc" },
        select: { contextSnapshot: true },
      });
      if (lastSameType?.contextSnapshot) {
        try {
          const baseline = JSON.parse(lastSameType.contextSnapshot) as ContextSnapshot;
          funcChangeNote = buildChangeNoteDraft(diffFromBaseline(baseline, currentFuncSnap));
        } catch { /* 파싱 실패 무시 */ }
      }
    }

    const specParts = [
      func.spec        ? `## 기본 설계 내용\n\n${func.spec}` : "",
      designFeedback   ? `## 상세설계\n\n${designFeedback}` : "",
    ].filter(Boolean).join("\n\n---\n\n");

    const createAiTask = prisma.aiTask.create({
      data: {
        systemId:        await generateSystemId("ATK"),
        refTableName:    "tb_function",
        refPkId:         numId,
        taskType,
        taskStatus:      "NONE",
        spec:            funcChangeNote && specParts ? funcChangeNote + "\n\n---\n\n" + specParts : specParts || null,
        contextSnapshot: JSON.stringify(currentFuncSnap),
        changeNote:      body.changeNote?.trim() || null,
        comment:         body.comment?.trim()    || null,
      },
    });

    if (taskType === "IMPLEMENT") {
      await Promise.all([
        createAiTask,
        prisma.prdBaseline.create({
          data: {
            refTableName:    "tb_function",
            refPkId:         numId,
            baselineType:    "IMPL",
            contextSnapshot: JSON.stringify(currentFuncSnap),
          },
        }),
      ]);
    } else {
      await createAiTask;
    }
  }

  return apiSuccess({
    ...data,
    status: phaseToStatus(data.phase, data.phaseStatus, data.confirmed),
  });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const numId = parseInt(id);

  const func = await prisma.function.findUnique({
    where: { functionId: numId },
    select: { phase: true, phaseStatus: true, confirmed: true },
  });

  if (!func) {
    return apiError("NOT_FOUND", "기능을 찾을 수 없습니다.", 404);
  }

  const status = phaseToStatus(func.phase, func.phaseStatus, func.confirmed);
  if (status === "IMPL_DONE") {
    return apiError("CANNOT_DELETE", "구현완료 상태의 기능은 삭제할 수 없습니다.");
  }

  await prisma.function.delete({ where: { functionId: numId } });

  return apiSuccess({ deleted: true });
}
