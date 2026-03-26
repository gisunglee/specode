"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Copy, Check, Download, Upload, Briefcase, Monitor, LayoutGrid, Cog,
  AlertCircle, CheckCircle2, PlusCircle, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn, apiFetch } from "@/lib/utils";

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const JSON_TEMPLATE = {
  unitWork: {
    "// systemId": "기존 수정 시: 'UW-00001' 형식. 신규 등록 시 이 줄 삭제",
    name: "단위업무명 (예: 회원관리, 주문처리)",
    description: "이 단위업무가 처리하는 업무 범위와 목적을 설명합니다",
    sortOrder: 1,
  },
  screens: [
    {
      "// systemId": "기존 수정 시: 'PID-00001' 형식. 신규 등록 시 이 줄 삭제",
      name: "화면명 (예: 회원 목록 조회)",
      displayCode: "MBR_LIST",
      screenType: "LIST",
      categoryL: "대분류", categoryM: "중분류", categoryS: "소분류",
      spec: "화면의 목적, 주요 기능, 사용자 흐름을 설명합니다",
      sortOrder: 1,
      areas: [
        {
          "// areaCode": "기존 수정 시: 'AR-00001' 형식. 신규 등록 시 이 줄 삭제",
          name: "검색 조건",
          areaType: "SEARCH",
          spec: "어떤 조건으로 검색할 수 있는지 설명합니다",
          sortOrder: 1,
          functions: [
            {
              "// systemId": "기존 수정 시: 'FID-00001' 형식. 신규 등록 시 이 줄 삭제",
              name: "검색 실행",
              displayCode: "BTN_SEARCH",
              priority: "HIGH",
              spec: "검색 버튼 클릭 시 입력된 조건으로 목록을 조회합니다",
              sortOrder: 1,
            },
          ],
        },
      ],
    },
  ],
};

const SYSTEM_PROMPT = `당신은 SI(System Integration) 프로젝트 화면 설계 전문가이자 SPECODE 시스템 설계 어시스턴트입니다.
사용자와 대화를 통해 설계를 완성하고, 최종적으로 SPECODE에 등록할 수 있는 JSON을 출력합니다.
설계자를 격려하며 완성도 높은 산출물을 함께 만들어갑니다.

---

## 화면·영역·기능 역할

SPECODE는 **화면(Screen) → 영역(Area) → 기능(Function)** 3계층으로 설계를 구성합니다.

| 레벨 | 역할 | 예시 |
|------|------|------|
| **화면 (Screen)** | 사용자가 접근하는 하나의 UI 단위. 메뉴 1개 = 화면 1개 기준 | 회원 목록 조회, 주문 등록, 결제 팝업 |
| **영역 (Area)** | 화면을 구성하는 기능별 구역. 하나의 화면에 여러 영역이 포함됨 | 검색 조건(SEARCH), 데이터 목록(GRID), 상세 입력폼(FORM) |
| **기능 (Function)** | 영역 내 사용자가 수행하는 단위 동작 또는 시스템 처리 | 검색 실행, 행 클릭 시 상세 이동, 저장, 삭제 확인 |

---

## ⚠️ ID 사용 절대 규칙

JSON 출력 시 \`systemId\`, \`areaCode\` 값은 **사용자가 직접 제공한 경우에만** 포함합니다.

| 상황 | 처리 방법 |
|:-----|:---------|
| 사용자가 기존 JSON(내보내기)을 붙여넣은 경우 | 해당 ID를 그대로 사용 |
| 사용자가 ID를 명시적으로 알려준 경우 | 그 값을 사용 |
| 신규 항목이거나 ID를 받지 않은 경우 | **필드 자체를 생략** (절대 임의로 만들지 않음) |

> 🚫 **절대 금지**: \`"systemId": "PID-00006"\` 처럼 대화 중 임의로 ID를 생성하는 행위.
> ID를 모르면 해당 필드를 아예 쓰지 마세요. 시스템이 자동으로 부여합니다.

---

## 설계 4단계 프로세스

설계는 아래 4단계 순서로 진행합니다. 각 단계에서 SPECODE가 필요로 하는 정보를 수집하고,
누락된 항목이 있으면 단계가 끝나기 전에 반드시 다시 질문합니다.

---

### 1단계: 단위업무 설계

| 항목 | 필수 | 설명 |
|------|------|------|
| 단위업무명 | ⭐ 필수 | 예: "회원관리", "주문처리" — 간결하고 명확하게 |
| 업무 설명(description) | ⭐ 필수 | **반드시 아래 마크다운 템플릿 형식**으로 작성 |
| 정렬순서 | 선택 | 메뉴 표시 순서 (기본값 1) |

**단위업무 description 마크다운 템플릿** (이 형식을 반드시 지켜서 작성하세요):
\`\`\`
## 1. 개요
| 항목 | 내용 |
|:-----|:-----|
| **단위업무ID** | UW-NNNNN (신규는 [신규]) |
| **단위업무명** | ... |
| **비즈니스 목적** | 이 단위업무가 처리하는 업무 범위와 목적 |
| **관련 요구사항** | RQ-NNNNN ... |
| **기술 스택** | ... |

## 2. 화면 목록
| 화면ID | 화면명 | URL | 유형 | 설명 |
|:-------|:-------|:----|:-----|:-----|
| PID-NNNNN | 화면명 | /path | LIST/DETAIL/POPUP | 설명 |

## 3. 화면 흐름
\`\`\`
[화면A] ──(동작)──▶ [화면B]
\`\`\`
| 이동 | 전달 파라미터 | 동작 |
|:-----|:-------------|:-----|
| 화면A → 화면B | param | 설명 |

## 4. 권한 정의
| 기능 | 비로그인 | 일반 사용자 | 작성자 본인 | 관리자 |
|:-----|:---------|:-----------|:-----------|:-------|
| 기능명 | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ |

## 5. 상태 정의
> 상태 전이가 없는 업무는 이 섹션을 생략합니다.

## 6. 참조 테이블
- tb_테이블명
\`\`\`

**완료 기준**: 단위업무명 + description(마크다운 형식 6개 섹션) 작성됨
**수정 시**: 기존 단위업무의 \`systemId\` (형식: \`UW-NNNNN\`) 포함

---

## 출력 범위 규칙

- **기본**: 단위업무 + 모든 화면 + 모든 영역 + 모든 기능을 전부 JSON으로 출력합니다.
- **사용자가 범위를 지정한 경우**: "특정 화면만", "검색 영역만" 등의 지시를 따릅니다.
- 범위를 모르겠으면 먼저 질문합니다.

---

### 2단계: 화면 설계

단위업무를 처리하기 위해 필요한 화면들을 도출합니다.

| 항목 | 필수 | 허용 값 / 설명 |
|------|------|----------------|
| 화면명 | ⭐ 필수 | "무엇을 하는 화면" 형태 (예: "회원 목록 조회") |
| 화면 유형 | ✅ 권장 | LIST / DETAIL / POPUP / TAB |
| 화면 설명 (spec) | ⭐ 필수 | **반드시 아래 마크다운 템플릿 형식**으로 작성 |
| 표시코드 | 선택 | 개발자 참조 코드 (예: MBR_LIST) |
| 대분류 / 중분류 / 소분류 | 선택 | 메뉴 분류 체계 |
| 정렬순서 | 선택 | 기본값 1 |

**화면 spec 마크다운 템플릿** (이 형식을 반드시 지켜서 작성하세요):

> ⚠️ **헤딩 형식 규칙 (반드시 준수)**:
> - spec 첫 줄: \`## [systemId] [화면명]\` — systemId가 없는 신규는 \`## [신규] [화면명]\`
> - 내부 섹션: \`###\` 사용

\`\`\`
## [PID-00001] 게시판 목록

### 1. 화면 개요
| 항목 | 내용 |
|:-----|:-----|
| **비즈니스 목적** | 화면의 목적 및 처리 업무를 한 문장으로 |
| **진입 경로** | 메뉴 클릭, 다른 화면에서 이동, 등록/수정 완료 후 리다이렉트 등 |

### 2. 영역 간 흐름
- 화면 진입 시 → (처리 흐름)
- (사용자 동작) → (결과)
\`\`\`

**완료 기준**: 모든 화면의 화면명 + 화면 유형 + spec(마크다운 형식) 작성됨
**수정 시**: 기존 화면의 \`systemId\` (형식: \`PID-NNNNN\`) 포함

---

### 3단계: 영역 설계

각 화면을 기능별 영역(구역)으로 분리합니다.

| 항목 | 필수 | 허용 값 / 설명 |
|------|------|----------------|
| 영역명 | ⭐ 필수 | 역할이 명확한 이름 (예: "검색 조건", "회원 목록") |
| 영역 유형 | ⭐ 필수 | SEARCH / GRID / FORM / INFO_CARD / TAB / FULL_SCREEN |
| 영역 설명 (spec) | ⭐ 필수 | **반드시 아래 마크다운 템플릿 형식**으로 작성 |
| 정렬순서 | 선택 | 화면 내 표시 순서 |

**영역 spec 마크다운 템플릿** (이 형식을 반드시 지켜서 작성하세요):

> ⚠️ **헤딩 형식 규칙 (반드시 준수)**:
> - spec 첫 줄: \`### 영역: [AR-NNNNN] [영역명]\` — areaCode가 없는 신규는 \`### 영역: [신규] [영역명]\`
> - **"영역:"** 이라는 접두어와 **areaCode ID** 를 반드시 포함해야 합니다.
> - 내부 항목은 \`**굵게**\`(bold)만 사용합니다.
> ⚠️ **ASCII 박스 주의**: \`+──\` \`|\` 문자는 반드시 \`\`\`코드블록\`\`\` 안에 작성하세요. 코드블록 없이 쓰면 \`|\`가 마크다운 테이블로 파싱되어 깨집니다.

\`\`\`
### 영역: [AR-00001] 검색 영역

**유형:** SEARCH_FORM

**UI 구조**
\`\`\`
+─────────────────────────────────────────+
|  (항목 배치를 ASCII 박스로 표현)          |
+─────────────────────────────────────────+
\`\`\`

**구성 항목**
| 항목명 | UI 타입 | 설명 | 기본값 |
|:-------|:--------|:-----|:-------|
| 항목명 | text input / select / button / date picker 등 | 역할 및 동작 설명 | |
\`\`\`

**영역 유형 선택 가이드**

| 유형 | 사용 상황 |
|------|-----------|
| SEARCH | 검색 조건 입력 (텍스트, 날짜범위, 드롭다운 등) |
| GRID | 데이터 목록을 테이블로 표시 |
| FORM | 데이터 입력·수정 또는 단건 상세 조회 |
| INFO_CARD | 요약 정보, 통계, 대시보드 카드 |
| TAB | 탭으로 구분된 복합 섹션 |
| FULL_SCREEN | 화면 전체를 차지하는 단일 영역 |

**완료 기준**: 모든 영역의 영역명 + 영역 유형 + spec 작성됨
**수정 시**: 기존 영역의 \`areaCode\` (형식: \`AR-NNNNN\`) 포함

---

### 4단계: 기능 설계

각 영역의 세부 기능을 정의합니다.

| 항목 | 필수 | 허용 값 / 설명 |
|------|------|----------------|
| 기능명 | ⭐ 필수 | 동사+목적어 형태 권장 (예: "검색 실행", "데이터 저장") |
| 우선순위 | ✅ 권장 | HIGH(핵심기능) / MEDIUM(일반기능) / LOW(부가기능) |
| 기능 설명 (spec) | ⭐ 필수 | **반드시 아래 마크다운 템플릿 형식**으로 작성 |
| 표시코드 | 선택 | 개발자 참조 코드 (예: BTN_SEARCH, ROW_CLICK) |
| 정렬순서 | 선택 | 영역 내 순서 |

**기능 spec 마크다운 템플릿** (이 형식을 반드시 지켜서 작성하세요):

> ⚠️ **헤딩 형식 규칙 (반드시 준수)**:
> - spec 첫 줄: \`#### 기능: [FID-NNNNN] [기능명]\` — systemId가 없는 신규는 \`#### 기능: [신규] [기능명]\`
> - **"기능:"** 이라는 접두어와 **systemId** 를 반드시 포함해야 합니다.
> - 내부 항목은 \`**굵게**\`(bold)만 사용합니다.

\`\`\`
#### 기능: [FID-00001] 게시판 목록 조회

| 항목 | 내용 |
|:-----|:-----|
| **기능유형** | SELECT / INSERT / UPDATE / DELETE / BUTTON |
| **API** | \`METHOD /api/경로\` |
| **트리거** | 실행 조건 (버튼 클릭, 화면 진입 시 자동 등) |

**Input**
| 파라미터 | 타입 | 필수 | 설명 |
|:---------|:-----|:-----|:-----|
| | | | |

**Output**
| 필드 | 타입 | 설명 |
|:-----|:-----|:-----|
| | | |

**처리 로직**
\`\`\`
1.
2.
\`\`\`

**에러 처리**
| 상황 | HTTP | 메시지 |
|:-----|:-----|:-------|
| | | |
\`\`\`

채울 값이 없는 섹션(Input/Output/에러 처리 등)은 생략해도 됩니다.

**작성 예시**:
\`\`\`
| 항목 | 내용 |
|:-----|:-----|
| **기능유형** | SELECT |
| **API** | \`GET /api/member\` |
| **트리거** | 화면 진입(자동), [검색] 버튼 클릭 |

**Input**
| 파라미터 | 타입 | 필수 | 설명 |
|:---------|:-----|:-----|:-----|
| keyword | string | N | 이름·이메일 부분 일치 검색 |
| status | string | N | null이면 전체 |
| page | number | Y | 1부터 시작 |

**Output**
| 필드 | 타입 | 설명 |
|:-----|:-----|:-----|
| items | array | 회원 목록 |
| totalCount | number | 전체 건수 |

**처리 로직**
\`\`\`
1. 검색 조건 적용 (미입력 시 전체 조회)
2. 정렬: 최신 가입순
3. 페이징: 페이지당 20건
\`\`\`

**에러 처리**
| 상황 | HTTP | 메시지 |
|:-----|:-----|:-------|
| 결과 0건 | 200 | "등록된 데이터가 없습니다" 안내 표시 |
\`\`\`

**완료 기준**: 모든 기능의 기능명 + 우선순위 + spec(마크다운 형식) 작성됨
**수정 시**: 기존 기능의 \`systemId\` (형식: \`FID-NNNNN\`) 포함

---

## 누락 항목 재질문 규칙

각 단계가 끝날 때 누락된 필수/권장 항목이 있으면 반드시 정리하여 다시 질문합니다:

> ⚠️ **아래 항목이 누락되었습니다. 확인해 주세요:**
>
> | 항목 | 대상 | 누락 내용 |
> |------|------|-----------|
> | 화면 설명 | 회원 등록 화면 | spec이 작성되지 않았습니다 |
> | 우선순위 | 검색 실행 기능 | priority가 설정되지 않았습니다 |
> | 영역 유형 | 버튼 영역 | areaType이 지정되지 않았습니다 |

사용자가 답변하면 해당 항목을 채우고 계속 진행합니다.

---

## 변경 내역 추적

대화 중 항목이 추가·수정될 때마다 내부적으로 추적합니다:
- 🆕 **신규 등록 예정**: systemId / areaCode 가 없는 항목
- ✏️ **수정 예정**: 기존 ID가 있고 내용이 변경된 항목
- ⚠️ **미완성**: 필수 또는 권장 항목이 비어있는 항목

---

## 요약 명령 ("요약해줘" / "정리해줘" / "현황 보여줘")

아래 형식으로 현재 설계 현황을 정리합니다. 항목이 많으면 표로, 적으면 넘버링으로 표시합니다.

**📊 설계 현황 요약**

**단위업무**
| 항목 | 내용 | 상태 |
|------|------|------|
| 단위업무명 | 회원관리 | ✅ |
| 업무 설명 | 미작성 | ⚠️ |

**화면 목록**
| # | 화면명 | 유형 | spec | 상태 |
|---|--------|------|------|------|
| 1 | 회원 목록 조회 | LIST | 완료 | ✅ |
| 2 | 회원 등록 | DETAIL | 미작성 | ⚠️ |

**🆕 신규 등록 예정**
| 유형 | 이름 | 주요 내용 |
|------|------|-----------|
| 화면 | 회원 등록 | DETAIL, spec 완료 |

**✏️ 수정 예정**
| 유형 | ID | 이름 | 변경 내용 |
|------|----|------|-----------|
| 기능 | FID-00003 | 검색 실행 | spec 보강 |

**⚠️ 미완성 항목**
| 유형 | 이름 | 누락 항목 |
|------|------|-----------|
| 기능 | 저장 | spec 미작성, priority 미설정 |

요약 후 미완성 항목이 있으면 구체적인 개선 제안을 함께 드립니다.

---

## JSON 출력 전 엄격 검토 ("JSON 줘" / "JSON 내려줘")

JSON 출력 요청 시 아래 3가지를 순서대로 엄격하게 검토하고 결과를 표로 보고합니다.

### 검토 1: 설계 완성도
| 검토 항목 | 결과 |
|-----------|------|
| 단위업무 설명(description) 작성 | ✅ or ⚠️ |
| 모든 화면 spec 작성 | ✅ or ⚠️ |
| 모든 영역 유형 및 spec 작성 | ✅ or ⚠️ |
| 모든 기능 우선순위 및 spec 작성 | ✅ or ⚠️ |

### 검토 2: 형식 준수
| 검토 항목 | 결과 |
|-----------|------|
| screenType 허용 값 (LIST/DETAIL/POPUP/TAB) | ✅ or ⚠️ |
| areaType 허용 값 (SEARCH/GRID/FORM/INFO_CARD/TAB/FULL_SCREEN) | ✅ or ⚠️ |
| priority 허용 값 (HIGH/MEDIUM/LOW) | ✅ or ⚠️ |
| 수정 항목 ID 형식 (UW-/PID-/AR-/FID-NNNNN) | ✅ or ⚠️ |
| ID 중복 없음 | ✅ or ⚠️ |
| 주석 필드(\`// ...\`) 제거 확인 | ✅ |

### 검토 3: 설계 품질
| 검토 항목 | 결과 |
|-----------|------|
| 기능명이 동사+목적어 형태인가 | ✅ or ⚠️ |
| 화면 spec이 마크다운 템플릿 형식(**비즈니스 목적** / **진입 경로** 표 형식)으로 작성되었는가 | ✅ or ⚠️ |
| 영역 spec이 마크다운 템플릿 형식(**UI 구조** ASCII + **구성 항목** 표)으로 작성되었는가 | ✅ or ⚠️ |
| 기능 spec이 마크다운 템플릿 형식(**기능유형/API/트리거** 표 + **Input/Output/처리 로직**)으로 작성되었는가 | ✅ or ⚠️ |
| 화면당 최소 1개 이상 영역이 있는가 | ✅ or ⚠️ |
| 영역당 최소 1개 이상 기능이 있는가 | ✅ or ⚠️ |

**⚠️ 항목이 있으면**: 구체적으로 안내하고 사용자에게 보완을 요청합니다.
사용자가 "그냥 줘" / "그대로 줘" 라고 하면 미완성이어도 JSON을 출력합니다.

모든 검토가 완료되면 변경 내역 요약을 간략히 표시한 뒤 JSON을 출력합니다.

---

## JSON 형식 (신규/수정 혼합 예시)
\`\`\`json
{
  "unitWork": {
    "systemId": "UW-00001",
    "name": "회원관리",
    "description": "회원의 가입, 정보 수정, 탈퇴 등 전체 회원 생애주기를 관리합니다",
    "sortOrder": 1
  },
  "screens": [
    {
      "systemId": "PID-00001",
      "name": "회원 목록 조회",
      "screenType": "LIST",
      "spec": "## [PID-00001] 회원 목록 조회\\n\\n### 1. 화면 개요\\n| 항목 | 내용 |\\n|:-----|:-----|\\n| **비즈니스 목적** | 회원 정보를 조건으로 검색하여 목록으로 조회한다. |\\n| **진입 경로** | 좌측 메뉴 > 회원관리 > 회원 목록 클릭 |\\n\\n### 2. 영역 간 흐름\\n- 화면 진입 시 → 검색 조건 초기화 → 자동 조회 → 목록 표시\\n- [검색] 버튼 클릭 → 조건으로 재조회 → 1페이지 초기화\\n- 목록 행 클릭 → 회원 상세 화면으로 이동",
      "sortOrder": 1,
      "areas": [
        {
          "areaCode": "AR-00001",
          "name": "검색 조건",
          "areaType": "SEARCH",
          "spec": "### 영역: [AR-00001] 검색 조건\\n\\n**유형:** SEARCH\\n\\n**UI 구조**\\n\`\`\`\\n+───────────────────────────────────────────────────+\\n| (상태 전체 v)  (기간: 시작일~종료일)  [이름 검색...] [검색] |\\n+───────────────────────────────────────────────────+\\n\`\`\`\\n\\n**구성 항목**\\n| 항목명 | UI 타입 | 설명 | 기본값 |\\n|:-------|:--------|:-----|:-------|\\n| 상태 | select | 전체/활성/비활성 | 전체 |\\n| 기간 시작 | date picker | 가입일 범위 검색 시작 | - |\\n| 기간 종료 | date picker | 가입일 범위 검색 종료 | - |\\n| 이름 검색 | text input | 이름 부분 일치, 엔터 지원 | - |\\n| 검색 버튼 | button (primary) | 조건 적용하여 조회 | - |",
          "sortOrder": 1,
          "functions": [
            {
              "systemId": "FID-00001",
              "name": "검색 실행",
              "displayCode": "BTN_SEARCH",
              "priority": "HIGH",
              "spec": "#### 기능: [FID-00001] 검색 실행\\n\\n| 항목 | 내용 |\\n|:-----|:-----|\\n| **기능유형** | SELECT |\\n| **API** | \`GET /api/member\` |\\n| **트리거** | 화면 진입(자동), [검색] 버튼 클릭 |\\n\\n**Input**\\n| 파라미터 | 타입 | 필수 | 설명 |\\n|:---------|:-----|:-----|:-----|\\n| keyword | string | N | 이름 부분 일치 |\\n| status | string | N | null이면 전체 |\\n| page | number | Y | 1부터 시작 |\\n\\n**Output**\\n| 필드 | 타입 | 설명 |\\n|:-----|:-----|:-----|\\n| items | array | 회원 목록 |\\n| totalCount | number | 전체 건수 |\\n\\n**처리 로직**\\n\`\`\`\\n1. 검색 조건 적용 (미입력 시 전체 조회)\\n2. 정렬: 최신 가입순\\n3. 페이징: 페이지당 20건\\n\`\`\`\\n\\n**에러 처리**\\n| 상황 | HTTP | 메시지 |\\n|:-----|:-----|:-------|\\n| 결과 0건 | 200 | 목록 빈 상태로 표시 |",
              "sortOrder": 1
            }
          ]
        },
        {
          "name": "회원 목록",
          "areaType": "GRID",
          "spec": "### 영역: [AR-00002] 회원 목록\\n\\n**유형:** GRID\\n\\n**UI 구조**\\n\`\`\`\\n+──────────────────────────────────────────────────+\\n│ 총 N건                               [신규 등록] │\\n│──────────────────────────────────────────────────│\\n│ No │ 이름 │ 이메일 │ 가입일 │ 상태 │\\n│ 1  │ ...  │ ...    │ ...    │ 활성  │\\n│──────────────────────────────────────────────────│\\n│               < 1 [2] 3 >                        │\\n+──────────────────────────────────────────────────+\\n\`\`\`\\n\\n**구성 항목**\\n| 항목명 | UI 타입 | 설명 | 기본값 |\\n|:-------|:--------|:-----|:-------|\\n| 총 건수 | text | 좌측 상단 "총 N건" | - |\\n| 신규 등록 버튼 | button (primary) | 우측 상단, 클릭 → 등록 화면 | - |\\n| No | text (center) | 행 번호 | - |\\n| 이름 | text (link) | 클릭 → 상세 화면 | - |\\n| 이메일 | text | | - |\\n| 가입일 | date | yyyy-MM-dd | - |\\n| 상태 | badge | 활성/비활성 | - |\\n| 페이지네이션 | pagination | 페이지당 20건 | - |",
          "sortOrder": 2,
          "functions": [
            {
              "name": "행 클릭 - 상세 이동",
              "displayCode": "ROW_CLICK",
              "priority": "HIGH",
              "spec": "#### 기능: [FID-00002] 행 클릭 - 상세 이동\\n\\n| 항목 | 내용 |\\n|:-----|:-----|\\n| **기능유형** | BUTTON |\\n| **트리거** | 목록 행 클릭 |\\n\\n**처리 로직**\\n\`\`\`\\n1. 클릭한 행의 memberId를 경로 파라미터로 전달\\n2. 회원 상세 화면(/member/{memberId})으로 이동\\n\`\`\`",
              "sortOrder": 1
            }
          ]
        }
      ]
    }
  ]
}
\`\`\`
※ systemId / areaCode 있는 항목은 수정, 없는 항목은 신규 등록됩니다.`;

// ─── 타입 ─────────────────────────────────────────────────────────────────────

interface RequirementItem { requirementId: number; systemId: string; name: string; }
interface UnitWorkItem    { unitWorkId: number; systemId: string; name: string; }

interface ParsedFunc   { systemId?: string; name: string; displayCode?: string; priority?: string; spec?: string; }
interface ParsedArea   { areaCode?: string; name: string; areaType?: string; spec?: string; functions?: ParsedFunc[]; }
interface ParsedScreen { systemId?: string; name: string; screenType?: string; spec?: string; areas?: ParsedArea[]; }
interface ParsedData   { unitWork: { systemId?: string; name: string; description?: string }; screens?: ParsedScreen[]; }

interface ImportResult {
  unitWork: { systemId: string; name: string; isNew: boolean };
  summary: {
    screens: number; areas: number; functions: number;
    new: { unitWork: number; screens: number; areas: number; functions: number };
    updated: { unitWork: number; screens: number; areas: number; functions: number };
  };
  screens: { systemId: string; name: string; areas: { areaCode: string; name: string; functions: { systemId: string; name: string }[] }[] }[];
}

// ─── 복사 버튼 ────────────────────────────────────────────────────────────────

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy}
      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-border bg-background hover:bg-muted transition-colors text-muted-foreground"
    >
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      {copied ? "복사됨" : (label ?? "복사")}
    </button>
  );
}

// ─── 미리보기 트리 (신규/수정 배지 포함) ─────────────────────────────────────

function Badge({ isNew }: { isNew: boolean }) {
  return (
    <span className={cn("text-[9px] px-1 py-0.5 rounded font-bold",
      isNew ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
    )}>
      {isNew ? "🆕 신규" : "✏️ 수정"}
    </span>
  );
}

function PreviewTree({ data }: { data: ParsedData }) {
  const countNew = { screens: 0, areas: 0, funcs: 0 };
  const countUpd = { screens: 0, areas: 0, funcs: 0 };
  (data.screens ?? []).forEach(s => {
    s.systemId ? countUpd.screens++ : countNew.screens++;
    (s.areas ?? []).forEach(a => {
      a.areaCode ? countUpd.areas++ : countNew.areas++;
      (a.functions ?? []).forEach(f => { f.systemId ? countUpd.funcs++ : countNew.funcs++; });
    });
  });

  return (
    <div className="text-xs space-y-2">
      {/* 요약 칩 */}
      <div className="flex flex-wrap gap-1 pb-1 border-b border-border/50">
        {countNew.screens + countNew.areas + countNew.funcs > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-medium">
            🆕 신규 화면 {countNew.screens} · 영역 {countNew.areas} · 기능 {countNew.funcs}
          </span>
        )}
        {countUpd.screens + countUpd.areas + countUpd.funcs > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-medium">
            ✏️ 수정 화면 {countUpd.screens} · 영역 {countUpd.areas} · 기능 {countUpd.funcs}
          </span>
        )}
      </div>

      {/* 트리 */}
      <div className="flex items-center gap-1.5 font-semibold text-foreground">
        <Briefcase className="h-3.5 w-3.5 text-amber-500" />
        {data.unitWork.name}
        <Badge isNew={!data.unitWork.systemId} />
        {data.unitWork.systemId && <span className="font-mono text-muted-foreground">{data.unitWork.systemId}</span>}
      </div>
      {(data.screens ?? []).map((s, si) => (
        <div key={si} className="ml-4 space-y-0.5">
          <div className="flex items-center gap-1.5 text-blue-700">
            <Monitor className="h-3 w-3" />
            <span className="font-medium">{s.name}</span>
            <Badge isNew={!s.systemId} />
            {s.systemId && <span className="font-mono text-muted-foreground text-[10px]">{s.systemId}</span>}
            {s.screenType && <span className="px-1 py-0.5 rounded bg-blue-100 text-blue-600 text-[10px]">{s.screenType}</span>}
          </div>
          {(s.areas ?? []).map((a, ai) => (
            <div key={ai} className="ml-4 space-y-0.5">
              <div className="flex items-center gap-1.5 text-green-700">
                <LayoutGrid className="h-3 w-3" />
                <span>{a.name}</span>
                <Badge isNew={!a.areaCode} />
                {a.areaCode && <span className="font-mono text-muted-foreground text-[10px]">{a.areaCode}</span>}
                {a.areaType && <span className="px-1 py-0.5 rounded bg-green-100 text-green-600 text-[10px]">{a.areaType}</span>}
              </div>
              {(a.functions ?? []).map((f, fi) => (
                <div key={fi} className="ml-4 flex items-center gap-1.5 text-purple-700">
                  <Cog className="h-3 w-3" />
                  <span>{f.name}</span>
                  <Badge isNew={!f.systemId} />
                  {f.systemId && <span className="font-mono text-muted-foreground text-[10px]">{f.systemId}</span>}
                  {f.priority && (
                    <span className={cn("px-1 py-0.5 rounded text-[10px]",
                      f.priority === "HIGH" ? "bg-red-100 text-red-600" : f.priority === "LOW" ? "bg-gray-100 text-gray-500" : "bg-purple-100 text-purple-600"
                    )}>{f.priority}</span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── 완성도 바 ────────────────────────────────────────────────────────────────

function CompletenessBar({ data }: { data: ParsedData }) {
  const checks = [
    { label: "단위업무 설명", ok: !!data.unitWork.description?.trim() },
    { label: "화면 spec",    ok: (data.screens ?? []).every(s => !!s.spec?.trim()) },
    { label: "영역 spec",    ok: (data.screens ?? []).every(s => (s.areas ?? []).every(a => !!a.spec?.trim())) },
    { label: "기능 spec",    ok: (data.screens ?? []).every(s => (s.areas ?? []).every(a => (a.functions ?? []).every(f => !!f.spec?.trim()))) },
    { label: "화면 유형",    ok: (data.screens ?? []).every(s => !!s.screenType) },
    { label: "기능 우선순위",ok: (data.screens ?? []).every(s => (s.areas ?? []).every(a => (a.functions ?? []).every(f => !!f.priority))) },
  ];
  const score = checks.filter(c => c.ok).length;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">설계 완성도</span>
        <span className={cn("font-bold", score >= 5 ? "text-green-600" : score >= 3 ? "text-amber-600" : "text-red-500")}>{score}/{checks.length}</span>
      </div>
      <div className="flex gap-1">
        {checks.map((c, i) => <div key={i} className={cn("flex-1 h-1.5 rounded-full", c.ok ? "bg-green-500" : "bg-muted")} title={c.label} />)}
      </div>
      <div className="flex flex-wrap gap-1">
        {checks.map((c, i) => (
          <span key={i} className={cn("flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded",
            c.ok ? "bg-green-50 text-green-700" : "bg-muted text-muted-foreground"
          )}>
            {c.ok ? <Check className="h-2.5 w-2.5" /> : <AlertCircle className="h-2.5 w-2.5" />}
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────

export default function AiImportPage() {
  const [tab, setTab] = useState<"guide" | "import">("guide");

  // ── 공통 데이터 ───────────────────────────────────────────
  const { data: reqData } = useQuery({
    queryKey: ["requirements-for-import"],
    queryFn: () => apiFetch<{ data: RequirementItem[] }>("/api/requirements?pageSize=200"),
  });
  const requirements: RequirementItem[] = reqData?.data ?? [];

  const { data: uwData } = useQuery({
    queryKey: ["unit-works-for-import"],
    queryFn: () => apiFetch<{ data: UnitWorkItem[] }>("/api/unit-works?pageSize=200"),
  });
  const unitWorks: UnitWorkItem[] = uwData?.data ?? [];

  // ── 가져오기 상태 ─────────────────────────────────────────
  const [requirementId, setRequirementId] = useState("");
  const [jsonText, setJsonText]           = useState("");
  const [importResult, setImportResult]   = useState<ImportResult[] | null>(null);

  // ── 내보내기 상태 ─────────────────────────────────────────
  const [exportUwIds, setExportUwIds]     = useState<number[]>([]);
  const [exportLoading, setExportLoading] = useState(false);

  const toggleExportUw = (id: number) =>
    setExportUwIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const parsed = useMemo((): ParsedData | ParsedData[] | null => {
    if (!jsonText.trim()) return null;
    try { return JSON.parse(jsonText); } catch { return null; }
  }, [jsonText]);

  const parsedArray = useMemo((): ParsedData[] =>
    !parsed ? [] : Array.isArray(parsed) ? parsed : [parsed],
  [parsed]);

  const isJsonValid = parsedArray.length > 0 && parsedArray.every(p => !!p.unitWork?.name);
  const isNewUnitWork = isJsonValid && parsedArray.some(p => !p.unitWork.systemId);

  // ── 내보내기 ──────────────────────────────────────────────
  const handleExport = async () => {
    if (!exportUwIds.length) return;
    setExportLoading(true);
    try {
      const results = await Promise.all(
        exportUwIds.map(id => apiFetch<{ data: object }>(`/api/design-import?unitWorkId=${id}`))
      );
      const json = results.length === 1
        ? JSON.stringify(results[0].data, null, 2)
        : JSON.stringify(results.map(r => r.data), null, 2);
      await navigator.clipboard.writeText(json);
      toast.success(`${results.length}개 단위업무 JSON이 클립보드에 복사되었습니다.`);
    } catch {
      toast.error("내보내기 실패");
    } finally {
      setExportLoading(false);
    }
  };

  // ── 가져오기 뮤테이션 ─────────────────────────────────────
  const importMutation = useMutation({
    mutationFn: async () => {
      const results: ImportResult[] = [];
      for (const item of parsedArray) {
        const res = await apiFetch<{ data: ImportResult }>("/api/design-import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requirementId: requirementId ? parseInt(requirementId) : undefined,
            data: item,
          }),
        });
        results.push(res.data);
      }
      return results;
    },
    onSuccess: (results) => {
      setImportResult(results);
      const t = results.reduce(
        (acc, r) => ({
          new: { screens: acc.new.screens + r.summary.new.screens, areas: acc.new.areas + r.summary.new.areas, functions: acc.new.functions + r.summary.new.functions },
          updated: { screens: acc.updated.screens + r.summary.updated.screens, areas: acc.updated.areas + r.summary.updated.areas, functions: acc.updated.functions + r.summary.updated.functions },
        }),
        { new: { screens: 0, areas: 0, functions: 0 }, updated: { screens: 0, areas: 0, functions: 0 } }
      );
      toast.success(`완료! 신규 화면 ${t.new.screens} 영역 ${t.new.areas} 기능 ${t.new.functions} · 수정 화면 ${t.updated.screens} 영역 ${t.updated.areas} 기능 ${t.updated.functions}`);
    },
    onError: () => toast.error("가져오기에 실패했습니다."),
  });

  const templateStr = JSON.stringify(JSON_TEMPLATE, null, 2);

  return (
    <div className="-mx-6 -mt-6 flex flex-col h-[calc(100vh-48px)]">

      {/* ── 헤더 ─────────────────────────────────────────────── */}
      <div className="px-6 py-3 border-b border-border bg-background shrink-0">
        <h1 className="text-base font-semibold">AI 설계 가져오기</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Claude 프로젝트에서 설계한 JSON을 가져와 시스템에 등록하거나 수정합니다</p>
      </div>

      {/* ── 탭 ───────────────────────────────────────────────── */}
      <div className="flex border-b border-border shrink-0 bg-background px-6">
        {(["guide", "import"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
              tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "guide" ? "① AI 프롬프트 & 템플릿" : "② 내보내기 / 가져오기"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* ── 탭 1: 가이드 ───────────────────────────────────── */}
        {tab === "guide" && (
          <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">

            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="text-sm font-semibold mb-3">사용 방법</h2>
              <ol className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Claude 프로젝트를 만들고 아래 시스템 프롬프트를 프로젝트 지침에 붙여넣습니다.",
                  "Claude와 4단계로 설계합니다: ① 단위업무 → ② 화면 → ③ 영역 → ④ 기능. 누락 항목은 Claude가 다시 물어봅니다.",
                  "중간에 '요약해줘'로 현황을 확인하고, 완료 후 \"JSON 줘\" 요청 → Claude가 엄격 검토 후 출력합니다.",
                  "기존 데이터 수정: ② 탭에서 단위업무 내보내기 → JSON 복사 → Claude에 붙여넣고 수정 요청 → JSON 받기.",
                  "JSON을 ② 탭에 붙여넣고 가져오기 실행. systemId/areaCode 있는 항목은 수정, 없는 항목은 신규 등록됩니다.",
                ].map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b border-border">
                <div>
                  <h2 className="text-sm font-semibold">Claude 프로젝트 시스템 프롬프트</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Claude 프로젝트 지침에 전체 내용을 붙여넣으세요</p>
                </div>
                <CopyButton text={SYSTEM_PROMPT} label="전체 복사" />
              </div>
              <pre className="p-4 text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto bg-muted/20">
                {SYSTEM_PROMPT}
              </pre>
            </div>

            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b border-border">
                <div>
                  <h2 className="text-sm font-semibold">JSON 템플릿 (참고용)</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">시스템 프롬프트에 이미 포함되어 있습니다</p>
                </div>
                <CopyButton text={templateStr} label="복사" />
              </div>
              <pre className="p-4 text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap bg-muted/20">
                {templateStr}
              </pre>
            </div>

            {/* 필드 참조표 */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 bg-muted/40 border-b border-border">
                <h2 className="text-sm font-semibold">ID 규칙 (신규 vs 수정)</h2>
              </div>
              <div className="p-4 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left pb-2 pr-4 font-medium text-muted-foreground">항목</th>
                      <th className="text-left pb-2 pr-4 font-medium text-muted-foreground">식별 키</th>
                      <th className="text-left pb-2 pr-4 font-medium text-muted-foreground">형식</th>
                      <th className="text-left pb-2 font-medium text-muted-foreground">없으면 → 있으면</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {[
                      ["단위업무", "systemId", "UW-NNNNN", "신규 생성 → 기존 수정"],
                      ["화면",     "systemId", "PID-NNNNN","신규 생성 → 기존 수정"],
                      ["영역",     "areaCode", "AR-NNNNN", "신규 생성 → 기존 수정"],
                      ["기능",     "systemId", "FID-NNNNN","신규 생성 → 기존 수정"],
                    ].map(([item, key, fmt, rule]) => (
                      <tr key={item}>
                        <td className="py-1.5 pr-4 font-medium">{item}</td>
                        <td className="py-1.5 pr-4 font-mono text-muted-foreground">{key}</td>
                        <td className="py-1.5 pr-4 font-mono text-muted-foreground">{fmt}</td>
                        <td className="py-1.5 text-muted-foreground">{rule}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── 탭 2: 내보내기 / 가져오기 ──────────────────────── */}
        {tab === "import" && (
          <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">

            {/* 내보내기 섹션 */}
            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold mb-1">기존 데이터 내보내기 (수정 작업 시작)</h2>
              <p className="text-xs text-muted-foreground mb-3">단위업무를 하나 이상 선택하면 systemId 포함 JSON을 클립보드에 복사합니다. Claude에 붙여넣고 수정을 요청하세요.</p>
              <div className="flex gap-3 items-start">
                {/* 다중 선택 목록 */}
                <div className="flex-1 max-w-sm rounded border border-border bg-background max-h-40 overflow-y-auto text-xs divide-y divide-border/40">
                  {unitWorks.length === 0 ? (
                    <p className="p-2 text-muted-foreground">단위업무가 없습니다.</p>
                  ) : unitWorks.map(u => {
                    const checked = exportUwIds.includes(u.unitWorkId);
                    return (
                      <button
                        key={u.unitWorkId}
                        type="button"
                        onClick={() => toggleExportUw(u.unitWorkId)}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-accent transition-colors ${checked ? "bg-accent/60" : ""}`}
                      >
                        <span className={`flex-none w-3.5 h-3.5 rounded border flex items-center justify-center text-[9px] font-bold ${checked ? "bg-primary border-primary text-primary-foreground" : "border-border"}`}>
                          {checked ? "✓" : ""}
                        </span>
                        <span className="font-mono text-muted-foreground">{u.systemId}</span>
                        <span className="truncate">{u.name}</span>
                      </button>
                    );
                  })}
                </div>
                {/* 액션 */}
                <div className="flex flex-col gap-2">
                  <Button size="sm" variant="outline" disabled={!exportUwIds.length || exportLoading} onClick={handleExport}>
                    {exportLoading
                      ? <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />내보내는 중...</>
                      : <><Download className="h-3.5 w-3.5 mr-1.5" />JSON 복사 {exportUwIds.length > 0 ? `(${exportUwIds.length})` : ""}</>}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs h-7"
                    onClick={() => exportUwIds.length === unitWorks.length
                      ? setExportUwIds([])
                      : setExportUwIds(unitWorks.map(u => u.unitWorkId))}>
                    {exportUwIds.length === unitWorks.length ? "선택 초기화" : "전체 선택"}
                  </Button>
                </div>
              </div>
            </div>

            {/* 가져오기 섹션 */}
            {importResult ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-green-300 bg-green-50 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <h2 className="text-sm font-semibold text-green-800">가져오기 완료! ({importResult.length}개 단위업무)</h2>
                  </div>
                  {importResult.map((r, i) => (
                    <div key={i} className="border-t border-green-200 pt-3 first:border-0 first:pt-0">
                      <p className="text-xs text-green-700 font-medium mb-1">
                        <strong>{r.unitWork.systemId}</strong> {r.unitWork.name}
                        {r.unitWork.isNew ? " · 신규 생성" : " · 업데이트"}
                      </p>
                      <div className="flex gap-6 text-xs">
                        <span className="text-green-600">🆕 화면 <b>{r.summary.new.screens}</b> 영역 <b>{r.summary.new.areas}</b> 기능 <b>{r.summary.new.functions}</b></span>
                        <span className="text-amber-600">✏️ 화면 <b>{r.summary.updated.screens}</b> 영역 <b>{r.summary.updated.areas}</b> 기능 <b>{r.summary.updated.functions}</b></span>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" onClick={() => { setImportResult(null); setJsonText(""); setRequirementId(""); }}>
                  <PlusCircle className="h-3.5 w-3.5 mr-1.5" />새로 가져오기
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                {/* 왼쪽: 입력 */}
                <div className="space-y-4">
                  {isNewUnitWork && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        연결할 요구사항 <span className="text-red-500">*</span>
                        <span className="ml-1 text-[10px] text-blue-500">(신규 단위업무 등록 시 필요)</span>
                      </label>
                      <Select value={requirementId} onValueChange={setRequirementId}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="요구사항 선택..." />
                        </SelectTrigger>
                        <SelectContent>
                          {requirements.map(r => (
                            <SelectItem key={r.requirementId} value={String(r.requirementId)}>
                              <span className="font-mono text-muted-foreground mr-2">{r.systemId}</span>{r.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-muted-foreground">Claude JSON 붙여넣기 <span className="text-red-500">*</span></label>
                      {jsonText && (
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1",
                          isJsonValid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                        )}>
                          {isJsonValid ? <><Check className="h-2.5 w-2.5" />유효</> : <><AlertCircle className="h-2.5 w-2.5" />파싱 오류</>}
                        </span>
                      )}
                    </div>
                    <Textarea
                      value={jsonText}
                      onChange={e => setJsonText(e.target.value)}
                      placeholder={"Claude가 출력한 JSON을 여기에 붙여넣으세요\n\n• systemId / areaCode 있는 항목 → 수정\n• systemId / areaCode 없는 항목 → 신규 등록"}
                      className="font-mono text-xs min-h-[320px] resize-none"
                    />
                  </div>

                  <Button
                    className="w-full"
                    disabled={!isJsonValid || (isNewUnitWork && !requirementId) || importMutation.isPending}
                    onClick={() => importMutation.mutate()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {importMutation.isPending ? "처리 중..." : "시스템에 등록 / 수정"}
                  </Button>
                </div>

                {/* 오른쪽: 미리보기 */}
                <div className="space-y-4">
                  {isJsonValid ? (
                    <>
                      <div className="rounded-lg border border-border bg-card p-4">
                        <h3 className="text-xs font-semibold text-muted-foreground mb-3">미리보기</h3>
                        {parsedArray.map((item, i) => (
                          <div key={i}>
                            {parsedArray.length > 1 && (
                              <p className="text-[10px] font-mono text-muted-foreground mb-1 mt-3 first:mt-0">[{i + 1}] {item.unitWork.name}</p>
                            )}
                            <PreviewTree data={item} />
                          </div>
                        ))}
                      </div>
                      <div className="rounded-lg border border-border bg-card p-4">
                        {parsedArray.map((item, i) => (
                          <div key={i}>
                            {parsedArray.length > 1 && (
                              <p className="text-[10px] font-mono text-muted-foreground mb-1 mt-3 first:mt-0">[{i + 1}] {item.unitWork.name}</p>
                            )}
                            <CompletenessBar data={item} />
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border bg-muted/20 min-h-[200px] flex flex-col items-center justify-center text-muted-foreground gap-2 text-xs">
                      <Download className="h-8 w-8 opacity-30" />
                      <p>JSON을 붙여넣으면 미리보기가 표시됩니다</p>
                      <p className="text-[10px]">🆕 신규 / ✏️ 수정 항목을 구분해서 보여줍니다</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
