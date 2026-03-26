# SPECODE (AI Dev Hub) - 종합 Product Requirements Document (PRD)

> **작성일:** 2026-03-10
> **대상:** Next.js 기반 AI 주도 기획/설계/개발 자동화 통합 관리 시스템
> **문서 목적:** 본 문서는 향후 AI 에이전트나 새로운 개발자가 프로젝트에 투입되었을 때, 이 시스템의 존재 목적, 도메인 아키텍처, 데이터 흐름, 화면 구조를 단숨에 파악할 수 있도록 작성된 **Master Context Document** 입니다.

---

## 1. 프로젝트 개요 (Overview)

### 1-1. 이 프로젝트는 무엇인가? (What)
**SPECODE (AI Dev Hub)**는 차세대 웹 기반 **AI 주도 기획 및 개발 관리 시스템(AI-Driven Dev Hub)**입니다.

### 1-2. 왜 존재하는가 / 무엇을 위한 것인가? (Why & For What)
전통적인 시스템 통합(SI) 프로젝트 혹은 소프트웨어 기획/개발 과정에서는 비즈니스 분석가(GS)나 기획자가 요구사항을 분석하고 화면을 설계한 뒤, 개발자가 이를 실제 코드로 구현합니다. 이 과정에서 발생하는 커뮤니케이션 비용, 표준 가이드 누락, 방대한 문서 작성의 비효율성을 해결하고자 합니다. 
SPECODE는 이 **System Integration(SI) 라이프사이클 전반에 외부 AI 서비스(OpenClaw 기반)를 연동시켜 설계와 구현을 자동화하고 품질을 극대화**하기 위해 만들어졌습니다.

---

## 2. 계층 구조 및 데이터 파이프라인 (Data Architecture & Flow)

시스템은 기획부터 구현까지 논리적이고 세분화된 9단계 트리 계층 구조를 가집니다.

### 2-1. 도메인 계층 구조 (Hierarchy)
**`과업(Task) ➔ 요구사항(Requirement) ➔ 사용자 스토리(User Story) ➔ 기회 보드 ➔ 오프라인(화면, DB)설계 ➔ 화면(Screen) ➔ 영역(Area) ➔ 기능(Function) ⚡(Trigger)➔ AI작업(AiTask)`**

- **Task (과업)**: 고객의 제안요청서에 존재하는 요구사항
- **Requirement (요구사항)**: 제안요청서 요구사항을 의미와 구조에 맞게 자르거나 합친 요구사항(예: "회원 관리 시스템 구축")
- **User Story (사용자 스토리)**: 요구사항에 대한 사용자 스토리를 작성, 매 단계마다 나침반 역할
- **기획 보드**: 과업과 요청사항(요구사항명세서) 등의 내용으로 정보구조도, 화면 기획, 프로세스기획을 AI를 활용하여 처리
- **오프라인(화면, DB)설계**: 오프라인으로 화면 설계, DB 설계를 진행하고 다음 스텝으로 넘어간다.
- **Screen (화면)**: 요구사항을 충족하기 위한 실제 UI 페이지 단위 (예: "회원 목록 조회 화면")
- **Area (영역)**: 한 화면 내의 논리적인 UI/데이터 구획 (예: "상단 검색 Form 영역", "하단 DataGrid 영역")
- **Function (기능)**: 특정 영역 내에서 사용자가 수행하는 구체적 동작 (예: "회원 이름으로 검색", "엑셀 다운로드")
- **AiTask (AI 작업)**: 기능 단위로 발생하는 AI 설계/검증/구현 요청을 비동기로 처리하기 위한 큐(Queue) 엔티티

### 2-2. 주요 테이블 요약 (DDL / Prisma Schema)

1. **`tb_requirement`**: `requirement_id(PK)`, `name`, `content`(원문), `description`(분석내용).
2. **`tb_screen`**: `screen_id(PK)`, `requirement_id(FK)`, `screen_type`, `layout_data`(행/열 기반 UI 배치 메타데이터).
3. **`tb_area`**: `area_id(PK)`, `screen_id(FK)`, `area_type`(GRID|FORM|TAB 등), `status`(NONE|DESIGN_REQ|DESIGN_DONE|CONFIRM_Y 등), `ai_detail_design`(AI가 제안한 영역 UI 컴포넌트 설계).
4. **`tb_function`**: `function_id(PK)`, `area_id(FK)`, `status`(DRAFT ~ IMPL_DONE 명세상태), `ai_design_content`(AI 기능상세설계), `ai_insp_feedback`(AI 검토피드백), `ai_impl_feedback`(AI 구현피드백).
5. **`tb_ai_task`**: `ai_task_id(PK)`, `ref_table_name`(다형성 참조), `ref_pk_id`, `task_type`(REVIEW|DESIGN|IMPLEMENT), `task_status`.
6. **`tb_standard_guide`**: `guide_id(PK)`, `category`, `title`, `content`. AI가 검토 시 참고하는 전역 기술/보안/UI 표준 정책.

### 2-3. 데이터 흐름 (Data Flow) 및 상태 전이 (Status Cycle)

**사용자(GS)와 AI 간의 티키타카(Ping-Pong) 흐름**
1. **[DRAFT]**: GS(기획자)가 화면 ➔ 영역 ➔ 기능을 생성하고, 각 기능의 초기 명세(Spec)와 데이터 흐름(Data Flow)을 마크다운으로 작성합니다.
2. **[REVIEW_REQ]**: GS가 표준 가이드에 맞게 잘 작성되었는지 AI에게 검토를 요청(상태 변경)하면, `tb_ai_task` 레코드가 생성됩니다.
3. **[AI_REVIEWING]**: 백그라운드 AI 폴링 봇이 `tb_ai_task`를 가져가서 분석합니다.
4. **[REVIEW_DONE]**: 분석 완료 후 API 콜백. `tb_function`의 `ai_insp_feedback`에 마크다운 피드백이 저장됩니다. GS는 이를 보고 명세를 수정합니다.
5. **[DESIGN_REQ/DONE]**: 검토가 완료되면 AI에게 구체적인 "상세 설계"를 지시합니다. 완료 시 `ai_design_content`가 갱신됩니다.
6. **[IMPL_REQ/DONE]**: 최종적으로 설계가 승인(CONFIRM_Y)되면, AI에게 실제 코드 구현 가이드나 스니펫을 요청합니다. 완료 시 `ai_impl_feedback`에 관련 소스파일 목록과 코드 구현 블록이 반환됩니다.

---

## 3. 화면별 역할 및 기능의 연결 (Screen Navigation & Roles)

SPECODE의 UI는 위 데이터 흐름을 가장 효율적으로 제어하도록 구성되어 있습니다. 좌측 LNB(사이드바)를 통해 이동합니다.

### 1) 대시보드 (`/`)
- **역할**: 프로젝트 진행 상황의 컨트롤 타워.
- **기능**: 전체 기능 상태별 카운트(대기/진행/완료 등), 최근 완료된 AI 피드백을 한눈에 볼 수 있는 활동 로그 제공. 클릭 시 해당 기능 상세 창으로 이동.

### 2) 요구사항 관리 (`/requirements`) -> 화면 관리 (`/screens`) -> 영역/기능 관리
상향식(Top-Down) 탐색을 지원합니다.
- **요구사항 관리**: RFP, 고객 요청 스펙 원문을 저장.
- **화면 관리 (`/screens`)**: UI 레이아웃을 시각적으로 드래그 앤 드롭 혹은 행렬(Row/Col) 기반 JSON 데이터로 배치하여 시각화.
- **기능 관리 (`/functions`) [가장 중요한 코어 페이지]**:
  - 시스템의 80% 상호작용이 여기서 일어납니다.
  - DataGrid에서 체크박스를 통해 대량의 기능을 일괄 AI 요청(Batch Request) 할 수 있습니다.
  - **기능 상세 상세 뷰 (`/functions/[id]`)**: 스티키 탭 네비게이션 적용. 이 화면 안에서 "명세 수정 ↔ AI 피드백 뷰 ↔ 상태 변경" 이 실시간으로 일어납니다.

### 3) 트리 뷰 (`/tree`)
- **역할**: 전체 계층 (Req ➔ Screen ➔ Area ➔ Func) 구조의 맵(Map)을 트리 형태로 제공하여 전체 시스템 볼륨과 진행도를 시각화합니다.
- **기능**: 각 계층 노드 클릭 시 해당 아이템의 상세 페이지로 바로 라우팅.

### 4) AI 현황 (`/ai-tasks`)
- **역할**: 마치 서버의 모니터링 콘솔(Monitoring Console) 같은 역할을 합니다.
- **기능**: AI가 어떤 작업(Task)을 대기 중이고, 처리 중이며, 실패했는지를 10초 주기로 확인합니다. 실패한 건에 대한 재처리(Retry) 트리거 지원.

### 5) 표준 가이드 (`/standard-guides`)
- **역할**: 시스템 전체의 컨벤션(Rule-book) 사전입니다.
- **기능**: UI 정책, 보안 가이드 코드가 서술되어 있으며, AI가 기능(Function)을 `REVIEW` 할 때 이 가이드의 내용을 Prompt Context로 함께 가져가서 "이 설계가 사내 표준을 준수하는가?" 를 판단하게 합니다.

---

## 4. 기술 스택 및 구현 스펙 (Tech Stack)

| 구분 | 기술 스택 | 설명 |
|---|---|---|
| **Frontend** | `Next.js 16.1.6`, `React 19` | App Router 최신 기술. 안정적이고 빠른 라우팅과 렌더링. |
| **UI/UX** | `Tailwind CSS v4`, `Radix UI` | Oklch 기반 테마, 커스텀 디자인 시스템 및 높은 접근성. |
| **State / Fetch** | `TanStack Query v5` | 서버 데이터 상태 동기화 및 캐싱 (Client Component 최적화). |
| **Backend** | `Next.js API Routes` | Serverless 형태의 RESTful 백엔드. 미들웨어 포함. |
| **ORM / DB** | `Prisma 6.19`, `PostgreSQL` | 타입 안전성, 스키마 마이그레이션 (`tb_` 접두사 테이블 네이밍 컨벤션). |
| **에디터** | `Tiptap`, `React Markdown` | GS가 작성하는 요구사항과 AI가 내려주는 피드백은 복잡한 마크다운을 완벽히 소화해야 함. |

---

## 5. 시스템 아키텍처 및 AI 연동 패턴 (System Architecture)

**1) 프론트엔드 - 백엔드 분리 패턴**
- 페이지 컴포넌트들은 `use client` 기반 비동기 상태 관리를 주로 하며, 모든 DB 트랜잭션은 `/api/*` 경로의 API 라우트를 경유합니다. DB 객체 직접 접근(Server Action 남용)을 지양하고 명확한 DTO 통신을 권장합니다.
- `Zod` 스키마를 사용하여 API Body 및 쿼리스트링 런타임 검증을 철저히 합니다.

**2) 비동기 폴링 (Polling) 비디오 스트리밍 대안 아키텍처**
- AI의 대규모 LLM 추론은 시간이 오래 걸립니다(30초~2분).
- HTTP Request Timeout을 방지하기 위해, 웹 클라이언트는 "DB에 태스크만 등록"하고 응답을 바로 받습니다.
- **외부 AI 시스템(OpenClaw)이 능동형 Worker 스케줄러**로 동작하여 `GET /api/ai/tasks` 로 일을 가져가고 처리 후 `POST` 결과만 밀어 넣습니다.
- 클라이언트는 `TanStack Query`의 refetch를 통해 자연스럽게 데이터를 최신화하거나, `/ai-tasks` 에서 현황을 지켜봅니다.

---

### 📝 AI 에이전트를 위한 팁 (How to use this context)
1. **신규 기능 추가/수정 지시를 받았다면:** 가장 먼저 `prisma/schema.prisma`를 확인하여 테이블 관계가 `Requirement -> Screen -> Area -> Function` 을 침해하지 않는지 확인하십시오.
2. **에러 핸들링:** API 추가 개발 시, `src/lib/utils.ts` 의 `apiSuccess`, `apiError` 규격에 맞는 반환 폼을 항상 지켜야 합니다.
3. **컴포넌트 개발:** UI 수정 시 가급적 `src/components/ui/` 에 있는 Radix/Tailwind 기반 재사용 컴포넌트(예: Button, Input, Select, Dialog)를 활용하세요.
