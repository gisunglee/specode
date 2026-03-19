# SPECODE — 프로젝트 PRD (2026-03-19 기준)

> **이 문서 하나로 프로젝트를 처음 보는 AI가 즉시 개발에 참여할 수 있도록 작성되었습니다.**
>
> 현재 상태: **현행 단일 테넌트 버전** (프로젝트/사용자/롤 미구현)
> 목표 상태: **멀티 테넌트 SaaS 정식 버전** (Section 3 참조)

---

## 1. 현행 시스템 PRD

### 1.1 한 줄 정의

**SPECODE(AI Dev Hub)** — AI와 협력하는 SI 개발 자동화 플랫폼.
과업(RFP) → 요구사항 → 단위업무 → 화면 → 영역 → 기능까지 계층적으로 관리하며,
AI가 설계 검토·상세 설계·목업 생성·구현 가이드를 비동기로 처리한다.

### 1.2 핵심 사용자

| 역할 | 주요 업무 |
|------|---------|
| PM / 분석가 | RFP 분석, 과업·요구사항 등록, 기획 보드 작성 |
| UI/UX 설계자 | 화면·영역 설계, Excalidraw 도안, 단위업무 구성 |
| 개발자 | 기능 명세 작성, AI 설계 검토, PR URL 등록 |
| AI 워커 | `/run-claude-tasks` 슬래시 커맨드로 AI 태스크 일괄 처리 |

### 1.3 핵심 가치

- **계층적 추적성**: 과업 → 요구사항 → 단위업무 → 화면 → 영역 → 기능 단방향 연결
- **AI 자동화**: 기능 단위 설계·검토·구현, 목업 HTML 생성을 AI가 비동기 처리
- **목업 자동 생성**: 화면·영역 단위로 HTML 목업 AI 생성 → iframe 즉시 미리보기
- **버전 관리**: 마크다운 필드 변경 이력 저장 + Diff 뷰어
- **일괄 설계**: bulk-design 화면에서 화면/영역/기능을 계층 탐색하며 일괄 명세 편집
- **표준 가이드**: UI/API/보안/DB 등 카테고리별 표준 문서 + AI 검토
- **MCP 서버**: stdio·HTTP 모드로 외부 AI 에이전트가 SPECODE 데이터에 직접 접근

---

### 1.4 기술 스택

#### 런타임 & 프레임워크

| 항목 | 버전 | 비고 |
|------|------|------|
| Node.js | 20+ | 런타임 |
| Next.js | 16.1.6 | App Router, Route Handlers |
| React | 19 | "use client" 페이지 |
| TypeScript | 5.x | strict 모드 |

#### UI & 스타일링

| 항목 | 비고 |
|------|------|
| Tailwind CSS v4 | `@import "tailwindcss"` + `@theme {}` (config 파일 없음) |
| Radix UI | Dialog, Select, Tabs, Accordion, Popover, Tooltip, Checkbox |
| Class Variance Authority | variant 스타일링 |
| Lucide React | 아이콘 |
| Sonner | 토스트 |
| Framer Motion | 애니메이션 |

#### 데이터 & 상태

| 항목 | 비고 |
|------|------|
| Prisma 6.x | PostgreSQL(프로덕션) / SQLite(개발) |
| TanStack Query v5 | useQuery, useMutation |
| TanStack Table v8 | DataGrid 컴포넌트 기반 |

#### 에디터 & 콘텐츠

| 항목 | 비고 |
|------|------|
| TipTap | WYSIWYG 리치텍스트 (RichTextEditor), 마크다운 (MarkdownEditor) |
| React Markdown + Remark GFM | 마크다운 렌더링 |
| Excalidraw | 화이트보드/설계 도구 |
| Mermaid | 다이어그램 렌더링 |
| React Diff Viewer | Diff 비교 |

#### 중요 Next.js 16 패턴

```typescript
// ✅ Route params는 반드시 Promise로 받아야 함
type RouteParams = { params: Promise<{ id: string }> };
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
}

// ✅ useSearchParams()는 Suspense 경계 필요
export default function Page() {
  return <Suspense fallback={null}><Content /></Suspense>;
}

// ✅ Tailwind v4 (config 파일 없음)
// globals.css
@import "tailwindcss";
@theme { --color-primary: oklch(...); }
```

---

### 1.5 도메인 계층 구조

```
Task (과업 — RFP 대항목)
  └── Requirement (요구사항)
        ├── UnitWork (단위업무)
        │     └── Screen (화면)
        │           └── Area (영역)
        │                 └── Function (기능)
        │                       └── AiTask (AI 작업 큐)
        └── UserStory (사용자 스토리)
              └── ScreenStoryMap ← Screen

PlanningDraft (기획 초안)
  ├── PlanningReqMap → Requirement
  └── PlanningDraftRefMap → PlanningDraft (기획 간 참조)

StandardGuide (표준 가이드)
  └── AiTask (REVIEW/INSPECT)

DbSchema (DB 스키마 메타데이터)
ContentVersion (필드별 변경 이력)
Attachment (첨부파일)
```

---

### 1.6 DB 스키마 전체

#### Task (tb_task)
```sql
taskId        INT      PK
systemId      STRING   UK "T-00001"
taskNo        STRING?
name          STRING   필수
category      STRING?
definition    STRING?
outputInfo    STRING?
rfpPage       INT?
content       STRING?  RFP 원문
createdAt     DATETIME
```

#### Requirement (tb_requirement)
```sql
requirementId   INT      PK
systemId        STRING   UK "RQ-00001"
name            STRING   필수
originalContent STRING?  원문 (RichText)
currentContent  STRING?  최종본 (RichText)
detailSpec      STRING?  명세서 (마크다운)
discussionMd    STRING?  협의내용 (마크다운)
priority        STRING?
taskId          INT?     FK → Task
source          STRING   "RFP"|"내부"|"추가" 기본="RFP"
createdAt, updatedAt DATETIME
```

#### UnitWork (tb_unit_work) ← 신규
```sql
unitWorkId    INT      PK
systemId      STRING   UK "UW-00001"
requirementId INT      FK → Requirement
name          STRING   필수
description   STRING?
sortOrder     INT      기본=0
useYn         STRING   "Y"|"N" 기본="Y"
createdAt, updatedAt DATETIME
```

#### Screen (tb_screen)
```sql
screenId        INT      PK
systemId        STRING   UK "PID-00001"
displayCode     STRING?
name            STRING   필수
screenType      STRING?  "LIST"|"DETAIL"|"POPUP"|"TAB"
requirementId   INT      FK → Requirement
unitWorkId      INT?     FK → UnitWork (nullable — 하위 호환)
spec            STRING?  화면 설명 (마크다운)
layoutData      STRING?  레이아웃 JSON
categoryL/M/S   STRING?  메뉴 분류
menuOrder       INT?
createdAt, updatedAt DATETIME
```

#### Area (tb_area)
```sql
areaId          INT      PK
areaCode        STRING   UK "AR-00001"
screenId        INT?     FK → Screen
name            STRING   필수
sortOrder       INT      기본=1
areaType        STRING   "GRID"|"FORM"|"INFO_CARD"|"TAB"|"FULL_SCREEN"
spec            STRING?  설계 (마크다운)
layoutData      STRING?  레이아웃 JSON
designData      STRING?  Excalidraw JSON
reqComment      STRING?  AI 요청 코멘트
aiFeedback      STRING?  AI 설계 결과
status          STRING   "NONE"|"DESIGN_REQ"|"DESIGN_DONE"|"CONFIRM_Y"
useYn           STRING   "Y"|"N" 기본="Y"
createdAt, updatedAt DATETIME
```

#### Function (tb_function)
```sql
functionId      INT      PK
systemId        STRING   UK "FID-00001"
displayCode     STRING?
name            STRING   필수
areaId          INT?     FK → Area
sortOrder       INT?
spec            STRING?  기능 명세 (마크다운)
status          STRING   "DRAFT"|"REVIEW_REQ"|"AI_REVIEWING"|"REVIEW_DONE"
                         |"DESIGN_REQ"|"DESIGN_DONE"|"CONFIRM_Y"
                         |"IMPL_REQ"|"AI_IMPLEMENTING"|"IMPL_DONE"
priority        STRING   "HIGH"|"MEDIUM"|"LOW" 기본="MEDIUM"
aiInspFeedback  STRING?  AI 검토 피드백
aiDesignContent STRING?  AI 상세 설계
aiImplFeedback  STRING?  AI 구현 가이드
refContent      STRING?  참고 프로그램
gitlabPrUrl     STRING?
changeReason    STRING?
createdAt, updatedAt DATETIME
```

#### AiTask (tb_ai_task)
```sql
aiTaskId        INT      PK
systemId        STRING   UK "ATK-00001"
refTableName    STRING   "tb_function"|"tb_standard_guide"|"tb_area"
                         |"tb_planning_draft"|"tb_screen"
refPkId         INT
taskType        STRING   "DESIGN"|"REVIEW"|"IMPLEMENT"|"IMPACT"|"REPROCESS"
                         |"INSPECT"|"PRD_EXPORT"|"PLANNING"|"MOCKUP"
taskStatus      STRING   "NONE"|"RUNNING"|"SUCCESS"|"AUTO_FIXED"
                         |"NEEDS_CHECK"|"WARNING"|"FAILED" 기본="NONE"
spec            STRING?  AI 호출 시점 스냅샷
comment         STRING?  추가 요청사항
feedback        STRING?  AI 결과 (마크다운 또는 HTML)
requestedAt     DATETIME 기본=now()
startedAt, completedAt DATETIME?
```

#### 기타 테이블

| 테이블 | 역할 |
|--------|------|
| ContentVersion (tb_content_version) | 필드별 변경 이력 (refTable, refPk, fieldName, content, changedBy) |
| UserStory (tb_user_story) | 페르소나/시나리오/인수조건 |
| ScreenStoryMap (tb_screen_story_map) | 화면-스토리 N:M 매핑 |
| PlanningDraft (tb_planning_draft) | 기획 초안 (planType: IA/PROCESS/MOCKUP) |
| PlanningReqMap (tb_planning_req_map) | 기획-요구사항 매핑 |
| PlanningDraftRefMap (tb_planning_draft_ref_map) | 기획 간 참조 |
| StandardGuide (tb_standard_guide) | 표준 가이드 (category + content + AI 피드백) |
| DbSchema (tb_db_schema) | DDL 메타데이터 |
| Attachment (tb_attachment) | 첨부파일 (refTable + refPk 범용) |
| Sequence (tb_sequence) | SystemId 채번 (T, RQ, UW, PID, AR, FID, ATK, STD, USR) |

---

### 1.7 AI 워크플로우

#### 태스크 생명주기

```
생성 (NONE)
  ↓ AI 워커: PATCH /api/ai/tasks/{id}/start
실행 중 (RUNNING)
  ↓ AI 워커: POST /api/ai/tasks/{id}/complete
결과:
  SUCCESS      정상 완료
  AUTO_FIXED   자동 수정 완료
  NEEDS_CHECK  사람 확인 필요
  WARNING      경고 있음
  FAILED       실패
```

#### Function 상태 전이

```
DRAFT
  → REVIEW_REQ    → AiTask(INSPECT) 생성 → aiInspFeedback 저장 → REVIEW_DONE
  → DESIGN_REQ    → AiTask(DESIGN) 생성  → aiDesignContent 저장 → DESIGN_DONE
  → CONFIRM_Y     사용자 컨펌
  → IMPL_REQ      → AiTask(IMPLEMENT) 생성 → aiImplFeedback 저장 → IMPL_DONE
```

#### onTaskComplete 훅 — 엔티티 자동 업데이트

| refTableName | taskType | 업데이트 대상 |
|---|---|---|
| tb_function | INSPECT | aiInspFeedback, status→REVIEW_DONE |
| tb_function | DESIGN | aiDesignContent, status→DESIGN_DONE + ContentVersion |
| tb_function | IMPLEMENT | aiImplFeedback, status→IMPL_DONE |
| tb_area | DESIGN | aiFeedback, status→DESIGN_DONE |
| tb_area | MOCKUP | (AiTask.feedback에만 저장, 상태 변경 없음) |
| tb_screen | MOCKUP | (AiTask.feedback에만 저장, 상태 변경 없음) |
| tb_standard_guide | REVIEW | (AiTask.feedback에만 저장) |
| tb_planning_draft | PLANNING | resultContent, resultType 자동 결정 (IA→MD, PROCESS→MERMAID, MOCKUP→HTML) |

#### AI 워커 실행 방식 (`/run-claude-tasks`)

```
1. GET /api/ai/tasks?limit=10  — 대기(NONE) 태스크 조회
2. 각 태스크:
   a. PATCH /api/ai/tasks/{id}/start  (RUNNING)
   b. task.attachments에서 이미지 다운로드 → Read 도구로 분석
   c. docs/prompts/{table_short}-{taskType_lower}.md 프롬프트 파일 로드
   d. spec + 이미지 + 프롬프트 기반 분석 수행
   e. 결과 → d:/tmp/specode_fb_{id}.md 저장 (Write 도구)
   f. python .claude/commands/task_complete.py {id} SUCCESS {file}
3. rm -f d:/tmp/specode_fb_*.md 정리
```

프롬프트 파일 경로 패턴: `docs/prompts/{table_short}-{taskType_lower}.md`
예) `tb_standard_guide` + `REVIEW` → `docs/prompts/standard_guide-review.md`

---

### 1.8 MCP 서버

SPECODE 데이터에 외부 AI 에이전트가 직접 접근할 수 있도록 Prisma 직접 연결 MCP 서버를 제공합니다.

```bash
# stdio 모드 (Claude Code 로컬 연결)
npx tsx mcp/server.ts

# HTTP 모드 (claude.ai, ngrok 등 외부 연결)
MCP_HTTP_PORT=3001 MCP_API_KEY=비밀키 npx tsx mcp/server.ts
```

제공 도구: `list_screens`, `get_screen`, `list_areas`, `get_area`, `list_functions`, `get_function`, `list_requirements`, `list_ai_tasks`, `create_area`, `create_function`, `update_function`, `request_design`, `request_implement_function/area/screen`

---

### 1.9 API 엔드포인트 목록

#### 표준 응답 포맷

```typescript
// 성공
{ success: true, data: T, pagination?: { page, pageSize, total, totalPages } }
// 에러
{ success: false, error: { code: string, message: string } }
```

#### 전체 라우트 목록

| Method | URL | 설명 |
|--------|-----|------|
| GET | `/api/dashboard` | 상태별 KPI 집계, 최근 AI 활동 피드 |
| GET | `/api/dashboard2` | 개발 현황판 상세 |
| GET | `/api/tree` | 전체 계층 트리 (Task→Req→Screen→Fn) |
| GET/POST | `/api/tasks` | 과업 목록/등록 |
| GET/PUT/DELETE | `/api/tasks/[id]` | 과업 상세/수정/삭제 |
| GET/POST | `/api/requirements` | 요구사항 목록/등록 |
| GET/PUT/DELETE | `/api/requirements/[id]` | 요구사항 상세/수정/삭제 |
| GET/POST | `/api/unit-works` | 단위업무 목록/등록 |
| GET/PUT/DELETE | `/api/unit-works/[id]` | 단위업무 상세/수정/삭제 |
| GET | `/api/unit-works/[id]/prd` | 단위업무 PRD 다운로드 |
| GET/POST | `/api/screens` | 화면 목록/등록 |
| GET/PUT/PATCH/DELETE | `/api/screens/[id]` | 화면 상세/수정/액션/삭제 |
| GET | `/api/screens/[id]/prd` | 화면 PRD 다운로드 |
| GET/POST | `/api/screens/[id]/story-map` | 사용자스토리 매핑 |
| GET/POST | `/api/areas` | 영역 목록/등록 |
| GET/PUT/PATCH/DELETE | `/api/areas/[id]` | 영역 상세/수정/액션/삭제 |
| GET | `/api/areas/[id]/prd` | 영역 PRD 다운로드 |
| GET/POST | `/api/functions` | 기능 목록/등록 |
| GET/PUT/PATCH/DELETE | `/api/functions/[id]` | 기능 상세/수정/상태변경/삭제 |
| GET | `/api/functions/[id]/prd` | 기능 PRD 다운로드 |
| GET/POST | `/api/user-stories` | 사용자 스토리 |
| GET/PUT/DELETE | `/api/user-stories/[id]` | 스토리 상세/수정/삭제 |
| GET/POST | `/api/planning` | 기획 목록/등록 |
| GET/PUT/DELETE | `/api/planning/[id]` | 기획 상세/수정/삭제 |
| POST | `/api/planning/[id]/make` | 화면으로 승격 |
| POST | `/api/planning/[id]/duplicate` | 복제 |
| GET/POST/DELETE | `/api/planning/[id]/req-map` | 요구사항 연결 |
| GET/POST/DELETE | `/api/planning/[id]/plan-ref-map` | 기획 간 참조 |
| GET/POST | `/api/standard-guides` | 표준 가이드 목록/등록 |
| GET/PUT/DELETE | `/api/standard-guides/[id]` | 가이드 상세/수정/삭제 |
| POST | `/api/standard-guides/[id]/inspect` | AI 검토 요청 |
| GET/POST | `/api/db-schema` | DB 스키마 목록/등록 |
| GET/PUT/DELETE | `/api/db-schema/[id]` | 스키마 상세/수정/삭제 |
| GET | `/api/db-schema/columns` | 컬럼 메타데이터 조회 |
| GET/POST | `/api/content-versions` | 변경 이력 |
| GET/POST | `/api/attachments` | 첨부파일 업로드/목록 |
| GET/DELETE | `/api/attachments/[id]` | 파일 다운로드/삭제 |
| GET/POST | `/api/ai-tasks` | AI 작업 현황 (내부용) |
| GET/PATCH/DELETE | `/api/ai-tasks/[id]` | AI 작업 상세/상태변경/삭제 |
| GET | `/api/ai/tasks` | AI 워커 폴링 전용 (X-API-Key 인증) |
| PATCH | `/api/ai/tasks/[id]/start` | AI 워커: 시작 |
| POST | `/api/ai/tasks/[id]/complete` | AI 워커: 완료 |
| GET/POST | `/api/design-contents` | 설계 컨텐츠 |
| GET/PUT/DELETE | `/api/design-contents/[id]` | 설계 컨텐츠 상세 |
| POST | `/api/design-import` | AI 설계 일괄 가져오기 |
| GET | `/api/openapi` | OpenAPI 명세 |

---

### 1.10 코드 컨벤션

```typescript
// API 응답 — 반드시 이 형식
import { apiSuccess, apiError } from "@/lib/utils";
return apiSuccess(data);
return apiError("NOT_FOUND", "메시지", 404);

// System ID 생성
import { generateSystemId } from "@/lib/sequence";
const id = await generateSystemId("RQ");  // → "RQ-00001"
// 접두사: T, RQ, UW, PID, AR, FID, ATK, STD, USR

// 버전 이력 저장
import { saveContentVersion } from "@/lib/contentVersion";
await saveContentVersion({ refTableName, refPkId, fieldName, currentContent, changedBy });
```

---

---

## 2. SPECODE 현행 시스템 기능 하이어라키

> SPECODE 자체를 SPECODE로 분석했을 때의 단위업무 → 화면 → 영역 → 기능 전체 목록

---

### 단위업무 1: 대시보드/현황 관리

#### 화면 1-1: 대시보드 (`/`)
| 영역 | 유형 | 주요 기능 |
|------|------|---------|
| KPI 집계 카드 | INFO_CARD | 기능 상태별 건수 조회, 오늘/이번주 AI 처리 건수 표시 |
| AI 활동 피드 | LIST | 최근 AI 태스크 목록 조회(성공/실패), 클릭 시 상세 이동 |
| 기능 상태 분포 | INFO_CARD | 전체 기능 상태 분포 비율 계산 및 표시 |

#### 화면 1-2: 개발 현황판 (`/dashboard2`)
| 영역 | 유형 | 주요 기능 |
|------|------|---------|
| 진행률 요약 | INFO_CARD | 단계별(설계/검토/구현) 진행률 계산, 완료율 표시 |
| 상태 분포 차트 | INFO_CARD | Function 상태별 건수 집계 |
| 기능별 현황 테이블 | GRID | 기능 목록 + 상태 + AI 처리 여부 표시 |

#### 화면 1-3: 트리 뷰 (`/tree`)
| 영역 | 유형 | 주요 기능 |
|------|------|---------|
| 계층 트리 탐색기 | FULL_SCREEN | Task→Req→UnitWork→Screen→Area→Function 전체 계층 조회, 노드 펼침/접힘, 검색 필터 |

#### 화면 1-4: 화면 구성 (`/composition`, `/composition/[screenId]`)
| 영역 | 유형 | 주요 기능 |
|------|------|---------|
| 화면 선택 패널 | LIST | 화면 목록 조회 및 선택 |
| 영역·기능 매트릭스 | GRID | 선택 화면의 영역별 기능 목록 시각화, 기능 상태 표시 |

---

### 단위업무 2: 과업(Task) 관리

#### 화면 2-1: 과업 목록 (`/tasks`)
| 영역 | 유형 | 주요 기능 |
|------|------|---------|
| 검색 필터 바 | FORM | 키워드 검색 |
| 과업 DataGrid | GRID | 과업 목록 조회(페이징), 과업 등록, 과업 수정, 과업 삭제 |

#### 화면 2-2: 과업 상세 (`/tasks/[id]`)
| 영역 | 유형 | 주요 기능 |
|------|------|---------|
| 기본정보 폼 | FORM | 과업번호·명칭·분류·RFP페이지·정의·산출정보 수정 |
| RFP 원문 에디터 | FULL_SCREEN | RFP 원문 마크다운 편집 |
| 하위 요구사항 목록 | GRID | 이 과업에 연결된 요구사항 목록 조회, 요구사항 상세 이동 |

---

### 단위업무 3: 요구사항(Requirement) 관리

#### 화면 3-1: 요구사항 목록 (`/requirements`)
| 영역 | 유형 | 주요 기능 |
|------|------|---------|
| 검색/필터 바 | FORM | 키워드 검색, 과업 필터 |
| 요구사항 DataGrid | GRID | 요구사항 목록 조회(페이징), 요구사항 등록, 행 클릭으로 인라인 패널 열기 |
| 인라인 편집 패널 | TAB | 4탭(원본/최종본/명세서/협의내용) 편집, 저장 시 버전 이력 자동 저장, Diff 뷰어 |

#### 화면 3-2: 요구사항 허브 (`/req-hub`)
| 영역 | 유형 | 주요 기능 |
|------|------|---------|
| 통합 뷰 | FULL_SCREEN | 요구사항-단위업무-화면-기능 연결 관계 통합 조회 |

---

### 단위업무 4: 사용자 스토리 관리

#### 화면 4-1: 사용자 스토리 목록 (`/user-stories`)
| 영역 | 유형 | 주요 기능 |
|------|------|---------|
| 검색/필터 바 | FORM | 요구사항 필터, 페르소나 필터 |
| 스토리 DataGrid | GRID | 스토리 목록 조회, 스토리 등록, 수정, 삭제 |
| 스토리 편집 다이얼로그 | FORM | 페르소나·시나리오·인수조건(AC) 편집 |
| 화면 매핑 패널 | GRID | 이 스토리와 연결된 화면 목록, 매핑 추가/삭제 |

---

### 단위업무 5: 기획 보드

#### 화면 5-1: 기획 보드 목록 (`/planning`)
| 영역 | 유형 | 주요 기능 |
|------|------|---------|
| 기획 그룹 목록 | LIST | groupUuid 기준 기획 세트 목록 조회 |
| 기획 카드 그리드 | GRID | 세트 내 기획 카드(IA/PROCESS/MOCKUP) 표시, 기획 등록, 삭제 |

#### 화면 5-2: 기획 보드 상세 (`/planning/[id]`)
| 영역 | 유형 | 주요 기능 |
|------|------|---------|
| 기획 설정 폼 | FORM | planType(IA/PROCESS/MOCKUP), 기획명, isPicked 설정 |
| 아이디어 입력 | FORM | manualInfo(상세 아이디어) 마크다운 편집, comment(AI 지시) 입력 |
| 연결 요구사항 | GRID | 요구사항 검색 및 연결, 연결된 요구사항 목록 |
| 참조 기획 연결 | GRID | 다른 기획 결과물을 AI 컨텍스트로 참조 설정 |
| AI 결과 뷰어 | FULL_SCREEN | resultContent 렌더링(MD/Mermaid/HTML), AI 기획 생성 요청, 진행 상태 표시 |
| 하단 액션 바 | FORM | 화면으로 승격, 기획 복제, AI 재요청 |

---

### 단위업무 6: 단위업무(UnitWork) 관리

#### 화면 6-1: 단위업무 목록 (`/unit-works`)
| 영역 | 유형 | 주요 기능 |
|------|------|---------|
| 검색/필터 바 | FORM | 요구사항 필터, 키워드 검색 |
| 단위업무 DataGrid | GRID | 단위업무 목록 조회, 등록, 수정, 삭제 |

#### 화면 6-2: 단위업무 상세 (`/unit-works/[id]`)
| 영역 | 유형 | 주요 기능 |
|------|------|---------|
| 기본정보 폼 | FORM | 단위업무명·설명·정렬순서 수정 |
| 하위 화면 목록 | GRID | 이 단위업무에 속한 화면 목록, 화면 상세 이동 |
| 단위업무 PRD | FORM | PRD 생성 및 다운로드 (하위 화면+영역+기능 전체 포함) |

---

### 단위업무 7: 화면(Screen) 설계

#### 화면 7-1: 화면 목록 (`/screens`)
| 영역 | 유형 | 주요 기능 |
|------|------|---------|
| 검색/필터 바 | FORM | 키워드 검색, 단위업무 필터, 화면유형 필터 |
| 일괄 목업 요청 버튼 | FORM | 체크박스 선택 후 여러 화면 동시 목업 요청 |
| 화면 DataGrid | GRID | 화면 목록 조회(페이징), 행 클릭→상세, 수정/삭제/기능목록 버튼 |

#### 화면 7-2: 화면 상세 (`/screens/[id]`)
| 영역 | 유형 | 주요 기능 |
|------|------|---------|
| 기본정보 폼 | FORM | 화면명·유형·표시코드·메뉴분류(대/중/소)·정렬 수정 |
| 화면 설명 에디터 | FORM | spec 마크다운 편집 |
| 레이아웃 에디터 | FORM | JSON 기반 레이아웃 구성 |
| 목업 요청/보기 | FORM | 목업 요청 다이얼로그(comment 입력), 목업 보기(iframe HTML 렌더링), 3초 폴링 |
| 하위 영역 목록 | GRID | 이 화면의 영역 목록, 영역 등록, 상세 이동 |
| 사용자스토리 매핑 | GRID | 화면-스토리 매핑 추가/삭제 |
| PRD 내보내기 | FORM | 화면+영역+기능 PRD 다운로드 |

---

### 단위업무 8: 영역(Area) 설계

#### 화면 8-1: 영역 목록 (`/areas`)
| 영역 | 유형 | 주요 기능 |
|------|------|---------|
| 검색/필터 바 | FORM | 키워드 검색, 화면 필터, 상태 필터 |
| 영역 DataGrid | GRID | 영역 목록 조회(페이징), 영역 등록, 수정, 삭제 |

#### 화면 8-2: 영역 상세 (`/areas/[id]`)
| 영역 | 유형 | 주요 기능 |
|------|------|---------|
| 기본정보 폼 | FORM | 영역명·타입·화면연결·정렬 수정, 상태 변경 드롭다운 |
| 설계 에디터 | TAB | MarkdownEditor(spec), Excalidraw(designData), LayoutEditor(layoutData) |
| 첨부파일 관리 | FORM | 이미지/파일 업로드, 목록, 삭제 |
| AI 요청 | FORM | AI 설계 요청(코멘트 입력), 목업 요청, 진행 상태 표시 |
| AI 피드백 뷰어 | INFO_CARD | aiFeedback 마크다운 렌더링 |
| 목업 보기 | FORM | 최근 MOCKUP AiTask SUCCESS 시 iframe 팝업 |
| 하위 기능 목록 | GRID | 이 영역의 기능 목록, 기능 등록, 상세 이동 |
| PRD 내보내기 | FORM | 영역+기능 PRD 다운로드 |

---

### 단위업무 9: 기능(Function) 관리

#### 화면 9-1: 기능 목록 (`/functions`)
| 영역 | 유형 | 주요 기능 |
|------|------|---------|
| 검색/필터 바 | FORM | 키워드 검색, 상태 필터, 우선순위 필터, 화면 필터, 영역 필터 |
| 기능 DataGrid | GRID | 기능 목록 조회(다중 필터·페이징), 기능 등록, 상태 칩 클릭 변경 |

#### 화면 9-2: 기능 상세 (`/functions/[id]`)
| 영역 | 유형 | 주요 기능 |
|------|------|---------|
| 기본정보 탭 | FORM | 기능명·표시코드·우선순위·정렬·상태 수정, GitLab PR URL 등록 |
| 설계 탭 | TAB | spec(기본설계) 편집, refContent(참고) 편집, aiDesignContent(AI설계) 뷰어 |
| AI 피드백 탭 | INFO_CARD | aiInspFeedback(검토), aiDesignContent(설계), aiImplFeedback(구현가이드) 뷰어 |
| 이력 탭 | LIST | 상태 변경 이력, ContentVersion 조회, Diff 뷰어 |
| 상태 변경 액션 | FORM | REVIEW_REQ/DESIGN_REQ/IMPL_REQ 요청 다이얼로그 (코멘트 입력) |
| PRD 내보내기 | FORM | 기능 PRD 다운로드 |

---

### 단위업무 10: AI 작업 관리

#### 화면 10-1: AI 작업 현황 (`/ai-tasks`)
| 영역 | 유형 | 주요 기능 |
|------|------|---------|
| 상태 탭 필터 | TAB | 전체/대기/진행중/확인필요/완료/자동수정/주의/실패/취소됨 |
| 검색 필터 | FORM | 유형 드롭다운(기능/가이드/영역/화면/기획캔버스), 대상 키워드 검색 |
| AI 작업 DataGrid | GRID | 작업 목록 조회(상태·유형·대상 필터·페이징), 재실행 버튼, 취소 버튼, 10초 자동 폴링 |
| 작업 상세 다이얼로그 | FULL_SCREEN | 작업 명세서 뷰어, AI 피드백 뷰어, 재실행/강제종료/삭제 액션 |

---

### 단위업무 11: 일괄 설계 작업

#### 화면 11-1: 일괄 설계 (`/bulk-design`)
| 영역 | 유형 | 주요 기능 |
|------|------|---------|
| 계층 탐색 패널 | TREE | 화면→영역→기능 계층 선택 |
| 명세 편집 패널 | TAB | 선택된 화면/영역/기능의 명세 마크다운 편집 |
| 미리보기 패널 | INFO_CARD | 편집 중 명세 마크다운 렌더링 (고정 높이 스크롤) |
| 요구사항 다이얼로그 | FULL_SCREEN | 연결 요구사항 상세 조회 (원본/최종본 웹에디터 읽기전용, 명세서/협의내용 편집) |
| AI 일괄 설계 요청 | FORM | 선택 범위 기준 AI 설계 태스크 일괄 생성 |

---

### 단위업무 12: 설계 컨텐츠 관리

#### 화면 12-1: 설계 컨텐츠 목록 (`/design-contents`)
| 영역 | 유형 | 주요 기능 |
|------|------|---------|
| 검색 필터 바 | FORM | 키워드 검색, 유형 필터 |
| 컨텐츠 DataGrid | GRID | 설계 컨텐츠 목록 조회, 등록, 수정, 삭제 |

#### 화면 12-2: 설계 컨텐츠 상세 (`/design-contents/[id]`)
| 영역 | 유형 | 주요 기능 |
|------|------|---------|
| 컨텐츠 에디터 | FULL_SCREEN | 설계 컨텐츠 편집 |
| 이력 패널 | LIST | 변경 이력 조회 |

---

### 단위업무 13: 표준 가이드 관리

#### 화면 13-1: 표준 가이드 (`/standard-guides`)
| 영역 | 유형 | 주요 기능 |
|------|------|---------|
| 카테고리 필터/검색 | FORM | 카테고리(UI/API/보안/...) 필터, 키워드 검색 |
| 가이드 DataGrid | GRID | 가이드 목록 조회(페이징), 가이드 등록, 수정, 삭제, 활성/비활성 토글 |
| 가이드 편집 다이얼로그 | FORM | 제목·카테고리·내용(마크다운)·관련파일 편집 |
| AI 검토 요청 | FORM | AI REVIEW 요청, 상태 변경 (REVIEW_REQ→REVIEW_DONE) |
| AI 피드백 패널 | INFO_CARD | AI 검토 결과 마크다운 렌더링 |

---

### 단위업무 14: DB 스키마 관리

#### 화면 14-1: DB 스키마 목록 (`/db-schema`)
| 영역 | 유형 | 주요 기능 |
|------|------|---------|
| 스키마 DataGrid | GRID | 테이블 목록 조회, DDL 등록, 수정, 삭제 |

#### 화면 14-2: DB 스키마 상세 (`/db-schema/[id]`)
| 영역 | 유형 | 주요 기능 |
|------|------|---------|
| DDL 에디터 | FORM | DDL SQL 편집, 테이블명·엔티티명·코멘트·그룹 수정 |
| 컬럼 목록 | GRID | DDL 파싱 결과 컬럼 메타데이터 표시 |
| 관계도 뷰어 | INFO_CARD | 테이블 간 관계도 시각화 |

---

### 단위업무 15: 변경 이력 관리

#### 화면 15-1: 변경 이력 (`/content-versions`)
| 영역 | 유형 | 주요 기능 |
|------|------|---------|
| 검색/필터 바 | FORM | 대상 엔티티(테이블+PK) 필터, 필드명 필터 |
| 이력 DataGrid | GRID | 이력 목록 조회(최신순) |
| Diff 뷰어 다이얼로그 | FULL_SCREEN | 두 버전 간 텍스트 Diff 비교 (react-diff-viewer) |

---

### 단위업무 16: AI 가져오기/설계 Import

#### 화면 16-1: AI 가져오기 (`/ai-import`)
| 영역 | 유형 | 주요 기능 |
|------|------|---------|
| 가져오기 설정 폼 | FORM | 대상 엔티티 선택, 가져오기 유형 설정 |
| 결과 미리보기 | INFO_CARD | AI 결과 사전 확인 |

---

---

## 3. SPECODE 정식 버전 설계

> 현행 단일 테넌트 구조 → 멀티 테넌트 SaaS 플랫폼으로 확장

---

### 3.1 추가 개념 정의

#### 프로젝트 (Project)
모든 데이터(과업, 요구사항, 화면, 기능 등)의 **최상위 컨테이너**.
사용자는 여러 프로젝트에 소속될 수 있으며, 프로젝트마다 독립적인 데이터 공간을 갖는다.

```
Project
  ├── Members (User + Role)
  ├── Tasks → Requirements → UnitWorks → Screens → Areas → Functions
  ├── PlanningDrafts
  ├── StandardGuides
  └── DbSchemas
```

#### 사용자 (User)
- 이메일/비밀번호 또는 소셜 로그인 (Google, GitHub)
- 하나의 계정으로 여러 프로젝트에 참여
- 구독 플랜은 사용자(조직) 단위로 관리

#### 롤 (Role) — 프로젝트 내 권한
| 롤 | 설명 | 주요 권한 |
|----|------|---------|
| OWNER | 프로젝트 생성자 | 전체 권한 + 프로젝트 삭제 + 멤버 관리 |
| ADMIN | 관리자 | 멤버 초대/제거 포함 전체 권한 |
| PM | 기획자/분석가 | 과업·요구사항·기획·단위업무 CRUD |
| DESIGNER | 설계자 | 화면·영역·기능 CRUD + AI 요청 |
| DEVELOPER | 개발자 | 기능 명세 수정 + AI 요청 + PR URL 등록 (읽기 위주) |
| VIEWER | 뷰어 | 전체 읽기 전용 |

#### 구독 플랜 (Subscription Plan)
| 플랜 | 프로젝트 | 멤버/프로젝트 | AI 요청/월 | 첨부파일 용량 | 가격(예시) |
|------|---------|-------------|-----------|-------------|---------|
| FREE | 1개 | 3명 | 30건 | 100MB | 무료 |
| STARTER | 3개 | 10명 | 300건 | 1GB | ₩29,000/월 |
| PRO | 무제한 | 30명 | 2,000건 | 10GB | ₩99,000/월 |
| ENTERPRISE | 무제한 | 무제한 | 무제한 | 무제한 | 협의 |

---

### 3.2 신규 DB 테이블 설계

#### User (tb_user)
```sql
userId          INT          PK
systemId        STRING       UK "USR-00001"
email           STRING       UK
name            STRING
avatarUrl       STRING?
provider        STRING       "email"|"google"|"github"
providerUid     STRING?      소셜 로그인 UID
passwordHash    STRING?      이메일 로그인 시
planType        STRING       "FREE"|"STARTER"|"PRO"|"ENTERPRISE" 기본="FREE"
planExpiresAt   DATETIME?    구독 만료일
isActive        BOOLEAN      기본=true
lastLoginAt     DATETIME?
createdAt       DATETIME
updatedAt       DATETIME
-- Relations --
projectMembers  ProjectMember[]
aiUsages        AiUsage[]
```

#### Project (tb_project)
```sql
projectId       INT          PK
systemId        STRING       UK "PRJ-00001"
name            STRING       프로젝트명
description     STRING?
logoUrl         STRING?
ownerId         INT          FK → User (프로젝트 소유자)
planType        STRING       "FREE"|"STARTER"|"PRO"|"ENTERPRISE" 기본="FREE"
isActive        BOOLEAN      기본=true
createdAt       DATETIME
updatedAt       DATETIME
-- Relations --
members         ProjectMember[]
tasks           Task[]
requirements    Requirement[]
standardGuides  StandardGuide[]
dbSchemas       DbSchema[]
planningDrafts  PlanningDraft[]
```

#### ProjectMember (tb_project_member)
```sql
memberId        INT          PK
projectId       INT          FK → Project (cascade delete)
userId          INT          FK → User
role            STRING       "OWNER"|"ADMIN"|"PM"|"DESIGNER"|"DEVELOPER"|"VIEWER"
invitedBy       INT?         FK → User (초대한 사람)
invitedAt       DATETIME?
joinedAt        DATETIME?
isActive        BOOLEAN      기본=true
createdAt       DATETIME
UNIQUE(projectId, userId)
```

#### AiUsage (tb_ai_usage) — AI 사용량 추적
```sql
usageId         INT          PK
userId          INT          FK → User
projectId       INT          FK → Project
aiTaskId        INT?         FK → AiTask
usedAt          DATETIME     기본=now()
taskType        STRING
-- 월별 집계 쿼리로 플랜 한도 체크
```

#### Invitation (tb_invitation) — 초대 관리
```sql
invitationId    INT          PK
projectId       INT          FK → Project
inviterUserId   INT          FK → User
inviteeEmail    STRING
role            STRING
token           STRING       UK (UUID)
expiresAt       DATETIME
acceptedAt      DATETIME?
createdAt       DATETIME
```

---

### 3.3 기존 테이블 변경

모든 프로젝트 범위 데이터에 `projectId` 추가 (하위 호환: nullable → 마이그레이션 후 NOT NULL)

| 테이블 | 추가 컬럼 | 비고 |
|--------|---------|------|
| tb_task | project_id INT FK → tb_project | |
| tb_requirement | project_id INT (Task 통해 간접 참조도 가능) | |
| tb_standard_guide | project_id INT FK → tb_project | |
| tb_db_schema | project_id INT FK → tb_project | |
| tb_planning_draft | project_id INT FK → tb_project | |
| tb_ai_task | project_id INT, user_id INT | 누가 요청했는지 추적 |
| tb_attachment | project_id INT | 용량 집계 |

---

### 3.4 신규 화면 목록

#### 인증 (Auth)
| 화면 | URL | 설명 |
|------|-----|------|
| 로그인 | `/login` | 이메일/소셜 로그인 |
| 회원가입 | `/signup` | 이메일 회원가입 + 이름 |
| 비밀번호 재설정 | `/reset-password` | 이메일 발송 → 새 비밀번호 설정 |

#### 프로젝트 관리
| 화면 | URL | 설명 |
|------|-----|------|
| 프로젝트 목록 | `/projects` | 내가 속한 프로젝트 목록, 새 프로젝트 생성 |
| 프로젝트 설정 | `/projects/[id]/settings` | 프로젝트명·설명·로고 수정, 멤버 관리, 플랜 표시 |
| 멤버 관리 | `/projects/[id]/members` | 멤버 초대(이메일), 롤 변경, 멤버 제거 |
| 초대 수락 | `/invite/[token]` | 초대 토큰 검증 → 가입 또는 로그인 → 프로젝트 참여 |

#### 계정/구독 관리
| 화면 | URL | 설명 |
|------|-----|------|
| 내 계정 | `/account` | 프로필 수정, 비밀번호 변경, 소셜 계정 연동 |
| 구독/결제 | `/account/subscription` | 현재 플랜, 업그레이드, 결제 내역 |
| AI 사용량 | `/account/usage` | 이번 달 AI 요청 건수, 플랜 한도 대비 사용률 |

---

### 3.5 API 추가/변경 목록

#### 인증 API

| Method | URL | 설명 |
|--------|-----|------|
| POST | `/api/auth/signup` | 회원가입 |
| POST | `/api/auth/login` | 로그인 (JWT 또는 세션) |
| POST | `/api/auth/logout` | 로그아웃 |
| GET | `/api/auth/me` | 내 정보 조회 |
| POST | `/api/auth/refresh` | 토큰 갱신 |
| POST | `/api/auth/[provider]` | 소셜 로그인 (google, github) |

#### 프로젝트 API

| Method | URL | 설명 |
|--------|-----|------|
| GET | `/api/projects` | 내 프로젝트 목록 |
| POST | `/api/projects` | 프로젝트 생성 |
| GET | `/api/projects/[id]` | 프로젝트 상세 |
| PUT | `/api/projects/[id]` | 프로젝트 수정 |
| DELETE | `/api/projects/[id]` | 프로젝트 삭제 (OWNER만) |
| GET | `/api/projects/[id]/members` | 멤버 목록 |
| POST | `/api/projects/[id]/members/invite` | 멤버 초대 |
| PUT | `/api/projects/[id]/members/[memberId]` | 롤 변경 |
| DELETE | `/api/projects/[id]/members/[memberId]` | 멤버 제거 |
| POST | `/api/invite/[token]/accept` | 초대 수락 |

#### 계정 API

| Method | URL | 설명 |
|--------|-----|------|
| GET | `/api/account/me` | 내 계정 정보 |
| PUT | `/api/account/me` | 프로필 수정 |
| PUT | `/api/account/password` | 비밀번호 변경 |
| GET | `/api/account/usage` | AI 사용량 조회 |
| GET | `/api/account/subscription` | 구독 정보 |

#### 기존 API 변경 사항

- 모든 기존 API: `projectId` 파라미터 추가 (헤더 또는 URL)
- 인증 미들웨어: 모든 요청에 JWT/세션 검증 + 프로젝트 접근 권한 검사
- 롤별 권한 체크:
  - VIEWER: GET 전용
  - DEVELOPER: 기능·영역 수정, AI 요청
  - DESIGNER: 화면·영역·기능·단위업무 전체
  - PM: 과업·요구사항·기획·표준가이드
  - ADMIN/OWNER: 전체

---

### 3.6 인증/권한 아키텍처

```
인증 방식: JWT (Access Token 15분 + Refresh Token 7일)
  또는 NextAuth.js 활용 (세션 기반)

미들웨어 처리 순서:
  1. /api/* 요청 수신
  2. Authorization 헤더 또는 httpOnly 쿠키에서 토큰 추출
  3. JWT 검증 → userId 추출
  4. X-Project-Id 헤더로 projectId 추출
  5. ProjectMember 테이블에서 해당 user+project의 role 조회
  6. 요청 메서드·엔드포인트 기반 권한 체크
  7. 권한 없으면 403 반환

AI 워커 인증:
  기존 X-API-Key 방식 유지 (서버 간 통신)
  + project별 API Key 발급 옵션 (ENTERPRISE)
```

---

### 3.7 AI 사용량 제한

```
플랜별 월 AI 요청 한도 초과 시:
  - 요청 생성 전 AiUsage 집계 쿼리 실행
  - 한도 초과 시 402 Payment Required 반환
  - 응답: { success: false, error: { code: "PLAN_LIMIT_EXCEEDED", message: "이번 달 AI 요청 한도를 초과했습니다. 플랜을 업그레이드하세요." } }

집계 쿼리 예시:
  SELECT COUNT(*) FROM tb_ai_usage
  WHERE user_id = ? AND DATE_TRUNC('month', used_at) = DATE_TRUNC('month', NOW())
```

---

### 3.8 마이그레이션 전략

#### Phase 1: 인증 레이어 추가 (현행 데이터 유지)
1. `tb_user` 테이블 생성 + 기본 관리자 계정 시딩
2. `tb_project` 테이블 생성 + 기존 데이터를 "기본 프로젝트"에 마이그레이션
3. NextAuth.js 또는 자체 JWT 인증 미들웨어 적용
4. 기존 모든 API에 `projectId` 컨텍스트 주입 (하위 호환)

#### Phase 2: 멀티 테넌트 적용
5. `tb_project_member` 생성 + 롤 기반 권한 미들웨어 적용
6. 프로젝트 CRUD UI 추가
7. 멤버 초대/관리 UI 추가

#### Phase 3: 구독/과금
8. `tb_ai_usage` 생성 + AI 사용량 추적
9. 구독 플랜 UI + 결제 연동 (Stripe 등)
10. AI 요청 한도 체크 미들웨어

#### 데이터 무결성
- 기존 데이터: `projectId = 1` (기본 프로젝트)로 일괄 업데이트
- `unitWorkId`, `requirementId` 등 nullable 컬럼은 하위 호환 유지
- 마이그레이션 스크립트: `scripts/migration_backup.sql` → 적용 → 검증

---

### 3.9 정식 버전 Sequence ID 체계 추가

| 접두사 | 엔티티 | 예시 |
|--------|--------|------|
| PRJ | Project | PRJ-00001 |
| USR | User | USR-00001 |
| INV | Invitation | INV-00001 |

---

### 3.10 개발 우선순위 로드맵

| 단계 | 항목 | 예상 공수 |
|------|------|---------|
| P0 (즉시) | JWT 인증 + 기본 프로젝트 개념 도입 | 2주 |
| P0 (즉시) | 프로젝트 생성/선택 UI | 1주 |
| P1 (1달) | 멤버 초대 + 롤 권한 체크 | 2주 |
| P1 (1달) | 회원가입/로그인 UI + 소셜 로그인 | 1주 |
| P2 (3달) | AI 사용량 추적 + 플랜 한도 체크 | 1주 |
| P2 (3달) | 구독/결제 연동 (Stripe) | 2주 |
| P3 (6달) | ENTERPRISE 기능 (SSO, 전용 AI 키, 감사 로그) | 별도 산정 |

---

*문서 작성: SPECODE × Claude Sonnet 4.6 — 2026-03-19*
