# OpenClaw AI 연동 API 명세

SPECODE ↔ OpenClaw 간 REST API 명세서입니다.
OpenClaw는 이 API를 통해 AI 태스크를 폴링하고, 처리 결과를 SPECODE에 반환합니다.

---

## 기본 정보

| 항목 | 값 |
|------|-----|
| Base URL | `https://{host}/api/ai` |
| 인증 방식 | API Key (요청 헤더) |
| Content-Type | `application/json` |

### 인증

모든 API 요청에 아래 헤더를 포함해야 합니다.

```
X-API-Key: {AI_API_KEY}
```

- 서버 환경변수 `AI_API_KEY` 와 일치하지 않으면 `401 Unauthorized` 반환
- `AI_API_KEY` 미설정 시 인증 없이 허용 (개발 환경 전용)

### 공통 응답 형식

**성공**
```json
{
  "success": true,
  "data": { ... }
}
```

**실패**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "에러 설명"
  }
}
```

---

## 태스크 상태 흐름

```
NONE ──[start API]──▶ RUNNING ──[complete API]──▶ SUCCESS
                                               ├──▶ AUTO_FIXED
                                               ├──▶ NEEDS_CHECK
                                               ├──▶ WARNING
                                               └──▶ FAILED
```

---

## API 목록

### 1. 대기 태스크 조회 (폴링)

> OpenClaw가 주기적으로 호출하여 처리할 태스크를 가져옵니다.

```
GET /api/ai/tasks
```

**요청 헤더**

| 헤더 | 필수 | 설명 |
|------|------|------|
| X-API-Key | ✅ | API 인증 키 |

**쿼리 파라미터**

| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| limit | number | 10 | 반환 건수 (최대 50) |
| taskType | string | - | 필터: `DESIGN` \| `REVIEW` \| `IMPLEMENT` \| `IMPACT` \| `INSPECT` |

**응답 예시 (200)**

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
      "spec": "사용자 로그인 기능. JWT 토큰 발급...",
      "comment": "cascade 삭제는 soft delete로 처리해줘",
      "requestedAt": "2026-03-04T10:00:00.000Z"
    }
  ]
}
```

**응답 필드 설명**

| 필드 | 설명 |
|------|------|
| aiTaskId | 태스크 PK (start/complete API에서 사용) |
| systemId | 시스템 ID (ATK-NNNNN) |
| refTableName | 대상 테이블: `tb_function` \| `tb_standard_guide` |
| refPkId | 대상 테이블 PK |
| taskType | 작업 유형 (아래 표 참고) |
| spec | AI 처리 시점의 기능 설명 스냅샷 (마크다운) |
| comment | GS 추가 요청사항 (없으면 null) |

**taskType 설명**

| taskType | 설명 | 대상 |
|----------|------|------|
| DESIGN | 기능 상세설계 | tb_function |
| REVIEW | 기능 검토/충돌 분석 | tb_function |
| IMPLEMENT | 기능 구현 | tb_function |
| IMPACT | 영향도 분석 | tb_function |
| INSPECT | 표준가이드 점검 | tb_standard_guide |

---

### 2. 작업 시작 알림

> AI가 태스크 처리를 시작할 때 호출합니다. `NONE → RUNNING` 으로 변경됩니다.

```
PATCH /api/ai/tasks/{id}/start
```

**경로 파라미터**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| id | number | `aiTaskId` |

**요청 헤더**

| 헤더 | 필수 | 설명 |
|------|------|------|
| X-API-Key | ✅ | API 인증 키 |

**요청 본문**: 없음

**응답 예시 (200)**

```json
{
  "success": true,
  "data": {
    "aiTaskId": 18,
    "systemId": "ATK-00018",
    "taskStatus": "RUNNING",
    "startedAt": "2026-03-04T07:18:33.272Z"
  }
}
```

**에러 응답**

| 코드 | HTTP | 설명 |
|------|------|------|
| NOT_FOUND | 404 | 태스크를 찾을 수 없음 |
| INVALID_STATE | 400 | NONE 상태가 아님 |
| UNAUTHORIZED | 401 | API 키 불일치 |

---

### 3. 작업 결과 제출

> AI가 처리 완료 후 결과를 제출합니다. 결과 저장 후 대상 엔티티를 자동으로 업데이트합니다.

```
POST /api/ai/tasks/{id}/complete
```

**경로 파라미터**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| id | number | `aiTaskId` |

**요청 헤더**

| 헤더 | 필수 | 설명 |
|------|------|------|
| X-API-Key | ✅ | API 인증 키 |
| Content-Type | ✅ | `application/json` |

**요청 본문**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| taskStatus | string | ✅ | 결과 상태 (아래 표 참고) |
| feedback | string | - | AI 결과 내용 (마크다운) |
| resultFiles | string | - | 수정한 파일 경로 목록 (줄바꿈 구분) |

**taskStatus 값**

| 값 | 설명 | 엔티티 반영 |
|----|------|------------|
| SUCCESS | 정상 완료 | ✅ |
| AUTO_FIXED | AI가 자동 수정 | ✅ |
| NEEDS_CHECK | 사람 검토 필요 | ❌ |
| WARNING | 경고 있음 | ❌ |
| FAILED | 처리 실패 | ❌ |

**요청 예시**

```json
{
  "taskStatus": "SUCCESS",
  "feedback": "## 상세 설계\n\n### API 엔드포인트\n...",
  "resultFiles": "src/main/java/com/example/LoginService.java\nsrc/main/resources/mapper/LoginMapper.xml"
}
```

**응답 예시 (200)**

```json
{
  "success": true,
  "data": {
    "aiTaskId": 18,
    "systemId": "ATK-00018",
    "taskStatus": "SUCCESS",
    "completedAt": "2026-03-04T07:25:00.000Z"
  }
}
```

**에러 응답**

| 코드 | HTTP | 설명 |
|------|------|------|
| NOT_FOUND | 404 | 태스크를 찾을 수 없음 |
| INVALID_STATE | 400 | RUNNING 상태가 아님 |
| VALIDATION_ERROR | 400 | taskStatus 값 오류 |
| UNAUTHORIZED | 401 | API 키 불일치 |

---

## 완료 후 자동 반영 동작

`taskStatus = SUCCESS | AUTO_FIXED` 일 때 대상 엔티티가 자동으로 업데이트됩니다.

| taskType | 업데이트 필드 | 상태 변경 |
|----------|-------------|----------|
| DESIGN | `tb_function.ai_design_content = feedback` | status → `DESIGN_DONE` |
| REVIEW | `tb_function.ai_review_result = feedback` | status → `REVIEW_DONE` |
| IMPLEMENT | `tb_function.ai_impl_feedback = feedback`<br>`tb_function.ai_impl_issues = resultFiles` | status → `IMPL_DONE` |
| IMPACT | `tb_function.ai_impact_analysis = feedback` | 변경 없음 |
| INSPECT | `tb_standard_guide.ai_feedback_content = feedback`<br>`tb_standard_guide.ai_feedback_at = now()` | status → `REVIEW_DONE` |

---

## 전형적인 처리 흐름

```
1. OpenClaw 폴링 (30초 간격)
   GET /api/ai/tasks?limit=5

2. 처리할 태스크 발견 → 시작 알림
   PATCH /api/ai/tasks/42/start

3. AI 처리 (spec + comment 기반 프롬프트 구성)
   ...

4. 결과 제출
   POST /api/ai/tasks/42/complete
   { "taskStatus": "SUCCESS", "feedback": "..." }

5. SPECODE 자동 반영 (onTaskComplete 훅)
   tb_function.ai_design_content ← feedback
   tb_function.status ← "DESIGN_DONE"
```

---

## 환경변수

```env
# .env.local
AI_API_KEY=your-secret-key-here
```

---

## 소스 구조

```
src/app/api/ai/
├── _lib/
│   ├── auth.ts              # API 키 인증 헬퍼
│   └── onTaskComplete.ts    # 완료 후 비즈니스 로직 훅
├── tasks/
│   └── route.ts             # GET  /api/ai/tasks
└── tasks/[id]/
    ├── start/
    │   └── route.ts         # PATCH /api/ai/tasks/[id]/start
    └── complete/
        └── route.ts         # POST  /api/ai/tasks/[id]/complete
```
