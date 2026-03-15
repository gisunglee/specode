# SPECODE AI 워커 API 명세

> **대상 독자**: AI 태스크를 처리하는 워커 (Claude Code 슬래시 커맨드, Python 스크립트, 향후 MCP 서버)
> **기준일**: 2026-03-15

---

## 개요 — 두 가지 실행 방식

```
방식 A: /run-claude-tasks (Claude Code VSCode 슬래시 커맨드)
  - CLAUDE.md + MEMORY.md 자동 로딩 (프로젝트 컨텍스트 자동 주입)
  - VSCode에서 수동 실행
  - 이미지 처리 가능 (Read tool 직접 사용)

방식 B: python scripts/run_ai_tasks.py
  - docs/PROJECT_CONTEXT.md 명시적 로딩 (프롬프트 앞에 주입)
  - CLI에서 직접 실행, cron 자동화 가능
  - 이미지 처리 가능 (curl 다운로드 후 경로 전달)
```

---

## 인증

모든 AI 워커 API는 `X-API-Key` 헤더 필수.

```
X-API-Key: {AI_API_KEY}
```

- 서버 환경변수 `AI_API_KEY` 와 비교 (`.env.local` 에 설정)
- `AI_API_KEY` 미설정 시 인증 없이 허용 (로컬 개발 환경 전용)
- Python 스크립트: `API_SECRET_KEY` 환경변수로 관리 (`scripts/.env` 또는 `.env`)

---

## 공통 응답 형식

```json
// 성공
{ "success": true, "data": { ... } }

// 실패
{ "success": false, "error": { "code": "ERROR_CODE", "message": "설명" } }
```

---

## AI 태스크 처리 API (핵심 — 두 방식 모두 사용)

### 1. 대기 태스크 목록 조회

```
GET /api/ai/tasks
```

**헤더**: `X-API-Key` 필수

**쿼리 파라미터**:
| 파라미터 | 기본값 | 설명 |
|---------|-------|------|
| limit | 10 | 최대 50 |
| taskType | (전체) | INSPECT \| DESIGN \| IMPLEMENT \| PLANNING \| IMPACT |

**응답 예시**:
```json
{
  "success": true,
  "data": [
    {
      "aiTaskId": 42,
      "systemId": "ATK-00042",
      "refTableName": "tb_function",
      "refPkId": 7,
      "taskType": "DESIGN",
      "taskStatus": "NONE",
      "spec": "...",
      "comment": "cascade 삭제는 soft delete로 처리해줘",
      "attachments": [
        {
          "attachmentId": 1,
          "logicalName": "화면설계.png",
          "fileExt": "png",
          "downloadUrl": "http://localhost:3000/api/attachments/1"
        }
      ],
      "requestedAt": "2026-03-15T10:00:00.000Z"
    }
  ]
}
```

**관련 파일**:
- `src/app/api/ai/tasks/route.ts`

---

### 2. 태스크 시작 (NONE → RUNNING)

```
PATCH /api/ai/tasks/{aiTaskId}/start
```

**헤더**: `X-API-Key` 필수
**본문**: 없음

**응답**:
```json
{
  "success": true,
  "data": {
    "aiTaskId": 42,
    "taskStatus": "RUNNING",
    "startedAt": "2026-03-15T10:01:00.000Z"
  }
}
```

**관련 파일**:
- `src/app/api/ai/tasks/[id]/start/route.ts`

---

### 3. 태스크 완료 결과 제출 (RUNNING → 최종 상태)

```
POST /api/ai/tasks/{aiTaskId}/complete
```

**헤더**: `X-API-Key`, `Content-Type: application/json`

**본문**:
```json
{
  "taskStatus": "SUCCESS",
  "feedback": "## 상세 설계\n\n...",
  "resultFiles": "src/app/api/login/route.ts\nsrc/lib/auth.ts"
}
```

**taskStatus 값**:
| 값 | 설명 | 대상 엔티티 반영 |
|----|------|----------------|
| SUCCESS | 정상 완료 | ✅ |
| AUTO_FIXED | AI 자동 수정 | ✅ |
| NEEDS_CHECK | 사람 검토 필요 | ❌ |
| WARNING | 경고 있음 | ❌ |
| FAILED | 처리 실패 | ❌ |

**완료 후 자동 반영 (SUCCESS / AUTO_FIXED)**:
| taskType | 업데이트 대상 | 상태 변경 |
|---------|------------|---------|
| INSPECT (tb_function) | `ai_insp_feedback` ← feedback | → REVIEW_DONE |
| DESIGN (tb_function) | `ai_design_content` ← feedback | → DESIGN_DONE |
| IMPLEMENT (tb_function) | `ai_impl_feedback` ← feedback | → IMPL_DONE |
| INSPECT (tb_standard_guide) | `ai_feedback_content` ← feedback | → REVIEW_DONE |
| DESIGN (tb_area) | `ai_feedback` ← feedback | → DESIGN_DONE |
| PLANNING (tb_planning_draft) | `result_content` ← feedback, `result_type` 자동 설정 | - |

**관련 파일**:
- `src/app/api/ai/tasks/[id]/complete/route.ts`
- `src/app/api/ai/_lib/onTaskComplete.ts` — 완료 후 엔티티 반영 훅

---

## 데이터 조회 API (컨텍스트 보강용)

### 4. 기능 목록 조회 — AI 벌크 조회

```
GET /api/functions?ids=ALL
GET /api/functions?ids=1,2,3
```

> `ids` 파라미터 있으면 페이지네이션 없이 전체/복수 반환 (AI 워커 전용 경로)
> `ids` 파라미터 없으면 기존 웹 UI용 페이지네이션 응답

**응답 필드 (ids 모드)**:
```json
{
  "success": true,
  "data": [
    {
      "functionId": 7,
      "systemId": "FID-00007",
      "name": "로그인",
      "status": "DESIGN_DONE",
      "spec": "...",
      "aiDesignContent": "...",
      "aiInspFeedback": "...",
      "area": {
        "name": "로그인 폼 영역",
        "areaCode": "AR-00001",
        "screen": { "name": "로그인 화면", "systemId": "SCR-00001" }
      }
    }
  ]
}
```

**관련 파일**:
- `src/app/api/functions/route.ts`

---

### 5. 기능 단건 상세 조회

```
GET /api/functions/{functionId}
```

area → screen → requirement → userStory 계층 전체 포함

**관련 파일**:
- `src/app/api/functions/[id]/route.ts`

---

### 6. 화면 상세 조회 (screen + areas + functions 트리)

```
GET /api/screens/{screenId}
```

**응답**: 화면 정보 + 영역 목록 (정렬순) + 각 영역의 기능 목록 + 첨부파일

**관련 파일**:
- `src/app/api/screens/[id]/route.ts`

---

### 7. DB 스키마 목록 조회

```
GET /api/db-schema
GET /api/db-schema?tableGroup=ai
```

**응답**: `schemaId, tableName, tableComment, tableGroup, updatedAt` (DDL 제외)

---

### 8. DB 스키마 단건 조회 (DDL 포함)

```
GET /api/db-schema/{schemaId}
```

**응답**: `ddlScript, relationsJson` 포함 전체

**관련 파일**:
- `src/app/api/db-schema/route.ts`
- `src/app/api/db-schema/[id]/route.ts`

---

## 전체 처리 흐름

```
[방식 A: Claude Code 슬래시 커맨드]
  1. /run-claude-tasks 실행
  2. GET /api/ai/tasks?limit=10
  3. for each task:
       PATCH /api/ai/tasks/{id}/start
       Claude가 spec 분석 (CLAUDE.md 컨텍스트 자동 로딩)
       이미지 있으면: curl 다운로드 → Read tool로 읽기
       Python 스크립트로 POST /api/ai/tasks/{id}/complete
  4. 결과 요약 출력

[방식 B: Python 스크립트]
  1. python scripts/run_ai_tasks.py
  2. docs/PROJECT_CONTEXT.md 로딩
  3. GET /api/ai/tasks?limit=10
  4. for each task:
       PATCH /api/ai/tasks/{id}/start    (requests)
       claude CLI 서브프로세스 실행 (PROJECT_CONTEXT.md + spec 합쳐서 프롬프트)
       POST /api/ai/tasks/{id}/complete  (requests)
  5. 결과 요약 출력
```

---

## 관련 파일 전체 목록

| 파일 | 역할 |
|------|------|
| `CLAUDE.md` | 방식 A 프로젝트 컨텍스트 (Claude Code 자동 로딩) |
| `docs/PROJECT_CONTEXT.md` | 방식 B 프로젝트 컨텍스트 (Python이 명시적 주입) |
| `docs/ai-worker-api.md` | **이 파일** — AI 워커 API 참조 문서 |
| `scripts/run_ai_tasks.py` | 방식 B Python 스크립트 |
| `scripts/requirements.txt` | Python 의존성 (requests, python-dotenv) |
| `src/app/api/ai/tasks/route.ts` | GET /api/ai/tasks |
| `src/app/api/ai/tasks/[id]/start/route.ts` | PATCH .../start |
| `src/app/api/ai/tasks/[id]/complete/route.ts` | POST .../complete |
| `src/app/api/ai/_lib/onTaskComplete.ts` | 완료 후 엔티티 반영 훅 |
| `src/app/api/ai/_lib/auth.ts` | X-API-Key 인증 헬퍼 |
| `src/app/api/functions/route.ts` | GET /api/functions (ids 벌크 포함) |
| `src/app/api/functions/[id]/route.ts` | GET /api/functions/{id} |
| `src/app/api/screens/[id]/route.ts` | GET /api/screens/{id} (트리) |
| `src/app/api/db-schema/route.ts` | GET /api/db-schema |
| `src/app/api/db-schema/[id]/route.ts` | GET /api/db-schema/{id} (DDL) |

---

## 환경변수

```env
# .env.local (서버)
AI_API_KEY=openclaw-api-key-here

# scripts/.env 또는 .env (Python 스크립트)
API_SECRET_KEY=openclaw-api-key-here
SPECODE_URL=http://localhost:3000
TASK_LIMIT=10
TASK_TYPE=           # 빈 값 = 전체, 또는 DESIGN|INSPECT 등
```

---

## 실행 명령

```bash
# 방식 A — VSCode 커맨드 팔레트 또는 터미널
/run-claude-tasks

# 방식 B — Python
python scripts/run_ai_tasks.py

# taskType 필터링
TASK_TYPE=DESIGN python scripts/run_ai_tasks.py
TASK_TYPE=INSPECT python scripts/run_ai_tasks.py

# 건수 제한
TASK_LIMIT=3 python scripts/run_ai_tasks.py
```
