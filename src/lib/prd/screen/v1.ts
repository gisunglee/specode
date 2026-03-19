/**
 * prd/screen/v1.ts — 화면 단위 PRD 생성기 v1
 *
 * 단위업무 PRD와 동일한 형식으로 화면 + 영역 + 기능을 출력한다.
 * 기술 컨텍스트 테이블, 구현 체크리스트 없음.
 */
import type { ScreenForPrd } from "../types";

export const VERSION = "v1" as const;

const SCREEN_TYPE_LABEL: Record<string, string> = {
  LIST:   "목록",
  DETAIL: "상세",
  FORM:   "등록/수정",
  POPUP:  "팝업",
  TAB:    "탭",
};

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

export function generateScreenPrd(screen: ScreenForPrd): string {
  const lines: string[] = [];
  const push = (...items: string[]) => lines.push(...items);

  const screenMeta: string[] = [`[${screen.systemId}]`, screen.name];
  if (screen.displayCode) screenMeta.push(`(${screen.displayCode})`);
  if (screen.screenType) screenMeta.push(`/ ${SCREEN_TYPE_LABEL[screen.screenType] ?? screen.screenType}`);
  push(`화면: ${screenMeta.join(" ")}`);

  if (screen.requirement) {
    push(`관련 요구사항: [${screen.requirement.systemId}] ${screen.requirement.name}`);
  }

  if (screen.spec?.trim()) {
    push("", screen.spec.trim());
  }

  screen.areas.forEach((area) => {
    push("");

    const aTypeLabel = AREA_TYPE_LABELS[area.areaType] ?? area.areaType;
    push(`영역: [${area.areaCode}] ${area.name} / ${aTypeLabel}`);

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
  });

  push("");
  return lines.join("\n");
}
