# 05. API 설계

## 기본 원칙

- 모든 응답은 단일 포맷: `{ success, data, pagination? }`
- 에러 응답: `{ success: false, error: { code, message } }`
- 인증: `X-API-Key` 헤더 (AI 워커 전용), 일반 페이지는 세션 기반
- API 경로: `/api/[엔티티복수]` (Next.js App Router)

---

## 응답 포맷

### 성공 응답
```ts
// 단일 항목
{ success: true, data: { ... } }

// 목록
{ success: true, data: [...], pagination: { page, pageSize, total } }

// 액션 (삭제 등)
{ success: true, data: { deleted: true } }
```

### 에러 응답
```ts
{ success: false, error: { code: "NOT_FOUND", message: "항목을 찾을 수 없습니다." } }
{ success: false, error: { code: "VALIDATION_ERROR", message: "필수 항목이 없습니다." } }
{ success: false, error: { code: "CONFLICT", message: "하위 데이터가 존재합니다." } }
```

### 공통 유틸 사용 (필수)
```ts
import { apiSuccess, apiError } from "@/lib/utils";

return apiSuccess(data);
return apiError("NOT_FOUND", "항목을 찾을 수 없습니다.", 404);
return apiError("CONFLICT", "하위 화면이 존재합니다.", 409);
```

---

## REST 엔드포인트 패턴

### 목록 라우트 `/api/[entity]/route.ts`
| Method | 동작 | 설명 |
|--------|------|------|
| GET | 목록 조회 | 필터/페이지네이션 지원 |
| POST | 신규 생성 | systemId 자동 채번 |

### 상세 라우트 `/api/[entity]/[id]/route.ts`
| Method | 동작 | 설명 |
|--------|------|------|
| GET | 단건 조회 | 관련 데이터 include |
| PUT | 수정 | 부분 업데이트 허용 |
| DELETE | 삭제 | 하위 데이터 존재 시 409 |

### 서브 액션 라우트 `/api/[entity]/[id]/[action]/route.ts`
예) `/api/functions/[id]/prd` — PRD 생성
예) `/api/ai/tasks/[id]/start` — AI 태스크 시작
예) `/api/ai/tasks/[id]/complete` — AI 태스크 완료

---

## 쿼리 파라미터 규칙

```
GET /api/requirements?page=1&pageSize=20&search=검색어&taskId=1&sort=systemId&order=asc
```

| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| page | number | 1 | 현재 페이지 |
| pageSize | number | 20 | 페이지당 건수 |
| search | string | - | 이름/내용 검색 |
| [엔티티]Id | number | - | 상위 엔티티 필터 |
| sort | string | createdAt | 정렬 기준 |
| order | asc\|desc | desc | 정렬 방향 |

---

## systemId 채번

```ts
import { generateSystemId } from "@/lib/sequence";

// 접두사 규칙
const systemId = await generateSystemId("RQ");  // → "RQ-00001"
```

| 엔티티 | 접두사 |
|--------|--------|
| Task | T |
| Requirement | RQ |
| UnitWork | UW |
| Screen | SCR |
| Area | AR |
| Function | FID |
| AiTask | ATK |
| StandardGuide | SG |

---

## 논리 삭제 vs 물리 삭제

| 상황 | 방법 |
|------|------|
| 하위 데이터가 없는 leaf 엔티티 | 물리 삭제 |
| 상위 엔티티 (하위 참조 가능) | `useYn = 'N'` 또는 `delYn = 'Y'` 논리 삭제 |
| AI 태스크 이력 | 물리 삭제 금지 |

**주의**: 조회 쿼리에서 반드시 `useYn = 'Y'` 필터 추가할 것.

---

## AI 연동 API

### AI 워커 전용 엔드포인트
```
GET  /api/ai/tasks?limit=10&taskType=INSPECT   대기 태스크 조회
PATCH /api/ai/tasks/{id}/start                  태스크 시작 (RUNNING)
POST  /api/ai/tasks/{id}/complete               태스크 완료 (SUCCESS/FAILED)
```

### 인증
```http
X-API-Key: {AI_API_KEY}
```

### complete 요청 바디
```json
{
  "status": "SUCCESS",
  "feedback": "마크다운 분석 결과..."
}
```

---

## 에러 코드 목록

| 코드 | HTTP | 설명 |
|------|------|------|
| NOT_FOUND | 404 | 리소스 없음 |
| VALIDATION_ERROR | 400 | 입력값 검증 실패 |
| CONFLICT | 409 | 하위 데이터 존재 등 |
| UNAUTHORIZED | 401 | 인증 실패 |
| FORBIDDEN | 403 | 권한 없음 |
| INTERNAL_ERROR | 500 | 서버 오류 |

---

## 페이지네이션 응답 예시

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 150,
    "totalPages": 8
  }
}
```
