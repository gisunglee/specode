// ─────────────────────────────────────────────────────────────
// Phase 모델 — Function / Area / StandardGuide 공통
// ─────────────────────────────────────────────────────────────

/** 작업 단계 */
export const PHASES = {
  DRAFT:  "DRAFT",
  REVIEW: "REVIEW",
  DESIGN: "DESIGN",
  IMPL:   "IMPL",
} as const;
export type Phase = keyof typeof PHASES;

/** 단계 내 진행 상태 */
export const PHASE_STATUSES = {
  IDLE:       "IDLE",
  REQUESTED:  "REQUESTED",
  PROCESSING: "PROCESSING",
  DONE:       "DONE",
} as const;
export type PhaseStatus = keyof typeof PHASE_STATUSES;

/**
 * 구 status 문자열 → { phase, phaseStatus, confirmed }
 * PATCH API가 기존 status 값을 받을 때 변환에 사용
 */
export function statusToPhase(status: string): {
  phase: string;
  phaseStatus: string;
  confirmed: boolean;
} {
  const map: Record<string, { phase: string; phaseStatus: string; confirmed: boolean }> = {
    DRAFT:           { phase: "DRAFT",  phaseStatus: "IDLE",       confirmed: false },
    REVIEW_REQ:      { phase: "REVIEW", phaseStatus: "REQUESTED",  confirmed: false },
    AI_REVIEWING:    { phase: "REVIEW", phaseStatus: "PROCESSING", confirmed: false },
    REVIEW_DONE:     { phase: "REVIEW", phaseStatus: "DONE",       confirmed: false },
    DESIGN_REQ:      { phase: "DESIGN", phaseStatus: "REQUESTED",  confirmed: false },
    DESIGN_DONE:     { phase: "DESIGN", phaseStatus: "DONE",       confirmed: false },
    CONFIRM_Y:       { phase: "DESIGN", phaseStatus: "DONE",       confirmed: true  },
    IMPL_REQ:        { phase: "IMPL",   phaseStatus: "REQUESTED",  confirmed: false },
    AI_IMPLEMENTING: { phase: "IMPL",   phaseStatus: "PROCESSING", confirmed: false },
    IMPL_DONE:       { phase: "IMPL",   phaseStatus: "DONE",       confirmed: false },
  };
  return map[status] ?? { phase: "DRAFT", phaseStatus: "IDLE", confirmed: false };
}

/**
 * { phase, phaseStatus, confirmed } → 구 status 문자열 (API 응답 호환)
 * 프론트엔드가 기존 status 기반으로 동작하는 동안 사용
 */
export function phaseToStatus(
  phase: string,
  phaseStatus: string,
  confirmed: boolean
): string {
  if (phase === "DRAFT") return "DRAFT";
  if (confirmed)         return "CONFIRM_Y";
  const key = `${phase}_${phaseStatus}`;
  const map: Record<string, string> = {
    REVIEW_REQUESTED:  "REVIEW_REQ",
    REVIEW_PROCESSING: "AI_REVIEWING",
    REVIEW_DONE:       "REVIEW_DONE",
    DESIGN_REQUESTED:  "DESIGN_REQ",
    DESIGN_PROCESSING: "AI_REVIEWING",
    DESIGN_DONE:       "DESIGN_DONE",
    IMPL_REQUESTED:    "IMPL_REQ",
    IMPL_PROCESSING:   "AI_IMPLEMENTING",
    IMPL_DONE:         "IMPL_DONE",
  };
  return map[key] ?? phase;
}

// ─────────────────────────────────────────────────────────────
// Function 상태 표시 (phaseToStatus 결과 기준)
// ─────────────────────────────────────────────────────────────

export const FUNC_STATUS_LABEL: Record<string, string> = {
  DRAFT:           "설계중",
  REVIEW_REQ:      "검토요청",
  AI_REVIEWING:    "AI검토중",
  REVIEW_DONE:     "검토완료",
  DESIGN_REQ:      "설계요청",
  DESIGN_DONE:     "설계완료",
  CONFIRM_Y:       "컨펌",
  IMPL_REQ:        "구현요청",
  AI_IMPLEMENTING: "AI구현중",
  IMPL_DONE:       "구현완료",
};

export const FUNC_STATUS_COLOR: Record<
  string,
  { bg: string; text: string; pulse?: boolean }
> = {
  DRAFT:           { bg: "bg-zinc-200",    text: "text-zinc-700" },
  REVIEW_REQ:      { bg: "bg-blue-100",    text: "text-blue-800" },
  AI_REVIEWING:    { bg: "bg-indigo-100",  text: "text-indigo-800",  pulse: true },
  REVIEW_DONE:     { bg: "bg-yellow-100",  text: "text-yellow-800" },
  DESIGN_REQ:      { bg: "bg-teal-100",    text: "text-teal-800" },
  DESIGN_DONE:     { bg: "bg-cyan-100",    text: "text-cyan-800" },
  CONFIRM_Y:       { bg: "bg-green-100",   text: "text-green-800" },
  IMPL_REQ:        { bg: "bg-orange-100",  text: "text-orange-800" },
  AI_IMPLEMENTING: { bg: "bg-purple-100",  text: "text-purple-800", pulse: true },
  IMPL_DONE:       { bg: "bg-emerald-100", text: "text-emerald-800" },
};

/** 사용자가 직접 선택할 수 있는 status 목록 */
export const USER_SELECTABLE_STATUSES = [
  "DRAFT",
  "REVIEW_REQ",
  "REVIEW_DONE",
  "DESIGN_REQ",
  "DESIGN_DONE",
  "CONFIRM_Y",
  "IMPL_REQ",
  "IMPL_DONE",
] as const;

/** 전체 유효 status (AI 진행 포함) */
export const ALL_STATUSES = [
  ...USER_SELECTABLE_STATUSES,
  "AI_REVIEWING",
  "AI_IMPLEMENTING",
] as const;

/** AI 요청 시 자동 AiTask를 생성하는 status */
export const AI_REQUEST_STATUSES = ["REVIEW_REQ", "DESIGN_REQ", "IMPL_REQ"] as const;

// ─────────────────────────────────────────────────────────────
// AiTask 상태 표시
// ─────────────────────────────────────────────────────────────

export const AI_TASK_STATUS_LABEL: Record<string, { label: string; class: string }> = {
  NONE:        { label: "⏳ 처리 대기", class: "text-muted-foreground" },
  RUNNING:     { label: "🔄 진행중",    class: "text-blue-600" },
  SUCCESS:     { label: "✅ 문제없음",  class: "text-emerald-600" },
  AUTO_FIXED:  { label: "🔧 자동 수정", class: "text-sky-600" },
  NEEDS_CHECK: { label: "⚠️ 확인 필요", class: "text-amber-600 font-medium" },
  WARNING:     { label: "⚠️ 주의",     class: "text-orange-500" },
  FAILED:      { label: "❌ 실패",      class: "text-red-500" },
  CANCELLED:   { label: "🚫 취소됨",   class: "text-muted-foreground" },
  // 구형 DB 값 fallback
  PENDING:     { label: "⏳ 처리 대기", class: "text-muted-foreground" },
  DONE:        { label: "✅ 완료",      class: "text-emerald-600" },
};

// ─────────────────────────────────────────────────────────────
// Area 상태 표시
// ─────────────────────────────────────────────────────────────

export const AREA_STATUS_LABEL: Record<string, { label: string; class: string }> = {
  DRAFT:       { label: "미요청",   class: "bg-zinc-100 text-zinc-500" },
  DESIGN_REQ:  { label: "설계요청", class: "bg-blue-100 text-blue-700" },
  DESIGN_DONE: { label: "설계완료", class: "bg-emerald-100 text-emerald-700" },
  CONFIRM_Y:   { label: "컨펌",     class: "bg-green-100 text-green-800" },
  // 구 값 호환
  NONE:        { label: "미요청",   class: "bg-zinc-100 text-zinc-500" },
};

// ─────────────────────────────────────────────────────────────
// 기획 보드 — planType 중앙 관리
// ─────────────────────────────────────────────────────────────

export const PLAN_TYPES = {
  IA:      { label: "IA (정보구조)",      resultType: "MD"      as const },
  PROCESS: { label: "PROCESS (프로세스)", resultType: "MERMAID" as const },
  ERD:     { label: "ERD (데이터 모델)",  resultType: "MERMAID" as const },
  MOCKUP:  { label: "MOCKUP (목업)",      resultType: "HTML"    as const },
} as const;

export type PlanType = keyof typeof PLAN_TYPES;
export type ResultType = "MD" | "MERMAID" | "HTML";

export const PLAN_TYPE_LIST = Object.entries(PLAN_TYPES).map(([value, { label }]) => ({
  value,
  label,
}));

export const PLAN_TYPE_COLORS: Record<string, string> = {
  IA:      "bg-blue-100 text-blue-700",
  PROCESS: "bg-amber-100 text-amber-700",
  ERD:     "bg-emerald-100 text-emerald-700",
  MOCKUP:  "bg-purple-100 text-purple-700",
};

/** planType → resultType 변환 */
export function getResultType(planType: string | null | undefined): ResultType {
  return (PLAN_TYPES[planType as PlanType]?.resultType ?? "MD") as ResultType;
}

// ─────────────────────────────────────────────────────────────
// 공통 상수
// ─────────────────────────────────────────────────────────────

export const PRIORITIES = [
  { value: "HIGH",          label: "상" },
  { value: "MEDIUM",        label: "중" },
  { value: "LOW",           label: "하" },
] as const;

export const CHANGE_REASONS = [
  { value: "REQ_CHANGE",    label: "요구사항변경" },
  { value: "DESIGN_ERROR",  label: "설계오류" },
  { value: "FIELD_FEEDBACK",label: "현장피드백" },
  { value: "OTHER",         label: "기타" },
] as const;

export const SCREEN_TYPES = [
  { value: "LIST",   label: "목록" },
  { value: "DETAIL", label: "상세" },
  { value: "POPUP",  label: "팝업" },
  { value: "TAB",    label: "탭" },
] as const;

export const AREA_TYPES = [
  { value: "SEARCH",      label: "검색조건" },
  { value: "GRID",        label: "그리드" },
  { value: "FORM",        label: "폼" },
  { value: "INFO_CARD",   label: "정보카드" },
  { value: "TAB",         label: "탭" },
  { value: "FULL_SCREEN", label: "전체화면" },
] as const;

export const NAV_ITEMS = [
  { href: "/",                label: "대시보드", icon: "LayoutDashboard" },
  { href: "/requirements",    label: "요구사항", icon: "ClipboardList" },
  { href: "/screens",         label: "화면",     icon: "Monitor" },
  { href: "/areas",           label: "영역",     icon: "LayoutGrid" },
  { href: "/functions",       label: "기능",     icon: "Cog" },
  { href: "/design-contents", label: "설계마당", icon: "Palette" },
  { href: "/tree",            label: "트리 뷰",  icon: "GitBranch" },
  { href: "/ai-tasks",        label: "AI 현황",  icon: "Bot" },
] as const;

// ─────────────────────────────────────────────────────────────
// 설계 한마당 — designType / toolType 상수
// ─────────────────────────────────────────────────────────────

export const DESIGN_TYPES = {
  ERD:     { label: "ERD",     color: "bg-emerald-100 text-emerald-700", defaultTool: "MERMAID" },
  MOCKUP:  { label: "MOCKUP",  color: "bg-purple-100 text-purple-700",  defaultTool: "EXCALIDRAW" },
  MINDMAP: { label: "MINDMAP", color: "bg-blue-100 text-blue-700",      defaultTool: "MERMAID" },
} as const;

export type DesignType = keyof typeof DESIGN_TYPES;

export const TOOL_TYPES = {
  MERMAID:    { label: "Mermaid",    desc: "텍스트 기반 다이어그램 (ERD, 마인드맵)" },
  EXCALIDRAW: { label: "Excalidraw", desc: "자유형 드로잉 (목업, 스케치)" },
} as const;

export type ToolType = keyof typeof TOOL_TYPES;

export const DESIGN_STATUS_LABEL: Record<string, { label: string; class: string }> = {
  DRAFT:     { label: "작성중", class: "bg-zinc-100 text-zinc-600" },
  IN_REVIEW: { label: "검토중", class: "bg-blue-100 text-blue-700" },
  APPROVED:  { label: "완료",   class: "bg-emerald-100 text-emerald-700" },
};
