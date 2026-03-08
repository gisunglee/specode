# SPECODE — Product Requirements Document (PRD)

> 버전: 1.0 | 작성일: 2026-03-07
> 이 문서만으로 동일한 시스템을 재구현할 수 있도록 상세하게 기술합니다.
> **제외 기능**: Excel Import/Export 기능은 이 PRD에 포함하지 않습니다.

---

## 목차

1. [제품 개요](#1-제품-개요)
2. [기술 스택](#2-기술-스택)
3. [데이터 모델](#3-데이터-모델)
4. [비즈니스 로직 & 상태 머신](#4-비즈니스-로직--상태-머신)
5. [API 명세](#5-api-명세)
6. [화면별 기능 명세](#6-화면별-기능-명세)
7. [공통 컴포넌트](#7-공통-컴포넌트)
8. [AI 연동 명세](#8-ai-연동-명세)
9. [레이아웃 & 내비게이션](#9-레이아웃--내비게이션)
10. [디자인 시스템](#10-디자인-시스템)
11. [환경변수 & 배포](#11-환경변수--배포)

---

## 1. 제품 개요

### 1.1 제품 설명

SPECODE(AI Dev Hub)는 SI(시스템 통합) 개발 프로젝트의 요구사항 분석부터 코드 구현까지, **GS(Business Analyst)**와 **AI**가 협력하는 개발 자동화 관리 시스템입니다.

### 1.2 핵심 워크플로우

```
1. GS가 요구사항 등록 (고객 RFQ + GS 분석 내용)
2. 요구사항 하위에 화면 등록 (화면 유형, 레이아웃 설계)
3. 화면 하위에 기능 등록 (개별 기능 명세 작성)
4. GS가 기능에 AI 검토 요청 → AI가 설계 검토 수행
5. GS가 확인 후 AI 상세설계 요청 → AI가 상세설계 생성
6. GS가 컨펌 후 AI 코드 구현 요청 → AI가 코드 생성
7. 표준가이드 작성 → AI가 표준 준수 여부 검토
```

### 1.3 사용자 역할

| 역할 | 설명 |
|------|------|
| GS | 비즈니스 분석가, 요구사항/화면/기능 등록 및 관리 (주 사용자) |
| AI | 외부 AI 서비스, X-API-Key로 인증하여 폴링 방식으로 작업 수행 |

---

## 2. 기술 스택

| 분류 | 기술 | 버전 |
|------|------|------|
| Framework | Next.js (App Router) | 16.x |
| UI Library | React | 19.x |
| Language | TypeScript (strict mode) | 5.x |
| Styling | Tailwind CSS v4 (`@import "tailwindcss"` + `@theme {}`) | 4.x |
| ORM | Prisma | 6.x |
| Database | PostgreSQL (prod) / SQLite (dev) | - |
| State / Fetch | TanStack Query (React Query) | 5.x |
| Table | TanStack Table | 8.x |
| UI Primitives | Radix UI (Dialog, Select, Tabs, Tooltip, Accordion) | - |
| Styling Utility | class-variance-authority (CVA) | - |
| Rich Text Editor | Tiptap (underline, starter-kit) | 3.x |
| Markdown Render | react-markdown + remark-gfm | 10.x |
| Animation | Framer Motion | - |
| Icons | lucide-react | - |
| Form | react-hook-form | - |
| Validation | Zod | 4.x |
| ID Generation | 커스텀 Sequence (DB 기반) | - |

### 2.1 Next.js 구성 주의사항

- 모든 페이지: `"use client"` (서버 컴포넌트 미사용)
- Route Params: `await params` 필수 (Promise 기반)
- `useSearchParams()`: 반드시 `<Suspense>` 내부에 위치

### 2.2 프로젝트 구조

```
src/
├── app/
│   ├── layout.tsx          # Root: <Providers> + <AppShell>
│   ├── globals.css         # Tailwind v4 @theme, oklch 색상
│   ├── page.tsx            # 대시보드
│   ├── requirements/
│   │   └── page.tsx
│   ├── screens/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── functions/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── ai-tasks/
│   │   └── page.tsx
│   ├── tree/
│   │   └── page.tsx
│   ├── standard-guides/
│   │   └── page.tsx
│   └── api/
│       ├── functions/
│       │   ├── route.ts            # GET, POST
│       │   └── [id]/route.ts       # GET, PUT, PATCH, DELETE
│       ├── screens/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── requirements/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── ai-tasks/
│       │   └── route.ts
│       ├── ai/
│       │   ├── _lib/
│       │   │   ├── auth.ts          # X-API-Key 검증
│       │   │   └── onTaskComplete.ts # AI 완료 처리 로직
│       │   └── tasks/
│       │       ├── route.ts         # GET (AI 폴링)
│       │       └── [id]/
│       │           ├── start/route.ts    # POST
│       │           └── complete/route.ts # POST
│       ├── dashboard/route.ts
│       ├── tree/route.ts
│       ├── standard-guides/
│       │   ├── route.ts
│       │   └── [id]/
│       │       ├── route.ts
│       │       └── inspect/route.ts
│       └── attachments/
│           ├── route.ts
│           └── [id]/route.ts
├── components/
│   ├── Providers.tsx           # TanStack Query QueryClientProvider
│   ├── layout/
│   │   ├── AppShell.tsx        # Sidebar 토글 + 반응형 레이아웃
│   │   ├── Sidebar.tsx         # 좌측 내비게이션
│   │   └── Header.tsx          # 상단 헤더
│   ├── common/
│   │   ├── DataGrid.tsx        # TanStack Table 래퍼
│   │   ├── StatusBadge.tsx     # 색상 뱃지
│   │   ├── MarkdownEditor.tsx  # 마크다운 editor/preview
│   │   ├── RichTextEditor.tsx  # Tiptap WYSIWYG
│   │   ├── ConfirmDialog.tsx   # 확인 모달
│   │   └── TagInput.tsx        # 다중 입력
│   ├── functions/
│   │   ├── BasicInfoTab.tsx
│   │   ├── DesignInfoTab.tsx
│   │   ├── AiFeedbackTab.tsx
│   │   └── HistoryTab.tsx
│   ├── screens/
│   │   └── LayoutEditor.tsx
│   └── ui/                     # shadcn/ui 스타일 기본 컴포넌트
│       ├── button.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── select.tsx
│       ├── tabs.tsx
│       ├── badge.tsx
│       └── textarea.tsx
├── lib/
│   ├── prisma.ts               # Prisma 싱글톤
│   ├── sequence.ts             # 자동 ID 생성
│   ├── validators.ts           # Zod 스키마
│   ├── constants.ts            # 상수 (상태, 레이블, 색상)
│   └── utils.ts                # apiSuccess, apiError, cn(), formatDateTime
└── types/
    └── index.ts                # 전체 TypeScript 인터페이스
```

---

## 3. 데이터 모델

### 3.1 Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// 자동 ID 시퀀스 테이블
model Sequence {
  prefix    String @id
  nextValue Int    @default(1)

  @@map("tb_sequence")
}

// 요구사항
model Requirement {
  requirementId Int      @id @default(autoincrement())
  systemId      String   @unique          // RQ-00001 형식
  name          String
  content       String?  @db.Text         // RFQ 원문 (HTML/Markdown)
  description   String?  @db.Text         // GS 분석 내용
  priority      String?                   // HIGH, MEDIUM, LOW
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  screens Screen[]

  @@map("tb_requirement")
}

// 화면
model Screen {
  screenId      Int      @id @default(autoincrement())
  systemId      String   @unique          // SID-00001 형식
  displayCode   String?                   // 표시용 코드 (BGT-001)
  name          String
  screenType    String?                   // LIST, DETAIL, POPUP, TAB
  requirementId Int
  spec          String?  @db.Text         // 화면 설명 (Markdown)
  layoutData    String?  @db.Text         // JSON: LayoutRow[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  requirement Requirement @relation(fields: [requirementId], references: [requirementId])
  functions   Function[]

  @@map("tb_screen")
}

// 기능
model Function {
  id            Int      @id @default(autoincrement())
  systemId      String   @unique          // FID-00001 형식
  displayCode   String?                   // 표시용 코드 (BGT-001-01)
  name          String
  screenId      Int
  spec          String?  @db.Text         // 기능 설명 (Markdown)
  dataFlow      String?                   // 데이터 흐름 (예: READ: TB_A / WRITE: TB_B)
  changeReason  String?  @db.Text         // 변경 사유
  status        String   @default("DRAFT")
  priority      String   @default("MEDIUM") // HIGH, MEDIUM, LOW

  // AI 결과 캐시 필드
  aiSummary            String? @db.Text   // AI 요약
  aiReviewResult       String? @db.Text   // AI 설계 검토 결과 (Markdown)
  aiConflictFunctions  String? @db.Text   // 충돌 기능 목록 (Markdown)
  aiImpactAnalysis     String? @db.Text   // 영향도 분석 (Markdown)
  aiDesignContent      String? @db.Text   // AI 상세설계 (Markdown, 사용자 수정 가능)
  aiImplFeedback       String? @db.Text   // AI 구현 피드백 (Markdown)
  aiImplIssues         String? @db.Text   // 이슈 파일 목록 (줄바꿈 구분)
  gitlabPrUrl          String?            // GitLab MR URL
  relatedFiles         String? @db.Text   // 관련 파일 목록 (줄바꿈 구분)
  refContent           String? @db.Text   // 참조 프로그램 내용 (Markdown)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  screen      Screen       @relation(fields: [screenId], references: [screenId])
  aiTasks     AiTask[]     // tasks 관계명으로 사용
  attachments Attachment[]

  @@map("tb_function")
}

// AI 작업 (폴리모픽: tb_function 또는 tb_standard_guide)
model AiTask {
  aiTaskId     Int      @id @default(autoincrement())
  systemId     String   @unique       // ATK-00001 형식
  refTableName String                 // "tb_function" | "tb_standard_guide"
  refPkId      Int                    // 대상 엔티티의 PK
  taskType     String                 // DESIGN, REVIEW, IMPLEMENT, IMPACT, REPROCESS, INSPECT
  taskStatus   String   @default("NONE")
  spec         String?  @db.Text      // 요청 시점의 기능 설명 스냅샷
  comment      String?  @db.Text      // GS 추가 요청 코멘트
  feedback     String?  @db.Text      // AI 결과 (Markdown)
  resultFiles  String?  @db.Text      // 처리된 파일 목록 (줄바꿈 구분)
  requestedAt  DateTime @default(now())
  startedAt    DateTime?
  completedAt  DateTime?

  function Function? @relation(fields: [refPkId], references: [id], map: "fk_aitask_function")

  @@index([refTableName, refPkId])
  @@index([taskStatus])
  @@map("tb_ai_task")
}

// 첨부파일 (폴리모픽)
model Attachment {
  attachmentId Int      @id @default(autoincrement())
  refTableName String                // "tb_function" 등
  refPkId      Int
  logicalName  String               // 표시 파일명
  physicalName String               // 저장 파일명
  filePath     String               // 파일 경로
  fileSize     Int
  fileExt      String?
  description  String?
  delYn        String   @default("N") // 논리 삭제
  createdBy    String   @default("GS")
  createdAt    DateTime @default(now())

  function Function? @relation(fields: [refPkId], references: [id], map: "fk_attachment_function")

  @@index([refTableName, refPkId])
  @@map("tb_attachment")
}

// 표준 가이드
model StandardGuide {
  guideId           Int      @id @default(autoincrement())
  systemId          String   @unique      // GD-0001 형식 (max 10자)
  category          String               // UI, DATA, AUTH, API, COMMON, SECURITY, FILE, ERROR, BATCH, REPORT
  title             String
  content           String?  @db.Text    // 가이드 내용 (Markdown)
  relatedFiles      String?  @db.Text    // 관련 파일 (줄바꿈 구분)
  isActive          String   @default("Y") // Y | N
  status            String   @default("")  // "" | REVIEW_REQ | REVIEW_DONE
  aiFeedbackContent String?  @db.Text    // AI 검토 피드백 (Markdown)
  aiFeedbackAt      DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@map("tb_standard_guide")
}
```

### 3.2 자동 ID 생성 규칙

```typescript
// lib/sequence.ts
async function generateSystemId(prefix: string): Promise<string>

// 프리픽스별 형식
// RQ  → "RQ-00001" (5자리)
// SID → "SID-00001" (5자리)
// FID → "FID-00001" (5자리)
// ATK → "ATK-00001" (5자리)
// GD  → "GD-0001"  (4자리, max 10자)
```

구현: `tb_sequence` 테이블의 `nextValue`를 atomic increment하여 중복 없이 생성

### 3.3 TypeScript 타입 정의

```typescript
// types/index.ts

// 기능 상태
export type FuncStatus =
  | "DRAFT" | "REVIEW_REQ" | "AI_REVIEWING" | "REVIEW_DONE"
  | "DESIGN_REQ" | "DESIGN_DONE" | "CONFIRM_Y"
  | "IMPL_REQ" | "AI_IMPLEMENTING" | "IMPL_DONE";

// AI 작업 상태
export type AiTaskStatus =
  | "NONE" | "RUNNING" | "SUCCESS" | "AUTO_FIXED"
  | "NEEDS_CHECK" | "WARNING" | "FAILED" | "CANCELLED";

// AI 작업 유형
export type AiTaskType =
  | "DESIGN" | "REVIEW" | "IMPLEMENT" | "IMPACT" | "REPROCESS" | "INSPECT";

// 화면 유형
export type ScreenType = "LIST" | "DETAIL" | "POPUP" | "TAB";

// 우선순위
export type Priority = "HIGH" | "MEDIUM" | "LOW";

// 레이아웃 구조
export interface LayoutRow {
  id: string;
  columns: LayoutColumn[];
}

export interface LayoutColumn {
  id: string;
  widthRatio: number;    // 1~100
  label: string;
  functionId?: number;
}

// API 응답 래퍼
export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface ApiResponseList<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  success: false;
  error: string;   // 에러 코드
  message: string; // 사람이 읽을 수 있는 메시지
}
```

---

## 4. 비즈니스 로직 & 상태 머신

### 4.1 상수 정의 (lib/constants.ts)

```typescript
// 기능 상태
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

// 사용자가 직접 선택 가능한 상태 (AI가 자동으로 설정하는 AI_REVIEWING, AI_IMPLEMENTING 제외)
export const USER_SELECTABLE_STATUSES: FuncStatus[] = [
  "DRAFT", "REVIEW_REQ", "REVIEW_DONE", "DESIGN_REQ",
  "DESIGN_DONE", "CONFIRM_Y", "IMPL_REQ", "IMPL_DONE",
];

// AI 작업 자동 생성을 트리거하는 상태
export const AI_REQUEST_STATUSES: FuncStatus[] = [
  "REVIEW_REQ", "DESIGN_REQ", "IMPL_REQ",
];

// 상태 변경 시 매핑되는 AI 작업 유형
export const STATUS_TO_TASK_TYPE: Partial<Record<FuncStatus, AiTaskType>> = {
  REVIEW_REQ: "REVIEW",
  DESIGN_REQ: "DESIGN",
  IMPL_REQ: "IMPLEMENT",
};

// AI 요청 시 중간 상태 (사용자가 선택하면 시스템이 이 상태로 변경)
export const AI_INTERIM_STATUS: Partial<Record<FuncStatus, FuncStatus>> = {
  REVIEW_REQ: "AI_REVIEWING",
  DESIGN_REQ: "AI_REVIEWING",
  IMPL_REQ: "AI_IMPLEMENTING",
};

// 상태 레이블 (한국어)
export const FUNC_STATUS_LABEL: Record<FuncStatus, string> = {
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

// 상태 색상 (Tailwind 클래스)
export const FUNC_STATUS_COLOR: Record<FuncStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  REVIEW_REQ: "bg-blue-100 text-blue-700",
  AI_REVIEWING: "bg-purple-100 text-purple-700",
  REVIEW_DONE: "bg-amber-100 text-amber-700",
  DESIGN_REQ: "bg-teal-100 text-teal-700",
  DESIGN_DONE: "bg-teal-100 text-teal-700",
  CONFIRM_Y: "bg-green-100 text-green-700",
  IMPL_REQ: "bg-orange-100 text-orange-700",
  AI_IMPLEMENTING: "bg-purple-100 text-purple-700",
  IMPL_DONE: "bg-emerald-100 text-emerald-700",
};

// AI 작업 상태 레이블 + 색상
export const AI_TASK_STATUS_LABEL: Record<AiTaskStatus, string> = {
  NONE: "⏳ 처리 대기",
  RUNNING: "🔄 진행중",
  SUCCESS: "✅ 문제없음",
  AUTO_FIXED: "🔧 자동 수정",
  NEEDS_CHECK: "⚠️ 확인 필요",
  WARNING: "⚠️ 주의사항 있음",
  FAILED: "❌ 실패",
  CANCELLED: "🚫 취소됨",
};

// 표준가이드 카테고리
export const GUIDE_CATEGORIES = [
  "UI", "DATA", "AUTH", "API", "COMMON",
  "SECURITY", "FILE", "ERROR", "BATCH", "REPORT",
] as const;

// 네비게이션 항목
export const NAV_ITEMS = [
  { href: "/", label: "대시보드", icon: "LayoutDashboard" },
  { href: "/requirements", label: "요구사항", icon: "ClipboardList" },
  { href: "/standard-guides", label: "표준가이드", icon: "BookOpen" },
  { href: "/screens", label: "화면", icon: "Monitor" },
  { href: "/functions", label: "기능", icon: "Cog" },
  { href: "/tree", label: "트리 뷰", icon: "GitBranch" },
  { href: "/ai-tasks", label: "AI 현황", icon: "Bot" },
];
```

### 4.2 기능 상태 변경 로직 (PATCH /api/functions/[id])

```
상태 변경 요청 수신
    ↓
유효한 상태값인지 검증
    ↓
현재 기능 조회
    ↓
[AI 요청 상태인 경우: REVIEW_REQ, DESIGN_REQ, IMPL_REQ]
    → AiTask 생성:
       - systemId: 시퀀스 생성 (ATK-xxxxx)
       - refTableName: "tb_function"
       - refPkId: 기능 ID
       - taskType: STATUS_TO_TASK_TYPE[status] (REVIEW/DESIGN/IMPLEMENT)
       - taskStatus: "NONE"
       - spec: 현재 기능.spec 스냅샷
       - comment: 요청 body의 comment 필드
    → 기능 상태를 AI_INTERIM_STATUS로 변경 (AI_REVIEWING 또는 AI_IMPLEMENTING)

[일반 상태 변경인 경우]
    → 기능 status를 요청한 status로 변경

응답 반환
```

### 4.3 AI 완료 처리 로직 (onTaskComplete.ts)

```
AI가 POST /api/ai/tasks/[id]/complete 호출
    ↓
X-API-Key 인증 검증
    ↓
AiTask 조회
    ↓
AiTask 업데이트:
- taskStatus = 요청의 taskStatus
- feedback = 요청의 feedback
- resultFiles = 요청의 resultFiles
- completedAt = 현재 시간
    ↓
[taskStatus가 SUCCESS 또는 AUTO_FIXED인 경우에만 아래 수행]
    ↓
[refTableName === "tb_function"]
    ↓ taskType별 처리:

    REVIEW:
    - Function.aiReviewResult = feedback
    - Function.status = "REVIEW_DONE"

    DESIGN:
    - Function.aiDesignContent = feedback
    - Function.status = "DESIGN_DONE"

    IMPLEMENT:
    - Function.aiImplFeedback = feedback
    - Function.status = "IMPL_DONE"

    IMPACT:
    - Function.aiImpactAnalysis = feedback
    - (status 변경 없음)

[refTableName === "tb_standard_guide"]
    ↓ taskType별 처리:

    INSPECT:
    - StandardGuide.aiFeedbackContent = feedback
    - StandardGuide.aiFeedbackAt = 현재 시간
    - StandardGuide.status = "REVIEW_DONE"
```

---

## 5. API 명세

### 공통 응답 형식

```typescript
// 성공
{ "success": true, "data": <T> }

// 목록 성공
{ "success": true, "data": [...], "pagination": { "page", "pageSize", "total", "totalPages" } }

// 오류
{ "success": false, "error": "ERROR_CODE", "message": "설명" }
```

**공통 오류 코드**: `VALIDATION_ERROR`, `NOT_FOUND`, `INVALID_STATUS`, `CANNOT_DELETE`, `SERVER_ERROR`, `UNAUTHORIZED`

---

### 5.1 기능 API

#### GET /api/functions
쿼리: `page`(기본 1), `pageSize`(기본 20), `status`, `screenId`, `search`

응답 데이터:
```typescript
{
  functionId: number,
  systemId: string,        // FID-00001
  displayCode: string | null,
  name: string,
  status: FuncStatus,
  priority: Priority,
  updatedAt: string,
  screen: {
    screenId: number,
    systemId: string,
    name: string,
    requirement: { name: string }
  },
  latestTask: {            // 가장 최근 AiTask (없으면 null)
    taskStatus: AiTaskStatus,
    taskType: AiTaskType,
    completedAt: string | null
  } | null
}
```

#### POST /api/functions
요청 바디:
```typescript
{
  name: string,            // 필수
  displayCode?: string,
  screenId: number,        // 필수
  priority?: Priority,     // 기본: MEDIUM
  spec?: string
}
```

응답: 생성된 기능 (screen 관계 포함)

#### GET /api/functions/[id]
응답: 기능 전체 필드 + `attachments[]` + `tasks[]` (AiTask 배열, requestedAt 역순)

#### PUT /api/functions/[id]
요청 바디 (모두 선택):
```typescript
{
  name?: string,
  displayCode?: string,
  screenId?: number,
  spec?: string,
  dataFlow?: string,
  changeReason?: string,
  priority?: Priority,
  aiDesignContent?: string,  // 사용자가 AI 설계 내용 직접 수정 가능
  relatedFiles?: string,
  refContent?: string
}
```

#### PATCH /api/functions/[id]
요청 바디:
```typescript
{ status: FuncStatus, comment?: string }
```

부작용: AI 요청 상태인 경우 AiTask 자동 생성 (4.2 참조)

#### DELETE /api/functions/[id]
제약: `status === "IMPL_DONE"`인 경우 삭제 불가 (400 CANNOT_DELETE)

---

### 5.2 화면 API

#### GET /api/screens
쿼리: `page`, `pageSize`, `search`, `requirementId`

응답 데이터: screenId, systemId, displayCode, name, screenType, requirementId, createdAt, updatedAt, requirement(name), _count(functions)

#### POST /api/screens
```typescript
{
  name: string,           // 필수
  displayCode?: string,
  screenType: ScreenType, // 필수
  requirementId: number,  // 필수
  spec?: string,
  layoutData?: string     // JSON string
}
```

#### GET /api/screens/[id]
응답: 화면 전체 필드 + functions(id, systemId, displayCode, name, status)

#### PUT /api/screens/[id]
요청: POST와 동일한 구조

#### DELETE /api/screens/[id]

---

### 5.3 요구사항 API

#### GET /api/requirements
쿼리: `page`, `pageSize`, `search`

응답 데이터: 요구사항 전체 필드 + _count(screens, functions through screens)

#### POST /api/requirements
```typescript
{ name: string, priority?: Priority, content?: string, description?: string }
```

#### PUT /api/requirements/[id]
요청: POST와 동일

#### DELETE /api/requirements/[id]

---

### 5.4 대시보드 API

#### GET /api/dashboard
응답:
```typescript
{
  summary: {
    totalFunctions: number,
    byStatus: Record<FuncStatus, number>,
    pendingConfirm: number,   // REVIEW_DONE 수
    aiRunning: number         // AI_REVIEWING + AI_IMPLEMENTING 합계
  },
  recentActivity: Array<{
    aiTaskId: number,
    refTableName: string,
    refPkId: number,
    taskType: AiTaskType,
    taskStatus: AiTaskStatus,
    requestedAt: string,
    completedAt: string | null,
    feedback: string | null,
    function: { systemId: string, name: string } | null
  }>
}
```

---

### 5.5 AI 작업 API (관리용)

#### GET /api/ai-tasks
쿼리: `page`(기본 1), `pageSize`(기본 20), `taskStatus`, `taskType`

응답 데이터: AiTask 전체 필드 + 대상 엔티티 정보 (refTableName으로 분기하여 조인)

---

### 5.6 트리 API

#### GET /api/tree
응답:
```typescript
Array<{
  id: number,
  type: "requirement",
  systemId: string,
  name: string,
  displayCode: null,
  children: Array<{
    id: number,
    type: "screen",
    systemId: string,
    name: string,
    displayCode: string | null,
    screenType: ScreenType,
    children: Array<{
      id: number,
      type: "function",
      systemId: string,
      name: string,
      displayCode: string | null,
      status: FuncStatus
    }>
  }>
}>
```

---

### 5.7 표준가이드 API

#### GET /api/standard-guides
쿼리: `page`(기본 1), `pageSize`(기본 50), `category`, `search`

응답 데이터: 가이드 전체 필드 + latestTask(AiTask, 최근 1건)

#### POST /api/standard-guides
```typescript
{
  category: typeof GUIDE_CATEGORIES[number],  // 필수
  title: string,                              // 필수
  content?: string,
  relatedFiles?: string,
  isActive?: "Y" | "N",
  status?: "" | "REVIEW_REQ" | "REVIEW_DONE",
  aiFeedbackContent?: string
}
```

#### GET /api/standard-guides/[id]
응답: 가이드 전체 필드 + aiTasks(AiTask 배열)

#### PUT /api/standard-guides/[id]
요청: POST와 동일

#### PATCH /api/standard-guides/[id]
```typescript
{ isActive: "Y" | "N" }
```

#### POST /api/standard-guides/[id]/inspect
부작용: AiTask 생성 (taskType: "INSPECT", refTableName: "tb_standard_guide", refPkId: guideId), 가이드 status → "REVIEW_REQ"

제약: 이미 status="REVIEW_REQ"인 경우 409 오류

#### DELETE /api/standard-guides/[id]

---

### 5.8 AI 연동 API (AI 서비스 전용)

**모든 엔드포인트**: `X-API-Key: {AI_API_KEY}` 헤더 필수 (없으면 401 반환)

#### GET /api/ai/tasks
쿼리: `limit`(기본 10, 최대 50), `taskType`(선택)

동작: taskStatus="NONE"인 AiTask 반환 (spec, comment 포함)

응답:
```typescript
Array<{
  aiTaskId: number,
  systemId: string,
  refTableName: string,
  refPkId: number,
  taskType: AiTaskType,
  taskStatus: "NONE",
  spec: string | null,
  comment: string | null,
  requestedAt: string
}>
```

#### POST /api/ai/tasks/[id]/start
동작: AiTask.taskStatus → "RUNNING", AiTask.startedAt = 현재시간

응답: 업데이트된 AiTask

#### POST /api/ai/tasks/[id]/complete
요청:
```typescript
{
  taskStatus: AiTaskStatus,  // SUCCESS, AUTO_FIXED, NEEDS_CHECK, WARNING, FAILED
  feedback?: string,
  resultFiles?: string
}
```

동작: onTaskComplete 로직 실행 (4.3 참조)

---

### 5.9 첨부파일 API

#### GET /api/attachments
쿼리: `refTableName`, `refPkId`

응답: delYn="N"인 첨부파일 목록

#### POST /api/attachments
`multipart/form-data`:
- `file`: 파일 바이너리
- `refTableName`: 대상 테이블명
- `refPkId`: 대상 PK
- `description`: 파일 설명 (선택)

저장 경로: `/uploads/{refTableName}/{refPkId}/{uniqueFilename}`

#### DELETE /api/attachments/[id]
동작: 논리 삭제 (delYn = "Y")

---

## 6. 화면별 기능 명세

### 6.1 대시보드 (/)

**컴포넌트**: `DashboardPage` ("use client")

**데이터 패칭**:
```typescript
const { data } = useQuery({
  queryKey: ["dashboard"],
  queryFn: () => fetch("/api/dashboard").then(r => r.json()).then(r => r.data),
  refetchInterval: 30000,  // 30초 자동 새로고침
});
```

**레이아웃 섹션**:

1. **상태 카드 행** (grid-cols-2 md:grid-cols-3 lg:grid-cols-5):
   - 표시 상태: DRAFT, REVIEW_REQ, REVIEW_DONE, AI_IMPLEMENTING, IMPL_DONE
   - 각 카드: 아이콘, 상태명(한국어), 건수
   - 클릭 → `router.push("/functions?status={status}")`

2. **하이라이트 카드 행** (grid-cols-2):
   - 컨펌 대기: `summary.pendingConfirm`건, 아이콘: CheckCircle2
   - AI 작업 중: `summary.aiRunning`건, 아이콘: Bot (pulse-glow 애니메이션)

3. **최근 AI 활동** (grid-cols-1 md:grid-cols-2):
   - 헤더: "최근 AI 활동" + Activity 아이콘
   - 빈 상태: "최근 AI 활동이 없습니다"
   - 각 카드:
     - 작업유형 뱃지(TASK_TYPE_LABEL) + 상태 텍스트
     - 기능 ID + 기능명 (없으면 refTableName)
     - 피드백 미리보기 (80자 truncate, 마크다운 제거 후)
     - 하단: 요청시간 / 완료시간
   - 클릭 → `router.push("/functions/{refPkId}")`

---

### 6.2 요구사항 목록 (/requirements)

**컴포넌트**: `RequirementsPage` ("use client")

**상태**:
- `page`, `search` — 필터링
- `dialogOpen`, `editTarget` — 등록/수정 다이얼로그
- `deleteTarget`, `deleteDialogOpen` — 삭제 확인

**DataGrid 컬럼**:
| 컬럼 | 필드 | 정렬 |
|------|------|------|
| ID | systemId | O |
| 이름 | name | O |
| 우선순위 | priority | - |
| 화면 수 | _count.screens | - |
| 기능 수 | - | - |
| 수정일 | updatedAt | O |
| 동작 | - | - |

**다이얼로그 필드**:
- 이름 (text, 필수)
- 우선순위 (select: HIGH/MEDIUM/LOW)
- RFQ 원문 (MarkdownEditor)
- GS 분석 내용 (MarkdownEditor)

---

### 6.3 화면 목록 (/screens)

**컴포넌트**: `ScreensPage` ("use client")

**DataGrid 컬럼**:
| 컬럼 | 필드 |
|------|------|
| ID | systemId |
| 표시코드 | displayCode |
| 화면명 | name |
| 유형 | screenType (LIST/DETAIL/POPUP/TAB) |
| 기능 수 | _count.functions |
| 요구사항 | requirement.name |
| 수정일 | updatedAt |
| 동작 | 기능목록 이동(📋) / 수정(✏️) / 삭제(🗑️) |

**동작 버튼** (행 클릭과 독립적):
- 📋: `router.push("/functions?screenId={id}")`
- ✏️: 수정 다이얼로그 열기
- 🗑️: 삭제 확인 다이얼로그

**화면 상세 (/screens/[id])**:

탭 구성:
1. **기본정보**: name, displayCode, screenType, requirement (수정 가능)
2. **설명**: spec (MarkdownEditor)
3. **레이아웃**: LayoutEditor 컴포넌트
4. **첨부파일**: AttachmentManager 컴포넌트

---

### 6.4 기능 목록 (/functions)

**컴포넌트**: `FunctionsPage` ("use client")

**URL 쿼리 파라미터**: `?status=`, `?screenId=` (초기 필터로 사용)

**상태 탭** (sticky, top-14):
- "전체" + FUNC_STATUS_LABEL 전체
- 클릭 → `statusFilter` 상태 변경, URL 업데이트

**배치 작업 버튼** (rows 선택 시 표시):
- "일괄 검토요청": 선택 행 전체에 PATCH status=REVIEW_REQ
- "일괄 컨펌": 선택 행 전체에 PATCH status=CONFIRM_Y

**DataGrid 컬럼**:
| 컬럼 | 필드 |
|------|------|
| 체크박스 | 행 선택 |
| ID | systemId |
| 표시코드 | displayCode |
| 기능명 | name |
| 상태 | status (StatusBadge) |
| 우선순위 | priority |
| 화면 | screen.name |
| 최근 AI결과 | latestTask.taskStatus (AiTask StatusBadge) |
| 수정일 | updatedAt |

**기능 등록 다이얼로그**:
- 기능명 (필수)
- 표시코드 (선택)
- 소속 화면 (필수, select)
- 우선순위 (select)
- 저장 후 → `router.push("/functions/{id}")`

---

### 6.5 기능 상세 (/functions/[id])

**컴포넌트**: `FunctionDetailPage` ("use client")

**데이터 패칭**:
```typescript
const { data: func, refetch } = useQuery({
  queryKey: ["function", id],
  queryFn: () => fetch(`/api/functions/${id}`).then(r => r.json()).then(r => r.data),
  gcTime: 0,    // 목록으로 돌아갈 때 재패칭
});
```

**레이아웃 구조**:

```
1. Full Header (일반 flow, 스크롤 시 사라짐)
   - ← 뒤로 버튼
   - FID-00001 (DISPLAY-CODE) — 기능명
   - 소속 화면: SID-xxxx 화면명 (링크)
   - 오른쪽: 상태 드롭다운

2. AI 요약 (있을 때만)
   - aiSummary 내용 표시

3. Sticky Nav (position: sticky, top: 56px)
   - 스크롤 시 표시: ← + 기능ID + 기능명 + 상태뱃지
   - 탭: [기본정보] [설계] [AI피드백] [이력]
   - 오른쪽: 상태 드롭다운 (Full Header와 동일)

4. 기본정보 섹션 (id="basic-info")
5. 설계 섹션 (id="design")
6. AI 피드백 섹션 (id="ai-feedback")
7. 이력 섹션 (id="history")
```

**스크롤 감지 (IntersectionObserver)**:
- Full Header 요소를 감시
- 뷰포트에서 사라지면 Sticky Nav의 compact 헤더 표시

**탭 클릭**:
- `document.getElementById(sectionId).scrollIntoView({ behavior: "smooth" })`

**상태 드롭다운 동작**:
1. AI 작업 중 (AI_REVIEWING/AI_IMPLEMENTING): 드롭다운 비활성, "처리중..." 표시
2. 일반 상태: USER_SELECTABLE_STATUSES에서 현재 상태 제외 후 표시
3. 선택 시:
   - AI 요청 상태(REVIEW_REQ/DESIGN_REQ/IMPL_REQ): 확인 다이얼로그 표시
     - 다이얼로그에 GS 코멘트 입력 필드 (MarkdownEditor)
     - "확인 및 요청" 클릭 → PATCH
   - 일반 상태: 즉시 PATCH
4. 성공 시: "저장됨 ✓" 2초 표시 후 사라짐

**기본정보 탭 필드**:
- 소속 화면 (읽기, 링크)
- 현재 상태 (읽기)
- 우선순위 (편집, select)
- 표시코드 (편집, text)
- 기능명 (편집, text)
- 변경 사유 (기능명 변경 시 표시되는 선택 입력)
- [저장] 버튼 → PUT

**설계 탭 필드** (2열 레이아웃):
- 왼쪽 (3/5 너비):
  - 기능 설명 (MarkdownEditor, spec)
  - AI 상세설계 (MarkdownEditor, aiDesignContent, 사용자 직접 수정 가능)
- 오른쪽 (2/5 너비):
  - 참조 프로그램 내용 (MarkdownEditor, refContent)
  - 데이터 흐름 (text input, dataFlow)
  - 관련 파일 (textarea, relatedFiles, 줄바꿈 구분)
  - 첨부파일 (AttachmentManager)
  - GS 코멘트 (MarkdownEditor, 별도 state, AI 요청 다이얼로그에서 사용)
- [저장] 버튼 → PUT

**AI 피드백 탭** (읽기 전용, Markdown 렌더링):
- AI 설계 검토 결과 (aiReviewResult)
- 충돌 기능 목록 (aiConflictFunctions)
- 영향도 분석 (aiImpactAnalysis)
- AI 구현 피드백 (aiImplFeedback)
- 구현 이슈 목록 (aiImplIssues)
- GitLab MR 링크 (gitlabPrUrl, 있으면 표시)
- 비어있는 섹션은 표시하지 않음

---

### 6.6 AI 현황 (/ai-tasks)

**컴포넌트**: `AiTasksPage` ("use client")

**자동 새로고침**: 10초

**상태 탭**: "전체" + AiTaskStatus 전체

**DataGrid 컬럼**:
| 컬럼 | 설명 |
|------|------|
| 작업 ID | systemId |
| 유형 | taskType (TASK_TYPE_LABEL 한국어) |
| 대상 | refTableName + 대상 이름, 클릭 → 상세 이동 |
| 상태 | taskStatus (StatusBadge) |
| 요청 시간 | requestedAt |
| 완료 시간 | completedAt |
| 소요 시간 | completedAt - requestedAt (분) |
| 동작 | taskStatus=NONE일 때만 취소(X) 버튼 표시 |

취소 클릭 → PATCH /api/ai-tasks/[id] `{ taskStatus: "CANCELLED" }`

---

### 6.7 트리 뷰 (/tree)

**컴포넌트**: `TreePage` ("use client")

**상태**: `expandedIds: Set<string>`, `search: string`

**검색 동작**: 이름, systemId, displayCode로 필터링, 매칭되는 노드의 부모도 모두 표시

**"전체 펼치기"**: 모든 노드 ID를 expandedIds에 추가

**"전체 접기"**: expandedIds 초기화

**노드 클릭**:
- requirement → `/requirements` (목록 이동)
- screen → `/screens/{id}`
- function → `/functions/{id}`

**노드 표시 형식**: `[아이콘] {systemId} ({displayCode}) {name} [상태뱃지-function만]`

---

### 6.8 표준가이드 (/standard-guides)

**컴포넌트**: `StandardGuidesPage` ("use client")

**자동 새로고침**: 8초

**카테고리 탭**: "전체" + GUIDE_CATEGORIES 전체 (카테고리별 색상 pill)

**DataGrid 컬럼**:
| 컬럼 | 설명 |
|------|------|
| ID | systemId |
| 카테고리 | category (색상 pill) |
| 제목 | title |
| 내용 미리보기 | content 첫 줄, 80자 truncate |
| AI 검토 | status 클릭 → 이력 다이얼로그 |
| 최근 AI 작업 | latestTask.taskStatus StatusBadge |
| 활성여부 | isActive 토글 버튼 (활성/비활성) |
| 수정일 | updatedAt |
| 동작 | 🔍 AI검토 / ✏️ 수정 / 🗑️ 삭제 |

**AI 검토(🔍) 버튼**:
- `status === "REVIEW_REQ"` → 비활성(이미 대기중)
- 클릭 → POST /api/standard-guides/[id]/inspect

**활성여부 토글**:
- 클릭 → PATCH isActive Y↔N (다이얼로그 없이 즉시)

**등록/수정 다이얼로그** (max-h-[85vh], 스크롤 가능):
좌(6열):
- 카테고리 (select, 필수)
- 제목 (text, 필수)
- 상태 (select: ""/REVIEW_REQ/REVIEW_DONE)
- 활성여부 (select: Y/N)
- 내용 (MarkdownEditor)
- 관련 파일 (textarea)

우(4열):
- AI 피드백 내용 (MarkdownEditor, aiFeedbackContent)
- 마지막 피드백 시간 (있으면 표시)

**AI 이력 다이얼로그**:
- 해당 가이드의 AiTask 목록 (역순)
- 각 항목: 요청시간, 상태뱃지, 작업ID
- Accordion으로 펼치면: 요청 코멘트, AI 피드백(Markdown), 처리 파일 목록, 완료 시간

---

## 7. 공통 컴포넌트

### 7.1 DataGrid

```typescript
interface DataGridProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  rowSelection?: boolean;
  selectedIds?: number[];
  onSelectionChange?: (ids: number[]) => void;
}
```

### 7.2 MarkdownEditor

```typescript
interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  minHeight?: string;  // CSS 값, 기본: "200px"
}
```

에디터/미리보기 탭 전환. 미리보기는 `react-markdown` + `remark-gfm`으로 렌더링.

### 7.3 StatusBadge

```typescript
interface StatusBadgeProps {
  status: FuncStatus | AiTaskStatus;
  type: "function" | "aitask";
  pulse?: boolean;  // AI 처리 중 상태에서 true
}
```

### 7.4 ConfirmDialog

```typescript
interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmLabel?: string;   // 기본: "확인"
  cancelLabel?: string;    // 기본: "취소"
  variant?: "default" | "destructive";
}
```

### 7.5 LayoutEditor

```typescript
interface LayoutEditorProps {
  value: LayoutRow[];
  onChange: (rows: LayoutRow[]) => void;
  functions: { id: number; name: string }[];  // 화면에 속한 기능 목록
}
```

**열 너비 비율 프리셋**: 100, 75, 66, 50, 33, 25 (datalist)

**텍스트 보기 다이얼로그**:
- 모드 전환: "텍스트" (Markdown 테이블) / "JSON" (구조화 JSON)
- 클립보드 복사 버튼

---

## 8. AI 연동 명세

### 8.1 인증

모든 `/api/ai/` 엔드포인트는 `X-API-Key` 헤더 필수.

```typescript
// lib/auth.ts
export function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get("X-API-Key");
  return apiKey === process.env.AI_API_KEY;
}
```

### 8.2 AI 폴링 사이클

```
AI 서비스 → GET /api/ai/tasks?limit=10
          ← [ { taskId, taskType, spec, comment, ... } ]

AI 서비스 → POST /api/ai/tasks/{id}/start
          ← { task } (taskStatus: RUNNING)

AI 처리 중 ...

AI 서비스 → POST /api/ai/tasks/{id}/complete
          → Body: { taskStatus: "SUCCESS", feedback: "# 결과...", resultFiles: "..." }
          ← { task } (업데이트됨)
```

### 8.3 AiTask 작업 유형별 처리

| taskType | 대상 | spec 내용 | feedback 저장 위치 | 완료 후 상태 |
|----------|------|-----------|-------------------|-------------|
| REVIEW | tb_function | 기능 설명(spec) | Function.aiReviewResult | REVIEW_DONE |
| DESIGN | tb_function | 기능 설명(spec) | Function.aiDesignContent | DESIGN_DONE |
| IMPLEMENT | tb_function | 기능 설명(spec) | Function.aiImplFeedback | IMPL_DONE |
| IMPACT | tb_function | 기능 설명(spec) | Function.aiImpactAnalysis | (변경 없음) |
| REPROCESS | tb_function | 기능 설명(spec) | taskType에 따라 분기 | (조건부) |
| INSPECT | tb_standard_guide | 가이드 내용(content) | StandardGuide.aiFeedbackContent | REVIEW_DONE |

---

## 9. 레이아웃 & 내비게이션

### 9.1 AppShell 구조

```typescript
// layout.tsx
<Providers>
  <AppShell>
    {children}
  </AppShell>
</Providers>
```

```
┌────────────────────────────────────────────┐
│  Header (fixed, h-14, top-0, z-40)         │
│  [햄버거 토글] [앱이름] [현재 페이지명]       │
├───────────┬────────────────────────────────┤
│ Sidebar   │ Main                           │
│ (fixed    │ (pt-14, pl-{sidebar-width})    │
│  top-14   │                                │
│  h-screen │ <Suspense fallback>            │
│  z-30)    │   {children}                   │
│           │ </Suspense>                    │
└───────────┴────────────────────────────────┘
```

**사이드바 너비**: 접힘 `w-16` / 펼침 `w-56`
**전환 애니메이션**: `transition-all duration-300 ease-in-out`
**상태 저장**: React state (세션 내 유지)

### 9.2 사이드바 구성

```
┌────────────────┐
│ [Bot] AI Dev Hub│   ← 로고 (접힘 시 아이콘만)
├────────────────┤
│ 📊 대시보드     │
│ 📋 요구사항     │
│ 📖 표준가이드   │
│ 🖥 화면         │
│ ⚙ 기능          │
│ 🌿 트리 뷰      │
│ 🤖 AI 현황      │
├────────────────┤
│ 📄 API 문서     │   ← 새 탭 열기
├────────────────┤
│ [← 접기]       │   ← 토글 버튼
└────────────────┘
```

---

## 10. 디자인 시스템

### 10.1 Tailwind v4 설정

```css
/* globals.css */
@import "tailwindcss";

@theme {
  /* 기본 색상 (oklch) */
  --color-background: oklch(0.98 0.002 260);
  --color-foreground: oklch(0.15 0.015 260);
  --color-primary: oklch(0.45 0.20 255);
  --color-primary-foreground: oklch(0.98 0.002 260);
  --color-muted: oklch(0.93 0.005 260);
  --color-muted-foreground: oklch(0.55 0.01 260);
  --color-border: oklch(0.90 0.005 260);
  --color-card: oklch(1.0 0 0);
  --color-card-foreground: oklch(0.15 0.015 260);

  /* Sidebar */
  --color-sidebar: oklch(0.17 0.02 258);
  --color-sidebar-foreground: oklch(0.88 0.01 260);
  --color-sidebar-accent: oklch(0.25 0.03 258);
  --color-sidebar-accent-foreground: oklch(0.95 0.005 260);

  /* Border radius */
  --radius: 0.5rem;
  --radius-sm: 0.25rem;
  --radius-lg: 0.75rem;
}

/* 커스텀 스크롤바 */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--color-muted-foreground); }

/* AI 실행 중 애니메이션 */
@keyframes pulse-glow {
  0%, 100% { opacity: 1; box-shadow: 0 0 4px oklch(0.55 0.20 285 / 0.4); }
  50%       { opacity: 0.7; box-shadow: 0 0 12px oklch(0.55 0.20 285 / 0.8); }
}
.animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }

/* Markdown 본문 스타일 */
.markdown-body { ... }  /* h1~h6, p, ul, ol, blockquote, table, code 스타일 */
```

### 10.2 기본 UI 컴포넌트 패턴 (shadcn/ui 스타일)

```typescript
// ui/button.tsx — CVA + Radix Slot
const buttonVariants = cva("...", {
  variants: {
    variant: { default: "...", outline: "...", ghost: "...", destructive: "..." },
    size: { sm: "...", default: "...", lg: "...", icon: "..." },
  },
  defaultVariants: { variant: "default", size: "default" },
});
```

### 10.3 상태 색상 규칙

```
기능 상태:
- DRAFT          → slate (회색)
- REVIEW_REQ     → blue (파랑)
- AI_REVIEWING   → purple + pulse (보라, 펄스)
- REVIEW_DONE    → amber (황색)
- DESIGN_REQ     → teal (청록)
- DESIGN_DONE    → teal (청록)
- CONFIRM_Y      → green (녹색)
- IMPL_REQ       → orange (주황)
- AI_IMPLEMENTING → purple + pulse (보라, 펄스)
- IMPL_DONE      → emerald (에메랄드)

AI 작업 상태:
- NONE           → gray
- RUNNING        → blue
- SUCCESS        → green
- AUTO_FIXED     → teal
- NEEDS_CHECK    → yellow
- WARNING        → orange
- FAILED         → red
- CANCELLED      → gray (muted)

우선순위:
- HIGH   → red
- MEDIUM → yellow
- LOW    → gray
```

---

## 11. 환경변수 & 배포

### 11.1 환경변수

```env
# 데이터베이스 (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[project-ref]:[password]@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres

# AI 연동 인증키
AI_API_KEY=your-secret-api-key-here

# 앱 설정
NEXT_PUBLIC_APP_NAME=AI Dev Hub
```

### 11.2 Prisma 설정 주의사항

- `DATABASE_URL`: Supabase Pooler (포트 6543, `?pgbouncer=true`)
- `DIRECT_URL`: 마이그레이션 전용 Direct 연결 (포트 5432)
- `prisma db push` 또는 `prisma migrate dev`로 스키마 반영

### 11.3 Next.js 배포 설정

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: "standalone",  // Docker/서버 배포 최적화
};
```

### 11.4 package.json 스크립트

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:seed": "npx tsx prisma/seed.ts",
    "db:studio": "prisma studio",
    "postinstall": "prisma generate"
  }
}
```

---

## 부록: 주요 용어

| 영문 | 한국어 | 설명 |
|------|--------|------|
| Requirement | 요구사항 | 고객 RFQ 및 GS 분석 내용 |
| Screen | 화면 | UI 화면 단위 |
| Function | 기능 | 화면 안의 개별 기능 |
| AiTask | AI 작업 | AI 처리 요청 단위 |
| GS | GS | 비즈니스 분석가 (주 사용자) |
| Spec | 설명/명세 | 기능 또는 화면의 명세 문서 (Markdown) |
| displayCode | 표시코드 | 사람이 읽기 쉬운 코드 (BGT-001 형식) |
| SystemId | 시스템 ID | 자동 생성되는 고유 ID (FID-00001 형식) |
| aiDesignContent | AI 상세설계 | AI가 생성하고 사용자가 수정 가능한 설계 문서 |
| dataFlow | 데이터 흐름 | READ/WRITE 대상 테이블 명세 |
| changeReason | 변경사유 | 명세 변경 시 기록하는 감사 추적 필드 |
| refContent | 참조프로그램 | AI 코드 생성 시 참조할 기존 프로그램 내용 |
| Polymorphic | 폴리모픽 | refTableName + refPkId 방식으로 여러 엔티티 참조 |
