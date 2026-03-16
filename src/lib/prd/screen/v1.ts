/**
 * prd/screen/v1.ts — 화면 단위 PRD 생성기 v1
 *
 * 변경 이력:
 *   v1 (2026-03-15) 최초 작성
 *     - 화면 개요 + 기술 컨텍스트 + 영역별 기능 명세 + 체크리스트
 *     - aiDesignContent / aiInspFeedback를 <details> 접기 처리
 */
import type { ScreenForPrd } from "../types";
import { type PrdConfig, DEFAULT_PRD_CONFIG } from "../config";

export const VERSION = "v1" as const;

const AREA_TYPE_LABELS: Record<string, string> = {
  SEARCH:      "검색조건",
  GRID:        "그리드",
  FORM:        "폼",
  INFO_CARD:   "정보카드",
  TAB:         "탭",
  FULL_SCREEN: "전체화면",
};

const PRIORITY_EMOJI: Record<string, string> = {
  HIGH:   "🔴",
  MEDIUM: "🟡",
  LOW:    "🟢",
};

export function generateScreenPrd(screen: ScreenForPrd, config: PrdConfig = DEFAULT_PRD_CONFIG): string {
  const now = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const menuParts = [screen.categoryL, screen.categoryM, screen.categoryS].filter(Boolean) as string[];
  const menuPath = menuParts.length ? menuParts.join(" > ") : "—";

  const urlSegment = menuParts.length
    ? menuParts[0].toLowerCase().replace(/[\s/]+/g, "-")
    : screen.systemId.toLowerCase();
  const urlSuggestion = `/${urlSegment}`;

  const reqInfo = screen.requirement
    ? `${screen.requirement.systemId} ${screen.requirement.name}`
    : "—";

  const totalFuncCount = screen.areas.reduce((s, a) => s + a.functions.length, 0);

  const lines: string[] = [];

  // ── 문서 헤더 ──────────────────────────────────────────────────────────
  lines.push(`# ${screen.systemId} ${screen.name} — 개발 PRD`);
  lines.push("");
  lines.push(`> 생성일: ${now} | 관련 요구사항: ${reqInfo} | **PRD 버전: 화면 v1**`);
  lines.push("");

  // ── 화면 개요 ──────────────────────────────────────────────────────────
  lines.push("## 화면 개요");
  lines.push("");
  lines.push(
    `- **화면 ID:** \`${screen.systemId}\`${screen.displayCode ? ` (${screen.displayCode})` : ""}`
  );
  lines.push(`- **URL 경로 (예시):** \`${urlSuggestion}\``);
  lines.push(`- **메뉴 경로:** ${menuPath}`);
  if (screen.screenType) lines.push(`- **화면 유형:** ${screen.screenType}`);
  lines.push(`- **영역:** ${screen.areas.length}개 | **기능:** ${totalFuncCount}건`);
  lines.push("");

  if (screen.spec?.trim()) {
    lines.push(screen.spec.trim());
    lines.push("");
  }

  // ── 기술 컨텍스트 ──────────────────────────────────────────────────────
  lines.push("## 기술 컨텍스트 (Claude Code 참고)");
  lines.push("");
  lines.push("| 항목 | 내용 |");
  lines.push("|------|------|");
  for (const row of config.techContext) {
    lines.push(`| ${row.label} | ${row.value} |`);
  }
  lines.push("");

  // ── 영역별 상세 ────────────────────────────────────────────────────────
  lines.push("---");
  lines.push("");
  lines.push("## 영역별 상세");
  lines.push("");

  if (screen.areas.length === 0) {
    lines.push("> 등록된 영역이 없습니다.");
    lines.push("");
  } else {
    for (const area of screen.areas) {
      const areaTypeLabel = AREA_TYPE_LABELS[area.areaType] ?? area.areaType;

      lines.push(`### ${area.areaCode}: ${area.name}`);
      lines.push("");
      lines.push(`**영역 유형:** ${areaTypeLabel}`);
      lines.push("");

      if (area.spec?.trim()) {
        lines.push(area.spec.trim());
        lines.push("");
      }

      if (area.designData) {
        lines.push("> ✏️ Excalidraw 설계 도안이 있습니다. SPECODE Area 상세 페이지에서 확인하세요.");
        lines.push("");
      }

      if (area.functions.length === 0) {
        lines.push("> 등록된 기능이 없습니다.");
        lines.push("");
      } else {
        for (const fn of area.functions) {
          const priorityEmoji = PRIORITY_EMOJI[fn.priority] ?? "⚪";
          const idLabel = fn.displayCode
            ? `${fn.systemId} (${fn.displayCode})`
            : fn.systemId;

          lines.push(`#### ${idLabel}: ${fn.name}`);
          lines.push("");
          lines.push(`**상태:** \`${fn.status}\` | **우선순위:** ${priorityEmoji} ${fn.priority}`);
          lines.push("");

          if (fn.spec?.trim()) {
            lines.push("**기능 명세:**");
            lines.push("");
            lines.push(fn.spec.trim());
            lines.push("");
          }

          if (fn.aiDesignContent?.trim()) {
            lines.push("<details>");
            lines.push("<summary>📐 AI 상세 설계 내용 (펼치기)</summary>");
            lines.push("");
            lines.push(fn.aiDesignContent.trim());
            lines.push("");
            lines.push("</details>");
            lines.push("");
          }

          if (fn.aiInspFeedback?.trim()) {
            lines.push("<details>");
            lines.push("<summary>🔍 AI 검토 피드백 (펼치기)</summary>");
            lines.push("");
            lines.push(fn.aiInspFeedback.trim());
            lines.push("");
            lines.push("</details>");
            lines.push("");
          }
        }
      }

      lines.push("---");
      lines.push("");
    }
  }

  // ── 구현 체크리스트 ────────────────────────────────────────────────────
  lines.push("## 구현 체크리스트");
  lines.push("");
  lines.push(`- [ ] 페이지 컴포넌트 (\`src/app${urlSuggestion}/page.tsx\`)`);
  lines.push("- [ ] API 엔드포인트 구현");

  const areaTypes = new Set(screen.areas.map((a) => a.areaType));
  if (areaTypes.has("GRID"))                          lines.push("- [ ] DataGrid 컴포넌트 (컬럼 정의 + 페이지네이션)");
  if (areaTypes.has("SEARCH") || areaTypes.has("FORM")) lines.push("- [ ] 검색/입력 폼 컴포넌트");
  if (areaTypes.has("FULL_SCREEN"))                   lines.push("- [ ] 상세/편집 다이얼로그 (Dialog)");
  if (areaTypes.has("TAB"))                           lines.push("- [ ] 탭 컴포넌트 (Tabs)");
  if (areaTypes.has("INFO_CARD"))                     lines.push("- [ ] 정보 카드 컴포넌트");

  lines.push("- [ ] 유효성 검사 (Zod)");
  lines.push("- [ ] 에러 처리 및 Toast 알림");
  lines.push("- [ ] 로딩 상태 처리 (isLoading / isPending)");
  lines.push("");

  return lines.join("\n");
}
