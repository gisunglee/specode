/**
 * DesignInfoTab.tsx — 기능 상세 페이지의 "설계" 섹션 컴포넌트
 *
 * 📌 역할:
 *   - 기능 설명(마크다운)을 편집/미리보기 할 수 있는 에디터 영역 (왼쪽 상단)
 *   - AI 상세설계(마크다운) — AI 자동 작성 또는 직접 편집 가능 (왼쪽 하단)
 *   - 참조 테이블, 공통 프로그램 보조 정보 (오른쪽)
 *   - 첨부파일 관리 (AttachmentManager 공통 컴포넌트)
 *   - GS 코멘트 — 첨부파일 아래 (오른쪽 하단)
 *   - 저장 버튼은 "설계" 타이틀 오른쪽에 위치
 *   - 버전 이력 저장 체크박스 (저장 버튼 왼쪽, localStorage 저장)
 */
"use client";

/* ─── React / 라이브러리 임포트 ──────────────────────────── */
import { useState, useCallback, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/* ─── UI 컴포넌트 임포트 ─────────────────────────────────── */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarkdownEditor } from "@/components/common/MarkdownEditor";
import { AttachmentManager } from "@/components/common/AttachmentManager";
import { apiFetch } from "@/lib/utils";
import { FileText } from "lucide-react";
import { FUNCTION_BASIC_TEMPLATE, FUNCTION_DETAIL_TEMPLATE, FUNCTION_BASIC_EXAMPLE, FUNCTION_DETAIL_EXAMPLE } from "@/lib/specTemplates";
import { SpecExampleDialog } from "@/components/common/SpecExampleDialog";
import { toast } from "sonner";
import type { FunctionItem } from "@/types";

const LS_KEY = "specode_save_version_log";

interface DesignInfoTabProps {
  func: FunctionItem;
  gsComment: string;
  onGsCommentChange: (value: string) => void;
  headerExtra?: React.ReactNode;
}

export function DesignInfoTab({
  func,
  gsComment,
  onGsCommentChange,
  headerExtra,
}: DesignInfoTabProps) {
  const queryClient = useQueryClient();

  /* ─── 폼 상태 관리 ─────────────────────────────────────── */
  const [example, setExample] = useState<{ content: string; title: string; onInsert: () => void } | null>(null);

  const [spec, setSpec] = useState(func.spec || "");
  const [aiDesignContent, setAiDesignContent] = useState(func.aiDesignContent || "");
  const [refContent, setRefContent] = useState(func.refContent || "");
  const [changeReason, setChangeReason] = useState("");

  /* ─── 버전 이력 저장 체크박스 (localStorage) ─────────── */
  const [saveVersionLog, setSaveVersionLog] = useState(true);
  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    setSaveVersionLog(stored === null ? true : stored === "true");
  }, []);
  const handleVersionLogChange = (checked: boolean) => {
    setSaveVersionLog(checked);
    localStorage.setItem(LS_KEY, String(checked));
  };

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
      refContent: refContent || null,
      changeReason: changeReason || undefined,
      ...(saveVersionLog ? { saveVersionLog: true } : {}),
    });
  };

  /* ─── 렌더링 ───────────────────────────────────────────── */
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">설계</h2>
        <div className="flex items-center gap-2">
          {headerExtra}
          {/* 버전 이력 저장 체크박스 */}
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={saveVersionLog}
              onChange={(e) => handleVersionLogChange(e.target.checked)}
              className="h-3.5 w-3.5 accent-primary"
            />
            버전 이력 저장
          </label>
          <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "저장중..." : "저장"}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-6 space-y-5">
        <div className="grid grid-cols-5 gap-6">
          {/* ── 왼쪽: 기본 설계 내용 + 상세설계 ────────────── */}
          <div className="col-span-3 space-y-4">
            <MarkdownEditor
              value={spec}
              onChange={setSpec}
              label="기본 설계 내용 (마크다운) *"
              rows={18}
              placeholder="기본 설계 내용을 마크다운으로 작성하세요..."
              refTableName="tb_function"
              refPkId={func.functionId}
              fieldName="spec"
              headerExtra={
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    onClick={() => setExample({
                      content: FUNCTION_BASIC_EXAMPLE,
                      title: "기본 설계 내용 예시 (공지사항 목록 조회)",
                      onInsert: () => setSpec(FUNCTION_BASIC_EXAMPLE),
                    })}
                  >
                    <FileText className="h-3 w-3" />
                    예시
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    onClick={() => {
                      if (!spec.trim() || window.confirm("기존 내용을 템플릿으로 덮어쓰시겠습니까?")) {
                        setSpec(FUNCTION_BASIC_TEMPLATE);
                      }
                    }}
                  >
                    <FileText className="h-3 w-3" />
                    템플릿 삽입
                  </button>
                </div>
              }
            />
            <MarkdownEditor
              value={aiDesignContent}
              onChange={setAiDesignContent}
              label="상세설계 (마크다운)"
              rows={25}
              placeholder="AI가 설계요청 후 자동으로 작성하거나, 직접 작성할 수 있습니다..."
              refTableName="tb_function"
              refPkId={func.functionId}
              fieldName="ai_design_content"
              headerExtra={
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    onClick={() => setExample({
                      content: FUNCTION_DETAIL_EXAMPLE,
                      title: "상세설계 예시 (공지사항 목록 조회)",
                      onInsert: () => setAiDesignContent(FUNCTION_DETAIL_EXAMPLE),
                    })}
                  >
                    <FileText className="h-3 w-3" />
                    예시
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    onClick={() => {
                      if (!aiDesignContent.trim() || window.confirm("기존 내용을 템플릿으로 덮어쓰시겠습니까?")) {
                        setAiDesignContent(FUNCTION_DETAIL_TEMPLATE);
                      }
                    }}
                  >
                    <FileText className="h-3 w-3" />
                    템플릿 삽입
                  </button>
                </div>
              }
            />
          </div>

          {/* ── 오른쪽: 참고 프로그램 + 첨부파일 + GS코멘트 */}
          <div className="col-span-2 space-y-5">
            <MarkdownEditor
              value={refContent}
              onChange={setRefContent}
              label="참고 프로그램 내용 (마크다운)"
              rows={12}
              placeholder="참고할 프로그램, 공통 모듈, 관련 코드 등을 작성하세요..."
              refTableName="tb_function"
              refPkId={func.functionId}
              fieldName="ref_content"
            />

            {/* ── 첨부파일 (공통 컴포넌트) ────────────────── */}
            <AttachmentManager
              refTableName="tb_function"
              refPkId={func.functionId}
              attachments={func.attachments ?? []}
              onChanged={handleFileChange}
            />

            {/* ── GS 코멘트 ─────────────────────────────── */}
            <div className="space-y-1">
              <MarkdownEditor
                value={gsComment}
                onChange={onGsCommentChange}
                label="GS 코멘트"
                rows={6}
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

      {example && (
        <SpecExampleDialog
          open
          onClose={() => setExample(null)}
          content={example.content}
          onInsert={example.onInsert}
          title={example.title}
        />
      )}
    </div>
  );
}
