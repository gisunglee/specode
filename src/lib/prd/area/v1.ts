/**
 * prd/area/v1.ts — 영역 단위 PRD 생성기 v1
 *
 * 단위업무 PRD와 동일한 형식으로 영역 + 소속 기능을 출력한다.
 * 기술 컨텍스트 테이블, 구현 체크리스트 없음.
 */
import type { AreaForPrd } from "../types";

export const VERSION = "v1" as const;

const AREA_TYPE_LABELS: Record<string, string> = {
  SEARCH:      "검색조건",
  GRID:        "그리드",
  FORM:        "폼",
  INFO_CARD:   "정보카드",
  TAB:         "탭",
  FULL_SCREEN: "전체화면",
};

const PRIORITY_LABEL: Record<string, string> = {
  HIGH: "높음", MEDIUM: "중간", LOW: "낮음",
};

/** 영역 PRD 생성 시 추가로 전달할 수 있는 상위 컨텍스트 */
export interface AreaPrdContext {
  screenSystemId?: string | null;
  screenName?: string | null;
}

export function generateAreaPrd(
  area: AreaForPrd,
  context: AreaPrdContext = {},
): string {
  const lines: string[] = [];
  const push = (...items: string[]) => lines.push(...items);

  const aTypeLabel = AREA_TYPE_LABELS[area.areaType] ?? area.areaType;
  push(`영역: [${area.areaCode}] ${area.name} / ${aTypeLabel}`);

  if (context.screenSystemId && context.screenName) {
    push(`상위 화면: ${context.screenSystemId} ${context.screenName}`);
  }

  if (area.spec?.trim()) {
    push("", area.spec.trim());
  }

  area.functions.forEach((fn) => {
    push("");

    const fnMeta: string[] = [`[${fn.systemId}]`, fn.name];
    if (fn.displayCode) fnMeta.push(`(${fn.displayCode})`);
    fnMeta.push(`/ 우선순위: ${PRIORITY_LABEL[fn.priority] ?? fn.priority}`);
    push(`기능: ${fnMeta.join(" ")}`);

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
  });

  push("");
  return lines.join("\n");
}
