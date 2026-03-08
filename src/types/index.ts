export interface Requirement {
  requirementId: number;
  systemId: string;
  name: string;
  content: string | null;     // 요구사항 내용 (원문 HTML)
  description: string | null; // 요구사항 분석 내용 (HTML)
  priority: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    screens: number;
  };
  screens?: Screen[];
}

export interface Screen {
  screenId: number;
  systemId: string;
  displayCode: string | null;
  name: string;
  screenType: string | null;
  requirementId: number;
  spec: string | null;
  layoutData: string | null;
  createdAt: string;
  updatedAt: string;
  requirement?: Requirement;
  _count?: {
    functions: number;
  };
  functions?: FunctionItem[];
  attachments?: Attachment[];
}

export interface FunctionItem {
  functionId: number;
  systemId: string;
  displayCode: string | null;
  name: string;
  screenId: number;
  spec: string | null;
  dataFlow: string | null;
  changeReason: string | null;
  status: string;
  priority: string;
  aiSummary: string | null;
  aiReviewResult: string | null;
  aiConflictFunctions: string | null;
  aiImpactAnalysis: string | null;
  aiDesignContent: string | null;  // AI가 작성한 상세 설계 내용 (마크다운)
  aiImplFeedback: string | null;
  aiImplIssues: string | null;
  gitlabPrUrl: string | null;
  relatedFiles: string | null;
  refContent: string | null;
  createdAt: string;
  updatedAt: string;
  screen?: Screen;
  latestTask?: AiTask | null;
  tasks?: AiTask[];
  attachments?: Attachment[];
}

export interface AiTask {
  aiTaskId: number;
  systemId: string;
  refTableName: string;   // "tb_function" | "tb_standard_guide" | ...
  refPkId: number;        // 대상 테이블 PK
  taskType: string;       // DESIGN | REVIEW | IMPLEMENT | IMPACT | REPROCESS | INSPECT
  taskStatus: string;     // NONE | RUNNING | SUCCESS | AUTO_FIXED | NEEDS_CHECK | WARNING | FAILED
  spec: string | null;
  comment: string | null;
  feedback: string | null;
  resultFiles: string | null;
  requestedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  // AI현황 페이지 전용: API에서 refTableName에 맞는 대상 정보를 담아 반환
  target?: {
    systemId: string;
    name?: string;   // tb_function
    title?: string;  // tb_standard_guide
    displayCode?: string | null;
    category?: string;
  } | null;
}

export interface Attachment {
  attachmentId: number;
  refTableName: string;
  refPkId: number;
  logicalName: string;
  physicalName: string;
  filePath: string;
  fileSize: number;
  fileExt: string | null;
  description: string | null;
  delYn: string;
  createdBy: string;
  createdAt: string;
}

export interface StandardGuide {
  guideId: number;
  systemId: string;
  category: string;
  title: string;
  content: string | null;
  relatedFiles: string | null;
  isActive: string; // "Y" | "N"
  status: string; // REVIEW_REQ | REVIEW_DONE
  aiFeedbackContent: string | null;
  aiFeedbackAt: string | null;
  createdAt: string;
  updatedAt: string;
  latestTask?: AiTask | null;
  tasks?: AiTask[];
}

export interface TreeNode {
  id: number;
  systemId: string;
  name: string;
  type: "requirement" | "screen" | "function";
  displayCode?: string;
  screenType?: string;
  status?: string;
  children?: TreeNode[];
}

export interface DashboardSummary {
  totalFunctions: number;
  byStatus: Record<string, number>;
  pendingConfirm: number;
  aiRunning: number;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  pagination?: Pagination;
  error?: {
    code: string;
    message: string;
  };
}
