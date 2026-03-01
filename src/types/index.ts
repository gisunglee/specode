export interface Requirement {
  requirementId: number;
  systemId: string;
  name: string;
  description: string | null;
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
  createdAt: string;
  updatedAt: string;
  requirement?: Requirement;
  _count?: {
    functions: number;
  };
  functions?: FunctionItem[];
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
  requestType: string;
  priority: string;
  aiSummary: string | null;
  aiReviewResult: string | null;
  aiConflictFunctions: string | null;
  aiImpactAnalysis: string | null;
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
  taskType: string;       // REVIEW | IMPLEMENT | IMPACT | REPROCESS
  taskStatus: string;     // PENDING | RUNNING | DONE | FAILED
  spec: string | null;    // AI 호출 시점 spec 스냅샷
  comment: string | null; // GS 추가 요청 (재처리용, NULL이면 최초 요청)
  feedback: string | null; // AI 결과 (마크다운 통째로)
  requestedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  function?: FunctionItem;
  files?: FuncFile[];
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
