/**
 * DesignInfoTab.tsx — 기능 상세 페이지의 "설계정보" 섹션 컴포넌트
 *
 * 📌 역할:
 *   - 기능 설명(마크다운)을 편집/미리보기 할 수 있는 에디터 영역 (왼쪽)
 *   - GS 코멘트 입력 (spec 아래) — AI 요청 시 함께 전달되는 메시지
 *   - 참조 테이블, 공통 프로그램, 데이터 흐름 등 보조 정보 (오른쪽)
 *   - 선행/후행/화면이동 관계 테이블 표시
 *   - 저장 버튼은 "설계정보" 타이틀 오른쪽에 위치
 *
 * 📌 레이아웃:
 *   설계정보                                                [저장]
 *   ┌─────────────────────────────────┬──────────────────────┐
 *   │  기능 설명 (마크다운 에디터)       │  참조 테이블          │
 *   │  - 편집/미리보기 토글 (좌측)       │  공통 프로그램         │
 *   │  - textarea rows=24              │  데이터 흐름          │
 *   │  GS 코멘트 (spec 아래)            │  관계 테이블          │
 *   └─────────────────────────────────┴──────────────────────┘
 *   [변경 사유 (조건부)]
 *
 * 📌 주요 기술:
 *   - "use client": Next.js에서 클라이언트 컴포넌트임을 선언
 *   - useMutation: TanStack Query의 데이터 변경(POST/PUT/DELETE) 훅
 *   - ReactMarkdown: 마크다운 문자열을 HTML로 렌더링하는 라이브러리
 *   - remarkGfm: GitHub Flavored Markdown 플러그인 (표, 체크박스 등 지원)
 */
"use client";

/* ─── React / 라이브러리 임포트 ──────────────────────────── */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/* ─── UI 컴포넌트 임포트 ─────────────────────────────────── */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/common/TagInput";
import { cn } from "@/lib/utils";
import type { FunctionItem } from "@/types";

/**
 * DesignInfoTab 컴포넌트의 props 타입
 *
 * @param func - API에서 가져온 기능(Function) 데이터 전체 객체
 * @param gsComment - 부모(page.tsx)에서 관리하는 GS 코멘트 값
 * @param onGsCommentChange - GS 코멘트 값 변경 콜백
 * @param headerExtra - 타이틀 행에 추가로 표시할 요소 (예: AI 요청 이력 버튼)
 *
 * 📌 gsComment는 "Lifting State Up" 패턴
 *    → 부모(page.tsx)가 상태를 소유 → 상태 변경(PATCH) 시 AiTask.comment로 전달
 *
 * 📌 headerExtra는 "Render Props / Children as Props" 패턴
 *    → 부모(page.tsx)가 버튼 요소를 만들어서 이 컴포넌트의 타이틀 행에 끼워넣음
 *    → 이 컴포넌트는 headerExtra가 뭔지 신경 쓰지 않고 그냥 렌더링만 함
 */
interface DesignInfoTabProps {
  func: FunctionItem;
  gsComment: string;
  onGsCommentChange: (value: string) => void;
  headerExtra?: React.ReactNode;
}

/**
 * DesignInfoTab — 설계정보 탭 메인 컴포넌트
 *
 * 📌 이 컴포넌트는 부모(page.tsx)에서 key={`design-${dataUpdatedAt}`} 로
 *    렌더링되므로, 서버 데이터가 변경되면 컴포넌트가 완전히 재생성(re-mount)됩니다.
 *    이 덕분에 useState 초기값이 항상 최신 서버 데이터를 반영합니다.
 */
export function DesignInfoTab({
  func,
  gsComment,
  onGsCommentChange,
  headerExtra,
}: DesignInfoTabProps) {
  const queryClient = useQueryClient();

  /* ─── 폼 상태 관리 ─────────────────────────────────────── */
  const [spec, setSpec] = useState(func.spec || "");
  const [previewMode, setPreviewMode] = useState(false);
  const [dataFlow, setDataFlow] = useState(func.dataFlow || "");
  const [changeReason, setChangeReason] = useState("");

  const [refTables, setRefTables] = useState<string[]>(
    func.references
      ?.filter((r) => r.refType === "TABLE")
      .map((r) => r.refValue) ?? []
  );

  const [refCommons, setRefCommons] = useState<string[]>(
    func.references
      ?.filter((r) => r.refType === "COMMON")
      .map((r) => r.refValue) ?? []
  );

  /* ─── API 저장 뮤테이션 ────────────────────────────────── */
  const updateMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(`/api/functions/${func.functionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["function", String(func.functionId)],
      });
      setChangeReason("");
    },
  });

  /** handleSave — 저장 버튼 클릭 핸들러 */
  const handleSave = () => {
    const references = [
      ...refTables.map((v) => ({ refType: "TABLE", refValue: v })),
      ...refCommons.map((v) => ({ refType: "COMMON", refValue: v })),
    ];
    updateMutation.mutate({
      spec,
      dataFlow,
      changeReason: changeReason || undefined,
      references,
    });
  };

  /* ─── 렌더링 ───────────────────────────────────────────── */
  return (
    <div className="space-y-5">
      {/*
       * ═══════════════════════════════════════════════════════
       * 타이틀 행 — "설계정보" 제목 + 저장 버튼
       *
       * 📌 저장 버튼을 타이틀 오른쪽 끝에 배치
       *    flex + justify-between 으로 양쪽 끝 정렬
       * ═══════════════════════════════════════════════════════
       */}
      {/*
       * 📌 타이틀 행 구조:
       *   설계정보              [AI 요청 이력] [저장]
       *
       *   headerExtra는 부모(page.tsx)에서 전달하는 추가 버튼 요소
       *   예: AI 요청 이력 팝업을 여는 버튼
       */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">설계정보</h2>
        <div className="flex items-center gap-2">
          {headerExtra}
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "저장중..." : "저장"}
          </Button>
        </div>
      </div>

      {/*
       * ═══════════════════════════════════════════════════════
       * 카드 본문 — 2-column 그리드 + 변경사유
       * ═══════════════════════════════════════════════════════
       */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-5">
        {/*
         * 2-column 그리드 레이아웃
         * 왼쪽 (3/5): 기능 설명 마크다운 에디터 + GS 코멘트
         * 오른쪽 (2/5): 참조테이블, 공통프로그램, 데이터흐름, 관계
         */}
        <div className="grid grid-cols-5 gap-6">
          {/* ═══════════════════════════════════════════════════ */}
          {/* 왼쪽 영역: 기능 설명 + GS 코멘트                      */}
          {/* ═══════════════════════════════════════════════════ */}
          <div className="col-span-3 space-y-4">
            {/* ── 라벨 + 편집/미리보기 토글 ──────────────────── */}
            <div className="flex items-center gap-3">
              <Label>기능 설명 (마크다운) *</Label>
              <div className="flex rounded-md border border-border overflow-hidden">
                <button
                  onClick={() => setPreviewMode(false)}
                  className={cn(
                    "px-3 py-1 text-xs font-medium transition-colors cursor-pointer",
                    !previewMode
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  편집
                </button>
                <button
                  onClick={() => setPreviewMode(true)}
                  className={cn(
                    "px-3 py-1 text-xs font-medium transition-colors cursor-pointer",
                    previewMode
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  미리보기
                </button>
              </div>
            </div>

            {/* ── spec 편집기 / 미리보기 ──────────────────── */}
            {previewMode ? (
              <div className="rounded-md border border-border bg-muted/10 p-4 min-h-[560px] prose prose-sm max-w-none">
                {spec ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {spec}
                  </ReactMarkdown>
                ) : (
                  <p className="text-muted-foreground">내용이 없습니다.</p>
                )}
              </div>
            ) : (
              <Textarea
                value={spec}
                onChange={(e) => setSpec(e.target.value)}
                placeholder="기능 설명을 마크다운으로 작성하세요..."
                rows={24}
                className="font-mono text-sm"
              />
            )}

            {/*
             * ═══════════════════════════════════════════════════
             * GS 코멘트 — AI에게 전달할 추가 메시지
             *
             * 📌 spec textarea 바로 아래에 위치
             *    사용자가 여기에 코멘트를 적어두면,
             *    우측 상단 상태 드롭다운에서 AI 요청 상태로 변경할 때
             *    spec과 함께 이 코멘트가 AI에게 전달됩니다.
             *
             * 📌 Controlled Component 패턴:
             *    부모(page.tsx)가 gsComment 상태를 소유하고
             *    이 컴포넌트는 입력 UI만 담당합니다.
             * ═══════════════════════════════════════════════════
             */}
            <div className="space-y-1.5">
              <Label className="text-xs">GS 코멘트</Label>
              <Textarea
                value={gsComment}
                onChange={(e) => onGsCommentChange(e.target.value)}
                placeholder="AI에게 전달할 추가 요청사항... (예: cascade는 soft delete로 해줘)"
                rows={2}
                className="text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                상태 변경 시 spec과 함께 AI에게 전달됩니다.
              </p>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════ */}
          {/* 오른쪽 영역: 보조 정보                                */}
          {/*                                                     */}
          {/* 📌 pt-8: 왼쪽 영역의 라벨+토글 행 높이(≈32px)만큼     */}
          {/*    상단 여백을 추가하여 참조 테이블 입력이              */}
          {/*    spec textarea의 상단 라인과 정렬되도록 맞춤         */}
          {/* ═══════════════════════════════════════════════════ */}
          <div className="col-span-2 space-y-5 pt-8">
            {/* ── 참조 테이블 ──────────────────────────────── */}
            <div className="space-y-1.5">
              <Label className="text-xs">참조 테이블</Label>
              <TagInput
                value={refTables}
                onChange={setRefTables}
                placeholder="테이블명 입력 후 Enter"
              />
            </div>

            {/* ── 참조 공통 프로그램 ──────────────────────── */}
            <div className="space-y-1.5">
              <Label className="text-xs">참조 공통 프로그램</Label>
              <TagInput
                value={refCommons}
                onChange={setRefCommons}
                placeholder="공통코드 입력 후 Enter"
              />
            </div>

            {/* ── 데이터 흐름 ──────────────────────────────── */}
            <div className="space-y-1.5">
              <Label className="text-xs">데이터 흐름</Label>
              <Input
                value={dataFlow}
                onChange={(e) => setDataFlow(e.target.value)}
                placeholder="예: READ: TB_A, TB_B / WRITE: TB_C"
              />
            </div>

            {/* ── 선행/후행/화면이동 관계 테이블 ──────────── */}
            {func.relations && func.relations.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">선행/후행/화면이동</Label>
                <div className="rounded-md border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">
                          유형
                        </th>
                        <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">
                          대상
                        </th>
                        <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">
                          설명
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {func.relations.map((rel) => (
                        <tr
                          key={rel.funcRelationId}
                          className="border-b border-border/50"
                        >
                          <td className="px-2 py-1.5">
                            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">
                              {rel.relationType === "PRECEDE"
                                ? "선행"
                                : rel.relationType === "FOLLOW"
                                  ? "후행"
                                  : "이동"}
                            </span>
                          </td>
                          <td className="px-2 py-1.5">
                            {rel.targetFunction?.systemId}
                          </td>
                          <td className="px-2 py-1.5 text-muted-foreground">
                            {rel.description || rel.params || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── 변경 사유 (조건부) ──────────────────────────── */}
        {func.spec && spec !== func.spec && (
          <div className="space-y-1.5">
            <Label className="text-xs">변경 사유</Label>
            <Input
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              placeholder="변경 사유를 입력하세요 (이력에 기록됩니다)"
            />
          </div>
        )}
      </div>
    </div>
  );
}
