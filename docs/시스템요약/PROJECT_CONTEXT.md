# SPECODE 프로젝트 컨텍스트

> **AI 태스크 워커를 위한 프로젝트 전체 컨텍스트입니다.**
> 이 파일은 새로운 AI 세션이 SPECODE 프로젝트를 이해하고 올바른 결과물을 생성하기 위한
> 필수 배경 지식을 담고 있습니다.
> **관리 주체: 개발자**. DB 구조나 도메인 변경 시 업데이트 필요합니다.

---

## 1. 프로젝트 정체성

**SPECODE (AI Dev Hub)**는 SI(시스템 통합) 프로젝트의 기획·설계·개발 과정을 AI가 보조하는 웹 관리 시스템이다.

- **사용자(GS)**: 비즈니스 분석가 / 기획자. 요구사항을 등록하고 AI에게 검토·설계·구현을 요청한다.
- **AI 워커**: 이 파일을 읽고 있는 당신. `tb_ai_task` 큐에서 태스크를 가져와 처리하고 결과를 반환한다.
- **목표**: AI의 분석이 "교과서적 일반론"이 아닌, 이 프로젝트의 실제 구조·DB·컨벤션에 맞는 구체적인 결과여야 한다.

---

## 2. 도메인 계층 구조

```
과업(Task)
  └─ 요구사항(Requirement)      ← RFP 요구사항을 분석·가공한 단위
       ├─ 사용자스토리(UserStory) ← 요구사항의 사용자 관점 시나리오
       └─ 화면(Screen)           ← 요구사항을 구현하는 UI 페이지
            └─ 영역(Area)        ← 화면 내 논리적 구획 (그리드/폼/탭 등)
                 └─ 기능(Function) ← 사용자가 수행하는 구체적 동작 [핵심 단위]
                      └─ AI태스크(AiTask) ← 기능에 대한 AI 처리 요청 [비동기 큐]

기획보드(PlanningDraft) ─── 요구사항들과 N:N 연결 → IA/프로세스/목업 생성
```

**가장 중요한 단위는 `Function(기능)`이다.** 시스템의 80% 상호작용이 기능 단위로 발생한다.

---

## 3. DB 스키마 (핵심 테이블)

### 3-1. tb_task (과업)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| task_id | BIGINT PK | |
| system_id | VARCHAR | T-00001 형식 |
| name | VARCHAR | 과업명 |
| content | TEXT | RFP 세부내용 원문 |
| definition | TEXT | 요약 정의 |

### 3-2. tb_requirement (요구사항) ★
| 컬럼 | 타입 | 설명 |
|------|------|------|
| requirement_id | BIGINT PK | |
| system_id | VARCHAR | RQ-00001 형식 |
| name | VARCHAR | 요구사항명 |
| original_content | TEXT | 원문 보존 (계약 근거) |
| current_content | TEXT | 협의/변경 반영 최종본 |
| detail_spec | TEXT | 요구사항 명세서 (마크다운) |
| discussion_md | TEXT | AI 학습용 상세 협의 내용 (마크다운) |
| task_id | BIGINT FK | 소속 과업 |

### 3-3. tb_screen (화면)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| screen_id | BIGINT PK | |
| system_id | VARCHAR | SCR-00001 형식 |
| name | VARCHAR | 화면명 |
| screen_type | VARCHAR | 화면 유형 |
| requirement_id | BIGINT FK | 소속 요구사항 |
| spec | TEXT | 화면 설명 (마크다운) |
| layout_data | TEXT | 레이아웃 JSON (행/열 기반 배치) |
| category_l/m/s | VARCHAR | 대/중/소 메뉴 분류 |

### 3-4. tb_area (영역)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| area_id | BIGINT PK | |
| area_code | VARCHAR | AR-00001 형식 |
| screen_id | BIGINT FK | 소속 화면 |
| name | VARCHAR | 영역명 |
| area_type | VARCHAR | GRID \| FORM \| INFO_CARD \| TAB \| FULL_SCREEN |
| spec | TEXT | 영역 설명 |
| status | VARCHAR | NONE \| DESIGN_REQ \| DESIGN_DONE \| CONFIRM_Y |
| ai_feedback | TEXT | AI 설계 결과 (마크다운) |

### 3-5. tb_function (기능) ★★ 가장 중요
| 컬럼 | 타입 | 설명 |
|------|------|------|
| function_id | BIGINT PK | |
| system_id | VARCHAR | FID-00001 형식 |
| name | VARCHAR | 기능명 |
| area_id | BIGINT FK | 소속 영역 |
| spec | TEXT | 기능 명세 (마크다운) — GS가 작성 |
| status | VARCHAR | 아래 상태 흐름 참고 |
| ai_insp_feedback | TEXT | INSPECT 결과 저장 |
| ai_design_content | TEXT | DESIGN 결과 저장 |
| ai_impl_feedback | TEXT | IMPLEMENT 결과 저장 |
| ref_content | TEXT | 참고 프로그램 내용 |

**Function 상태 흐름:**
```
DRAFT → REVIEW_REQ → AI_REVIEWING → REVIEW_DONE
      → DESIGN_REQ  →              → DESIGN_DONE → CONFIRM_Y
      → IMPL_REQ    →              → IMPL_DONE
```

### 3-6. tb_ai_task (AI 태스크 큐) ★★
| 컬럼 | 타입 | 설명 |
|------|------|------|
| ai_task_id | BIGINT PK | |
| system_id | VARCHAR | ATK-00001 형식 |
| ref_table_name | VARCHAR | 처리 대상 테이블명 |
| ref_pk_id | BIGINT | 처리 대상 PK |
| task_type | VARCHAR | INSPECT \| DESIGN \| IMPLEMENT \| PLANNING \| IMPACT |
| task_status | VARCHAR | NONE → RUNNING → SUCCESS/FAILED 등 |
| spec | TEXT | AI 처리용 컨텍스트 스냅샷 (JSON or 마크다운) |
| comment | TEXT | GS 추가 요청사항 |
| feedback | TEXT | AI 결과 저장 필드 |

### 3-7. tb_standard_guide (표준 가이드)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| guide_id | BIGINT PK | |
| system_id | VARCHAR | SG-NNNNN 형식 |
| category | VARCHAR | UI \| DATA \| AUTH \| API \| SECURITY \| FILE \| ERROR \| BATCH \| REPORT \| COMMON |
| title | VARCHAR | 가이드 제목 |
| content | TEXT | 가이드 내용 (마크다운) |
| ai_feedback_content | TEXT | AI 점검 피드백 저장 |

### 3-8. tb_planning_draft (기획 보드)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| plan_sn | BIGINT PK | |
| plan_nm | VARCHAR | 기획명 |
| plan_type | VARCHAR | IA \| PROCESS \| MOCKUP |
| manual_info | TEXT | 사용자 상세 아이디어 (AI 처리 1순위 참고) |
| comment | TEXT | AI 지시사항 |
| result_content | TEXT | AI 생성 결과 (MD/Mermaid/HTML) |
| result_type | VARCHAR | MD \| MERMAID \| HTML |

---

## 4. AI 태스크 타입별 처리 가이드

### taskType: INSPECT (tb_function 대상)
**목적**: GS가 작성한 기능 명세가 올바른지 AI가 검토·피드백

**입력 (spec 필드)**:
```
기능명, 기능 명세(마크다운), 소속 화면/영역 정보
```

**요구 출력 (feedback에 저장됨)**:
```markdown
# [기능명] 검토 피드백

## 종합 평가
(완성도 평가: 상/중/하)

## 잘된 점
- ...

## 보완 필요 사항
- ...

## 구체적 개선 제안
(실질적인 명세 개선 방향)
```

**완료 후 자동 처리**: `tb_function.ai_insp_feedback` ← feedback, status → `REVIEW_DONE`

---

### taskType: DESIGN (tb_function 대상)
**목적**: 기능 명세를 바탕으로 상세 설계 문서 생성

**입력 (spec 필드)**:
```
기능명, 기능 명세, 화면/영역 정보, 참고 이미지(첨부 시)
```

**요구 출력 (feedback에 저장됨)**:
```markdown
# [기능명] 상세 설계

## 개요
(기능의 목적과 처리 결과)

## 화면 구성 (이미지 첨부 시 ASCII 레이아웃 포함)
+------------------------------------------+
| [컴포넌트 구성]                          |
+------------------------------------------+

## 데이터 흐름
1. 사용자 액션 → ...
2. API 호출 → ...
3. DB 처리 → ...

## API 설계
- Method: POST/GET/...
- Endpoint: /api/...
- Request: { 필드명: 타입 }
- Response: { 필드명: 타입 }

## DB 접근 (관련 테이블)
- tb_xxx: 조회/삽입/수정 조건

## 예외 처리
- 케이스 1: 처리 방법
- 케이스 2: 처리 방법
```

**완료 후 자동 처리**: `tb_function.ai_design_content` ← feedback, status → `DESIGN_DONE`

---

### taskType: IMPLEMENT (tb_function 대상)
**목적**: 설계 기반 구현 가이드 및 코드 스니펫 생성

**요구 출력**: 실제 구현 가능한 코드 블록 + 파일 경로 포함

**완료 후 자동 처리**: `tb_function.ai_impl_feedback` ← feedback, status → `IMPL_DONE`

---

### taskType: INSPECT (tb_standard_guide 대상)
**목적**: 표준 가이드 문서가 적절한지 점검

**요구 출력**: 가이드의 명확성·완성도·현실 적용 가능성 피드백

**완료 후 자동 처리**: `tb_standard_guide.ai_feedback_content` ← feedback, status → `REVIEW_DONE`

---

### taskType: DESIGN (tb_area 대상)
**목적**: 영역(Area) 단위 UI 컴포넌트 설계

**완료 후 자동 처리**: `tb_area.ai_feedback` ← feedback, status → `DESIGN_DONE`

---

### taskType: PLANNING (tb_planning_draft 대상)
**목적**: 기획 보드에서 요구사항을 바탕으로 IA/프로세스/목업 생성

**spec 구조 (JSON)**:
```json
{
  "planType": "IA | PROCESS | MOCKUP",
  "manualInfo": "사용자 상세 아이디어 (최우선 반영)",
  "comment": "AI 지시사항",
  "requirements": [
    {
      "systemId": "RQ-00001",
      "name": "요구사항명",
      "detailSpec": "요구사항 명세서",
      "discussionMd": "상세 협의 내용",
      "content": "요구사항 본문"
    }
  ],
  "prevContext": {
    "planNm": "이전 기획명",
    "resultType": "MD | MERMAID | HTML",
    "resultContent": "이전 결과물 (연속성 참고용)"
  }
}
```

**planType별 출력 형식**:
- `IA` → Markdown (정보구조도, 메뉴 계층)
- `PROCESS` → Mermaid flowchart
- `MOCKUP` → HTML (인라인 스타일 포함, 실제 렌더링 가능)

**완료 후 자동 처리**: `tb_planning_draft.result_content` ← feedback, `result_type` 자동 설정

---

## 5. 코드 컨벤션 (IMPLEMENT 태스크 시 준수)

### API 응답 형식
```ts
// 성공
return apiSuccess(data);
// → { success: true, data: ... }

// 실패
return apiError("ERROR_CODE", "메시지", httpStatus);
// → { success: false, error: { code, message } }
```

### 파일 경로 패턴
```
API Route:   src/app/api/[도메인]/route.ts
             src/app/api/[도메인]/[id]/route.ts
Page:        src/app/[도메인]/page.tsx
Components:  src/components/common/[이름].tsx
             src/components/ui/[이름].tsx
Lib:         src/lib/[유틸].ts
```

### System ID 생성
```ts
import { generateSystemId } from "@/lib/sequence";
const id = await generateSystemId("RQ");  // "RQ-00001"
```

### 테이블 네이밍 컨벤션
- 모든 테이블: `tb_` 접두사
- 그룹 접두사: `cm`(공통), `rq`(요구사항), `pl`(기획), `ds`(설계), `ai`(AI), `an`(분석)
- 컬럼 형식단어: `_id`(식별자), `_nm`(명), `_cd`(코드), `_cn`(내용), `_dt`(일시), `_yn`(여부), `_sn`(순번)

---

## 6. 중요한 판단 기준

### 분석 품질 기준
1. **구체성**: "JWT를 사용하세요" (X) → "tb_function의 spec 필드에 다음과 같이 명시하세요" (O)
2. **현실성**: 이 프로젝트의 실제 스택(Next.js/Prisma/PostgreSQL)에 맞는 구현
3. **일관성**: 기존 `apiSuccess/apiError` 패턴, `tb_` 테이블 컨벤션 준수
4. **완결성**: 예외 처리, 경계 케이스까지 포함

### spec의 comment 필드 처리
`comment` 필드가 있으면 **최우선으로 반영**한다. GS가 특별히 요청한 사항이다.

### 이미지 첨부 처리
태스크에 이미지 첨부가 있으면:
1. 화면 레이아웃을 ASCII 박스로 표현 (아래 형식)
2. UI 컴포넌트 목록 추출
3. 데이터 필드명 파악
4. 사용자 흐름 분석

```
ASCII 레이아웃 예시:
+--------------------------------------------------+
| 화면 제목                      [버튼1] [버튼2]   |
+--------------------------------------------------+
| 레이블  | [ 입력 필드              ]              |
| 레이블  | ( 드롭다운 v )                          |
+--------------------------------------------------+
| 컬럼1   | 컬럼2   | 컬럼3   | 액션               |
| 데이터  | 데이터  | 데이터  | [수정] [삭제]      |
+--------------------------------------------------+
```

---

## 7. 결과물 반환 규칙

- **언어**: 한국어로 작성 (코드 제외)
- **형식**: Markdown (MOCKUP 제외)
- **길이**: 충분히 구체적으로. 짧은 답변은 가치 없음
- **taskStatus**: 정상 처리 시 `SUCCESS`, 구조적 문제로 판단 불가 시 `NEEDS_CHECK`

---

*최종 수정: 2026-03-15*
