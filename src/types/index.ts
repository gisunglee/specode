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
  createdAt: string;
  updatedAt: string;
  screen?: Screen;
  references?: FuncReference[];
  relations?: FuncRelation[];
  relatedBy?: FuncRelation[];
  files?: FuncFile[];
  tasks?: AiTask[];
  attachments?: Attachment[];
}

export interface FuncReference {
  funcReferenceId: number;
  functionId: number;
  refType: string;
  refValue: string;
  description: string | null;
  createdAt: string;
}

export interface FuncRelation {
  funcRelationId: number;
  sourceFunctionId: number;
  targetFunctionId: number;
  relationType: string;
  params: string | null;
  description: string | null;
  createdAt: string;
  sourceFunction?: FunctionItem;
  targetFunction?: FunctionItem;
}

export interface FuncFile {
  funcFileId: number;
  functionId: number;
  aiTaskId: number | null;
  filePath: string;
  description: string | null;
  createdBy: string;
  createdAt: string;
}

export interface AiTask {
  aiTaskId: number;
  systemId: string;
  functionId: number;
  taskType: string;       // DESIGN | REVIEW | IMPLEMENT | IMPACT | REPROCESS
  taskStatus: string;     // NONE | RUNNING | SUCCESS | AUTO_FIXED | NEEDS_CHECK | WARNING | FAILED
  spec: string | null;    // AI 호출 시점 spec 스냅샷
  comment: string | null; // GS 추가 요청 (재처리용, NULL이면 최초 요청)
  feedback: string | null; // AI 결과 (마크다운 통째로)
  requestedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  function?: FunctionItem;
  files?: FuncFile[];
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
