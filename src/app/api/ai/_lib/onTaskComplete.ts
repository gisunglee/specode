/**
 * onTaskComplete.ts — AI 태스크 완료 후 비즈니스 로직 훅
 *
 * POST /api/ai/tasks/[id]/complete 에서 AI 결과가 저장된 직후 호출됩니다.
 * taskType · refTableName 에 따라 대상 엔티티를 자동 업데이트합니다.
 *
 * 📌 향후 확장 포인트:
 *   - 알림 발송, 슬랙 웹훅, 이벤트 큐 등은 이 파일에 추가
 *   - taskType 별 분기는 switch 케이스에 추가
 */
import prisma from "@/lib/prisma";
import { saveContentVersion } from "@/lib/contentVersion";

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
 * onTaskComplete
 *
 * SUCCESS / AUTO_FIXED 상태일 때만 대상 엔티티를 업데이트합니다.
 * FAILED / WARNING 등의 경우 AiTask 자체에만 결과가 기록됩니다.
 */
export async function onTaskComplete(payload: TaskCompletePayload): Promise<void> {
  const { aiTaskId, refTableName, refPkId, taskType, taskStatus, feedback, resultFiles } = payload;

  // 성공 계열 상태일 때만 엔티티 반영
  const isSuccess = taskStatus === "SUCCESS" || taskStatus === "AUTO_FIXED";
  if (!isSuccess) return;

  /* ─── tb_function 대상 ─────────────────────────────────────── */
  if (refTableName === "tb_function") {
    const updateData: Record<string, unknown> = {};
    let versionFieldName: string | null = null;

    switch (taskType) {
      case "INSPECT":
        // AI 기능 점검 피드백 → aiInspFeedback, 상태 REVIEW_DONE
        updateData.aiInspFeedback = feedback;
        updateData.status = "REVIEW_DONE";
        break;

      case "DESIGN":
        // AI 상세설계 결과 → aiDesignContent, 상태 DESIGN_DONE
        updateData.aiDesignContent = feedback;
        updateData.status = "DESIGN_DONE";
        versionFieldName = "ai_design_content";
        break;

      case "IMPLEMENT":
        // AI 구현 피드백 → aiImplFeedback, 상태 IMPL_DONE
        updateData.aiImplFeedback = feedback;
        updateData.status = "IMPL_DONE";
        break;

      // 📌 신규 taskType 추가 시 여기에 case 추가
    }

    if (Object.keys(updateData).length > 0) {
      // 버전 이력: 변경 직전 현재 값 저장
      if (versionFieldName) {
        const current = await prisma.function.findUnique({
          where: { functionId: refPkId },
          select: { aiDesignContent: true },
        });
        if (current) {
          await saveContentVersion({
            refTableName: "tb_function",
            refPkId,
            fieldName: versionFieldName,
            currentContent: current.aiDesignContent,
            changedBy: "ai",
            aiTaskId,
          });
        }
      }

      await prisma.function.update({
        where: { functionId: refPkId },
        data: updateData,
      });
    }
    return;
  }

  /* ─── tb_standard_guide 대상 ───────────────────────────────── */
  if (refTableName === "tb_standard_guide") {
    if (taskType === "INSPECT") {
      // AI 점검 피드백 → aiFeedbackContent, 상태 REVIEW_DONE
      await prisma.standardGuide.update({
        where: { guideId: refPkId },
        data: {
          aiFeedbackContent: feedback,
          aiFeedbackAt: new Date(),
          status: "REVIEW_DONE",
        },
      });
    }
    return;
  }

  /* ─── tb_area 대상 ─────────────────────────────────────────── */
  if (refTableName === "tb_area") {
    if (taskType === "DESIGN") {
      // AI 설계 결과 → aiFeedback, 상태 DESIGN_DONE
      await prisma.area.update({
        where: { areaId: refPkId },
        data: {
          aiFeedback: feedback,
          status: "DESIGN_DONE",
        },
      });
    }
    return;
  }

  /* ─── tb_planning_draft 대상 ───────────────────────────────── */
  if (refTableName === "tb_planning_draft") {
    if (taskType === "PLANNING") {
      const resultTypeMap: Record<string, string> = {
        IA: "MD", PROCESS: "MERMAID", MOCKUP: "HTML", ERD: "MERMAID",
      };
      let resultType = "MD";
      try {
        const task = await prisma.aiTask.findUnique({ where: { aiTaskId }, select: { spec: true } });
        resultType = resultTypeMap[JSON.parse(task?.spec || "{}").planType] ?? "MD";
      } catch { /* spec 파싱 실패 시 MD 기본값 */ }

      const current = await prisma.planningDraft.findUnique({
        where: { planSn: refPkId }, select: { resultContent: true },
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

  // 📌 신규 refTableName 추가 시 if 블록 추가

  void resultFiles; // unused
}
