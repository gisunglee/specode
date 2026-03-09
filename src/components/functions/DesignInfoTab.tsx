/**
 * DesignInfoTab.tsx — 기능 상세 페이지의 "설계" 섹션 컴포넌트
 *
 * 📌 역할:
 *   - 기능 설명(마크다운)을 편집/미리보기 할 수 있는 에디터 영역 (왼쪽 상단)
 *   - AI 상세설계(마크다운) — AI 자동 작성 또는 직접 편집 가능 (왼쪽 하단)
 *   - 참조 테이블, 공통 프로그램, 데이터 흐름 등 보조 정보 (오른쪽)
 *   - 선행/후행/화면이동 관계 테이블 표시
 *   - 첨부파일 관리 (AttachmentManager 공통 컴포넌트)
 *   - GS 코멘트 — 첨부파일 아래 (오른쪽 하단)
 *   - 저장 버튼은 "설계" 타이틀 오른쪽에 위치
 *
 * 📌 레이아웃:
 *   설계                                                [저장]
 *   ┌─────────────────────────────────┬──────────────────────┐
 *   │  기능 설명 (MarkdownEditor)      │  참조 테이블          │
 *   │                                 │  공통 프로그램         │
 *   │  AI 상세설계 (MarkdownEditor)    │  데이터 흐름          │
 *   │  (AI 자동 작성 or 직접 편집)     │  관계 테이블          │
 *   │                                 │  첨부파일             │
 *   │                                 │  GS 코멘트            │
 *   └─────────────────────────────────┴──────────────────────┘
 *   [변경 사유 (조건부)]
 *
 * 📌 주요 기술:
 *   - MarkdownEditor: 공통 마크다운 편집/미리보기 컴포넌트
 *   - AttachmentManager: 공통 첨부파일 관리 컴포넌트
 *   - useMutation: TanStack Query의 데이터 변경 훅
 */
"use client";

/* ─── React / 라이브러리 임포트 ──────────────────────────── */
import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/* ─── UI 컴포넌트 임포트 ─────────────────────────────────── */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarkdownEditor } from "@/components/common/MarkdownEditor";
import { AttachmentManager } from "@/components/common/AttachmentManager";
import { apiFetch } from "@/lib/utils";
import { toast } from "sonner";
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
 * DesignInfoTab — 설계 탭 메인 컴포넌트
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
  const [aiDesignContent, setAiDesignContent] = useState(func.aiDesignContent || "");
  const [dataFlow, setDataFlow] = useState(func.dataFlow || "");
  const [relatedFiles, setRelatedFiles] = useState(func.relatedFiles || "");
  const [refContent, setRefContent] = useState(func.refContent || "");
  const [changeReason, setChangeReason] = useState("");

  /* ─── API 저장 뮤테이션 ────────────────────────────────── */
  const updateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch(`/api/functions/${func.functionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["function", String(func.functionId)],
      });
      toast.success("저장되었습니다.");
      setChangeReason("");
    },
  });

  /** 첨부파일 변경 콜백 (업로드/삭제 후 데이터 갱신) */
  const handleFileChange = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ["function", String(func.functionId)],
    });
  }, [queryClient, func.functionId]);

  /** handleSave — 저장 버튼 클릭 핸들러 */
  const handleSave = () => {
    updateMutation.mutate({
      spec,
      aiDesignContent: aiDesignContent || null,
      dataFlow,
      relatedFiles: relatedFiles || null,
      refContent: refContent || null,
      changeReason: changeReason || undefined,
    });
  };

  /* ─── 렌더링 ───────────────────────────────────────────── */
  return (
    <div className="space-y-5">
      {/*
       * 📌 타이틀 행 구조:
       *   설계              [AI 피드백] [AI 요청 이력] [저장]
       *
       *   headerExtra는 부모(page.tsx)에서 전달하는 추가 버튼 요소
       */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">설계</h2>
        <div className="flex items-center gap-2">
          {headerExtra}
          <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
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
         * 왼쪽 (3/5): 기능 설명 + AI 상세설계 에디터
         * 오른쪽 (2/5): 참조테이블, 공통프로그램, 데이터흐름, 관계, 첨부파일, GS코멘트
         */}
        <div className="grid grid-cols-5 gap-6">
          {/* ═══════════════════════════════════════════════════ */}
          {/* 왼쪽 영역: 기능 설명 + AI 상세설계                   */}
          {/* ═══════════════════════════════════════════════════ */}
          <div className="col-span-3 space-y-4">
            {/* ── 기능 설명 마크다운 에디터 ──────────────────── */}
            <MarkdownEditor
              value={spec}
              onChange={setSpec}
              label="기능 설명 (마크다운) *"
              rows={18}
              placeholder="기능 설명을 마크다운으로 작성하세요..."
            />

            {/*
             * ── AI 상세설계 마크다운 에디터 ────────────────────
             *
             * 📌 AI가 DESIGN 태스크 완료 후 자동으로 채워주지만,
             *    사람이 직접 작성/수정도 가능한 필드입니다.
             *    저장 버튼 클릭 시 aiDesignContent 컬럼에 저장됩니다.
             */}
            <MarkdownEditor
              value={aiDesignContent}
              onChange={setAiDesignContent}
              label="AI 상세설계 (마크다운)"
              rows={15}
              placeholder="AI가 설계요청 후 자동으로 작성하거나, 직접 작성할 수 있습니다..."
            />
          </div>

          {/* ═══════════════════════════════════════════════════ */}
          {/* 오른쪽 영역: 보조 정보 + GS 코멘트                   */}
          {/*                                                     */}
          {/* 📌 pt-3: 왼쪽 MarkdownEditor 헤더(라벨+토글, ~26px) + */}
          {/*    space-y-2 gap(8px) = textarea top ≈ 34px          */}
          {/*    우측 참조테이블 label(16px) + space-y-1.5(6px)=22px */}
          {/*    → pt = 34 - 22 = 12px ≈ pt-3                      */}
          {/* ═══════════════════════════════════════════════════ */}
          <div className="col-span-2 space-y-5 pt-3">
            {/* ── 참고 프로그램 내용 ────────────────────────── */}
            <MarkdownEditor
              value={refContent}
              onChange={setRefContent}
              label="참고 프로그램 내용 (마크다운)"
              rows={12}
              placeholder="참고할 프로그램, 공통 모듈, 관련 코드 등을 작성하세요..."
            />

            {/* ── 데이터 흐름 ──────────────────────────────── */}
            <div className="space-y-1.5">
              <Label className="text-xs">데이터 흐름</Label>
              <Input
                value={dataFlow}
                onChange={(e) => setDataFlow(e.target.value)}
                placeholder="예: READ: TB_A, TB_B / WRITE: TB_C"
              />
            </div>

            {/* ── 관련 파일 ─────────────────────────────────
             * 📌 줄바꿈 구분 파일 경로 목록. 저장 시 related_files 컬럼에 저장
             */}
            <div className="space-y-1.5">
              <Label className="text-xs">관련 파일</Label>
              <textarea
                value={relatedFiles}
                onChange={(e) => setRelatedFiles(e.target.value)}
                rows={4}
                placeholder={"src/main/java/com/example/SomeService.java\nsrc/main/java/com/example/SomeMapper.java"}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs resize-y font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <p className="text-[11px] text-muted-foreground">한 줄에 파일 경로 하나씩</p>
            </div>

            {/* ── 첨부파일 (공통 컴포넌트) ────────────────── */}
            <AttachmentManager
              refTableName="tb_function"
              refPkId={func.functionId}
              attachments={func.attachments ?? []}
              onChanged={handleFileChange}
            />

            {/*
             * ── GS 코멘트 (첨부파일 아래) ─────────────────
             *
             * 📌 AI 요청 상태로 변경할 때 spec, aiDesignContent와 함께
             *    이 코멘트가 AI에게 전달됩니다.
             *
             * 📌 Controlled Component 패턴:
             *    부모(page.tsx)가 gsComment 상태를 소유하고
             *    이 컴포넌트는 입력 UI만 담당합니다.
             */}
            <div className="space-y-1">
              <MarkdownEditor
                value={gsComment}
                onChange={onGsCommentChange}
                label="GS 코멘트"
                rows={3}
                placeholder="AI에게 전달할 추가 요청사항... (예: cascade는 soft delete로 해줘)"
              />
              <p className="text-[11px] text-muted-foreground">
                상태 변경 시 spec과 함께 AI에게 전달됩니다.
              </p>
            </div>
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
