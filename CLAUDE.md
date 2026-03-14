# SPECODE — Claude Code 개발 가이드

> Claude Code (VSCode Extension) 가 이 프로젝트 작업 시 참조하는 컨텍스트 파일입니다.
> **관리 주체: 개발자**. 구조 변경 시 이 파일도 함께 업데이트하세요.

---

## 프로젝트 한 줄 요약

**SPECODE (AI Dev Hub)** — SI 프로젝트의 기획·설계·개발 라이프사이클을 AI가 보조하는 웹 관리 시스템.
기획자(GS)가 요구사항 → 화면 → 영역 → 기능을 등록하면, AI가 설계 검토·상세 설계·구현 가이드를 비동기로 처리한다.

---

## 기술 스택

| 구분 | 버전 | 비고 |
|------|------|------|
| Next.js | 16.1.6 | App Router, `use client` 페이지 |
| React | 19 | |
| TypeScript | 5.x | strict 모드 |
| Tailwind CSS | v4 | `@import "tailwindcss"` + `@theme {}` (config 파일 없음) |
| Prisma | 6.x | PostgreSQL (개발은 SQLite 가능) |
| TanStack Query | v5 | 서버 상태 관리 |
| TanStack Table | v8 | DataGrid 구현 |
| Radix UI | - | shadcn/ui 스타일 커스텀 컴포넌트 |

---

## 핵심 디렉토리 구조

```
src/
├── app/
│   ├── api/                    # 모든 백엔드 로직 (Server-side API Routes)
│   │   ├── ai/tasks/           # AI 폴링 API (외부 AI 워커 전용)
│   │   │   ├── route.ts        # GET  /api/ai/tasks
│   │   │   └── [id]/start|complete/route.ts
│   │   ├── functions/          # 기능 CRUD
│   │   ├── areas/              # 영역 CRUD
│   │   ├── screens/            # 화면 CRUD
│   │   ├── requirements/       # 요구사항 CRUD
│   │   ├── tasks/              # 과업 CRUD
│   │   ├── planning/           # 기획 보드
│   │   ├── standard-guides/    # 표준 가이드
│   │   └── ai-tasks/           # AI 태스크 조회/재처리 (내부용)
│   ├── functions/              # 기능 관리 페이지 (가장 핵심)
│   ├── screens/                # 화면 관리
│   ├── requirements/           # 요구사항 관리
│   ├── ai-tasks/               # AI 작업 현황 모니터링
│   ├── planning/               # 기획 보드
│   └── standard-guides/        # 표준 가이드
├── components/
│   ├── common/                 # DataGrid, MarkdownEditor 등 공통 컴포넌트
│   └── ui/                     # Button, Input, Dialog 등 기본 UI (Radix 기반)
└── lib/
    ├── prisma.ts               # Prisma 클라이언트 싱글톤
    ├── utils.ts                # apiSuccess(), apiError() — API 응답 표준
    ├── sequence.ts             # generateSystemId() — T-00001, RQ-00001 형식
    ├── contentVersion.ts       # saveContentVersion() — AI 변경 이력 저장
    └── constants.ts            # 공통 상수
```

---

## 도메인 계층 구조

```
과업(Task) → 요구사항(Requirement) → 사용자스토리(UserStory)
                                   → 화면(Screen) → 영역(Area) → 기능(Function)
                                                                        ↓
                                                               AI태스크(AiTask) [비동기 큐]
기획보드(PlanningDraft) ─── 요구사항과 N:N 연결 ───────────────────────────┘
```

---

## DB 주요 모델 (Prisma)

| 모델 | 테이블 | PK | 핵심 필드 |
|------|--------|----|----------|
| Task | tb_task | taskId | systemId(T-NNNNN), name, content |
| Requirement | tb_requirement | requirementId | systemId(RQ-NNNNN), originalContent, currentContent, detailSpec, discussionMd |
| Screen | tb_screen | screenId | systemId, requirementId(FK), layoutData(JSON) |
| Area | tb_area | areaId | areaCode(AR-NNNNN), screenId(FK), areaType, status, aiFeedback |
| Function | tb_function | functionId | systemId(FID-NNNNN), areaId(FK), **status**, spec, aiInspFeedback, aiDesignContent, aiImplFeedback |
| AiTask | tb_ai_task | aiTaskId | systemId(ATK-NNNNN), refTableName, refPkId, taskType, **taskStatus**, spec, feedback |
| StandardGuide | tb_standard_guide | guideId | category, content, aiFeedbackContent |
| PlanningDraft | tb_planning_draft | planSn | planType(IA/PROCESS/MOCKUP), manualInfo, resultContent, resultType |

### Function 상태 흐름
```
DRAFT → REVIEW_REQ → AI_REVIEWING → REVIEW_DONE
     → DESIGN_REQ  → (AI_REVIEWING) → DESIGN_DONE
     → CONFIRM_Y
     → IMPL_REQ    → (AI_REVIEWING) → IMPL_DONE
```

### AiTask 상태 흐름
```
NONE →[start]→ RUNNING →[complete]→ SUCCESS | AUTO_FIXED | NEEDS_CHECK | WARNING | FAILED
```

---

## 코드 컨벤션

### API 응답 — 반드시 이 형식 사용
```ts
import { apiSuccess, apiError } from "@/lib/utils";

return apiSuccess(data);                          // { success: true, data }
return apiError("NOT_FOUND", "메시지", 404);      // { success: false, error: { code, message } }
```

### System ID 생성
```ts
import { generateSystemId } from "@/lib/sequence";
const systemId = await generateSystemId("RQ");  // → "RQ-00001"
// 접두사: T(과업), RQ(요구사항), FID(기능), AR(영역), ATK(AI태스크), SG(표준가이드)
```

### Route Params (Next.js 16)
```ts
// params가 Promise 타입 — await 필수
type RouteParams = { params: Promise<{ id: string }> };
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
}
```

### AI 완료 처리 훅
```ts
// src/app/api/ai/_lib/onTaskComplete.ts
// SUCCESS | AUTO_FIXED 상태일 때만 대상 엔티티 자동 업데이트
// taskType별 분기: INSPECT, DESIGN, IMPLEMENT, PLANNING
```

---

## 자주 쓰는 개발 명령

```bash
npm run dev          # 개발 서버 (http://localhost:3000)
npx prisma studio    # DB GUI
npx prisma migrate dev --name "변경명"  # 스키마 변경 적용
npx prisma generate  # Prisma 클라이언트 재생성
```

---

## 주의사항 (알려진 함정)

| 상황 | 주의 |
|------|------|
| Tailwind v4 | `tailwind.config.ts` 없음. `@theme {}` 블록에서 변수 정의 |
| Prisma 7.x | 사용 금지 — config 포맷 변경으로 호환 안 됨. **6.x 유지** |
| Zod v4 | `required_error` → `{ error: "msg" }` 형식으로 변경됨 |
| useSearchParams | Next.js 16에서 `<Suspense>` 래핑 필수 |
| 논리삭제 | `del_yn = 'N'` 또는 `useYn = 'Y'` 필터링 누락 주의 |
| 한글 API 전송 | `curl` 사용 시 UTF-8 깨짐 → Python urllib 사용 |

---

## AI 연동 구조 (이 프로젝트만의 패턴)

```
[SPECODE Web] ─── tb_ai_task에 태스크 등록 (NONE)
                          ↓
[AI 워커] ─── GET /api/ai/tasks 폴링
           ─── PATCH /api/ai/tasks/{id}/start   (RUNNING)
           ─── (AI 처리)
           ─── POST  /api/ai/tasks/{id}/complete (SUCCESS/FAILED)
                          ↓
[onTaskComplete 훅] ─── 대상 엔티티 자동 업데이트
```

현재 AI 워커: **Claude Code `/run-claude-tasks` 슬래시 커맨드** (수동 실행)
AI 워커 API 키: `X-API-Key: openclaw-api-key-here` (`.env.local`의 `AI_API_KEY`)

---

## 관련 문서

- [AI API 명세](docs/ai-api.md) — 폴링/시작/완료 API 상세
- [PRD](docs/PROJECT_PRD_0310.md) — 전체 요구사항 및 설계 의도
- [DDL v3](docs/SPECODE_DDL_v3.sql) — PostgreSQL 스키마 전체
- [AI 활용 가이드](docs/claude-활용가이드.md)
