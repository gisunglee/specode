/**
 * BasicInfoTab.tsx — 기능 상세 페이지의 "기본정보" 섹션 컴포넌트
 *
 * 📌 역할:
 *   - 기능의 기본 메타데이터를 표시하고 수정할 수 있는 폼
 *   - 시스템 ID (읽기전용), 표시용 코드, 기능명, 상위 화면 등
 *   - 요청 유형(신규/변경/버그/검토), 우선순위(상/중/하) 선택
 *   - 변경 사유 입력 (상태가 CHANGE_REQ이거나 이미 사유가 있을 때)
 *
 * 📌 레이아웃:
 *   기본정보                                      [저장]
 *   ┌──────────┬──────────┬──────────────────────┐
 *   │ 시스템 ID │ 표시코드  │      기능명 (2칸)     │
 *   ├──────────┴──────────┼──────────┬───────────┤
 *   │   상위 화면 (2칸)     │ 요청유형  │ 우선순위   │
 *   ├──────────────────────┴──────────┴───────────┤
 *   │ [변경 사유 (조건부)]                          │
 *   └─────────────────────────────────────────────┘
 *
 * 📌 주요 기술:
 *   - "use client": 브라우저에서 실행되는 컴포넌트 선언 (이벤트 핸들러, useState 사용)
 *   - useMutation: TanStack Query의 서버 데이터 변경 훅 (PUT 요청)
 *   - key prop 패턴: 부모에서 key={`basic-${dataUpdatedAt}`}로 전달하여
 *     서버 데이터 갱신 시 컴포넌트를 완전히 재생성 → 폼 상태 자동 초기화
 */
"use client";

/* ─── React / 라이브러리 임포트 ──────────────────────────── */
import { useState } from "react"; // React 상태 관리 훅
import { useMutation, useQueryClient } from "@tanstack/react-query"; // 서버 데이터 변경 & 캐시 관리

/* ─── UI 컴포넌트 임포트 ─────────────────────────────────── */
import { Button } from "@/components/ui/button"; // 공통 버튼
import { Input } from "@/components/ui/input"; // 공통 텍스트 입력
import { Label } from "@/components/ui/label"; // 폼 라벨
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // 드롭다운 선택 컴포넌트 (Radix UI 기반)

/* ─── 상수 & 타입 임포트 ─────────────────────────────────── */
import { REQUEST_TYPES, PRIORITIES } from "@/lib/constants"; // 요청유형, 우선순위 옵션 목록
import type { FunctionItem } from "@/types"; // 기능 데이터 타입 정의

/**
 * BasicInfoTab 컴포넌트의 props 타입
 * @param func - API에서 가져온 기능(Function) 데이터 객체
 */
interface BasicInfoTabProps {
  func: FunctionItem;
}

/**
 * BasicInfoTab — 기본정보 탭 메인 컴포넌트
 *
 * 📌 이 컴포넌트는 부모(page.tsx)에서 key={`basic-${dataUpdatedAt}`}로 렌더링되어,
 *    서버 데이터 갱신 시 자동으로 재생성(re-mount)됩니다.
 *    → useState 초기값이 항상 최신 서버 데이터 반영
 *    → "저장하지 않고 다른 페이지 갔다 돌아와도 원래 값으로 복원" 효과
 */
export function BasicInfoTab({ func }: BasicInfoTabProps) {
  /**
   * queryClient: TanStack Query 캐시 관리자
   * 저장 성공 → invalidateQueries → 자동 refetch → key 변경 → 컴포넌트 재생성
   */
  const queryClient = useQueryClient();

  /* ─── 폼 상태 ──────────────────────────────────────────── */
  /**
   * 📌 하나의 useState로 폼 전체를 관리
   *    각 필드 변경 시 setForm(f => ({ ...f, fieldName: newValue })) 패턴 사용
   *    → 스프레드 연산자(...)로 기존 값 유지 + 변경 필드만 덮어씀
   */
  const [form, setForm] = useState({
    name: func.name, // 기능명 (필수)
    displayCode: func.displayCode || "", // 표시용 코드 (사용자가 보기 좋은 ID)
    requestType: func.requestType, // 요청 유형: NEW, CHANGE, BUGFIX, REVIEW_ONLY
    priority: func.priority, // 우선순위: HIGH, MEDIUM, LOW
    changeReason: func.changeReason || "", // 변경 사유 (조건부 표시)
  });

  /* ─── API 저장 뮤테이션 ────────────────────────────────── */
  /**
   * useMutation: 서버에 PUT 요청을 보내는 훅
   * - isPending: API 호출 진행 중 여부 (버튼 비활성화에 사용)
   * - mutate(body): API 호출 실행 함수
   */
  const updateMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      // PUT /api/functions/[id] — 기능 데이터 수정 API
      const res = await fetch(`/api/functions/${func.functionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return res.json();
    },
    onSuccess: () => {
      // 📌 저장 성공 → 캐시 무효화 → 자동 refetch → UI 갱신
      queryClient.invalidateQueries({
        queryKey: ["function", String(func.functionId)],
      });
    },
  });

  /** 저장 버튼 클릭 핸들러 — form 상태를 그대로 API에 전송 */
  const handleSave = () => {
    updateMutation.mutate(form);
  };

  /* ─── 렌더링 ───────────────────────────────────────────── */
  return (
    <div className="space-y-5">
      {/*
       * ═══════════════════════════════════════════════════════
       * 타이틀 행 — "기본정보" 제목 + 저장 버튼
       *
       * 📌 DesignInfoTab과 동일한 패턴
       *    flex + justify-between 으로 양쪽 끝 정렬
       * ═══════════════════════════════════════════════════════
       */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">기본정보</h2>
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "저장중..." : "저장"}
        </Button>
      </div>

    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      {/* ── Row 1: 시스템 ID, 표시코드, 기능명 ──────────────── */}
      {/*
       * grid-cols-4: 4칸 그리드 (각 칸 25%)
       * 시스템 ID(1칸) + 표시코드(1칸) + 기능명(2칸) = 총 4칸
       */}
      <div className="grid grid-cols-4 gap-4">
        {/* 시스템 ID — 자동 생성되므로 수정 불가 (disabled) */}
        <div className="space-y-1.5">
          <Label className="text-muted-foreground text-xs">시스템 ID</Label>
          <Input value={func.systemId} disabled className="bg-muted/30" />
        </div>

        {/* 표시용 코드 — 사용자가 직접 입력하는 코드 (예: "USR-001") */}
        <div className="space-y-1.5">
          <Label className="text-xs">표시용 코드</Label>
          <Input
            value={form.displayCode}
            onChange={(e) =>
              setForm((f) => ({ ...f, displayCode: e.target.value }))
            }
          />
        </div>

        {/* 기능명 — 2칸 차지 (col-span-2), 필수 입력 */}
        <div className="col-span-2 space-y-1.5">
          <Label className="text-xs">기능명 *</Label>
          <Input
            value={form.name}
            onChange={(e) =>
              setForm((f) => ({ ...f, name: e.target.value }))
            }
          />
        </div>
      </div>

      {/* ── Row 2: 상위 화면, 요청유형, 우선순위 ─────────────── */}
      <div className="grid grid-cols-4 gap-4">
        {/* 상위 화면 — 읽기전용 (화면 관리에서 설정) */}
        <div className="col-span-2 space-y-1.5">
          <Label className="text-muted-foreground text-xs">상위 화면</Label>
          <Input
            value={`${func.screen?.systemId ?? ""} ${func.screen?.name ?? ""}`}
            disabled
            className="bg-muted/30"
          />
        </div>

        {/*
         * 요청 유형 드롭다운 — Select 컴포넌트 (Radix UI 기반)
         * 옵션: 신규개발(NEW), 변경요청(CHANGE), 버그수정(BUGFIX), 설계검토만(REVIEW_ONLY)
         *
         * 📌 Select 컴포넌트 구조:
         *   <Select>         — 상태 관리 래퍼 (value, onValueChange)
         *     <SelectTrigger> — 클릭 가능한 트리거 버튼 (현재 선택값 표시)
         *       <SelectValue /> — 선택된 값의 라벨 표시
         *     </SelectTrigger>
         *     <SelectContent> — 드롭다운 팝오버 (옵션 목록)
         *       <SelectItem>  — 개별 옵션
         *     </SelectContent>
         *   </Select>
         */}
        <div className="space-y-1.5">
          <Label className="text-xs">요청 유형</Label>
          <Select
            value={form.requestType}
            onValueChange={(v) =>
              setForm((f) => ({ ...f, requestType: v }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REQUEST_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 우선순위 드롭다운 — 상(HIGH), 중(MEDIUM), 하(LOW) */}
        <div className="space-y-1.5">
          <Label className="text-xs">우선순위</Label>
          <Select
            value={form.priority}
            onValueChange={(v) =>
              setForm((f) => ({ ...f, priority: v }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Row 3: 변경 사유 (조건부) ──────────────────────────── */}
      {/*
       * 📌 변경 사유는 이미 사유가 있을 때만 표시
       *    (이전에 입력한 값 보여주기 / 수정 가능)
       */}
      {func.changeReason && (
        <div className="space-y-1.5">
          <Label className="text-xs">변경 사유</Label>
          <Input
            value={form.changeReason}
            onChange={(e) =>
              setForm((f) => ({ ...f, changeReason: e.target.value }))
            }
            placeholder="변경 사유를 입력하세요"
          />
        </div>
      )}
    </div>
    </div>
  );
}
