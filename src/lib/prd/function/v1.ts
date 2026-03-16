/**
 * prd/function/v1.ts — 기능 단위 PRD 생성기 v1
 *
 * 변경 이력:
 *   v1 (2026-03-16) 최초 작성
 *     - 기능 개요 + 기술 컨텍스트 + 기능 명세 + AI 설계/검토 내용 + 체크리스트
 *     - aiDesignContent 는 본문 노출, aiInspFeedback 는 <details> 접기 처리
 */
import type { FunctionForPrd } from "../types";
import { type PrdConfig, DEFAULT_PRD_CONFIG } from "../config";

export const VERSION = "v1" as const;

const PRIORITY_EMOJI: Record<string, string> = {
  HIGH:   "🔴",
  MEDIUM: "🟡",
  LOW:    "🟢",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT:        "작성중",
  REVIEW_REQ:   "검토요청",
  AI_REVIEWING: "AI검토중",
  REVIEW_DONE:  "검토완료",
  DESIGN_REQ:   "설계요청",
  DESIGN_DONE:  "설계완료",
  CONFIRM_Y:    "확정",
  IMPL_REQ:     "구현요청",
  IMPL_DONE:    "구현완료",
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
  config: PrdConfig = DEFAULT_PRD_CONFIG,
): string {
  const now = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const idLabel = fn.displayCode
    ? `${fn.systemId} (${fn.displayCode})`
    : fn.systemId;
  const priorityEmoji = PRIORITY_EMOJI[fn.priority] ?? "⚪";
  const statusLabel = STATUS_LABEL[fn.status] ?? fn.status;
  const lines: string[] = [];

  // ── 문서 헤더 ──────────────────────────────────────────────────────────
  lines.push(`# ${idLabel}: ${fn.name} — 개발 PRD`);
  lines.push("");
  lines.push(`> 생성일: ${now} | **PRD 버전: 기능 v1**`);
  lines.push("");

  // ── 기능 개요 ──────────────────────────────────────────────────────────
  lines.push("## 기능 개요");
  lines.push("");
  lines.push(`- **기능 ID:** \`${fn.systemId}\`${fn.displayCode ? ` (${fn.displayCode})` : ""}`);
  lines.push(`- **상태:** \`${fn.status}\` (${statusLabel})`);
  lines.push(`- **우선순위:** ${priorityEmoji} ${fn.priority}`);
  if (context.areaCode && context.areaName) lines.push(`- **소속 영역:** ${context.areaCode} ${context.areaName}`);
  if (context.screenSystemId && context.screenName) lines.push(`- **상위 화면:** ${context.screenSystemId} ${context.screenName}`);
  lines.push("");

  // ── 기술 컨텍스트 ──────────────────────────────────────────────────────
  lines.push("## 기술 컨텍스트 (Claude Code 참고)");
  lines.push("");
  lines.push("| 항목 | 내용 |");
  lines.push("|------|------|");
  for (const row of config.techContext) {
    lines.push(`| ${row.label} | ${row.value} |`);
  }
  lines.push("");

  // ── 기능 명세 ──────────────────────────────────────────────────────────
  lines.push("---");
  lines.push("");
  lines.push("## 기능 명세");
  lines.push("");

  if (fn.spec?.trim()) {
    lines.push(fn.spec.trim());
    lines.push("");
  } else {
    lines.push("> 기능 명세가 작성되지 않았습니다.");
    lines.push("");
  }

  // ── AI 상세 설계 내용 ────────────────────────────────────────────────────
  if (fn.aiDesignContent?.trim()) {
    lines.push("---");
    lines.push("");
    lines.push("## AI 상세 설계 내용");
    lines.push("");
    lines.push(fn.aiDesignContent.trim());
    lines.push("");
  }

  // ── AI 검토 피드백 ──────────────────────────────────────────────────────
  if (fn.aiInspFeedback?.trim()) {
    lines.push("<details>");
    lines.push("<summary>🔍 AI 검토 피드백 (펼치기)</summary>");
    lines.push("");
    lines.push(fn.aiInspFeedback.trim());
    lines.push("");
    lines.push("</details>");
    lines.push("");
  }

  // ── 구현 체크리스트 ────────────────────────────────────────────────────
  lines.push("---");
  lines.push("");
  lines.push("## 구현 체크리스트");
  lines.push("");
  lines.push("- [ ] API 엔드포인트 구현");
  lines.push("- [ ] 컴포넌트 구현 (UI + 상태 관리)");
  lines.push("- [ ] 유효성 검사 (Zod)");
  lines.push("- [ ] 에러 처리 및 Toast 알림");
  lines.push("- [ ] 로딩 상태 처리 (isLoading / isPending)");
  lines.push("");

  return lines.join("\n");
}
