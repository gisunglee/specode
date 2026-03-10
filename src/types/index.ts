export interface Requirement {
  requirementId: number;
  systemId: string;
  name: string;
  content: string | null;
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
  spec: string | null;
  layoutData: string | null;
  createdAt: string;
  updatedAt: string;
  requirement?: Requirement;
  _count?: {
    areas: number;
  };
  areas?: Area[];
  attachments?: Attachment[];
}

export interface Area {
  areaId: number;
  areaCode: string;
  screenId: number;
  name: string;
  sortOrder: number;
  areaType: string;
  spec: string | null;
  imageUrl: string | null;
  displayFields: string | null;
  status: string;
  reqComment: string | null;
  aiFeedback: string | null;
  aiDetailDesign: string | null;
  useYn: string;
  createdBy: string | null;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string;
  screen?: Screen;
  functions?: FunctionItem[];
  _count?: {
    functions: number;
  };
  tasks?: AiTask[];
}

export interface FunctionItem {
  functionId: number;
  systemId: string;
  displayCode: string | null;
  name: string;
  areaId: number | null;
  spec: string | null;
  dataFlow: string | null;
  changeReason: string | null;
  status: string;
  priority: string;
  aiInspFeedback: string | null;
  aiDesignContent: string | null;
  aiImplFeedback: string | null;
  gitlabPrUrl: string | null;
  relatedFiles: string | null;
  refContent: string | null;
  createdAt: string;
  updatedAt: string;
  area?: Area;
  latestTask?: AiTask | null;
  tasks?: AiTask[];
  attachments?: Attachment[];
}

export interface AiTask {
  aiTaskId: number;
  systemId: string;
  refTableName: string;
  refPkId: number;
  taskType: string;
  taskStatus: string;
  spec: string | null;
  comment: string | null;
  feedback: string | null;
  resultFiles: string | null;
  requestedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  target?: {
    systemId: string;
    name?: string;
    title?: string;
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
  isActive: string;
  status: string;
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
  type: "requirement" | "screen" | "area" | "function";
  displayCode?: string;
  screenType?: string;
  areaType?: string;
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
