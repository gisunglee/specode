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

## 설계 4단계 프로세스

설계는 아래 4단계 순서로 진행합니다. 각 단계에서 SPECODE가 필요로 하는 정보를 수집하고,
누락된 항목이 있으면 단계가 끝나기 전에 반드시 다시 질문합니다.

---

### 1단계: 단위업무 설계

| 항목 | 필수 | 설명 |
|------|------|------|
| 단위업무명 | ⭐ 필수 | 예: "회원관리", "주문처리" — 간결하고 명확하게 |
| 업무 설명 | ✅ 권장 | 업무 범위, 주요 사용자, 처리 흐름 |
| 정렬순서 | 선택 | 메뉴 표시 순서 (기본값 1) |

**완료 기준**: 단위업무명 + 업무 설명이 작성됨
**수정 시**: 기존 단위업무의 \`systemId\` (형식: \`UW-NNNNN\`) 포함

---

### 2단계: 화면 설계

단위업무를 처리하기 위해 필요한 화면들을 도출합니다.

| 항목 | 필수 | 허용 값 / 설명 |
|------|------|----------------|
| 화면명 | ⭐ 필수 | "무엇을 하는 화면" 형태 (예: "회원 목록 조회") |
| 화면 유형 | ✅ 권장 | LIST / DETAIL / POPUP / TAB |
| 화면 설명 (spec) | ✅ 권장 | 화면 목적, 주요 기능, 사용자 흐름, 진입/이동 조건 |
| 표시코드 | 선택 | 개발자 참조 코드 (예: MBR_LIST) |
| 대분류 / 중분류 / 소분류 | 선택 | 메뉴 분류 체계 |
| 정렬순서 | 선택 | 기본값 1 |

**완료 기준**: 모든 화면의 화면명 + 화면 유형 + spec 작성됨
**수정 시**: 기존 화면의 \`systemId\` (형식: \`PID-NNNNN\`) 포함

---

### 3단계: 영역 설계

각 화면을 기능별 영역(구역)으로 분리합니다.

| 항목 | 필수 | 허용 값 / 설명 |
|------|------|----------------|
| 영역명 | ⭐ 필수 | 역할이 명확한 이름 (예: "검색 조건", "회원 목록") |
| 영역 유형 | ⭐ 필수 | SEARCH / GRID / FORM / INFO_CARD / TAB / FULL_SCREEN |
| 영역 설명 (spec) | ✅ 권장 | 영역 역할, 포함 항목, 초기값, 특이사항 |
| 정렬순서 | 선택 | 화면 내 표시 순서 |

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
| 기능 설명 (spec) | ✅ 권장 | 아래 spec 작성 형식 참고 |
| 표시코드 | 선택 | 개발자 참조 코드 (예: BTN_SEARCH, ROW_CLICK) |
| 정렬순서 | 선택 | 영역 내 순서 |

**기능 spec 작성 형식** (이 순서로 작성하면 완성도가 높아집니다):
1. **트리거**: 무엇이 이 기능을 실행하는가 (예: [검색] 버튼 클릭, 페이지 진입 시)
2. **처리**: 어떤 조건/데이터로 어떻게 처리하는가
3. **결과**: 처리 후 어떤 결과가 표시/저장되는가
4. **예외**: 필수값 누락, 권한 없음, 데이터 없음 등 예외 상황 처리

**작성 예시**:
> [검색] 버튼 클릭 시 이름·이메일·가입일·상태 조건으로 회원 목록을 조회합니다. 조건 미입력 시 전체 조회. 페이지당 20건 표시, 전체 건수 노출. 결과 없을 경우 "조회된 데이터가 없습니다" 메시지를 표시합니다.

**완료 기준**: 모든 기능의 기능명 + 우선순위 + spec 작성됨
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
| 기능 spec이 트리거·처리·결과·예외를 포함하는가 | ✅ or ⚠️ |
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
      "spec": "회원 정보를 조건으로 검색하여 목록으로 표시합니다",
      "sortOrder": 1,
      "areas": [
        {
          "areaCode": "AR-00001",
          "name": "검색 조건",
          "areaType": "SEARCH",
          "spec": "이름, 이메일, 가입일, 상태로 검색합니다",
          "sortOrder": 1,
          "functions": [
            {
              "systemId": "FID-00001",
              "name": "검색 실행",
              "displayCode": "BTN_SEARCH",
              "priority": "HIGH",
              "spec": "검색 버튼 클릭 시 조건에 맞는 회원 목록을 조회합니다",
              "sortOrder": 1
            }
          ]
        },
        {
          "name": "회원 목록",
          "areaType": "GRID",
          "spec": "검색 결과를 테이블로 표시합니다. 행 클릭 시 상세 화면으로 이동합니다",
          "sortOrder": 2,
          "functions": [
            {
              "name": "행 클릭 - 상세 이동",
              "displayCode": "ROW_CLICK",
              "priority": "HIGH",
              "spec": "목록 행 클릭 시 해당 회원의 상세 화면으로 이동합니다",
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
  const [importResult, setImportResult]   = useState<ImportResult | null>(null);

  // ── 내보내기 상태 ─────────────────────────────────────────
  const [exportUwId, setExportUwId]       = useState("");
  const [exportLoading, setExportLoading] = useState(false);

  const parsed = useMemo((): ParsedData | null => {
    if (!jsonText.trim()) return null;
    try { return JSON.parse(jsonText); } catch { return null; }
  }, [jsonText]);

  const isJsonValid = parsed !== null && !!parsed.unitWork?.name;
  const isNewUnitWork = isJsonValid && !parsed!.unitWork.systemId;

  // ── 내보내기 ──────────────────────────────────────────────
  const handleExport = async () => {
    if (!exportUwId) return;
    setExportLoading(true);
    try {
      const res = await apiFetch<{ data: object }>(`/api/design-import?unitWorkId=${exportUwId}`);
      const json = JSON.stringify(res.data, null, 2);
      await navigator.clipboard.writeText(json);
      toast.success("JSON이 클립보드에 복사되었습니다. Claude에 붙여넣으세요!");
    } catch {
      toast.error("내보내기 실패");
    } finally {
      setExportLoading(false);
    }
  };

  // ── 가져오기 뮤테이션 ─────────────────────────────────────
  const importMutation = useMutation({
    mutationFn: () => apiFetch<{ data: ImportResult }>("/api/design-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requirementId: requirementId ? parseInt(requirementId) : undefined,
        data: parsed,
      }),
    }),
    onSuccess: (res) => {
      setImportResult(res.data);
      const s = res.data.summary;
      toast.success(`완료! 신규 화면 ${s.new.screens} 영역 ${s.new.areas} 기능 ${s.new.functions} · 수정 화면 ${s.updated.screens} 영역 ${s.updated.areas} 기능 ${s.updated.functions}`);
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
              <p className="text-xs text-muted-foreground mb-3">단위업무를 선택하면 systemId 포함 JSON을 클립보드에 복사합니다. Claude에 붙여넣고 수정을 요청하세요.</p>
              <div className="flex gap-2">
                <Select value={exportUwId} onValueChange={setExportUwId}>
                  <SelectTrigger className="h-8 text-xs w-72">
                    <SelectValue placeholder="단위업무 선택..." />
                  </SelectTrigger>
                  <SelectContent>
                    {unitWorks.map(u => (
                      <SelectItem key={u.unitWorkId} value={String(u.unitWorkId)}>
                        <span className="font-mono text-muted-foreground mr-2">{u.systemId}</span>{u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" disabled={!exportUwId || exportLoading} onClick={handleExport}>
                  {exportLoading
                    ? <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />내보내는 중...</>
                    : <><Download className="h-3.5 w-3.5 mr-1.5" />JSON 복사</>}
                </Button>
              </div>
            </div>

            {/* 가져오기 섹션 */}
            {importResult ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-green-300 bg-green-50 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <h2 className="text-sm font-semibold text-green-800">가져오기 완료!</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-green-600 font-medium mb-1">🆕 신규 등록</p>
                      <div className="flex gap-4 text-green-700">
                        <span><b>{importResult.summary.new.screens}</b> 화면</span>
                        <span><b>{importResult.summary.new.areas}</b> 영역</span>
                        <span><b>{importResult.summary.new.functions}</b> 기능</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-amber-600 font-medium mb-1">✏️ 수정 완료</p>
                      <div className="flex gap-4 text-amber-700">
                        <span><b>{importResult.summary.updated.screens}</b> 화면</span>
                        <span><b>{importResult.summary.updated.areas}</b> 영역</span>
                        <span><b>{importResult.summary.updated.functions}</b> 기능</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-green-600 mt-2">
                    단위업무 <strong>{importResult.unitWork.systemId}</strong> {importResult.unitWork.name}
                    {importResult.unitWork.isNew ? " 이(가) 새로 생성되었습니다." : " 이(가) 업데이트되었습니다."}
                  </p>
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
