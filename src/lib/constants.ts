export const FUNC_STATUS = {
  DRAFT: "DRAFT",
  REVIEW_REQ: "REVIEW_REQ",
  AI_REVIEWING: "AI_REVIEWING",
  REVIEW_DONE: "REVIEW_DONE",
  DESIGN_REQ: "DESIGN_REQ",
  DESIGN_DONE: "DESIGN_DONE",
  CONFIRM_Y: "CONFIRM_Y",
  IMPL_REQ: "IMPL_REQ",
  AI_IMPLEMENTING: "AI_IMPLEMENTING",
  IMPL_DONE: "IMPL_DONE",
} as const;

export const FUNC_STATUS_LABEL: Record<string, string> = {
  DRAFT: "설계중",
  REVIEW_REQ: "검토요청",
  AI_REVIEWING: "AI검토중",
  REVIEW_DONE: "검토완료",
  DESIGN_REQ: "설계요청",
  DESIGN_DONE: "설계완료",
  CONFIRM_Y: "컨펌",
  IMPL_REQ: "구현요청",
  AI_IMPLEMENTING: "AI구현중",
  IMPL_DONE: "구현완료",
};

export const FUNC_STATUS_COLOR: Record<
  string,
  { bg: string; text: string; pulse?: boolean }
> = {
  DRAFT: { bg: "bg-zinc-200", text: "text-zinc-700" },
  REVIEW_REQ: { bg: "bg-blue-100", text: "text-blue-800" },
  AI_REVIEWING: {
    bg: "bg-indigo-100",
    text: "text-indigo-800",
    pulse: true,
  },
  REVIEW_DONE: { bg: "bg-yellow-100", text: "text-yellow-800" },
  DESIGN_REQ: { bg: "bg-teal-100", text: "text-teal-800" },
  DESIGN_DONE: { bg: "bg-cyan-100", text: "text-cyan-800" },
  CONFIRM_Y: { bg: "bg-green-100", text: "text-green-800" },
  IMPL_REQ: { bg: "bg-orange-100", text: "text-orange-800" },
  AI_IMPLEMENTING: {
    bg: "bg-purple-100",
    text: "text-purple-800",
    pulse: true,
  },
  IMPL_DONE: { bg: "bg-emerald-100", text: "text-emerald-800" },
};

/** Statuses the user can freely select (AI-only statuses excluded) */
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

/** All known valid statuses */
export const ALL_STATUSES = [
  ...USER_SELECTABLE_STATUSES,
  "AI_REVIEWING",
  "AI_IMPLEMENTING",
] as const;

/** Statuses that trigger AI task creation — show "AI에게 요청하시겠습니까?" */
export const AI_REQUEST_STATUSES = ["REVIEW_REQ", "DESIGN_REQ", "IMPL_REQ"];

/** AI 작업 처리 결과 상태 라벨 — functions/[id] 헤더, functions 목록에 공유 */
export const AI_TASK_STATUS_LABEL: Record<string, { label: string; class: string }> = {
  NONE:        { label: "⏳ 처리 대기",     class: "text-muted-foreground" },
  RUNNING:     { label: "🔄 진행중",        class: "text-blue-600" },
  SUCCESS:     { label: "✅ 문제없음",       class: "text-emerald-600" },
  AUTO_FIXED:  { label: "🔧 자동 수정",      class: "text-sky-600" },
  NEEDS_CHECK: { label: "⚠️ 확인 필요",     class: "text-amber-600 font-medium" },
  WARNING:     { label: "⚠️ 주의",          class: "text-orange-500" },
  FAILED:      { label: "❌ 실패",           class: "text-red-500" },
  CANCELLED:   { label: "🚫 취소됨",         class: "text-muted-foreground" },
  /* 구형 DB 값 fallback */
  PENDING:     { label: "⏳ 처리 대기",     class: "text-muted-foreground" },
  DONE:        { label: "✅ 완료",           class: "text-emerald-600" },
};

export const PRIORITIES = [
  { value: "HIGH", label: "상" },
  { value: "MEDIUM", label: "중" },
  { value: "LOW", label: "하" },
] as const;

export const CHANGE_REASONS = [
  { value: "REQ_CHANGE", label: "요구사항변경" },
  { value: "DESIGN_ERROR", label: "설계오류" },
  { value: "FIELD_FEEDBACK", label: "현장피드백" },
  { value: "OTHER", label: "기타" },
] as const;

export const SCREEN_TYPES = [
  { value: "LIST", label: "목록" },
  { value: "DETAIL", label: "상세" },
  { value: "POPUP", label: "팝업" },
  { value: "TAB", label: "탭" },
] as const;

export const AREA_TYPES = [
  { value: "GRID",        label: "그리드" },
  { value: "FORM",        label: "폼" },
  { value: "INFO_CARD",   label: "정보카드" },
  { value: "TAB",         label: "탭" },
  { value: "FULL_SCREEN", label: "전체화면" },
] as const;

export const AREA_STATUS_LABEL: Record<string, { label: string; class: string }> = {
  NONE:        { label: "미요청",   class: "bg-zinc-100 text-zinc-500" },
  DESIGN_REQ:  { label: "설계요청", class: "bg-blue-100 text-blue-700" },
  DESIGN_DONE: { label: "설계완료", class: "bg-emerald-100 text-emerald-700" },
  CONFIRM_Y:   { label: "컨펌",     class: "bg-green-100 text-green-800" },
};

export const NAV_ITEMS = [
  { href: "/", label: "대시보드", icon: "LayoutDashboard" },
  { href: "/requirements", label: "요구사항", icon: "ClipboardList" },
  { href: "/screens", label: "화면", icon: "Monitor" },
  { href: "/areas", label: "영역", icon: "LayoutGrid" },
  { href: "/functions", label: "기능", icon: "Cog" },
  { href: "/tree", label: "트리 뷰", icon: "GitBranch" },
  { href: "/ai-tasks", label: "AI 현황", icon: "Bot" },
] as const;
