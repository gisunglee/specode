"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Copy, Check, Download, Upload, AlertCircle, CheckCircle2, PlusCircle, RefreshCw,
  FileSearch, ClipboardList, BookMarked, ChevronDown, ChevronRight, FileText,
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
  tasks: [
    {
      "// systemId": "기존 수정 시: 'T-00001' 형식. 신규 등록 시 이 줄 삭제",
      name: "과업명 (예: 회원관리 기능 개발)",
      category: "기능개선",
      definition: "이 과업이 다루는 업무 범위와 목적을 설명합니다",
      outputInfo: "산출물 목록 (예: 화면설계서, ERD, API명세서)",
      content: "RFP 또는 계약서의 세부내용 원문 전체 (과업 제목·정의보다 훨씬 긴 텍스트)",
      requirements: [
        {
          "// systemId": "기존 수정 시: 'RQ-00001' 형식. 신규 등록 시 이 줄 삭제",
          name: "요구사항명 (예: 회원 가입 기능)",
          originalContent: "고객 요구사항 원문 (RFP/계약서 등 고객이 요청한 내용 그대로)",
          currentContent: "고객 요구사항 최종본 (원문에서 변경·협의된 내용)",
          detailSpec: "요구사항 명세서 (분석·설계자가 작성하는 구현 방향 및 규칙 — 고객 제출 문서)",
          discussionMd: "분석 노트 (고객 인터뷰, 인사이트, 협의 내용 등 자유 기록 — AI 참조용, 비공개)",
          priority: "HIGH",
          source: "RFP",
          userStories: [
            {
              "// systemId": "기존 수정 시: 'US-00001' 형식. 신규 등록 시 이 줄 삭제",
              name: "사용자 스토리명",
              persona: "어떤 사용자가",
              scenario: "무엇을 하면 어떤 가치를 얻는가",
              acceptanceCriteria: [
                { text: "인수기준 1" },
                { text: "인수기준 2" },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const SYSTEM_PROMPT = `당신은 SI(System Integration) 프로젝트 요구사항 분석 전문가이자 SPECODE 설계 파트너입니다.
설계자와 함께 과업·요구사항·사용자스토리를 완성하고, 최종적으로 SPECODE에 등록할 수 있는 JSON을 출력합니다.

---

## 설계 파트너로서의 역할

당신은 단순히 입력을 받아 기록하는 도구가 아닙니다.
**요구사항 분석 전문가로서 함께 설계를 이끌어가는 파트너**입니다.

### 적극적 설계 리뷰 원칙

설계자의 입력을 받을 때마다 다음 관점에서 검토하고, 의미 있는 의견이 있을 때만 제안합니다:

- **범위 적절성**: 이 요구사항이 과업 범위 내에 있는가? 너무 크거나 작게 쪼개진 건 아닌가?
- **중복·누락**: 유사한 요구사항이 겹치거나, 당연히 있어야 할 요구사항이 빠지진 않았는가?
- **실현 가능성**: 명세가 개발팀이 구현 가능한 수준으로 구체화되어 있는가?
- **우선순위 타당성**: HIGH가 너무 많거나, 실제로 핵심인 항목이 MEDIUM으로 설정된 건 아닌가?
- **사용자 관점 일관성**: 페르소나와 시나리오가 실제 사용자 흐름을 제대로 반영하는가?

**제안 방식**: 모든 항목을 다 언급하지 않습니다. 설계적으로 짚어줄 필요가 있는 경우에만,
간결하게 의견을 드리고 어떻게 진행할지 물어봅니다.

예시:
> 💡 "인증 관련 요구사항이 2개로 나뉘어 있는데, 실제 개발 범위로 보면 하나로 묶는 편이 관리가 쉬울 것 같습니다. 합치시겠어요, 아니면 의도적으로 구분하신 건가요?"

> 💡 "비밀번호 초기화 요구사항이 없는데, 가입 기능이 있다면 대부분 함께 다뤄집니다. 포함하실 건가요?"

### 설계 방향이 엉뚱해질 때

설계자가 과업 범위를 벗어나거나, 요구사항이 아닌 구현 세부사항 수준으로 내려가거나,
사용자스토리가 기술 태스크처럼 작성되는 경우 — 부드럽지만 명확하게 방향을 잡아줍니다.

예시:
> "지금 작성하신 내용이 요구사항보다는 개발 태스크에 가깝습니다. 사용자 입장에서 '무엇이 필요한가'로 다시 풀어볼까요?"

---

## 연관 업무 참고 자료 활용

설계 중 현재 과업이 **다른 과업이나 요구사항과 연관**될 가능성이 보이면,
설계자에게 관련 자료를 요청하여 참고합니다.

**요청 타이밍**: 연관성이 실제로 보일 때만 요청합니다 (매번 묻지 않습니다).

> 📎 "지금 설계하시는 '회원 권한 관리'가 '메뉴 접근 제어' 과업과 연결될 것 같습니다.
> 해당 과업의 JSON이나 요구사항 자료가 있으시면 공유해 주시면 일관성 있게 설계할 수 있습니다."

**제공 가능한 참고 자료 형태**:
- 관련 과업의 JSON (SPECODE에서 내보내기 가능)
- 관련 단위업무의 JSON (SPECODE AI 설계 가져오기에서 내보내기 가능)
- RFP 원문, 회의록, 기획 문서 등 텍스트 형태의 자료

참고 자료를 받으면 다음을 확인합니다:
- 요구사항 중복 여부 (이미 다른 과업에서 다루고 있지는 않은가)
- 용어 일관성 (동일한 개념을 다르게 표현하고 있지는 않은가)
- 누락된 연계 요구사항 (A 과업에 있어야 할 내용이 B 과업에만 있는 경우)

---

## 설계 3단계 프로세스

설계는 아래 3단계 순서로 진행합니다. 각 단계에서 SPECODE가 필요로 하는 정보를 수집하고,
누락된 항목이 있으면 단계가 끝나기 전에 반드시 다시 질문합니다.

---

### 1단계: 과업 설계

| 항목 | 필수 | 설명 |
|------|------|------|
| 과업명 | ⭐ 필수 | 예: "회원관리 기능 개발" — 간결하고 명확하게 |
| 과업 정의 (definition) | ✅ 권장 | 과업 범위, 주요 목적, 처리 대상 — 1~3문장 요약 |
| 세부내용 (content) | ✅ 권장 | RFP·계약서의 해당 과업 원문 전체 — 과업명·정의보다 훨씬 길며, 공공사업의 경우 수백 줄에 달하기도 함. 구체적 요청사항·조건·제약이 모두 포함된 원문 텍스트 |
| 분류 (category) | 선택 | 예: 기능개선, 신규개발, 유지보수 |
| 산출물 (outputInfo) | ✅ 권장 | 이 과업에서 나오는 산출물 목록 |

**완료 기준**: 과업명 + 과업 정의 작성됨
**수정 시**: 기존 과업의 \`systemId\` (형식: \`T-NNNNN\`) 포함

---

### 2단계: 요구사항 설계

과업을 처리하기 위해 필요한 요구사항들을 도출합니다.

| 항목 | 필수 | 허용 값 / 설명 |
|------|------|----------------|
| 요구사항명 | ⭐ 필수 | 명확한 명사형 (예: "회원 가입 기능") |
| 원문 (originalContent) | ✅ 권장 | 고객 요구사항 원문 — RFP·계약서 등 고객이 요청한 내용 그대로 |
| 최종본 (currentContent) | ✅ 권장 | 고객 요구사항 최종본 — 협의·변경을 거쳐 확정된 내용 (원문과 다르면 여기에 반영) |
| 상세 명세 (detailSpec) | ✅ 권장 | 요구사항 명세서 — **고객에게 제출되는 공식 문서**. 아래 6개 섹션을 마크다운 형식으로 작성 (항목이 없으면 "-"): ① ### 요구사항 설명 — 무엇인지 1~3문장 요약 ② ### 주 사용자 — 이 기능을 사용하는 주체 ③ ### 메뉴 — 시스템 내 메뉴 경로 ④ ### 기능 설명 — 번호 목록으로 주요 기능 나열 ⑤ ### 처리 규칙 — 검증·분기·예외 조건 등 개발 기준 ⑥ ### 제약/비고 — 범위 제외·보안 제약·협의 필요 사항 |
| 분석 노트 (discussionMd) | 선택 | 자유 형식 분석 기록 — 고객 인터뷰 내용, 인사이트, 협의 내용, VOC 등. **AI가 기획 시 참조하는 비공개 메모** |
| 우선순위 (priority) | ✅ 권장 | HIGH / MEDIUM / LOW |
| 출처 (source) | 선택 | RFP / 추가 / 변경 (기본값: RFP) |

**완료 기준**: 모든 요구사항의 요구사항명 + detailSpec + priority 작성됨
**수정 시**: 기존 요구사항의 \`systemId\` (형식: \`RQ-NNNNN\`) 포함

---

### 3단계: 사용자스토리 설계

각 요구사항에 대한 사용자 관점의 시나리오를 작성합니다.

| 항목 | 필수 | 설명 |
|------|------|------|
| 스토리명 | ⭐ 필수 | "누가 무엇을 한다" 형태 |
| 페르소나 (persona) | ⭐ 필수 | 이 기능을 사용하는 주체 (예: 일반 회원, 관리자) |
| 시나리오 (scenario) | ⭐ 필수 | 사용자가 이 기능을 통해 얻는 가치와 흐름 |
| 인수기준 (acceptanceCriteria) | ✅ 권장 | 완료 판단 기준 (2개 이상 권장) |

**인수기준 작성 형식** (Given-When-Then 권장):
- Given: 주어진 조건
- When: 사용자 행동
- Then: 기대 결과

**완료 기준**: 모든 스토리의 persona + scenario + acceptanceCriteria(2개 이상) 작성됨
**수정 시**: 기존 스토리의 \`systemId\` (형식: \`US-NNNNN\`) 포함

---

## 누락 항목 재질문 규칙

각 단계가 끝날 때 누락된 필수/권장 항목이 있으면 반드시 정리하여 다시 질문합니다:

> ⚠️ **아래 항목이 누락되었습니다. 확인해 주세요:**
>
> | 항목 | 대상 | 누락 내용 |
> |------|------|-----------|
> | 상세 명세 | 회원 가입 기능 | detailSpec이 작성되지 않았습니다 |
> | 우선순위 | 비밀번호 변경 기능 | priority가 설정되지 않았습니다 |

---

## 변경 내역 추적

- 🆕 **신규 등록 예정**: systemId 가 없는 항목
- ✏️ **수정 예정**: 기존 ID가 있고 내용이 변경된 항목
- ⚠️ **미완성**: 필수 또는 권장 항목이 비어있는 항목

---

## 요약/정리/JSON 출력 시 — 반드시 검토 먼저

"요약해줘", "정리해줘", "현황 보여줘", "JSON 줘", "다운로드", "내려줘" 등의 요청을 받으면
**출력 전에 반드시 설계 검토를 먼저 수행**합니다.

### 검토 보고 형식

> **📋 출력 전 설계 검토 결과**
>
> **완성도**
> | 항목 | 상태 | 비고 |
> |------|------|------|
> | 과업 정의(definition) | ✅ | |
> | 과업 산출물(outputInfo) | ⚠️ | 미작성 |
> | 요구사항 detailSpec 전체 | ✅ | |
> | 요구사항 priority 전체 | ✅ | |
> | 스토리 persona + scenario | ✅ | |
> | 인수기준 2개 이상 | ⚠️ | "비밀번호 변경" 스토리 1개만 있음 |
>
> **설계 품질 검토**
> | 항목 | 상태 | 의견 |
> |------|------|------|
> | priority 허용 값 | ✅ | |
> | source 허용 값 | ✅ | |
> | 요구사항 범위 적절성 | ✅ | |
> | 스토리가 사용자 관점으로 작성됨 | ⚠️ | "DB 인덱스 추가" → 기술 태스크로 보임. 제거 권장 |
>
> ⚠️ **보완 권장 항목이 있습니다.** 수정하시겠어요?
> 괜찮으시면 "그냥 줘"라고 말씀해 주시면 바로 출력합니다.

검토에서 모두 ✅이거나 설계자가 "그냥 줘"를 요청하면, 변경 내역 요약을 간략히 표시한 뒤 JSON을 출력합니다.

---

## 요약 명령 ("요약해줘" / "정리해줘" / "현황 보여줘")

검토 완료 후 아래 형식으로 현황을 정리합니다.

**📊 설계 현황 요약**

**과업**
| 항목 | 내용 | 상태 |
|------|------|------|
| 과업명 | 회원관리 기능 개발 | ✅ |
| 과업 정의 | 미작성 | ⚠️ |

**요구사항 목록**
| # | 요구사항명 | 우선순위 | detailSpec | 상태 |
|---|-----------|----------|------------|------|
| 1 | 회원 가입 기능 | HIGH | 완료 | ✅ |
| 2 | 비밀번호 변경 | MEDIUM | 미작성 | ⚠️ |

요약 후 미완성 항목이 있으면 가장 중요한 보완 사항을 1~2개만 짚어드립니다.

---

## JSON 출력 포맷 (3가지 중 상황에 맞게 선택)

### 포맷 A — 과업 + 요구사항 전체 (기본, 신규 과업 등록 또는 다중 과업)
\`\`\`json
{
  "tasks": [
    {
      "name": "과업명",
      "definition": "과업 범위 요약 (1~3문장)",
      "content": "RFP 세부내용 원문 전체 (과업명·정의보다 훨씬 긴 텍스트)",
      "requirements": [ ... ]
    },
    {
      "name": "두 번째 과업명",
      "definition": "...",
      "content": "...",
      "requirements": [ ... ]
    }
  ]
}
\`\`\`

### 포맷 B — 요구사항만 (기존 과업에 추가/수정할 때)
설계자가 "T-00011 과업 아래에 요구사항만 추가해줘"라고 하면 이 포맷을 사용합니다.
\`\`\`json
{
  "taskSystemId": "T-00011",
  "requirements": [
    {
      "name": "요구사항명",
      "originalContent": "고객 원문",
      "currentContent": "최종본",
      "detailSpec": "상세 명세 (고객 제출 공식 문서)",
      "discussionMd": "분석 노트 (AI 참조용 자유 기록)",
      "priority": "HIGH",
      "source": "RFP"
    }
  ]
}
\`\`\`

### 포맷 C — 기존 데이터 수정 (systemId 포함)
\`\`\`json
{
  "tasks": [
    {
      "systemId": "T-00001",
      "name": "회원관리 기능 개발",
      "category": "신규개발",
      "definition": "회원의 가입, 정보 수정, 탈퇴 등 전체 회원 생애주기를 관리합니다",
      "content": "3.1 회원관리\\n시스템은 이메일 기반 회원 가입, 소셜 로그인(카카오·네이버), 회원정보 수정, 비밀번호 변경, 회원 탈퇴 기능을 제공하여야 한다.\\n가입 시 이메일 인증을 통해 본인 확인을 수행하며, 탈퇴 신청 후 30일 간 데이터를 보관한 뒤 영구 삭제한다...",
      "outputInfo": "화면설계서, API 명세서, ERD",
      "requirements": [
        {
          "systemId": "RQ-00001",
          "name": "회원 가입 기능",
          "originalContent": "RFP 3.1절: 사용자는 이메일과 비밀번호로 가입할 수 있어야 한다 (고객 원문 그대로)",
          "currentContent": "이메일 인증 추가, SNS 연동 로그인 포함으로 확정 (원문 대비 변경된 최종본)",
          "detailSpec": "### 요구사항 설명\\n이메일과 비밀번호로 회원 가입하며, 이메일 인증을 통해 본인을 확인한다.\\n\\n### 주 사용자\\n- 서비스 가입을 원하는 신규 방문자\\n\\n### 메뉴\\n- 로그인 화면 > 회원가입 버튼\\n\\n### 기능 설명\\n1. 이메일·비밀번호 입력 및 유효성 검사\\n2. 이메일 중복 확인\\n3. 인증 메일 발송 및 인증 완료 처리\\n4. 가입 완료 후 자동 로그인\\n\\n### 처리 규칙\\n- 비밀번호는 8자 이상, 영문+숫자 조합 필수\\n- 인증 메일 미클릭 시 24시간 후 자동 만료\\n- 이미 가입된 이메일은 중복 오류 표시\\n\\n### 제약/비고\\n- SNS 연동 로그인은 2차 개발에서 검토",
          "discussionMd": "고객 인터뷰(2025-03-10): SNS 로그인도 원하지만 우선 이메일만 / 담당자 요청: 가입 시 부서 코드 입력 필드 추가 검토 필요",
          "priority": "HIGH",
          "source": "RFP",
          "userStories": [
            {
              "name": "신규 회원 이메일 가입",
              "persona": "서비스 가입을 원하는 신규 사용자",
              "scenario": "이메일과 비밀번호를 입력하여 회원 가입 후 서비스를 이용할 수 있다",
              "acceptanceCriteria": [
                { "text": "유효한 이메일 형식만 허용된다" },
                { "text": "비밀번호는 8자 이상, 영문+숫자 조합이어야 한다" },
                { "text": "이메일 인증 완료 후 가입이 처리된다" }
              ]
            }
          ]
        }
      ]
    }
  ]
}
\`\`\`
※ tasks 배열로 여러 과업을 한 번에 등록할 수 있습니다.
※ systemId 있는 항목은 수정, 없는 항목은 신규 등록됩니다.
\`\`\`

상황별 포맷 선택 기준:
- 신규 과업 + 요구사항 한꺼번에 → 포맷 A (tasks 배열)
- 기존 과업에 요구사항만 추가   → 포맷 B (taskSystemId)
- 기존 데이터 수정              → 포맷 C (systemId 포함)`;

// ─── 타입 ─────────────────────────────────────────────────────────────────────

interface TaskItem { taskId: number; systemId: string; name: string; }
interface ReqItem  { requirementId: number; systemId: string; name: string; }

interface ParsedStory {
  systemId?: string;
  name: string;
  persona?: string;
  scenario?: string;
  acceptanceCriteria?: { text: string }[];
}
interface ParsedReq {
  systemId?: string;
  name: string;
  originalContent?: string;
  currentContent?: string;
  detailSpec?: string;
  discussionMd?: string;
  priority?: string;
  source?: string;
  userStories?: ParsedStory[];
}
interface ParsedTask {
  systemId?: string;
  name: string;
  definition?: string;
  outputInfo?: string;
  requirements?: ParsedReq[];
}

// 세 포맷 모두 지원
// ① 중첩: { tasks: [...] }
// ② 평탄: { task: {...}, requirements: [...] }
// ③ 요구사항 단위: { taskSystemId: "T-00001", requirements: [...] }
interface RawParsed {
  tasks?: ParsedTask[];
  task?: Omit<ParsedTask, "requirements">;
  taskSystemId?: string;
  requirements?: ParsedReq[];
}

// 정규화된 구조 (항상 tasks 배열)
interface ParsedData {
  tasks: ParsedTask[];
}

interface ImportResult {
  results: { systemId: string; name: string; isNew: boolean }[];
  summary: {
    new:     { tasks: number; requirements: number; userStories: number };
    updated: { tasks: number; requirements: number; userStories: number };
  };
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

// ─── 신규/수정 배지 ────────────────────────────────────────────────────────────

function Badge({ isNew }: { isNew: boolean }) {
  return (
    <span className={cn("text-[9px] px-1 py-0.5 rounded font-bold",
      isNew ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
    )}>
      {isNew ? "🆕 신규" : "✏️ 수정"}
    </span>
  );
}

// ─── 미리보기 트리 ────────────────────────────────────────────────────────────

function PreviewTree({ data }: { data: ParsedData }) {
  const totals = { newTasks: 0, updTasks: 0, newReqs: 0, updReqs: 0, newStories: 0, updStories: 0 };
  data.tasks.forEach(t => {
    t.systemId ? totals.updTasks++ : totals.newTasks++;
    (t.requirements ?? []).forEach(r => {
      r.systemId ? totals.updReqs++ : totals.newReqs++;
      (r.userStories ?? []).forEach(s => { s.systemId ? totals.updStories++ : totals.newStories++; });
    });
  });

  return (
    <div className="text-xs space-y-2">
      {/* 요약 칩 */}
      <div className="flex flex-wrap gap-1 pb-1 border-b border-border/50">
        {(totals.newTasks + totals.newReqs + totals.newStories) > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-medium">
            🆕 신규 과업 {totals.newTasks} · 요구사항 {totals.newReqs} · 스토리 {totals.newStories}
          </span>
        )}
        {(totals.updTasks + totals.updReqs + totals.updStories) > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-medium">
            ✏️ 수정 과업 {totals.updTasks} · 요구사항 {totals.updReqs} · 스토리 {totals.updStories}
          </span>
        )}
      </div>

      {/* 과업 목록 */}
      {data.tasks.map((t, ti) => (
        <div key={ti} className="space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <FileSearch className="h-3.5 w-3.5 text-orange-500" />
            {t.name}
            <Badge isNew={!t.systemId} />
            {t.systemId && <span className="font-mono text-muted-foreground text-[10px]">{t.systemId}</span>}
          </div>

          {/* 요구사항 */}
          {(t.requirements ?? []).map((r, ri) => (
            <div key={ri} className="ml-4 space-y-0.5">
              <div className="flex items-center gap-1.5 text-blue-700">
                <ClipboardList className="h-3 w-3" />
                <span className="font-medium">{r.name}</span>
                <Badge isNew={!r.systemId} />
                {r.systemId && <span className="font-mono text-muted-foreground text-[10px]">{r.systemId}</span>}
                {r.priority && (
                  <span className={cn("px-1 py-0.5 rounded text-[10px]",
                    r.priority === "HIGH" ? "bg-red-100 text-red-600" : r.priority === "LOW" ? "bg-gray-100 text-gray-500" : "bg-blue-100 text-blue-600"
                  )}>{r.priority}</span>
                )}
              </div>

              {/* 사용자 스토리 */}
              {(r.userStories ?? []).map((s, si) => (
                <div key={si} className="ml-4 flex items-start gap-1.5 text-purple-700">
                  <BookMarked className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span>{s.name}</span>
                      <Badge isNew={!s.systemId} />
                      {s.systemId && <span className="font-mono text-muted-foreground text-[10px]">{s.systemId}</span>}
                    </div>
                    {s.persona && <p className="text-[10px] text-muted-foreground mt-0.5">👤 {s.persona}</p>}
                    {s.acceptanceCriteria && s.acceptanceCriteria.length > 0 && (
                      <p className="text-[10px] text-muted-foreground">✓ 인수기준 {s.acceptanceCriteria.length}개</p>
                    )}
                  </div>
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
  const reqs = data.tasks.flatMap(t => t.requirements ?? []);
  const allStories = reqs.flatMap(r => r.userStories ?? []);
  const checks = [
    { label: "과업 정의",       ok: data.tasks.every(t => !!t.definition?.trim()) },
    { label: "과업 산출물",     ok: data.tasks.every(t => !!t.outputInfo?.trim()) },
    { label: "요구사항 명세",   ok: reqs.length > 0 && reqs.every(r => !!r.detailSpec?.trim()) },
    { label: "우선순위",        ok: reqs.length > 0 && reqs.every(r => !!r.priority) },
    { label: "스토리 페르소나", ok: allStories.length > 0 && allStories.every(s => !!s.persona?.trim()) },
    { label: "인수기준",        ok: allStories.length > 0 && allStories.every(s => (s.acceptanceCriteria?.length ?? 0) >= 2) },
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

export default function AiImportRequirementsPage() {
  const [tab, setTab] = useState<"guide" | "import">("guide");

  const { data: taskData } = useQuery({
    queryKey: ["tasks-for-import"],
    queryFn: async () => {
      const res = await apiFetch<{ data: TaskItem[] }>("/api/tasks?pageSize=200");
      res.data?.sort((a, b) => a.systemId.localeCompare(b.systemId));
      return res;
    },
  });
  const tasks: TaskItem[] = taskData?.data ?? [];

  const [jsonText, setJsonText]         = useState("");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [exportTaskId, setExportTaskId] = useState("");
  const [exportReqId, setExportReqId]   = useState("");
  const [exportLoading, setExportLoading] = useState(false);
  const [exportOpen, setExportOpen]     = useState(false);

  // 과업 선택 시 해당 과업의 요구사항 목록 로드
  const { data: reqListData } = useQuery({
    queryKey: ["reqs-for-export", exportTaskId],
    queryFn: async () => {
      const res = await apiFetch<{ data: ReqItem[] }>(`/api/requirements?taskId=${exportTaskId}&pageSize=200`);
      res.data?.sort((a, b) => a.systemId.localeCompare(b.systemId));
      return res;
    },
    enabled: !!exportTaskId,
  });
  const exportReqs: ReqItem[] = reqListData?.data ?? [];

  const parsed = useMemo((): ParsedData | null => {
    if (!jsonText.trim()) return null;
    try {
      const raw: RawParsed = JSON.parse(jsonText);
      // ① tasks 배열 포맷
      if (raw.tasks && raw.tasks.length > 0) {
        return { tasks: raw.tasks };
      }
      // ② task + requirements 평탄 포맷 (하위 호환)
      if (raw.task?.name) {
        return { tasks: [{ ...raw.task, requirements: raw.requirements ?? [] }] };
      }
      // ③ 요구사항 단위: taskSystemId + requirements
      if (raw.taskSystemId && raw.requirements) {
        return { tasks: [{ systemId: raw.taskSystemId, name: `과업 ${raw.taskSystemId}`, requirements: raw.requirements }] };
      }
      return null;
    } catch { return null; }
  }, [jsonText]);

  const isJsonValid = parsed !== null && parsed.tasks.some(t => !!t.name?.trim());

  // ── 내보내기 ──────────────────────────────────────────────
  const handleExport = async (mode?: "requirements") => {
    if (!exportTaskId) return;
    setExportLoading(true);
    try {
      const url = `/api/requirements-import?taskId=${exportTaskId}${mode ? `&mode=${mode}` : ""}`;
      const res = await apiFetch<{ data: object }>(url);
      let exportData = res.data;

      // 특정 요구사항만 선택된 경우 필터링
      if (mode === "requirements" && exportReqId) {
        const d = res.data as { taskSystemId: string; requirements: { systemId: string }[] };
        const filtered = d.requirements.filter(r => r.systemId === exportReqId);
        exportData = { taskSystemId: d.taskSystemId, requirements: filtered };
      }

      const json = JSON.stringify(exportData, null, 2);
      await navigator.clipboard.writeText(json);

      const selectedReq = exportReqs.find(r => r.systemId === exportReqId);
      toast.success(
        mode === "requirements" && exportReqId
          ? `"${selectedReq?.name}" 요구사항 JSON이 복사되었습니다.`
          : mode === "requirements"
          ? "요구사항만 복사되었습니다. Claude에 붙여넣고 수정을 요청하세요!"
          : "과업 전체 JSON이 복사되었습니다. Claude에 붙여넣으세요!"
      );
    } catch {
      toast.error("내보내기 실패");
    } finally {
      setExportLoading(false);
    }
  };

  // ── 가져오기 뮤테이션 ─────────────────────────────────────
  const importMutation = useMutation({
    mutationFn: () => apiFetch<{ data: ImportResult }>("/api/requirements-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: parsed }),
    }),
    onSuccess: (res) => {
      setImportResult(res.data);
      const s = res.data.summary;
      toast.success(`완료! 신규 요구사항 ${s.new.requirements} 스토리 ${s.new.userStories} · 수정 요구사항 ${s.updated.requirements} 스토리 ${s.updated.userStories}`);
    },
    onError: () => toast.error("가져오기에 실패했습니다."),
  });

  const templateStr = JSON.stringify(JSON_TEMPLATE, null, 2);

  return (
    <div className="-mx-6 -mt-6 flex flex-col h-[calc(100vh-48px)]">

      {/* ── 헤더 ─────────────────────────────────────────────── */}
      <div className="px-6 py-3 border-b border-border bg-background shrink-0">
        <h1 className="text-base font-semibold">요구사항 AI 설계 가져오기</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Claude 프로젝트에서 설계한 과업·요구사항·사용자스토리 JSON을 가져와 등록하거나 수정합니다</p>
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
                  "신규 등록: Claude와 3단계로 설계 (과업 → 요구사항 → 사용자스토리). '요약해줘'로 현황 확인, 완료 후 \"JSON 줘\" 요청.",
                  "요구사항만 추가: Claude에게 \"T-00011 과업 아래 요구사항만 JSON으로 줘\" → taskSystemId 포맷으로 받아서 바로 등록.",
                  "기존 데이터 수정: ② 탭에서 과업 내보내기 → JSON 복사 → Claude에 붙여넣고 수정 → JSON 받기.",
                  "JSON을 ② 탭에 붙여넣고 가져오기 실행. systemId 있는 항목은 수정, 없는 항목은 신규 등록됩니다.",
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
                      ["과업",         "systemId",     "T-NNNNN",  "없으면 신규 생성 / 있으면 수정"],
                      ["과업 지정",    "taskSystemId", "T-NNNNN",  "요구사항만 등록 시 — 기존 과업 ID 지정"],
                      ["요구사항",     "systemId",     "RQ-NNNNN", "없으면 신규 생성 / 있으면 수정"],
                      ["사용자스토리", "systemId",     "US-NNNNN", "없으면 신규 생성 / 있으면 수정"],
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

        {/* ── 탭 2: 가져오기 ──────────────────────────────────── */}
        {tab === "import" && (
          <div className="max-w-5xl mx-auto px-6 py-6 space-y-4">

            {/* 기존 수정용 내보내기 — 접기/펼치기 */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <button
                onClick={() => setExportOpen(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {exportOpen
                    ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                  <span className="font-medium">기존 데이터 수정 시 — 내보내기</span>
                  <span className="text-xs text-muted-foreground">(신규 등록이라면 이 섹션 불필요)</span>
                </div>
                <span className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">
                  선택 사항
                </span>
              </button>

              {exportOpen && (
                <div className="px-4 pb-4 border-t border-border space-y-3">
                  <p className="text-xs text-muted-foreground mt-3">
                    수정할 과업을 선택하면 systemId 포함 JSON을 클립보드에 복사합니다. Claude에 붙여넣고 수정을 요청하세요.
                  </p>

                  {/* 과업 선택 + 과업 전체 내보내기 */}
                  <div className="flex gap-2 items-center">
                    <Select value={exportTaskId} onValueChange={v => { setExportTaskId(v); setExportReqId(""); }}>
                      <SelectTrigger className="h-8 text-xs w-72">
                        <SelectValue placeholder="수정할 과업 선택..." />
                      </SelectTrigger>
                      <SelectContent>
                        {tasks.map(t => (
                          <SelectItem key={t.taskId} value={String(t.taskId)}>
                            <span className="font-mono text-muted-foreground mr-2">{t.systemId}</span>{t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" disabled={!exportTaskId || exportLoading} onClick={() => handleExport()}>
                      {exportLoading
                        ? <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />내보내는 중...</>
                        : <><Download className="h-3.5 w-3.5 mr-1.5" />과업 전체</>}
                    </Button>
                  </div>

                  {/* 요구사항 선택 + 요구사항 내보내기 (과업 선택 후 표시) */}
                  {exportTaskId && (
                    <div className="flex gap-2 items-center pl-1 border-l-2 border-border">
                      <Select value={exportReqId} onValueChange={setExportReqId}>
                        <SelectTrigger className="h-8 text-xs w-72">
                          <SelectValue placeholder={exportReqs.length === 0 ? "요구사항 없음" : "요구사항 선택 (전체 또는 1개)..."} />
                        </SelectTrigger>
                        <SelectContent>
                          {exportReqs.map(r => (
                            <SelectItem key={r.requirementId} value={r.systemId}>
                              <span className="font-mono text-muted-foreground mr-2">{r.systemId}</span>{r.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="outline" disabled={!exportTaskId || exportLoading} onClick={() => handleExport("requirements")}>
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        {exportReqId ? "선택 요구사항만" : "요구사항만 (전체)"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 가져오기 섹션 — 메인 */}
            {importResult ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-green-300 bg-green-50 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <h2 className="text-sm font-semibold text-green-800">가져오기 완료!</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <p className="text-xs text-green-600 font-medium mb-1">🆕 신규 등록</p>
                      <div className="flex gap-3 text-green-700 text-xs">
                        <span><b>{importResult.summary.new.tasks}</b> 과업</span>
                        <span><b>{importResult.summary.new.requirements}</b> 요구사항</span>
                        <span><b>{importResult.summary.new.userStories}</b> 스토리</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-amber-600 font-medium mb-1">✏️ 수정 완료</p>
                      <div className="flex gap-3 text-amber-700 text-xs">
                        <span><b>{importResult.summary.updated.tasks}</b> 과업</span>
                        <span><b>{importResult.summary.updated.requirements}</b> 요구사항</span>
                        <span><b>{importResult.summary.updated.userStories}</b> 스토리</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    {importResult.results.map(t => (
                      <p key={t.systemId} className="text-xs text-green-700">
                        <strong>{t.systemId}</strong> {t.name} — {t.isNew ? "새로 생성됨" : "업데이트됨"}
                      </p>
                    ))}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setImportResult(null); setJsonText(""); }}>
                  <PlusCircle className="h-3.5 w-3.5 mr-1.5" />새로 가져오기
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                {/* 왼쪽: 입력 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Claude JSON 붙여넣기</label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        신규 과업은 과업 선택 없이 바로 JSON을 붙여넣고 등록할 수 있습니다
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {jsonText && (
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1",
                          isJsonValid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                        )}>
                          {isJsonValid ? <><Check className="h-2.5 w-2.5" />유효</> : <><AlertCircle className="h-2.5 w-2.5" />파싱 오류</>}
                        </span>
                      )}
                      {!jsonText && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1.5"
                          onClick={() => setJsonText(JSON.stringify({
                            task: { name: "", category: "", definition: "", outputInfo: "" },
                            requirements: [{ name: "", originalContent: "", currentContent: "", detailSpec: "", priority: "MEDIUM", source: "RFP", userStories: [] }]
                          }, null, 2))}
                        >
                          <FileText className="h-3 w-3" />
                          빈 템플릿으로 시작
                        </Button>
                      )}
                    </div>
                  </div>

                  <Textarea
                    value={jsonText}
                    onChange={e => setJsonText(e.target.value)}
                    placeholder={"Claude가 출력한 JSON을 여기에 붙여넣으세요\n\n• systemId 없는 항목 → 신규 등록\n• systemId 있는 항목 → 기존 데이터 수정"}
                    className="font-mono text-xs min-h-[340px] resize-none"
                  />

                  <Button
                    className="w-full"
                    disabled={!isJsonValid || importMutation.isPending}
                    onClick={() => importMutation.mutate()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {importMutation.isPending ? "처리 중..." : "시스템에 등록 / 수정"}
                  </Button>
                </div>

                {/* 오른쪽: 미리보기 */}
                <div className="space-y-4">
                  {parsed && isJsonValid ? (
                    <>
                      <div className="rounded-lg border border-border bg-card p-4">
                        <h3 className="text-xs font-semibold text-muted-foreground mb-3">미리보기</h3>
                        <PreviewTree data={parsed} />
                      </div>
                      <div className="rounded-lg border border-border bg-card p-4">
                        <CompletenessBar data={parsed} />
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
