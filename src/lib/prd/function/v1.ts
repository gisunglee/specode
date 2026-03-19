/**
 * prd/function/v1.ts — 기능 단위 PRD 생성기 v1
 *
 * 단위업무 PRD와 동일한 형식으로 단일 기능을 출력한다.
 * 기술 컨텍스트 테이블, 구현 체크리스트 없음.
 */
import type { FunctionForPrd } from "../types";

export const VERSION = "v1" as const;

const PRIORITY_LABEL: Record<string, string> = {
  HIGH: "높음", MEDIUM: "중간", LOW: "낮음",
};

/** 기능 PRD 생성 시 추가로 전달할 수 있는 상위 컨텍스트 */
export interface FunctionPrdContext {
  areaCode?: string | null;
  areaName?: string | null;
  screenSystemId?: string | null;
  screenName?: string | null;
}

export function generateFunctionPrd(
  fn: FunctionForPrd,
  context: FunctionPrdContext = {},
): string {
  const lines: string[] = [];
  const push = (...items: string[]) => lines.push(...items);

  const fnMeta: string[] = [`[${fn.systemId}]`, fn.name];
  if (fn.displayCode) fnMeta.push(`(${fn.displayCode})`);
  fnMeta.push(`/ 우선순위: ${PRIORITY_LABEL[fn.priority] ?? fn.priority}`);
  push(`기능: ${fnMeta.join(" ")}`);

  if (context.areaCode && context.areaName) {
    push(`소속 영역: ${context.areaCode} ${context.areaName}`);
  }
  if (context.screenSystemId && context.screenName) {
    push(`상위 화면: ${context.screenSystemId} ${context.screenName}`);
  }

  if (fn.spec?.trim()) {
    push("", fn.spec.trim());
  }

  if (fn.refContent?.trim()) {
    push(
      "",
      "<details>",
      "<summary>참고 프로그램</summary>",
      "",
      fn.refContent.trim(),
      "",
      "</details>"
    );
  }

  if (fn.aiDesignContent?.trim()) {
    push(
      "",
      "<details>",
      "<summary>AI 상세 설계</summary>",
      "",
      fn.aiDesignContent.trim(),
      "",
      "</details>"
    );
  }

  if (fn.aiInspFeedback?.trim()) {
    push(
      "",
      "<details>",
      "<summary>AI 검토 결과</summary>",
      "",
      fn.aiInspFeedback.trim(),
      "",
      "</details>"
    );
  }

  push("");
  return lines.join("\n");
}
