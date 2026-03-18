/**
 * onTaskComplete.ts — AI 태스크 완료 후 비즈니스 로직 훅
 *
 * POST /api/ai/tasks/[id]/complete 에서 AI 결과가 저장된 직후 호출됩니다.
 *
 * 변경 이력:
 *   - AI 결과물(aiInspFeedback, aiDesignContent 등) 컬럼 제거됨
 *     → AiTask.feedback 이 단일 결과 저장소. 엔티티에는 phase/phaseStatus만 업데이트.
 *   - taskType INSPECT → REVIEW 통일
 *   - planType → resultType 매핑을 constants.ts 로 중앙화
 */
import prisma from "@/lib/prisma";
import { saveContentVersion } from "@/lib/contentVersion";
import { getResultType } from "@/lib/constants";

export interface TaskCompletePayload {
  aiTaskId: number;
  refTableName: string;
  refPkId: number;
  taskType: string;
  taskStatus: string; // SUCCESS | AUTO_FIXED | NEEDS_CHECK | WARNING | FAILED
  feedback: string | null;
  resultFiles: string | null;
}

/**
 * taskType → 완료 후 엔티티에 반영할 phase/phaseStatus
 * REVIEW/DESIGN/IMPLEMENT 완료 시 DONE으로 전진
 */
const TASK_TYPE_PHASE: Record<string, { phase: string; phaseStatus: string }> = {
  REVIEW:    { phase: "REVIEW", phaseStatus: "DONE" },
  INSPECT:   { phase: "REVIEW", phaseStatus: "DONE" }, // 구 taskType 호환
  DESIGN:    { phase: "DESIGN", phaseStatus: "DONE" },
  IMPLEMENT: { phase: "IMPL",   phaseStatus: "DONE" },
};

export async function onTaskComplete(payload: TaskCompletePayload): Promise<void> {
  const { aiTaskId, refTableName, refPkId, taskType, taskStatus, feedback, resultFiles } = payload;

  const isSuccess = taskStatus === "SUCCESS" || taskStatus === "AUTO_FIXED";
  if (!isSuccess) return;

  /* ─── tb_function ──────────────────────────────────────────── */
  if (refTableName === "tb_function") {
    const phaseUpdate = TASK_TYPE_PHASE[taskType];
    if (!phaseUpdate) return;

    await prisma.function.update({
      where: { functionId: refPkId },
      data: phaseUpdate,
    });

    // AI DESIGN 완료 시 ai_design_content 업데이트 (raw SQL — Prisma 클라이언트 미지원)
    if (taskType === "DESIGN") {
      await prisma.$executeRaw`
        UPDATE tb_function SET ai_design_content = ${feedback} WHERE function_id = ${refPkId}
      `;
    }
    return;
  }

  /* ─── tb_area ──────────────────────────────────────────────── */
  if (refTableName === "tb_area") {
    // DESIGN만 phase 전진. MOCKUP / IMPLEMENT 은 상태 변경 없음
    if (taskType === "DESIGN") {
      await prisma.area.update({
        where: { areaId: refPkId },
        data: { phase: "DESIGN", phaseStatus: "DONE" },
      });
    }
    return;
  }

  /* ─── tb_standard_guide ────────────────────────────────────── */
  if (refTableName === "tb_standard_guide") {
    if (taskType === "REVIEW" || taskType === "INSPECT") {
      await prisma.standardGuide.update({
        where: { guideId: refPkId },
        data: { phase: "REVIEW", phaseStatus: "DONE" },
      });
    }
    return;
  }

  /* ─── tb_planning_draft ────────────────────────────────────── */
  if (refTableName === "tb_planning_draft") {
    if (taskType === "PLANNING") {
      // planType → resultType 결정 (constants.ts 에서 중앙 관리)
      let resultType = "MD";
      try {
        const task = await prisma.aiTask.findUnique({
          where: { aiTaskId },
          select: { spec: true },
        });
        const parsed = JSON.parse(task?.spec || "{}");
        resultType = getResultType(parsed.planType);
      } catch {
        // spec 파싱 실패 시 MD 기본값
      }

      // 변경 전 내용 이력 저장
      const current = await prisma.planningDraft.findUnique({
        where: { planSn: refPkId },
        select: { resultContent: true },
      });
      await saveContentVersion({
        refTableName: "tb_planning_draft",
        refPkId,
        fieldName: "result_content",
        currentContent: current?.resultContent ?? null,
        changedBy: "ai",
        aiTaskId,
      });

      await prisma.planningDraft.update({
        where: { planSn: refPkId },
        data: { resultContent: feedback, resultType },
      });
    }
    return;
  }

  void resultFiles; // unused
}
