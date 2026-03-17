# SPECODE — 프로젝트 PRD (2026-03-17 기준)

> **이 문서 하나로 프로젝트를 처음 보는 AI가 즉시 개발에 참여할 수 있도록 작성되었습니다.**

---

## 1. 프로젝트 개요

### 1.1 한 줄 정의

**SPECODE(AI Dev Hub)** — AI와 협력하는 SI 개발 자동화 플랫폼.
요구사항 분석 → 화면/기능 설계 → AI 검토/설계/구현 → 컨펌까지 전 과정을 하나의 시스템에서 관리한다.

### 1.2 핵심 사용자

| 역할 | 주요 업무 |
|------|---------|
| PM / 분석가 | RFP 분석, 요구사항 등록, 과업 분류, 기획 보드 작성 |
| UI/UX 설계자 | 화면·영역 설계, Excalidraw 도안, 사용자 스토리 작성 |
| 개발자 | 기능 명세 작성, AI 설계 검토, PR URL 등록 |
| AI 처리 워커 | `/api/ai/tasks` 폴링 → 자동 설계/검토/구현/목업 수행 |

### 1.3 핵심 가치

- **계층적 추적성**: RFP 과업 → 요구사항 → 화면 → 영역 → 기능까지 단방향 연결
- **AI 자동화**: 기능 단위 설계·검토·구현을 AI가 처리, 사람이 컨펌
- **목업 자동 생성**: 화면·영역 단위로 HTML 목업을 AI가 생성, iframe 팝업으로 즉시 미리보기
- **버전 관리**: 모든 마크다운 필드의 변경 이력 저장 + Diff 뷰어
- **확장성**: PRD 생성, DB 스키마 관리, 표준 가이드 검사, MCP 서버까지 포함

---

## 2. 기술 스택

### 2.1 런타임 & 프레임워크

| 항목 | 버전 | 비고 |
|------|------|------|
| Node.js | 20+ | 런타임 |
| Next.js | 16.1.6 | App Router, Route Handlers |
| React | 19.2.4 | "use client" 페이지 |
| TypeScript | 5.9.3 | strict 모드 |

### 2.2 UI & 스타일링

| 항목 | 버전 | 비고 |
|------|------|------|
| Tailwind CSS | 4.2.1 | `@import "tailwindcss"` + `@theme {}` |
| Radix UI | 최신 | Dialog, Select, Tabs, Accordion, Popover, Tooltip, Dropdown, Label, **Checkbox** |
| Class Variance Authority | 0.7.1 | variant 스타일링 |
| Lucide React | 0.575.0 | 아이콘 |
| Sonner | 2.0.7 | 토스트 (`toast.success`, `toast.error`, `toast.info`) |
| Framer Motion | 12.34.3 | 애니메이션 |

### 2.3 데이터 & 상태

| 항목 | 버전 | 비고 |
|------|------|------|
| Prisma ORM | 6.x | PostgreSQL(프로덕션) / SQLite(개발 가능) |
| TanStack React Query | 5.90.21 | `useQuery`, `useMutation` |
| TanStack React Table | 8.21.3 | DataGrid 컴포넌트 기반 |
| React Hook Form | 7.71.2 | 폼 관리 |
| Zod | 4.3.6 | 스키마 검증 (`{ error: "msg" }` - v4 API) |

### 2.4 에디터 & 콘텐츠

| 항목 | 버전 | 비고 |
|------|------|------|
| TipTap | 3.20.0 | WYSIWYG + Markdown 에디터 |
| React Markdown | 10.1.0 | 마크다운 렌더링 |
| Remark GFM | 4.0.1 | GitHub Flavored Markdown |
| Excalidraw | 0.18.0 | 화이트보드/설계 도구 |
| Mermaid | 11.13.0 | 다이어그램 렌더링 |
| React Diff Viewer | 4.2.0 | Diff 비교 |
| Mammoth | 1.12.0 | DOCX 변환 |

### 2.5 중요 Next.js 16 패턴

```typescript
// ✅ Route params는 반드시 Promise로 받아야 함
type RouteParams = { params: Promise<{ id: string }> };
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
}

// ✅ 페이지에서 params 사용
export default function DetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
}

// ✅ useSearchParams()는 Suspense 경계 필요
export default function Page() {
  return <Suspense fallback={<div>로딩 중...</div>}><Content /></Suspense>;
}

// ✅ Tailwind v4 import 방식 (config 파일 없음)
// globals.css
@import "tailwindcss";
@theme { --color-primary: oklch(...); }
```

---

## 3. 프로젝트 구조

```
d:\source\specode\
├── prisma/
│   ├── schema.prisma           # DB 스키마 (PostgreSQL)
│   └── seed.ts                 # 시드 데이터
├── mcp/
│   └── server.ts               # MCP 서버 (stdio + HTTP 모드)
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # 루트 레이아웃 (AppShell 포함)
│   │   ├── globals.css         # Tailwind + 글로벌 스타일
│   │   ├── page.tsx            # / 대시보드
│   │   ├── api/                # Route Handlers (API)
│   │   │   ├── ai/tasks/       # AI 폴링 API (외부 AI 워커 전용)
│   │   │   │   ├── route.ts               # GET /api/ai/tasks
│   │   │   │   └── [id]/start|complete/   # PATCH start, POST complete
│   │   │   ├── _lib/
│   │   │   │   └── onTaskComplete.ts      # AI 완료 후 엔티티 자동 업데이트 훅
│   │   │   ├── functions/      # 기능 CRUD
│   │   │   ├── areas/          # 영역 CRUD + AI 요청
│   │   │   ├── screens/        # 화면 CRUD + AI 목업 요청
│   │   │   ├── requirements/   # 요구사항 CRUD
│   │   │   ├── tasks/          # 과업 CRUD
│   │   │   ├── planning/       # 기획 보드 + ref-map
│   │   │   ├── standard-guides/# 표준 가이드
│   │   │   └── ai-tasks/       # AI 태스크 조회/재처리 (내부용)
│   │   └── [각 도메인]/        # 페이지
│   ├── components/
│   │   ├── ui/                 # 기본 UI (Button, Input, Dialog, Checkbox ...)
│   │   ├── common/             # 공통 컴포넌트 (DataGrid, MarkdownEditor ...)
│   │   ├── layout/             # AppShell, Header, Sidebar
│   │   ├── functions/          # 기능 상세 탭들
│   │   ├── areas/              # 영역 관련 (AiDesignRequestDialog)
│   │   ├── screens/            # 화면 관련 (LayoutEditor)
│   │   ├── user-story/         # 사용자 스토리 컴포넌트
│   │   └── db-schema/          # DB 스키마 에디터
│   └── lib/
│       ├── prisma.ts           # Prisma 싱글톤
│       ├── utils.ts            # apiFetch, cn, formatDate, apiSuccess, apiError
│       ├── constants.ts        # 상태/라벨 상수
│       ├── validators.ts       # Zod 스키마
│       ├── sequence.ts         # generateSystemId()
│       ├── contentVersion.ts   # 버전 이력 저장
│       ├── ddlParser.ts        # DDL → 메타데이터 파싱
│       └── prd/                # PRD 생성기 (버전별)
│           ├── config.ts       # 기술 컨텍스트 설정
│           ├── types.ts        # PRD 타입
│           ├── index.ts        # 버전 포인터
│           ├── screen/v1.ts    # 화면 PRD 생성기
│           ├── area/v1.ts      # 영역 PRD 생성기 (stub)
│           └── function/v1.ts  # 기능 PRD 생성기 (stub)
├── docs/
│   └── prompts/                # AI 작업 전용 프롬프트 파일
│       └── area-design.md      # 영역 설계 프롬프트 (예시)
│           # 패턴: {table_short}-{taskType_lower}.md
│           # 예) area-design.md, function-inspect.md
├── .claude/
│   └── commands/
│       ├── run-claude-tasks.md  # /run-claude-tasks 슬래시 커맨드
│       └── task_complete.py     # AI 태스크 결과 전송 헬퍼
└── public/
    └── uploads/attachments/    # 첨부파일 저장 디렉토리
```

---

## 4. DB 스키마 전체

> 데이터베이스: PostgreSQL (프로덕션) / SQLite 호환 가능 (개발)
> ORM: Prisma 6.x
> 모든 테이블은 `tb_` 접두사

### 4.1 핵심 계층 구조

```
Task (과업)
  └── Requirement (요구사항)
        ├── Screen (화면)
        │     └── Area (영역)
        │           └── Function (기능)
        │                   └── AiTask (AI 작업 큐)
        └── UserStory (사용자 스토리)
              └── ScreenStoryMap ← Screen

PlanningDraft (기획)
  ├── PlanningReqMap → Requirement
  └── PlanningDraftRefMap → PlanningDraft (기획 간 참조)
```

### 4.2 테이블 상세

#### Task (tb_task) — RFP 원문 대항목
```sql
taskId        INT          PK, 자동증분
systemId      STRING       UK, "T-00001" 형식
taskNo        STRING?      과업 번호 (사용자 정의)
name          STRING       과업명 (필수)
category      STRING?      분류 (예: 기능 요구사항)
definition    STRING?      요약 정의
outputInfo    STRING?      산출정보
rfpPage       INT?         RFP 페이지 번호
content       STRING?      RFP 세부내용 원문 전체 (장문)
createdAt     DATETIME
-- Relations --
requirements  Requirement[]
```

#### Requirement (tb_requirement) — 세부 요구사항
```sql
requirementId   INT          PK, 자동증분
systemId        STRING       UK, "RQ-00001" 형식
name            STRING       요구사항명 (필수)
originalContent STRING?      원문 보존 (계약 근거, RichText)
currentContent  STRING?      협의/변경 반영 최종본 (RichText)
detailSpec      STRING?      요구사항 명세서 (마크다운)
priority        STRING?      우선순위
taskId          INT?         FK → Task (nullable)
source          STRING       "RFP"|"내부"|"추가" (기본값: "RFP")
discussionMd    STRING?      상세 협의내용 (마크다운)
createdAt       DATETIME
updatedAt       DATETIME
-- Relations --
task            Task?
screens         Screen[]
userStories     UserStory[]
planningMaps    PlanningReqMap[]
-- Indexes --
INDEX(taskId)
```

#### Screen (tb_screen) — 화면/페이지
```sql
screenId        INT          PK, 자동증분
systemId        STRING       UK, "PID-00001" 형식
displayCode     STRING?      화면 표시 코드 (사용자 정의)
name            STRING       화면명 (필수)
screenType      STRING?      "LIST"|"DETAIL"|"POPUP"|"TAB"
requirementId   INT          FK → Requirement (필수)
spec            STRING?      화면 설명 (마크다운)
layoutData      STRING?      레이아웃 JSON
categoryL       STRING?      대분류 메뉴
categoryM       STRING?      중분류 메뉴
categoryS       STRING?      소분류 메뉴
menuOrder       INT?         메뉴 정렬 순서
createdAt       DATETIME
updatedAt       DATETIME
-- Relations --
requirement     Requirement
areas           Area[]
storyMaps       ScreenStoryMap[]
```

#### Area (tb_area) — 영역/UI 컴포넌트 그룹
```sql
areaId          INT          PK, 자동증분
areaCode        STRING       UK, "AR-00001" 형식
screenId        INT?         FK → Screen (nullable)
name            STRING       영역명 (필수)
sortOrder       INT          정렬 순서 (기본값: 1)
areaType        STRING       "GRID"|"FORM"|"INFO_CARD"|"TAB"|"FULL_SCREEN"
spec            STRING?      영역 설계 (마크다운)
layoutData      STRING?      레이아웃 JSON
designData      STRING?      Excalidraw 설계 JSON
status          STRING       "NONE"|"DESIGN_REQ"|"DESIGN_DONE"|"CONFIRM_Y" (기본: "NONE")
reqComment      STRING?      AI 요청 코멘트
aiFeedback      STRING?      AI 설계 결과 (마크다운)
useYn           STRING       "Y"|"N" (기본값: "Y")
createdBy       STRING?
createdAt       DATETIME
updatedBy       STRING?
updatedAt       DATETIME
-- Relations --
screen          Screen?
functions       Function[]
-- Indexes --
INDEX(screenId), INDEX(status)
```

#### Function (tb_function) — 기능/비즈니스 로직 단위
```sql
functionId      INT          PK, 자동증분
systemId        STRING       UK, "FID-00001" 형식
displayCode     STRING?      표시 코드
name            STRING       기능명 (필수)
areaId          INT?         FK → Area (nullable)
sortOrder       INT?         정렬 순서 (기본값: 0)
spec            STRING?      기능 명세 (마크다운)
changeReason    STRING?      변경 사유
status          STRING       생명주기 상태 (기본값: "DRAFT")
                             "DRAFT"|"REVIEW_REQ"|"AI_REVIEWING"|"REVIEW_DONE"
                             |"DESIGN_REQ"|"DESIGN_DONE"|"CONFIRM_Y"
                             |"IMPL_REQ"|"AI_IMPLEMENTING"|"IMPL_DONE"
priority        STRING       "HIGH"|"MEDIUM"|"LOW" (기본값: "MEDIUM")
aiInspFeedback  STRING?      AI 검토 피드백 (마크다운)
aiDesignContent STRING?      AI 상세 설계 내용 (마크다운)
aiImplFeedback  STRING?      AI 구현 가이드 (마크다운)
gitlabPrUrl     STRING?      GitLab PR URL
refContent      STRING?      참고 프로그램 내용 (마크다운)
createdAt       DATETIME
updatedAt       DATETIME
-- Relations --
area            Area?
-- Indexes --
INDEX(status), INDEX(areaId)
```

#### AiTask (tb_ai_task) — AI 작업 요청/결과
```sql
aiTaskId        INT          PK, 자동증분
systemId        STRING       UK, "ATK-00001" 형식
refTableName    STRING       참조 테이블
                             "tb_function"|"tb_standard_guide"|"tb_area"
                             |"tb_planning_draft"|"tb_screen"
refPkId         INT          참조 PK
taskType        STRING       "DESIGN"|"REVIEW"|"IMPLEMENT"|"IMPACT"|"REPROCESS"
                             |"INSPECT"|"PRD_EXPORT"|"PLANNING"|"MOCKUP"
                             ※ MOCKUP: 화면/영역 HTML 목업 생성
taskStatus      STRING       "NONE"|"RUNNING"|"SUCCESS"|"AUTO_FIXED"
                             |"NEEDS_CHECK"|"WARNING"|"FAILED" (기본: "NONE")
spec            STRING?      AI 호출 시점 내용 스냅샷 (마크다운)
comment         STRING?      추가 요청사항
feedback        STRING?      AI 결과 (마크다운 또는 HTML)
contextSnapshot STRING?      AI 요청 시점 구조화 데이터 스냅샷 (JSON)
changeNote      STRING?      변경 메모 (IMPLEMENT 요청 시)
resultFiles     STRING?      AI 수정 파일 목록 (줄바꿈 구분)
requestedAt     DATETIME     (기본값: now())
startedAt       DATETIME?
completedAt     DATETIME?
-- Indexes --
INDEX(taskStatus), INDEX(refTableName, refPkId)
-- DB 체크 제약 (PostgreSQL) --
CHECK task_type IN ('DESIGN','REVIEW','IMPLEMENT','IMPACT','REPROCESS',
                    'INSPECT','PRD_EXPORT','PLANNING','MOCKUP')
```

#### ContentVersion (tb_content_version) — 필드별 변경 이력
```sql
versionId       BIGINT       PK, 자동증분
refTableName    STRING       참조 테이블
refPkId         INT          참조 PK
fieldName       STRING       필드명 (예: "current_content", "ai_design_content")
aiTaskId        INT?         관련 AI 태스크
content         STRING       저장된 전체 내용
changedBy       STRING       "user"|"ai" (기본값: "user")
createdAt       DATETIME
-- Indexes --
INDEX(refTableName, refPkId, fieldName, createdAt DESC)
INDEX(aiTaskId)
```

#### UserStory (tb_user_story) — 사용자 스토리
```sql
userStoryId     INT          PK, 자동증분
requirementId   INT          FK → Requirement
systemId        STRING       UK, "USR-00001" 형식
name            STRING       스토리명
persona         STRING?      페르소나 (예: "관리자")
scenario        STRING?      시나리오 설명
acceptanceCriteria JSON?     [{text: string}][] 형식
createdAt       DATETIME
updatedAt       DATETIME
```

#### ScreenStoryMap (tb_screen_story_map) — 화면-스토리 매핑
```sql
mapSn           INT          PK
screenId        INT          FK → Screen (cascade delete)
userStoryId     INT          FK → UserStory (cascade delete)
isMainStory     BOOLEAN      주요 스토리 여부 (기본값: false)
createdAt       DATETIME
UNIQUE(screenId, userStoryId)
```

#### PlanningDraft (tb_planning_draft) — 기획 초안
```sql
planSn          INT          PK, 자동증분
planNm          STRING       기획 이름
planType        STRING?      "IA"|"PROCESS"|"MOCKUP"
manualInfo      STRING?      사용자 상세 아이디어 (AI 최우선 반영)
comment         STRING?      AI 지시사항
resultContent   STRING?      AI 생성 결과 (마크다운/HTML/Mermaid)
resultType      STRING?      "MD"|"HTML"|"MERMAID"
groupUuid       STRING       연속 화면 세트 묶음 ID
sortOrd         INT          그룹 내 순서 (기본값: 1)
isPicked        BOOLEAN      확정 마킹 (화면 승격 후보)
createdAt       DATETIME
updatedAt       DATETIME
-- Relations --
reqMaps         PlanningReqMap[]
planRefMaps     PlanningDraftRefMap[]
```

#### PlanningReqMap (tb_planning_req_map) — 기획-요구사항 매핑
```sql
mapSn           INT          PK
planSn          INT          FK → PlanningDraft (cascade delete)
requirementId   INT          FK → Requirement
createdAt       DATETIME
UNIQUE(planSn, requirementId)
```

#### PlanningDraftRefMap (tb_planning_draft_ref_map) — 기획 간 참조 매핑
```sql
mapSn           INT          PK, 자동증분
planSn          INT          FK → PlanningDraft (cascade delete)
refPlanSn       INT          참조할 다른 기획의 planSn
createdAt       DATETIME
UNIQUE(planSn, refPlanSn)
-- 용도: 현재 기획이 다른 기획의 결과물(IA, PROCESS 등)을 AI 컨텍스트로 참조할 때 사용
```

#### StandardGuide (tb_standard_guide) — 표준 가이드
```sql
guideId         INT          PK, 자동증분
systemId        VARCHAR(10)  UK, "STD-001" 형식
category        STRING       "UI"|"DATA"|"AUTH"|"API"|"COMMON"|"SECURITY"|"FILE"|"ERROR"|"BATCH"|"REPORT"
title           STRING       가이드 제목
content         STRING?      가이드 내용 (마크다운)
relatedFiles    STRING?      관련 파일 목록 (줄바꿈 구분)
isActive        STRING       "Y"|"N" (기본값: "Y")
status          STRING       ""|"REVIEW_REQ"|"REVIEW_DONE"
aiFeedbackContent STRING?   AI 피드백 (마크다운)
aiFeedbackAt    DATETIME?
createdAt       DATETIME
updatedAt       DATETIME
```

#### DbSchema (tb_db_schema) — DB 스키마 메타데이터
```sql
schemaId        INT          PK
tableName       VARCHAR(100) UK
entityName      VARCHAR(100)?
tableComment    VARCHAR(200)?
ddlScript       STRING       DDL SQL 전체
relationsJson   STRING?      관계도 JSON
tableGroup      VARCHAR(50)? 그룹 (예: "core", "ai")
updatedAt       DATETIME
```

#### Sequence (tb_sequence) — SystemId 자동 채번
```sql
sequenceId      INT          PK
prefix          STRING       UK (예: "RQ", "PID", "FID", "ATK", "AR", "T", "USR", "STD")
lastValue       INT          마지막 일련번호 (기본값: 0)
```

#### Attachment (tb_attachment) — 첨부파일 메타데이터
```sql
attachmentId    INT          PK
refTableName    STRING       참조 테이블
refPkId         INT          참조 PK
logicalName     STRING       원본 파일명
physicalName    STRING       저장 파일명 (UUID 기반)
filePath        STRING       저장 경로 (/uploads/attachments/xxx.ext)
fileSize        INT          바이트
fileExt         STRING?      확장자 (png, jpg, pdf 등)
description     STRING?
delYn           STRING       "Y"|"N" (기본값: "N")
createdBy       STRING       (기본값: "GS")
createdAt       DATETIME
-- Indexes --
INDEX(refTableName, refPkId)
-- AI 워커가 이미지 참조 시 downloadUrl 포함하여 응답
```

---

## 5. API 엔드포인트 전체 목록

### 표준 응답 포맷

```typescript
// 성공
{ success: true, data: T, pagination?: { page, pageSize, total, totalPages } }

// 에러
{ success: false, error: { code: string, message: string } }
```

### 표준 헬퍼 (src/lib/utils.ts)

```typescript
export function apiSuccess<T>(data: T, status = 200): NextResponse
export function apiError(code: string, message: string, status = 400): NextResponse
```

### 5.1 대시보드

| Method | URL | 기능 |
|--------|-----|------|
| GET | `/api/dashboard` | 상태별 집계, 최근 AI 활동 피드 |
| GET | `/api/dashboard2` | 개발 현황판 상세 데이터 |
| GET | `/api/tree` | 전체 계층 트리 (Task→Req→Screen→Fn) |

### 5.2 과업 (Task)

| Method | URL | Query | Body |
|--------|-----|-------|------|
| GET | `/api/tasks` | page, pageSize, search | — |
| POST | `/api/tasks` | — | { name, category?, taskNo?, content?, rfpPage?, outputInfo?, definition? } |
| GET | `/api/tasks/[id]` | — | — |
| PUT | `/api/tasks/[id]` | — | 부분 수정 가능 |
| DELETE | `/api/tasks/[id]` | — | — |

### 5.3 요구사항 (Requirement)

| Method | URL | Query | Body |
|--------|-----|-------|------|
| GET | `/api/requirements` | page, pageSize, search, taskId | — |
| POST | `/api/requirements` | — | { name, taskId?, source?, priority?, originalContent?, currentContent?, detailSpec?, discussionMd? } |
| GET | `/api/requirements/[id]` | — | — |
| PUT | `/api/requirements/[id]` | — | 부분 수정 + saveHistoryFields?: string[] |
| DELETE | `/api/requirements/[id]` | — | — |

> **특이사항**: `saveHistoryFields`에 `"current_content"`, `"detail_spec"`, `"discussion_md"` 포함 시 ContentVersion 자동 저장

### 5.4 화면 (Screen)

| Method | URL | Query | Body |
|--------|-----|-------|------|
| GET | `/api/screens` | page, pageSize, search, requirementId | — |
| POST | `/api/screens` | — | { name, requirementId, screenType?, displayCode?, categoryL?, categoryM?, categoryS?, menuOrder? } |
| GET | `/api/screens/categories` | — | — |
| GET | `/api/screens/[id]` | — | — (**latestMockupTask 포함**) |
| PUT | `/api/screens/[id]` | — | 부분 수정 |
| PATCH | `/api/screens/[id]` | — | `{ action: "IMPL_REQ", changeNote? }` 또는 `{ action: "MOCKUP_REQ", comment? }` |
| DELETE | `/api/screens/[id]` | — | — (하위 area 없을 때만) |
| GET | `/api/screens/[id]/prd` | — | — → text/markdown 다운로드 |
| GET | `/api/screens/[id]/story-map` | — | — |
| POST | `/api/screens/[id]/story-map` | — | { userStoryId, isMainStory? } |

**GET `/api/screens/[id]` 응답 상세:**
```typescript
{
  // Screen 기본 필드 전체
  ...screen,
  // 하위 영역 (각 영역의 functions 포함)
  areas: Area[],
  // 첨부파일 목록
  attachments: Attachment[],
  // 최근 MOCKUP 태스크 (없으면 null)
  latestMockupTask: {
    aiTaskId: number;
    taskStatus: string;
    feedback: string | null;   // HTML 목업 결과
    requestedAt: string;
  } | null
}
```

**PATCH `/api/screens/[id]` — action 분기:**
- `action: "MOCKUP_REQ"` → 화면 + 전체 영역 + 기능 설계 스펙 조합하여 AiTask(MOCKUP) 생성
  - spec 조합 순서: 화면 설명 → 영역별 (영역 설계 → 기능별 기본설계 + 상세설계 + 구현가이드)
- `action: "IMPL_REQ"` → 화면 단위 구현 AiTask(IMPLEMENT) 생성

### 5.5 영역 (Area)

| Method | URL | Query | Body |
|--------|-----|-------|------|
| GET | `/api/areas` | page, pageSize, search | — |
| POST | `/api/areas` | — | { name, areaType, screenId?, sortOrder? } |
| GET | `/api/areas/[id]` | — | — (functions, tasks, attachments 포함) |
| PUT | `/api/areas/[id]` | — | 부분 수정 (spec, layoutData, designData, reqComment 등) |
| PATCH | `/api/areas/[id]` | — | action 또는 status 변경 |
| DELETE | `/api/areas/[id]` | mode? | mode=cascade(하위 삭제), mode=detach(연결 해제) |

**PATCH `/api/areas/[id]` — action/status 분기:**
```typescript
// 목업 요청 (신규)
{ action: "MOCKUP_REQ", comment?: string }
→ 영역 + 기능 전체 스펙 조합 → AiTask(MOCKUP, refTableName="tb_area") 생성
   spec 조합: 영역 설명 → 기능별 (기본설계 + 상세설계 + 구현가이드)

// 구현 요청
{ action: "IMPL_REQ", changeNote?: string }
→ AiTask(IMPLEMENT) 생성

// 상태 변경
{ status: "DESIGN_REQ", aiSpec?, comment? }
→ Area.status 업데이트
→ status === "DESIGN_REQ" 시 AiTask(DESIGN) 자동 생성
   AiTask.spec = body.aiSpec ?? area.spec (클라이언트 조합 spec 우선)
```

### 5.6 기능 (Function)

| Method | URL | Query | Body |
|--------|-----|-------|------|
| GET | `/api/functions` | page, pageSize, search, status, screenId, areaId, priority | — |
|  |  | **ids="ALL" 또는 "1,2,3"** (AI 워커용 벌크 조회) | — |
| POST | `/api/functions` | — | { name, areaId?, displayCode?, priority?, sortOrder? } |
| GET | `/api/functions/[id]` | — | — (AI 이력 포함) |
| PUT | `/api/functions/[id]` | — | 부분 수정 |
| PATCH | `/api/functions/[id]` | — | { status, comment? } → 상태 변경 + AiTask 자동 생성 |
| DELETE | `/api/functions/[id]` | — | — |

### 5.7 사용자 스토리 (UserStory)

| Method | URL | Query | Body |
|--------|-----|-------|------|
| GET | `/api/user-stories` | page, pageSize, requirementId | — |
| POST | `/api/user-stories` | — | { requirementId, name, persona?, scenario?, acceptanceCriteria? } |
| GET | `/api/user-stories/personas` | — | — |
| GET | `/api/user-stories/[id]` | — | — |
| PUT | `/api/user-stories/[id]` | — | 부분 수정 |
| DELETE | `/api/user-stories/[id]` | — | — |

### 5.8 기획 (Planning)

| Method | URL | Query | Body |
|--------|-----|-------|------|
| GET | `/api/planning` | page, pageSize, groupUuid? | — |
| POST | `/api/planning` | — | { planNm, planType?, groupUuid?, manualInfo?, comment?, sortOrd? } |
| GET | `/api/planning/[id]` | — | — (reqMaps, planRefMaps, prevDraft, latestAiTask, refPlanDetails 포함) |
| PUT | `/api/planning/[id]` | — | 부분 수정 |
| DELETE | `/api/planning/[id]` | — | — |
| POST | `/api/planning/[id]/make` | — | — → Screen 생성 (승격) |
| POST | `/api/planning/[id]/duplicate` | — | — → 같은 group 내 복제 |
| GET | `/api/planning/[id]/req-map` | — | — |
| POST | `/api/planning/[id]/req-map` | — | { requirementId } |
| GET | `/api/planning/[id]/plan-ref-map` | — | — |
| POST | `/api/planning/[id]/plan-ref-map` | — | { refPlanSn } |
| DELETE | `/api/planning/[id]/plan-ref-map` | — | { refPlanSn } |

**GET `/api/planning/[id]` 응답 상세:**
```typescript
{
  ...planningDraft,
  reqMaps: [{ requirement: { requirementId, systemId, name, ... } }],
  planRefMaps: [{ mapSn, planSn, refPlanSn }],
  refPlanDetails: [{ planSn, planNm, planType, manualInfo, resultContent, resultType }],
  prevDraft: { planSn, planNm, resultContent, resultType } | null,
  latestAiTask: AiTask | null,
}
```

### 5.9 AI 태스크 (AiTask)

| Method | URL | Query | Body |
|--------|-----|-------|------|
| GET | `/api/ai/tasks` | limit?, taskType? | — (NONE 상태 대기 목록, attachments 포함) |
| GET | `/api/ai-tasks` | page, pageSize, taskStatus?, taskType? | — |
| POST | `/api/ai-tasks` | — | { refTableName, refPkId, taskType, spec?, comment? } |
| GET | `/api/ai-tasks/[id]` | — | — |
| DELETE | `/api/ai-tasks/[id]` | — | — |
| PATCH | `/api/ai/tasks/[id]/start` | — | — → RUNNING 전환 |
| POST | `/api/ai/tasks/[id]/complete` | — | { taskStatus, feedback } |

> **AI 워커 폴링 패턴:**
> `GET /api/ai/tasks?limit=10` → start → 분석 → complete
> 헤더: `X-API-Key: openclaw-api-key-here`

### 5.10 DB 스키마

| Method | URL | Query | Body |
|--------|-----|-------|------|
| GET | `/api/db-schema` | page, pageSize | — |
| POST | `/api/db-schema` | — | { tableName, ddlScript, entityName?, tableComment?, tableGroup? } |
| GET | `/api/db-schema/columns` | tableName | — |
| GET | `/api/db-schema/[id]` | — | — |
| PUT | `/api/db-schema/[id]` | — | 부분 수정 |
| DELETE | `/api/db-schema/[id]` | — | — |

### 5.11 표준 가이드

| Method | URL | Query | Body |
|--------|-----|-------|------|
| GET | `/api/standard-guides` | page, pageSize, category? | — |
| POST | `/api/standard-guides` | — | { title, category, content?, relatedFiles? } |
| GET | `/api/standard-guides/[id]` | — | — |
| PUT | `/api/standard-guides/[id]` | — | 부분 수정 |
| DELETE | `/api/standard-guides/[id]` | — | — |
| POST | `/api/standard-guides/[id]/inspect` | — | — → AiTask(INSPECT) 생성 |

### 5.12 컨텐츠 버전

| Method | URL | Query | Body |
|--------|-----|-------|------|
| GET | `/api/content-versions` | refTableName, refPkId, fieldName? | — |
| POST | `/api/content-versions` | — | { refTableName, refPkId, fieldName, content, changedBy? } |
| GET | `/api/content-versions/[id]` | — | — |

### 5.13 첨부파일

| Method | URL | Query | Body |
|--------|-----|-------|------|
| GET | `/api/attachments` | refTableName, refPkId | — |
| POST | `/api/attachments` | — | FormData: { file, refTableName, refPkId, description? } |
| GET | `/api/attachments/[id]` | — | — → 파일 다운로드 (X-API-Key 지원) |
| DELETE | `/api/attachments/[id]` | — | — |

---

## 6. 화면(페이지) 목록

### 6.1 메인 네비게이션

| 메뉴명 | URL | 설명 |
|--------|-----|------|
| 대시보드 | `/` | 상태별 집계 KPI + 최근 AI 활동 피드 |
| 개발 현황판 | `/dashboard2` | 진행률 + 상태 분포 |
| 표준가이드 | `/standard-guides` | UI/API/보안 등 표준 정의 |
| 과업 | `/tasks` | RFP 과업 CRUD |
| 요구사항 | `/requirements` | 요구사항 관리 (4탭 에디터) |
| 사용자 스토리 | `/user-stories` | 페르소나/시나리오/AC |
| 기획 보드 | `/planning` | IA/PROCESS/MOCKUP 기획 |
| 화면 | `/screens` | 화면 목록/등록 + 체크박스 일괄 목업 요청 |
| 영역 | `/areas` | 영역 목록/등록 |
| 기능 | `/functions` | 기능 목록/상태관리 |
| 요구사항 허브 | `/req-hub` | 통합 뷰 |
| 화면 구성 | `/composition` | 화면별 영역·기능 시각화 |
| AI 현황 | `/ai-tasks` | AI 작업 요청/진행/완료 현황 |
| DB 스키마 | `/db-schema` | DDL 관리 |
| 변경 이력 | `/content-versions` | 버전 이력 + Diff 뷰어 |
| 트리 뷰 | `/tree` | 전체 계층 트리 |

### 6.2 상세 페이지 기능 목록

#### `/screens` — 화면 목록 (**업데이트됨**)
- 행 앞 **체크박스 컬럼** (전체 선택/개별 선택)
- 헤더 **"목업 요청 (N)"** 버튼 — 항상 표시, 미선택 시 toast.info 안내
- 체크박스 선택 후 목업 요청 → comment 입력 Dialog → 선택된 모든 화면에 PATCH 일괄 전송
- DataGrid: ID, 표시코드, 대분류, 중분류, 화면명, 유형, 영역 수, 소속 요구사항, 수정일, AI 결과
- 행 클릭 → `/screens/{id}` 이동
- 수정(연필)/삭제(휴지통)/기능목록(리스트) 액션 버튼

#### `/screens/[id]` — 화면 상세 (**업데이트됨**)
- 기본정보 (name, screenType, displayCode, categoryL/M/S, menuOrder)
- 화면 spec (마크다운 에디터)
- 레이아웃 에디터 (JSON)
- 하위 영역 DataGrid
- PRD 내보내기 버튼
- **"목업 요청" 버튼** — AI 실행 중 비활성화 (RUNNING/NONE 폴링 중)
- **"목업 보기" 버튼** — latestMockupTask.taskStatus === "SUCCESS" 시 활성화
- **목업 요청 Dialog** — comment 입력 후 PATCH action=MOCKUP_REQ
- **목업 보기 Dialog** — `<iframe srcDoc={feedback} sandbox="allow-scripts allow-same-origin">` 로 HTML 렌더링
- **3초 폴링**: MOCKUP 태스크가 NONE/RUNNING 상태이면 자동 refetch

#### `/areas/[id]` — 영역 상세 (**업데이트됨**)
- 기본정보 (name, areaType, screenId, sortOrder)
- 설계 섹션:
  - MarkdownEditor (spec), AI 요청 코멘트 (reqComment)
  - Excalidraw 설계 도구 (designData), LayoutEditor (layoutData)
  - AttachmentManager (첨부파일)
- AI 피드백 섹션 (aiFeedback)
- 하위 기능 DataGrid
- **"목업 요청" 버튼** — PATCH action=MOCKUP_REQ (화면 상세와 동일한 패턴)
- **"목업 보기" 버튼** — tasks 배열에서 taskType==="MOCKUP" 인 최근 태스크 SUCCESS 시 활성화
- **목업 보기 Dialog** — iframe 팝업
- **3초 폴링**: MOCKUP 태스크 NONE/RUNNING 시
- AI 설계 요청 다이얼로그 (AiDesignRequestDialog)
- 상태 변경 드롭다운

#### `/tasks/[id]` — 과업 상세
- 기본 정보 편집 (taskNo, name, category, rfpPage, definition, outputInfo)
- RFP 원문 (content, 마크다운 에디터)
- 하위 요구사항 DataGrid

#### `/requirements` — 요구사항 관리
- 목록 DataGrid (검색, 과업 필터)
- 인라인 확장 편집 (4탭: 원본/최종본/명세서/협의내용)
- 이력 저장 + 버전 이력 뷰어

#### `/functions/[id]` — 기능 상세
- 탭: 기본정보 / 설계(spec+refContent+aiDesignContent) / AI 피드백 / 이력
- 상태 변경 드롭다운 → REVIEW_REQ/DESIGN_REQ/IMPL_REQ 시 AI 요청 다이얼로그

#### `/planning/[id]` — 기획 상세
- planType 선택 (IA/PROCESS/MOCKUP)
- manualInfo, comment, resultContent, isPicked
- **참조 기획 설정** (planRefMaps) — 다른 기획 결과물을 AI 컨텍스트로 포함
- 화면으로 승격 버튼

---

## 7. 공통 컴포넌트 라이브러리

### 7.1 기본 UI (`src/components/ui/`)

| 컴포넌트 | 기반 | 주요 Props |
|---------|------|-----------|
| **Button** | CVA | variant: default\|outline\|ghost\|destructive\|secondary, size: default\|sm\|icon |
| **Input** | native | 표준 HTML input 래퍼 |
| **Textarea** | native | 표준 HTML textarea 래퍼 |
| **Label** | Radix Label | htmlFor 연결 |
| **Badge** | CVA | variant: default\|secondary\|destructive\|outline |
| **Dialog** | Radix Dialog | open, onOpenChange; DialogHeader, DialogContent, DialogFooter |
| **Select** | Radix Select | value, onValueChange; SelectTrigger, SelectContent, SelectItem |
| **Tabs** | Radix Tabs | defaultValue; TabsList, TabsTrigger, TabsContent |
| **Checkbox** | Radix Checkbox | checked, onCheckedChange, disabled |

**Checkbox 사용 예:**
```tsx
import { Checkbox } from "@/components/ui/checkbox";

<Checkbox
  checked={isSelected}
  onCheckedChange={(checked) => setSelected(!!checked)}
  onClick={(e) => e.stopPropagation()}  // 행 클릭 전파 방지 필수
/>
```

### 7.2 공통 컴포넌트 (`src/components/common/`)

| 컴포넌트 | 역할 | 주요 Props |
|---------|------|-----------|
| **DataGrid** | TanStack Table 기반 테이블 | columns, data, onRowClick, emptyMessage, isLoading, dense |
| **StatusBadge** | 기능 상태 표시 (색상+텍스트) | status: string |
| **ConfirmDialog** | 삭제/위험 확인 다이얼로그 | open, onOpenChange, title, description, confirmLabel, onConfirm, loading, variant |
| **VersionDiffDialog** | 버전 Diff 뷰어 | — |
| **AttachmentManager** | 첨부파일 업로드/목록/삭제 | refTableName, refPkId, attachments, onChanged |
| **MarkdownEditor** | TipTap 마크다운 에디터 | value, onChange, label, rows, placeholder |
| **RichTextEditor** | TipTap WYSIWYG | value, onChange |
| **MermaidRenderer** | Mermaid 다이어그램 | code: string |
| **ExcalidrawDialog** | Excalidraw 화이트보드 | value, onSave, saving |
| **LayoutEditor** | 레이아웃 JSON 에디터 | value: LayoutRow[], onChange, areas? |

---

## 8. 유틸리티 라이브러리 (`src/lib/`)

### 8.1 utils.ts

```typescript
export function cn(...inputs: ClassValue[]): string                           // Tailwind 병합
export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T>  // 에러 throw fetch
export function apiSuccess<T>(data: T, status = 200): NextResponse
export function apiError(code: string, message: string, status = 400): NextResponse
export function formatDate(dateStr: string): string      // "YYYY-MM-DD"
export function formatDateTime(dateStr: string): string  // "YYYY-MM-DD HH:mm"
```

### 8.2 sequence.ts

```typescript
export async function generateSystemId(prefix: string): Promise<string>
// 지원 prefix: T, RQ, PID, AR, FID, ATK, USR, STD, SG
// 예: await generateSystemId("ATK") → "ATK-00001"
```

### 8.3 contentVersion.ts

```typescript
export async function saveContentVersion(params: {
  refTableName: string;
  refPkId: number;
  fieldName: string;
  currentContent: string | null;
  changedBy?: string;  // "user" | "ai"
  aiTaskId?: number;
}): Promise<void>
```

### 8.4 constants.ts

```typescript
export const FUNC_STATUS_LABEL: Record<string, { label: string; class: string }>
export const AREA_TYPES = ["GRID", "FORM", "INFO_CARD", "TAB", "FULL_SCREEN"]
export const AREA_STATUS_LABEL: Record<string, { label: string; class: string }>
export const AI_TASK_STATUS_LABEL: Record<string, { label: string; class: string }>
export const SCREEN_TYPES = [
  { value: "LIST", label: "목록" },
  { value: "DETAIL", label: "상세" },
  { value: "POPUP", label: "팝업" },
  { value: "TAB", label: "탭" },
]
```

---

## 9. 비즈니스 로직 및 워크플로우

### 9.1 전체 개발 흐름

```
① RFP 입수
   → Task 등록 (name, content, rfpPage)

② 요구사항 분해
   → Requirement 등록 (taskId 연결)
   → originalContent 보존, currentContent 협의 반영

③ 기획 단계
   → PlanningDraft 생성 (IA/PROCESS/MOCKUP)
   → 다른 기획 결과물 참조 설정 (PlanningDraftRefMap)
   → AI가 resultContent 생성
   → isPicked=true → Screen으로 승격

④ 화면 설계
   → Screen 등록 (requirementId 연결)
   → Area 등록 (screenId 연결, areaType 지정)
   → Area.designData에 Excalidraw 도안 저장

⑤ 기능 명세
   → Function 등록 (areaId 연결)
   → spec 마크다운으로 명세 작성

⑥ AI 자동화
   → Function 상태를 REVIEW_REQ로 변경
   → AiTask 자동 생성 (taskType: "REVIEW"/"INSPECT")
   → AI 워커가 폴링 → 처리 → feedback 저장
   → REVIEW_DONE → DESIGN_REQ → DESIGN_DONE → CONFIRM_Y

⑦ 구현
   → IMPL_REQ → AI 구현 → gitlabPrUrl 연결
   → IMPL_DONE → 개발 완료

⑧ 목업 확인 (어느 단계에서나 가능)
   → 화면/영역 상세 또는 화면 목록에서 목업 요청
   → AiTask(MOCKUP) 생성 → AI가 HTML 생성
   → SUCCESS 시 iframe 팝업으로 즉시 미리보기
```

### 9.2 AI 태스크 생명주기

```
생성 (NONE)
  ↓ [AI 워커: PATCH /api/ai/tasks/{id}/start]
실행 중 (RUNNING)
  ↓ [AI 워커: POST /api/ai/tasks/{id}/complete]
완료:
  SUCCESS      정상 완료
  AUTO_FIXED   자동 수정 완료
  NEEDS_CHECK  확인 필요
  WARNING      경고 있음
  FAILED       실패
```

### 9.3 Function 상태 전이

```
DRAFT
  → REVIEW_REQ    AiTask(INSPECT) 자동 생성 → aiInspFeedback 저장 → REVIEW_DONE
  → DESIGN_REQ    AiTask(DESIGN) 자동 생성  → aiDesignContent 저장 → DESIGN_DONE
  → CONFIRM_Y     사용자 컨펌
  → IMPL_REQ      AiTask(IMPLEMENT) 자동 생성 → aiImplFeedback 저장 → IMPL_DONE
```

### 9.4 Area 상태 전이 (PATCH action/status)

```
NONE
  → [status: "DESIGN_REQ"] AiTask(DESIGN) 자동 생성 → aiFeedback 저장 → DESIGN_DONE
  → [action: "MOCKUP_REQ"] AiTask(MOCKUP) 생성 → feedback(HTML) 저장 (상태 변경 없음)
  → [action: "IMPL_REQ"]   AiTask(IMPLEMENT) 생성 (상태 변경 없음)
  → CONFIRM_Y    컨펌
```

### 9.5 onTaskComplete 훅 — taskType별 엔티티 업데이트

```
src/app/api/ai/_lib/onTaskComplete.ts

taskType 분기:
  tb_function:
    INSPECT   → aiInspFeedback = feedback, status = "REVIEW_DONE"
    DESIGN    → aiDesignContent = feedback, status = "DESIGN_DONE" + ContentVersion 저장
    IMPLEMENT → aiImplFeedback = feedback, status = "IMPL_DONE"

  tb_standard_guide:
    INSPECT   → aiFeedbackContent = feedback, aiFeedbackAt = now, status = "REVIEW_DONE"

  tb_area:
    DESIGN    → aiFeedback = feedback, status = "DESIGN_DONE"
    MOCKUP    → (no-op, feedback은 AiTask에만 저장)

  tb_planning_draft:
    PLANNING  → resultContent = feedback, resultType 자동 결정 (IA→MD, PROCESS→MERMAID, MOCKUP→HTML)
                ContentVersion 저장

  tb_screen:
    MOCKUP    → (no-op, feedback은 AiTask에만 저장)
```

### 9.6 목업 요청 — spec 조합 상세

```typescript
// 화면 목업 spec 구성 (PATCH /api/screens/[id], action="MOCKUP_REQ")
[
  "# 화면: {name} ({systemId})\n\n## 화면 설명\n\n{screen.spec}",
  // 각 영역마다:
  "# 영역: {areaCode} {areaName}\n\n## 영역 설계\n\n{area.spec}",
  "  ## 기능: [{displayCode}] {funcName}",
  "    ### 기본 설계\n\n{func.spec}",
  "    ### 상세 설계\n\n{func.aiDesignContent}",
  "    ### 구현 가이드\n\n{func.aiImplFeedback}",
].join("\n\n---\n\n")

// 영역 목업 spec 구성 (PATCH /api/areas/[id], action="MOCKUP_REQ")
// 동일 구성, 단일 영역 기준
```

### 9.7 화면 목록 일괄 목업 요청 패턴

```typescript
// src/app/screens/page.tsx
const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

// 목업 요청 mutation — 선택된 모든 화면에 병렬 PATCH
const mockupMutation = useMutation({
  mutationFn: async (ids: number[]) => {
    await Promise.all(
      ids.map((id) =>
        apiFetch(`/api/screens/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ action: "MOCKUP_REQ", comment }),
        })
      )
    );
  },
});
```

### 9.8 버전 이력 자동 저장

```typescript
// Requirement PUT 시
if (saveHistoryFields.includes("current_content")) {
  await saveContentVersion({ refTableName: "tb_requirement", refPkId: id,
    fieldName: "current_content", currentContent: existing.currentContent, changedBy: "user" });
}

// Area PUT 시 (saveVersionLog=true + spec 변경 시)
await saveContentVersion({ refTableName: "tb_area", refPkId: numId,
  fieldName: "spec", currentContent: existing.spec, changedBy: "user" });
```

---

## 10. MCP 서버 (`mcp/server.ts`)

SPECODE 데이터에 Claude Code/claude.ai가 직접 접근할 수 있도록 MCP 서버를 제공합니다.
Prisma에 직접 연결하므로 Next.js 서버 없이 독립 실행 가능합니다.

### 10.1 실행 모드

```bash
# stdio 모드 (기본 — Claude Code 로컬 연결)
npx tsx mcp/server.ts

# HTTP 모드 (외부 연결용 — claude.ai, ngrok 등)
MCP_HTTP_PORT=3001 MCP_API_KEY=비밀키 npx tsx mcp/server.ts
# 또는
npx tsx mcp/server.ts --http --port 3001 --key 비밀키
```

### 10.2 HTTP 모드 상세

- **라이브러리**: `@modelcontextprotocol/sdk/server/streamableHttp.js`
- **MCP 엔드포인트**: `POST/GET /mcp`
- **헬스체크**: `GET /health → { status: "ok", server: "specode-mcp", mode: "http" }`
- **인증**: `x-api-key` 헤더 또는 `Authorization: Bearer {key}`
- **외부 노출**: ngrok / Cloudflare Tunnel 사용 시 포트포워딩 불필요 (아웃바운드 연결 방식)

### 10.3 제공 도구 목록

| 도구 | 설명 |
|------|------|
| `list_screens` | 화면 목록 조회 (search, requirementId 필터) |
| `get_screen` | 화면 상세 (areas + functions 포함) |
| `list_areas` | 영역 목록 조회 (screenId, status, search 필터) |
| `get_area` | 영역 상세 (functions 포함) |
| `list_functions` | 기능 목록 조회 (areaId, status, search 필터) |
| `get_function` | 기능 상세 (최근 AI 작업 이력 포함) |
| `list_requirements` | 요구사항 목록 조회 |
| `list_ai_tasks` | AI 작업 현황 조회 (status, type 필터) |
| `list_tasks` | 과업 목록 조회 |
| `create_area` | 영역 등록 |
| `create_function` | 기능 등록 |
| `update_function` | 기능 수정 (name, spec, aiDesignContent) |
| `request_design` | 영역 AI 설계 요청 (DESIGN_REQ 상태 변경 + AiTask 생성) |
| `request_implement_function` | 기능 단위 구현 요청 |
| `request_implement_area` | 영역 단위 구현 요청 |
| `request_implement_screen` | 화면 단위 구현 요청 |

---

## 11. AI 워커 (`/run-claude-tasks`)

SPECODE의 AI 처리는 Claude Code 슬래시 커맨드 `/run-claude-tasks`로 수동 실행합니다.

### 11.1 처리 흐름

```
1. GET /api/ai/tasks?limit=10 — 대기 태스크 조회
2. 각 태스크:
   a. PATCH /api/ai/tasks/{id}/start (RUNNING)
   b. task.attachments에서 이미지 다운로드 → Read 도구로 분석
   c. docs/prompts/{table_short}-{taskType_lower}.md 로드 (있으면)
   d. task.spec + 이미지 + 프롬프트 파일 기반 분석 수행
   e. 결과를 d:/tmp/specode_fb_{aiTaskId}.md 에 저장 (Write 도구)
   f. python .claude/commands/task_complete.py {id} SUCCESS d:/tmp/specode_fb_{id}.md
3. 완료 후: rm -f d:/tmp/specode_fb_*.md 정리
```

### 11.2 task_complete.py

결과 전송 헬퍼 스크립트. 한글 UTF-8 안전 처리를 위해 curl 대신 사용.

```bash
python .claude/commands/task_complete.py {aiTaskId} SUCCESS d:/tmp/specode_fb_{aiTaskId}.md
# 실패 시
python .claude/commands/task_complete.py {aiTaskId} FAILED d:/tmp/specode_fb_{aiTaskId}.md
```

### 11.3 프롬프트 파일 위치

```
docs/prompts/{table_short}-{taskType_lower}.md
예) docs/prompts/area-design.md       # tb_area + DESIGN
    docs/prompts/function-inspect.md  # tb_function + INSPECT
    docs/prompts/screen-mockup.md     # tb_screen + MOCKUP (선택)
```

---

## 12. 코딩 패턴 & 컨벤션

### 12.1 API Route 패턴

```typescript
// src/app/api/[domain]/[id]/route.ts
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { generateSystemId } from "@/lib/sequence";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const numId = parseInt(id);
  const data = await prisma.entity.findUnique({ where: { id: numId } });
  if (!data) return apiError("NOT_FOUND", "찾을 수 없습니다.", 404);
  return apiSuccess(data);
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const numId = parseInt(id);
  const body = await req.json();

  if (body.action === "MOCKUP_REQ") {
    // 목업 요청 처리
    const taskSystemId = await generateSystemId("ATK");
    await prisma.aiTask.create({
      data: {
        systemId: taskSystemId,
        refTableName: "tb_screen",
        refPkId: numId,
        taskType: "MOCKUP",
        taskStatus: "NONE",
        spec: /* 조합된 spec */,
        comment: body.comment?.trim() || null,
        contextSnapshot: JSON.stringify({ /* 스냅샷 */ }),
      },
    });
    return apiSuccess({ requested: true });
  }
  // ...
}
```

### 12.2 목업 폴링 패턴 (프론트엔드)

```typescript
// 상세 페이지에서 MOCKUP 태스크 3초 폴링
const { data, refetch } = useQuery({
  queryKey: ["screen", id],
  queryFn: () => fetch(`/api/screens/${id}`).then(r => r.json()),
  gcTime: 0,
});

const latestMockupTask = data?.data?.latestMockupTask ?? null;
const isMockupRunning = latestMockupTask?.taskStatus === "NONE"
                      || latestMockupTask?.taskStatus === "RUNNING";
const hasMockupResult = latestMockupTask?.taskStatus === "SUCCESS"
                      && !!latestMockupTask.feedback;

useEffect(() => {
  if (!isMockupRunning) return;
  const timer = setInterval(() => refetch(), 3000);
  return () => clearInterval(timer);
}, [isMockupRunning, refetch]);

// 목업 보기 팝업
<Dialog open={mockupViewOpen} onOpenChange={setMockupViewOpen}>
  <DialogContent className="max-w-[95vw] max-h-[95vh] flex flex-col">
    <DialogHeader><DialogTitle>목업 미리보기</DialogTitle></DialogHeader>
    <iframe
      srcDoc={latestMockupTask?.feedback ?? ""}
      sandbox="allow-scripts allow-same-origin"
      className="flex-1 w-full border-0 rounded min-h-[600px]"
    />
  </DialogContent>
</Dialog>
```

### 12.3 체크박스 컬럼 패턴 (목록 페이지)

```typescript
// 선택 상태 관리
const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
const rows: MyRow[] = data?.data ?? [];
const allPageSelected = rows.length > 0 && rows.every(r => selectedIds.has(r.id));

// 컬럼 정의
{
  id: "select",
  header: () => (
    <Checkbox checked={allPageSelected} onCheckedChange={toggleAll}
      onClick={(e) => e.stopPropagation()} />
  ),
  cell: ({ row }) => (
    <Checkbox
      checked={selectedIds.has(row.original.id)}
      onCheckedChange={() => {
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.has(row.original.id) ? next.delete(row.original.id) : next.add(row.original.id);
          return next;
        });
      }}
      onClick={(e) => e.stopPropagation()}
    />
  ),
  size: 40,
  enableSorting: false,
}
```

### 12.4 공통 패턴

```typescript
// ✅ Zod v4 에러 메시지
const schema = z.object({ name: z.string({ error: "필수값입니다." }).min(1) });

// ✅ gcTime: 0 — 페이지 이동 시 항상 새로 조회
const { data } = useQuery({ queryKey: ["entity", id], queryFn: ..., gcTime: 0 });

// ✅ toast 사용 (3종류)
toast.success("저장되었습니다.");
toast.error("오류가 발생했습니다.");
toast.info("화면을 선택하세요.");
```

---

## 13. 환경 변수 & 설정

### 13.1 .env.local

```env
DATABASE_URL="postgresql://..."      # Supabase 또는 PostgreSQL
DIRECT_URL="postgresql://..."        # 직접 연결 (Supabase pooler 우회용)
AI_API_KEY="openclaw-api-key-here"   # AI 워커 인증 키
```

### 13.2 파일 경로

```
public/uploads/attachments/      ← 첨부파일 저장
d:/tmp/                          ← AI 워커 임시 파일 (Windows)
docs/prompts/                    ← AI 작업별 프롬프트 파일
```

### 13.3 AI 워커 인증

```
X-API-Key: openclaw-api-key-here
```

### 13.4 MCP 서버 HTTP 모드 환경변수

```env
MCP_HTTP_PORT=3001      # HTTP 서버 포트
MCP_API_KEY=비밀키      # 인증 키 (미설정 시 공개 노출 경고)
```

---

## 14. 현재 구현 완료된 기능 목록

### ✅ 완전 구현

| 기능 | 상태 |
|------|------|
| 대시보드 (상태별 집계, AI 피드) | 완료 |
| 과업 CRUD | 완료 |
| 요구사항 CRUD + 4탭 에디터 + 버전 이력 | 완료 |
| 화면 CRUD + 카테고리 + PRD 내보내기 | 완료 |
| **화면 목록 체크박스 + 일괄 목업 요청** | 완료 |
| **화면 상세 목업 요청 + iframe 팝업 미리보기** | 완료 |
| 영역 CRUD + Excalidraw + AI 설계 요청 | 완료 |
| **영역 상세 목업 요청 + iframe 팝업 미리보기** | 완료 |
| 기능 CRUD + 상태 생명주기 + AI 요청 | 완료 |
| 사용자 스토리 + AC 에디터 + 화면 매핑 | 완료 |
| 기획 보드 (IA/PROCESS/MOCKUP) + 화면 승격 | 완료 |
| **기획 간 참조 매핑 (PlanningDraftRefMap)** | 완료 |
| AI 태스크 관리 (NONE→RUNNING→SUCCESS) | 완료 |
| AI 워커 API (`/api/ai/tasks`) | 완료 |
| 첨부파일 업로드/다운로드/삭제 | 완료 |
| 버전 이력 저장 + Diff 뷰어 | 완료 |
| DB 스키마 관리 + DDL 파서 | 완료 |
| 표준 가이드 + AI 검사 | 완료 |
| 화면 구성 (composition) 뷰 | 완료 |
| PRD 생성기 (버전별 구조) | 완료 |
| **MCP 서버 (stdio + HTTP 이중 모드)** | 완료 |
| DataGrid 공통 컴포넌트 | 완료 |
| **Checkbox UI 컴포넌트** | 완료 |

### 🔲 미구현 / 개선 예정

| 기능 | 비고 |
|------|------|
| Area PRD 생성기 (`area/v1.ts`) | stub 상태 |
| Function PRD 생성기 (`function/v1.ts`) | stub 상태 |
| MCP HTTP 모드 외부 배포 | AWS/Vercel 배포 시 활성화 예정 |
| 실시간 알림 (AI 완료 등) | 현재 폴링 방식 |

---

## 15. 주요 데이터 예시

### systemId 형식

```
과업:          T-00001
요구사항:      RQ-00001
화면:          PID-00001
영역:          AR-00001
기능:          FID-00001
AI 태스크:     ATK-00001
사용자스토리:  USR-00001
표준가이드:    STD-001
```

### Function 상태 색상 (Tailwind)

```
DRAFT          → text-gray-600
REVIEW_REQ     → text-yellow-700 animate-pulse
AI_REVIEWING   → text-blue-700
REVIEW_DONE    → text-green-700
DESIGN_REQ     → text-amber-700 animate-pulse
DESIGN_DONE    → text-emerald-700
CONFIRM_Y      → text-purple-700
IMPL_REQ       → text-orange-700 animate-pulse
AI_IMPLEMENTING→ text-cyan-700
IMPL_DONE      → text-teal-700
```

### AiTask taskType → 결과 저장 위치

| taskType | refTableName | 결과 저장 필드 | 상태 변경 |
|----------|-------------|--------------|---------|
| INSPECT | tb_function | aiInspFeedback | REVIEW_DONE |
| DESIGN | tb_function | aiDesignContent | DESIGN_DONE |
| IMPLEMENT | tb_function | aiImplFeedback | IMPL_DONE |
| DESIGN | tb_area | aiFeedback | DESIGN_DONE |
| MOCKUP | tb_area | (aiTask.feedback만) | 없음 |
| MOCKUP | tb_screen | (aiTask.feedback만) | 없음 |
| INSPECT | tb_standard_guide | aiFeedbackContent | REVIEW_DONE |
| PLANNING | tb_planning_draft | resultContent | 없음 |

---

## 16. 개발 참고사항 (알려진 함정)

| 상황 | 주의 |
|------|------|
| **Prisma 버전** | v6 사용. v7은 config 포맷 변경으로 호환 안 됨 |
| **Zod v4** | `required_error`/`invalid_type_error` 없음 → `{ error: "msg" }` 사용 |
| **Tailwind v4** | `tailwind.config.ts` 없음. `globals.css`의 `@theme {}` 에서 설정 |
| **Route params** | 반드시 `Promise<{ id: string }>` + `await params` |
| **useSearchParams** | `<Suspense>` 경계 필수 |
| **gcTime: 0** | 페이지 이동 시 항상 새로 조회. 모든 useQuery에 설정 |
| **한글 파일 전송** | curl 대신 Python urllib 사용 (UTF-8 보장) |
| **AI 워커 임시 파일** | Windows 경로 `d:/tmp/` 사용 (Unix `/tmp/` 아님) |
| **AiTask MOCKUP** | DB 체크 제약에 'MOCKUP' 추가 필요 (PostgreSQL ALTER TABLE) |
| **tb_planning_draft_ref_map** | 신규 테이블 — 마이그레이션 필요 (`npx prisma migrate dev`) |
| **Checkbox** | `@radix-ui/react-checkbox` 패키지 필요 |
| **MCP HTTP 모드** | express + `@types/express` 패키지 필요 |
| **iframe 목업** | `sandbox="allow-scripts allow-same-origin"` 속성 필수 |

---

*이 문서는 2026-03-17 기준으로 작성되었습니다.*
*코드 변경 시 이 문서도 함께 업데이트해야 합니다.*
