/**
 * contentVersion.ts — 콘텐츠 버전 이력 저장 유틸
 *
 * 특정 필드가 UPDATE 되기 직전, 현재(이전) 값을 tb_content_version 에 저장한다.
 *
 * 허용 조합 (이 5개 외에는 무시):
 *   tb_function        → spec, ai_design_content, ref_content
 *   tb_area            → spec
 *   tb_standard_guide  → content
 */
import prisma from "@/lib/prisma";

/** 버전 이력을 남기는 테이블·필드 조합 */
const VERSIONED_FIELDS: Record<string, string[]> = {
  tb_function: ["spec", "ai_design_content", "ref_content"],
  tb_area: ["spec"],
  tb_standard_guide: ["content"],
  tb_db_schema: ["ddl_script"],
  tb_planning_draft: ["result_content"],
};

export interface SaveVersionParams {
  refTableName: "tb_function" | "tb_area" | "tb_standard_guide" | "tb_db_schema" | "tb_planning_draft";
  refPkId: number;
  fieldName: string;
  /** 변경 직전의 현재 값 (이걸 이력으로 남긴다) */
  currentContent: string | null;
  changedBy?: "user" | "ai";
  aiTaskId?: number | null;
}

/**
 * saveContentVersion
 *
 * 동작 규칙:
 * 1. currentContent가 null 이거나 빈 문자열이면 저장하지 않는다 (최초 작성은 이력 없음).
 * 2. 허용된 5개 조합이 아니면 무시한다 (에러 발생 없음).
 * 3. 실패해도 예외를 전파하지 않는다 — 원본 UPDATE 보호.
 */
export async function saveContentVersion(params: SaveVersionParams): Promise<void> {
  const {
    refTableName,
    refPkId,
    fieldName,
    currentContent,
    changedBy = "user",
    aiTaskId = null,
  } = params;

  // 1. 내용 없으면 이력 불필요
  if (!currentContent) return;

  // 2. 허용 조합 검증
  const allowed = VERSIONED_FIELDS[refTableName];
  if (!allowed || !allowed.includes(fieldName)) return;

  try {
    await prisma.contentVersion.create({
      data: {
        refTableName,
        refPkId,
        fieldName,
        aiTaskId,
        content: currentContent,
        changedBy,
      },
    });
  } catch (err) {
    // 이력 저장 실패는 무시 — 원본 UPDATE 정상 실행 보장
    console.error("[contentVersion] 이력 저장 실패:", err);
  }
}
