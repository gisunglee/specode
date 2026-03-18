/**
 * prd/unitwork/v1.ts — 단위업무 PRD 생성기 v1
 *
 * 단위업무 하위의 모든 화면·영역·기능을 헤딩 없이 순서대로 나열.
 * 사용자가 spec 내용에서 직접 #/##/### 포맷을 사용한다.
 */

export const VERSION = "v1" as const;

const SCREEN_TYPE_LABEL: Record<string, string> = {
  LIST:   "목록",
  DETAIL: "상세",
  FORM:   "등록/수정",
  POPUP:  "팝업",
  TAB:    "탭",
};

const AREA_TYPE_LABEL: Record<string, string> = {
  GRID:        "그리드",
  FORM:        "폼",
  SEARCH:      "검색조건",
  INFO_CARD:   "정보카드",
  TAB:         "탭",
  FULL_SCREEN: "전체화면",
};

const PRIORITY_LABEL: Record<string, string> = {
  HIGH: "높음", MEDIUM: "중간", LOW: "낮음",
};

export interface FuncForUwPrd {
  systemId:        string;
  displayCode:     string | null;
  name:            string;
  priority:        string;
  spec:            string | null;
  refContent:      string | null;
  aiDesignContent: string | null;
  aiInspFeedback:  string | null;
}

export interface AreaForUwPrd {
  areaCode:   string;
  name:       string;
  areaType:   string;
  spec:       string | null;
  functions:  FuncForUwPrd[];
}

export interface ScreenForUwPrd {
  systemId:    string;
  displayCode: string | null;
  name:        string;
  screenType:  string | null;
  spec:        string | null;
  areas:       AreaForUwPrd[];
}

export interface UnitWorkForPrd {
  systemId:    string;
  name:        string;
  description: string | null;
  requirement: { systemId: string; name: string } | null;
  screens:     ScreenForUwPrd[];
}

export function generateUnitWorkPrd(uw: UnitWorkForPrd): string {
  const lines: string[] = [];

  const push = (...items: string[]) => lines.push(...items);

  // ── 단위업무 정보 ──────────────────────────────────────────────
  push(`단위업무: ${uw.name} (${uw.systemId})`);
  if (uw.requirement) {
    push(`요구사항: [${uw.requirement.systemId}] ${uw.requirement.name}`);
  }
  if (uw.description?.trim()) {
    push("", uw.description.trim());
  }

  // ── 화면 → 영역 → 기능 순서대로 나열 ─────────────────────────
  uw.screens.forEach((screen) => {
    push("");

    const screenMeta: string[] = [`[${screen.systemId}]`, screen.name];
    if (screen.displayCode) screenMeta.push(`(${screen.displayCode})`);
    if (screen.screenType)  screenMeta.push(`/ ${SCREEN_TYPE_LABEL[screen.screenType] ?? screen.screenType}`);
    push(`화면: ${screenMeta.join(" ")}`);

    if (screen.spec?.trim()) {
      push("", screen.spec.trim());
    }

    screen.areas.forEach((area) => {
      push("");

      const aTypeLabel = AREA_TYPE_LABEL[area.areaType] ?? area.areaType;
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
  });

  push("");
  return lines.join("\n");
}
