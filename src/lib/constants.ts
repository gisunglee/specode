export const FUNC_STATUS = {
  DRAFT: "DRAFT",
  REVIEW_REQ: "REVIEW_REQ",
  AI_REVIEWING: "AI_REVIEWING",
  REVIEW_DONE: "REVIEW_DONE",
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
export const AI_REQUEST_STATUSES = ["REVIEW_REQ", "IMPL_REQ"];

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

export const NAV_ITEMS = [
  { href: "/", label: "대시보드", icon: "LayoutDashboard" },
  { href: "/requirements", label: "요구사항", icon: "ClipboardList" },
  { href: "/screens", label: "화면", icon: "Monitor" },
  { href: "/functions", label: "기능", icon: "Cog" },
  { href: "/tree", label: "트리 뷰", icon: "GitBranch" },
  { href: "/import-export", label: "엑셀", icon: "FileSpreadsheet" },
  { href: "/ai-tasks", label: "AI 현황", icon: "Bot" },
] as const;
