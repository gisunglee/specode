# SPECODE — 프로젝트 PRD (2026-03-15 기준)

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
| AI 처리 워커 | `/api/ai/tasks` 폴링 → 자동 설계/검토/구현 수행 |

### 1.3 핵심 가치

- **계층적 추적성**: RFP 과업 → 요구사항 → 화면 → 영역 → 기능까지 단방향 연결
- **AI 자동화**: 기능 단위 설계·검토·구현을 AI가 처리, 사람이 컨펌
- **버전 관리**: 모든 마크다운 필드의 변경 이력 저장 + Diff 뷰어
- **확장성**: PRD 생성, DB 스키마 관리, 표준 가이드 검사까지 포함

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
| Radix UI | 최신 | Dialog, Select, Tabs, Accordion, Popover, Tooltip, Dropdown, Label |
| Class Variance Authority | 0.7.1 | variant 스타일링 |
| Lucide React | 0.575.0 | 아이콘 |
| Sonner | 2.0.7 | 토스트 (`toast.success`, `toast.error`) |
| Framer Motion | 12.34.3 | 애니메이션 |

### 2.3 데이터 & 상태

| 항목 | 버전 | 비고 |
|------|------|------|
| Prisma ORM | 6.19.2 | SQLite(개발) / PostgreSQL(프로덕션) |
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

// ✅ useSearchParams()는 Suspense 경계 필요
export default function Page() {
  return <Suspense fallback={<div>로딩 중...</div>}><Content /></Suspense>;
}

// ✅ Tailwind v4 import 방식
// globals.css
@import "tailwindcss";
@theme { --color-primary: oklch(...); }
```

---

## 3. 프로젝트 구조

```
d:\source\specode\
├── prisma/
│   ├── schema.prisma           # DB 스키마
│   └── seed.ts                 # 시드 데이터
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # 루트 레이아웃 (AppShell 포함)
│   │   ├── globals.css         # Tailwind + 글로벌 스타일
│   │   ├── page.tsx            # / 대시보드
│   │   ├── api/                # Route Handlers (API)
│   │   └── [각 도메인]/        # 페이지
│   ├── components/
│   │   ├── ui/                 # 기본 UI (Button, Input, Dialog ...)
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
│   └── prompts/                # AI 작업 프롬프트 파일
│       └── area-design.md      # 영역 설계 프롬프트
├── .claude/
│   └── commands/
│       └── task_complete.py    # AI 태스크 결과 전송 헬퍼
└── public/
    └── uploads/attachments/    # 첨부파일 저장 디렉토리
```

---

## 4. DB 스키마 전체

> 데이터베이스: SQLite(개발) / PostgreSQL(프로덕션)
> ORM: Prisma 6.x
> 모든 테이블은 `tb_` 접두사

### 4.1 핵심 계층 구조

```
Task (과업)
  └── Requirement (요구사항)
        ├── Screen (화면)
        │     └── Area (영역)
        │           └── Function (기능)
        └── UserStory (사용자 스토리)
              └── ScreenStoryMap ← Screen
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
createdAt     DATETIME     자동 생성
-- Relations --
requirements  Requirement[] 하위 요구사항들
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
task            Task?        소속 과업
screens         Screen[]     하위 화면들
userStories     UserStory[]  관련 사용자 스토리
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
requirement     Requirement  소속 요구사항
areas           Area[]       하위 영역들
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
aiFeedback      STRING?      AI 피드백 결과
useYn           STRING       "Y"|"N" (기본값: "Y")
createdBy       STRING?
createdAt       DATETIME
updatedBy       STRING?
updatedAt       DATETIME
-- Relations --
screen          Screen?      소속 화면
functions       Function[]   하위 기능들
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
aiImplFeedback  STRING?      AI 구현 피드백 (마크다운)
gitlabPrUrl     STRING?      GitLab PR URL
refContent      STRING?      참고 프로그램 내용 (마크다운)
createdAt       DATETIME
updatedAt       DATETIME
-- Relations --
area            Area?        소속 영역
-- Indexes --
INDEX(status), INDEX(areaId)
```

#### AiTask (tb_ai_task) — AI 작업 요청/결과
```sql
aiTaskId        INT          PK, 자동증분
systemId        STRING       UK, "ATK-00001" 형식
refTableName    STRING       참조 테이블: "tb_function"|"tb_standard_guide"|"tb_area"|"tb_planning_draft"
refPkId         INT          참조 PK
taskType        STRING       "DESIGN"|"REVIEW"|"IMPLEMENT"|"IMPACT"|"REPROCESS"|"INSPECT"
taskStatus      STRING       "NONE"|"RUNNING"|"SUCCESS"|"AUTO_FIXED"|"NEEDS_CHECK"|"WARNING"|"FAILED" (기본: "NONE")
spec            STRING?      AI 호출 시점 내용 스냅샷
comment         STRING?      추가 요청사항 (재처리용)
feedback        STRING?      AI 결과 마크다운
resultFiles     STRING?      AI 수정 파일 목록 (줄바꿈 구분)
requestedAt     DATETIME     (기본값: now())
startedAt       DATETIME?
completedAt     DATETIME?
-- Indexes --
INDEX(taskStatus), INDEX(refTableName, refPkId)
```

#### ContentVersion (tb_content_version) — 필드별 변경 이력
```sql
versionId       BIGINT       PK, 자동증분
refTableName    STRING       참조 테이블
refPkId         INT          참조 PK
fieldName       STRING       필드명 (예: "current_content")
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
-- Relations --
requirement     Requirement
screenMaps      ScreenStoryMap[]
-- Indexes --
INDEX(requirementId)
```

#### ScreenStoryMap (tb_screen_story_map) — 화면-스토리 매핑
```sql
mapSn           INT          PK, 자동증분
screenId        INT          FK → Screen (cascade delete)
userStoryId     INT          FK → UserStory (cascade delete)
isMainStory     BOOLEAN      주요 스토리 여부 (기본값: false)
createdAt       DATETIME
UNIQUE(screenId, userStoryId)
INDEX(screenId)
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
```

#### PlanningReqMap (tb_planning_req_map) — 기획-요구사항 매핑
```sql
mapSn           INT          PK, 자동증분
planSn          INT          FK → PlanningDraft (cascade delete)
requirementId   INT          FK → Requirement
createdAt       DATETIME
UNIQUE(planSn, requirementId)
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
-- Indexes --
INDEX(category)
```

#### DbSchema (tb_db_schema) — DB 스키마 메타데이터
```sql
schemaId        INT          PK, 자동증분
tableName       VARCHAR(100) UK
entityName      VARCHAR(100)?
tableComment    VARCHAR(200)?
ddlScript       STRING       DDL SQL 전체
relationsJson   STRING?      관계도 JSON
tableGroup      VARCHAR(50)? 그룹 (예: "core", "ai")
updatedAt       DATETIME
-- Indexes --
INDEX(tableGroup)
```

#### Sequence (tb_sequence) — SystemId 자동 채번
```sql
sequenceId      INT          PK, 자동증분
prefix          STRING       UK (예: "RQ", "PID", "FID", "ATK", "AR", "T", "USR", "STD")
lastValue       INT          마지막 일련번호 (기본값: 0)
```

#### Attachment (tb_attachment) — 첨부파일 메타데이터
```sql
attachmentId    INT          PK, 자동증분
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
| GET | `/api/screens/[id]` | — | — (하위 areas 포함) |
| PUT | `/api/screens/[id]` | — | 부분 수정 |
| DELETE | `/api/screens/[id]` | — | — (하위 area 없을 때만) |
| GET | `/api/screens/[id]/prd` | — | — → text/markdown 다운로드 |
| GET | `/api/screens/[id]/story-map` | — | — |
| POST | `/api/screens/[id]/story-map` | — | { userStoryId, isMainStory? } |

### 5.5 영역 (Area)

| Method | URL | Query | Body |
|--------|-----|-------|------|
| GET | `/api/areas` | page, pageSize, search | — |
| POST | `/api/areas` | — | { name, areaType, screenId?, sortOrder? } |
| GET | `/api/areas/[id]` | — | — (functions, tasks, attachments 포함) |
| PUT | `/api/areas/[id]` | — | 부분 수정 (spec, layoutData, designData, reqComment 등) |
| PATCH | `/api/areas/[id]` | — | { status, aiSpec?, comment? } → 상태 변경 + AiTask 자동 생성 |
| DELETE | `/api/areas/[id]` | mode? | mode=cascade(하위 함수 삭제), mode=detach(연결 해제) |

> **특이사항 (PATCH)**:
> `status === "DESIGN_REQ"` 시 AiTask 자동 생성
> `spec: body.aiSpec ?? area.spec` — 클라이언트가 조합한 spec 우선 사용

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
| GET | `/api/planning/[id]` | — | — |
| PUT | `/api/planning/[id]` | — | 부분 수정 |
| DELETE | `/api/planning/[id]` | — | — |
| POST | `/api/planning/[id]/make` | — | — → Screen 생성 (승격) |
| POST | `/api/planning/[id]/duplicate` | — | — → 같은 group 내 복제 |
| GET | `/api/planning/[id]/req-map` | — | — |
| POST | `/api/planning/[id]/req-map` | — | { requirementId } |

### 5.9 AI 태스크 (AiTask)

| Method | URL | Query | Body |
|--------|-----|-------|------|
| GET | `/api/ai/tasks` | limit?, taskType? | — (NONE 상태 대기 목록) |
| GET | `/api/ai-tasks` | page, pageSize, taskStatus?, taskType? | — |
| POST | `/api/ai-tasks` | — | { refTableName, refPkId, taskType, spec?, comment? } |
| GET | `/api/ai-tasks/[id]` | — | — |
| DELETE | `/api/ai-tasks/[id]` | — | — |
| PATCH | `/api/ai/tasks/[id]/start` | — | — → RUNNING 전환 |
| POST | `/api/ai/tasks/[id]/complete` | — | { taskStatus: "SUCCESS"\|"FAILED", feedback: string } |

> **AI 워커 폴링 패턴**:
> `GET /api/ai/tasks?limit=10` → start → 분석 → complete
> X-API-Key: `openclaw-api-key-here` 헤더 필수

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
| POST | `/api/standard-guides/[id]/inspect` | — | — → AiTask 생성 (INSPECT) |

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
| 화면 | `/screens` | 화면 목록/등록 |
| 영역 | `/areas` | 영역 목록/등록 |
| 기능 | `/functions` | 기능 목록/상태관리 |
| 요구사항 허브 | `/req-hub` | 통합 뷰 |
| 화면 구성 | `/composition` | 화면별 영역·기능 시각화 |
| AI 현황 | `/ai-tasks` | AI 작업 요청/진행/완료 현황 |
| DB 스키마 | `/db-schema` | DDL 관리 |
| 변경 이력 | `/content-versions` | 버전 이력 + Diff 뷰어 |
| 트리 뷰 | `/tree` | 전체 계층 트리 |

### 6.2 상세 페이지 기능 목록

#### `/tasks/[id]` — 과업 상세
- 기본 정보 편집 (taskNo, name, category, rfpPage, definition, outputInfo)
- RFP 원문 전체 내용 (content, 마크다운 에디터)
- 하위 요구사항 DataGrid

#### `/requirements` — 요구사항 관리
- 목록 DataGrid (검색, 과업 필터)
- 등록 다이얼로그
- 인라인 확장 편집:
  - **탭 1**: 원본 내용 (originalContent, RichText)
  - **탭 2**: 최종본 (currentContent, RichText)
  - **탭 3**: 요구사항 명세서 (detailSpec, 마크다운)
  - **탭 4**: 협의 내용 (discussionMd, 마크다운)
- 이력 저장 여부 선택 + 버전 이력 뷰어
- 원본 수정 시 경고 다이얼로그

#### `/screens/[id]` — 화면 상세
- 기본정보 (name, screenType, displayCode, categoryL/M/S, menuOrder)
- 화면 spec (마크다운 에디터)
- 레이아웃 에디터 (JSON)
- 하위 영역 DataGrid
- PRD 내보내기 버튼 → 마크다운 다운로드

#### `/areas/[id]` — 영역 상세
- 기본정보 (name, areaType, screenId, sortOrder)
- 설계 섹션:
  - MarkdownEditor (spec)
  - AI 요청 코멘트 (reqComment)
  - Excalidraw 설계 도구 (designData)
  - LayoutEditor (layoutData)
  - AttachmentManager (첨부파일)
- AI 피드백 섹션
- 하위 기능 DataGrid
- AI 설계 요청 다이얼로그 (AiDesignRequestDialog):
  - 영역 설계(spec) 포함 여부
  - 디자인 설계(designData) 포함 여부 (designData 있을 때만)
  - 이미지 참조 여부 (참조/미참조)
- 상태 변경 드롭다운 (NONE→DESIGN_REQ 시 다이얼로그)
- AI 요청 이력 팝업 (HistoryTab)

#### `/functions/[id]` — 기능 상세
- 탭 인터페이스:
  - **기본정보**: name, displayCode, priority, status, changeReason, gitlabPrUrl
  - **설계**: spec(마크다운), refContent(참고 프로그램), aiDesignContent(AI 설계)
  - **AI 피드백**: aiInspFeedback 표시
  - **이력**: AI 작업 이력 + ContentVersion
- 상태 변경 드롭다운 → REVIEW_REQ/DESIGN_REQ/IMPL_REQ 시 AI 요청 다이얼로그

#### `/planning/[id]` — 기획 상세
- planType 선택 (IA/PROCESS/MOCKUP)
- manualInfo (사용자 아이디어, 마크다운)
- comment (AI 지시사항)
- resultContent (AI 결과 표시)
- isPicked 체크박스
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
| **Dialog** | Radix Dialog | open, onOpenChange; 내부: DialogHeader, DialogContent, DialogFooter |
| **Select** | Radix Select | value, onValueChange; 내부: SelectTrigger, SelectContent, SelectItem |
| **Tabs** | Radix Tabs | defaultValue; 내부: TabsList, TabsTrigger, TabsContent |

### 7.2 공통 컴포넌트 (`src/components/common/`)

| 컴포넌트 | 역할 | 주요 Props |
|---------|------|-----------|
| **DataGrid** | TanStack Table 기반 테이블 | columns, data, onRowClick, emptyMessage, isLoading |
| **StatusBadge** | 기능 상태 표시 (색상+텍스트) | status: string |
| **ConfirmDialog** | 삭제/위험 확인 다이얼로그 | open, onOpenChange, title, description, confirmLabel, onConfirm, loading, variant |
| **VersionDiffDialog** | 버전 Diff 뷰어 | — |
| **VersionButtons** | 이력 보기 버튼 그룹 | — |
| **AttachmentManager** | 첨부파일 업로드/목록/삭제 | refTableName, refPkId, attachments, onChanged |
| **FileUploadZone** | 드래그앤드롭 파일 업로드 | onUpload, accept |
| **MarkdownEditor** | TipTap 마크다운 에디터 | value, onChange, label, rows, placeholder, refTableName?, refPkId?, fieldName? |
| **RichTextEditor** | TipTap WYSIWYG (이미지 지원) | value, onChange |
| **MermaidRenderer** | Mermaid 다이어그램 렌더링 | code: string |
| **ExcalidrawDialog** | Excalidraw 화이트보드 | value, onSave, saving |
| **LayoutEditor** | 레이아웃 JSON 에디터 | value: LayoutRow[], onChange, areas? |

### 7.3 특수 컴포넌트

| 컴포넌트 | 위치 | 역할 |
|---------|------|------|
| **AiDesignRequestDialog** | components/areas/ | AI 설계 요청 옵션 선택 다이얼로그 |
| **HistoryTab** | components/functions/ | AI 요청 이력 탭 (AiTask 목록) |
| **AcceptanceCriteriaEditor** | components/user-story/ | AC 편집기 |
| **AppShell** | components/layout/ | 루트 레이아웃 (Header + Sidebar + Main) |

---

## 8. 유틸리티 라이브러리 (`src/lib/`)

### 8.1 utils.ts

```typescript
// Tailwind 클래스 병합
export function cn(...inputs: ClassValue[]): string

// 에러 처리 fetch 래퍼 (에러 시 throw)
export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T>

// API 응답 헬퍼
export function apiSuccess<T>(data: T, status = 200): NextResponse
export function apiError(code: string, message: string, status = 400): NextResponse

// 날짜 포맷
export function formatDate(dateStr: string): string       // "YYYY-MM-DD"
export function formatDateTime(dateStr: string): string   // "YYYY-MM-DD HH:mm"
```

### 8.2 sequence.ts

```typescript
// prefix로 시퀀스 조회 후 증분, "RQ-00001" 형식 반환
export async function generateSystemId(prefix: string): Promise<string>
// 예: await generateSystemId("RQ") → "RQ-00001"
// 지원 prefix: T, RQ, PID, AR, FID, ATK, USR, STD
```

### 8.3 contentVersion.ts

```typescript
// 현재 내용을 버전 이력으로 저장
export async function saveContentVersion(params: {
  refTableName: string;
  refPkId: number;
  fieldName: string;
  currentContent: string | null;
  changedBy?: string;
  aiTaskId?: number;
}): Promise<void>
```

### 8.4 constants.ts

```typescript
// 기능 상태 레이블
export const FUNC_STATUS_LABEL: Record<string, { label: string; class: string }>

// 영역 유형 목록
export const AREA_TYPES = [
  { value: "GRID", label: "그리드" },
  { value: "FORM", label: "폼" },
  { value: "INFO_CARD", label: "정보카드" },
  { value: "TAB", label: "탭" },
  { value: "FULL_SCREEN", label: "전체화면" },
]

// 영역 상태 레이블
export const AREA_STATUS_LABEL: Record<string, { label: string; class: string }>
```

### 8.5 prd/ — PRD 생성기 (버전 관리)

```typescript
// 사용법
import { generateScreenPrd, PRD_VERSIONS } from "@/lib/prd";

const markdown = generateScreenPrd(screen, config?);
// → 화면 PRD 마크다운 반환

// 버전 업그레이드: index.ts에서 import 경로만 변경
// 구버전 파일(v1.ts 등)은 절대 삭제하지 않음
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
   → AiTask 자동 생성 (taskType: "REVIEW")
   → AI 워커가 폴링 → 처리 → feedback 저장
   → REVIEW_DONE → DESIGN_REQ → DESIGN_DONE → CONFIRM_Y

⑦ 구현
   → IMPL_REQ → AI 구현 → gitlabPrUrl 연결
   → IMPL_DONE → 개발 완료
```

### 9.2 AI 태스크 생명주기

```
생성 (NONE)
  ↓ [AI 워커: PATCH /api/ai/tasks/{id}/start]
실행 중 (RUNNING)
  ↓ [AI 워커: POST /api/ai/tasks/{id}/complete]
완료 상태 중 하나:
  - SUCCESS      정상 완료
  - AUTO_FIXED   자동 수정 완료
  - NEEDS_CHECK  확인 필요
  - WARNING      경고 있음
  - FAILED       실패
```

### 9.3 Function 상태 전이 (PATCH /api/functions/[id])

```
DRAFT
  → REVIEW_REQ   (AI 검토 요청 → AiTask 자동 생성)
  → AI_REVIEWING (AI 처리 중)
  → REVIEW_DONE  (검토 완료 → aiInspFeedback 저장)
  → DESIGN_REQ   (설계 요청 → AiTask 자동 생성)
  → DESIGN_DONE  (설계 완료 → aiDesignContent 저장)
  → CONFIRM_Y    (사용자 컨펌)
  → IMPL_REQ     (구현 요청 → AiTask 자동 생성)
  → AI_IMPLEMENTING
  → IMPL_DONE
```

### 9.4 Area 상태 전이 (PATCH /api/areas/[id])

```
NONE
  → DESIGN_REQ   (AI 설계 요청 → AiTask 자동 생성)
                 AiTask.spec = body.aiSpec ?? area.spec
  → DESIGN_DONE  (설계 완료)
  → CONFIRM_Y    (컨펌)
```

### 9.5 버전 이력 자동 저장

```typescript
// Requirement PUT 시
if (saveHistoryFields.includes("current_content")) {
  await saveContentVersion({
    refTableName: "tb_requirement",
    refPkId: id,
    fieldName: "current_content",
    currentContent: existing.currentContent,
    changedBy: "user"
  });
}
```

---

## 10. 코딩 패턴 & 컨벤션

### 10.1 API Route 패턴

```typescript
// src/app/api/[domain]/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const numId = parseInt(id);
  if (isNaN(numId)) return apiError("INVALID_ID", "유효하지 않은 ID입니다.");

  const data = await prisma.entity.findUnique({ where: { id: numId } });
  if (!data) return apiError("NOT_FOUND", "찾을 수 없습니다.", 404);

  return apiSuccess(data);
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = await prisma.entity.update({
      where: { id: parseInt(id) },
      data: { field: body.field ?? undefined },
    });
    return apiSuccess(data);
  } catch (error) {
    console.error(error);
    return apiError("SERVER_ERROR", "수정에 실패했습니다.", 500);
  }
}
```

### 10.2 페이지 컴포넌트 패턴

```typescript
// src/app/[domain]/[id]/page.tsx
"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/utils";

export default function EntityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["entity", id],
    queryFn: async () => {
      const res = await fetch(`/api/entity/${id}`);
      return res.json();
    },
    gcTime: 0,
  });

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch(`/api/entity/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entity", id] });
      toast.success("저장되었습니다.");
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <div className="text-muted-foreground">로딩 중...</div>;
  if (!data?.data) return <div>찾을 수 없습니다.</div>;

  return <div>{/* 화면 렌더 */}</div>;
}
```

### 10.3 공통 패턴

```typescript
// ✅ Zod v4 에러 메시지 (required_error 없음)
const schema = z.object({
  name: z.string({ error: "필수값입니다." }).min(1),
});

// ✅ DataGrid 사용
const columns: ColumnDef<Row, unknown>[] = [
  { accessorKey: "systemId", header: "ID", size: 110 },
  { accessorKey: "name", header: "이름" },
  {
    accessorKey: "status",
    header: "상태",
    cell: ({ getValue }) => <StatusBadge status={getValue() as string} />,
  },
];
<DataGrid columns={columns} data={data} onRowClick={(row) => router.push(`/domain/${row.id}`)} />

// ✅ useSearchParams는 Suspense 필수
export default function Page() {
  return <Suspense><Content /></Suspense>;
}
```

---

## 11. 환경 변수 & 설정

### 11.1 .env

```env
DATABASE_URL="file:./dev.db"           # SQLite (개발)
# DATABASE_URL="postgresql://..."       # PostgreSQL (프로덕션)
# DIRECT_URL="postgresql://..."         # 직접 연결 (Supabase 등)
```

### 11.2 파일 업로드 경로

```
public/uploads/attachments/   ← 첨부파일 저장 위치
```

### 11.3 AI 워커 인증

```
X-API-Key: openclaw-api-key-here
```

### 11.4 AI 프롬프트 파일 위치

```
docs/prompts/{table_short}-{taskType_lower}.md
예) docs/prompts/area-design.md
    docs/prompts/function-inspect.md
```

---

## 12. 현재 구현 완료된 기능 목록

### ✅ 완전 구현

| 기능 | 상태 |
|------|------|
| 대시보드 (상태별 집계, AI 피드) | 완료 |
| 과업 CRUD | 완료 |
| 요구사항 CRUD + 4탭 에디터 + 버전 이력 | 완료 |
| 화면 CRUD + 카테고리 + PRD 내보내기 | 완료 |
| 영역 CRUD + Excalidraw + AI 설계 요청 다이얼로그 | 완료 |
| 기능 CRUD + 상태 생명주기 + AI 요청 | 완료 |
| 사용자 스토리 + AC 에디터 + 화면 매핑 | 완료 |
| 기획 보드 (IA/PROCESS/MOCKUP) + 화면 승격 | 완료 |
| AI 태스크 관리 (NONE→RUNNING→SUCCESS) | 완료 |
| AI 워커 API (`/api/ai/tasks`) | 완료 |
| 첨부파일 업로드/다운로드/삭제 | 완료 |
| 버전 이력 저장 + Diff 뷰어 | 완료 |
| DB 스키마 관리 + DDL 파서 | 완료 |
| 표준 가이드 + AI 검사 | 완료 |
| 화면 구성 (composition) 뷰 | 완료 |
| PRD 생성기 (버전별 구조) | 완료 |
| DataGrid 공통 컴포넌트 | 완료 |

### 🔲 미구현 / 개선 예정

| 기능 | 비고 |
|------|------|
| Area PRD 생성기 (`area/v1.ts`) | stub 상태 |
| Function PRD 생성기 (`function/v1.ts`) | stub 상태 |
| 계획 보드 AI 자동화 연동 | manual 처리 |
| 실시간 알림 (AI 완료 등) | 폴링 방식 |

---

## 13. 주요 데이터 예시 (AI 참고용)

### systemId 형식

```
과업:       T-00001
요구사항:   RQ-00001
화면:       PID-00001
영역:       AR-00001
기능:       FID-00001
AI 태스크: ATK-00001
사용자스토리: USR-00001
표준가이드: STD-001
```

### Function 상태 클래스 (Tailwind)

```
DRAFT          → bg-gray-100 text-gray-600
REVIEW_REQ     → bg-yellow-100 text-yellow-700 animate-pulse
AI_REVIEWING   → bg-blue-100 text-blue-700
REVIEW_DONE    → bg-green-100 text-green-700
DESIGN_REQ     → bg-amber-100 text-amber-700 animate-pulse
DESIGN_DONE    → bg-emerald-100 text-emerald-700
CONFIRM_Y      → bg-purple-100 text-purple-700
IMPL_REQ       → bg-orange-100 text-orange-700 animate-pulse
AI_IMPLEMENTING→ bg-cyan-100 text-cyan-700
IMPL_DONE      → bg-teal-100 text-teal-700
```

### PRD 생성 파일명 패턴

```
PRD_screen-v1_{systemId}_{name}.md
예) PRD_screen-v1_PID-00001_과업목록.md
```

---

## 14. 개발 참고사항

1. **Prisma 버전**: v6 사용 (v7은 config 포맷이 달라 호환 안 됨)
2. **Zod 버전**: v4 — `required_error`/`invalid_type_error` 없음, `error: "msg"` 사용
3. **Tailwind v4**: config 파일 없음, `globals.css`의 `@theme {}` 에서 설정
4. **route params**: 반드시 `Promise<{ id: string }>` + `await params`
5. **useSearchParams**: `<Suspense>` 경계 필수
6. **gcTime: 0**: 페이지 이동 시 항상 새로 조회하기 위해 모든 useQuery에 설정
7. **한글 파일 전송**: curl 대신 Python urllib 사용 (UTF-8 보장)
8. **API 키**: AI 워커는 `X-API-Key: openclaw-api-key-here` 헤더 필수

---

*이 문서는 2026-03-15 기준으로 자동 생성되었습니다.*
*코드 변경 시 이 문서도 함께 업데이트해야 합니다.*
