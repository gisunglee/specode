/**
 * ImplRequestDialog — 구현/설계 요청 확인 다이얼로그
 *
 * 역할:
 *   - AI 요청 상태(IMPL_REQ / DESIGN_REQ / REVIEW_REQ)로 변경 시 확인
 *   - 이전 IMPLEMENT/PRD_EXPORT 이력이 있으면 → 변경사항 diff 표시
 *   - 변경사항 메모(changeNote) 입력 가능 (자동 draft + 사용자 편집)
 *   - 이력이 없는 최초 요청이면 → 단순 확인 팝업
 */
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FUNC_STATUS_LABEL } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import {
  diffFromBaseline,
  buildChangeNoteDraft,
  type ContextSnapshot,
  type SectionDiff,
} from "@/lib/implBaseline";
import type { FunctionItem } from "@/types";

interface BaselineTask {
  aiTaskId: number;
  systemId: string;
  taskType: string;
  taskStatus: string;
  contextSnapshot: string;
  requestedAt: string;
}

interface ImplRequestDialogProps {
  open: boolean;
  onClose: () => void;
  targetStatus: string;
  func: FunctionItem;
  loading?: boolean;
  onConfirm: (changeNote: string) => void;
}

export function ImplRequestDialog({
  open,
  onClose,
  targetStatus,
  func,
  loading,
  onConfirm,
}: ImplRequestDialogProps) {
  const [baseline, setBaseline] = useState<BaselineTask | null | undefined>(undefined); // undefined = 로딩중
  const [diffs, setDiffs] = useState<SectionDiff[]>([]);
  const [changeNote, setChangeNote] = useState("");

  // 다이얼로그 열릴 때마다 baseline 조회
  useEffect(() => {
    if (!open) return;
    setBaseline(undefined);
    setDiffs([]);
    setChangeNote("");

    fetch(`/api/functions/${func.functionId}/baseline`)
      .then((r) => r.json())
      .then((res) => {
        const task: BaselineTask | null = res.data;
        setBaseline(task);

        if (task?.contextSnapshot) {
          const snapshot: ContextSnapshot = JSON.parse(task.contextSnapshot);
          const diffResult = diffFromBaseline(snapshot, {
            spec: func.spec,
            aiDesignContent: func.aiDesignContent,
            refContent: func.refContent,
          });
          setDiffs(diffResult);
          setChangeNote(buildChangeNoteDraft(diffResult));
        }
      })
      .catch(() => setBaseline(null));
  }, [open, func.functionId, func.spec, func.aiDesignContent, func.refContent]);

  const isLoading = baseline === undefined;
  const hasBaseline = !!baseline;
  const hasDiff = diffs.length > 0;

  const taskTypeLabel: Record<string, string> = {
    IMPLEMENT: "구현 요청",
    PRD_EXPORT: "PRD 내보내기",
    DESIGN: "설계 요청",
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {FUNC_STATUS_LABEL[targetStatus] ?? targetStatus} — AI 요청
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">이력 확인 중...</p>
          ) : hasBaseline ? (
            <>
              {/* 이전 기준선 정보 */}
              <div className="rounded-md bg-muted/30 border border-border px-4 py-3 text-sm space-y-1">
                <p className="text-xs text-muted-foreground font-medium">이전 기준선</p>
                <p>
                  <span className="font-medium">{baseline!.systemId}</span>
                  <span className="text-muted-foreground ml-2">
                    ({taskTypeLabel[baseline!.taskType] ?? baseline!.taskType})
                  </span>
                  <span className="text-muted-foreground ml-2">
                    {formatDateTime(baseline!.requestedAt)}
                  </span>
                </p>
              </div>

              {/* 변경사항 diff */}
              {hasDiff ? (
                <div className="rounded-md bg-amber-500/5 border border-amber-500/20 px-4 py-3 space-y-2">
                  <p className="text-xs font-medium text-amber-600">이후 변경된 내용</p>
                  {diffs.map((d) => (
                    <div key={d.field} className="text-xs space-y-0.5">
                      <p className="font-medium text-foreground">{d.label}</p>
                      {d.modified.map((s) => (
                        <p key={s.name} className="text-amber-600">~ 변경: {s.name}</p>
                      ))}
                      {d.added.map((s) => (
                        <p key={s.name} className="text-emerald-600">+ 추가: {s.name}</p>
                      ))}
                      {d.removed.map((s) => (
                        <p key={s.name} className="text-destructive">- 삭제: {s.name}</p>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md bg-muted/20 border border-border px-4 py-3">
                  <p className="text-xs text-muted-foreground">이전 기준선 이후 설계 변경 없음</p>
                </div>
              )}

              {/* 변경사항 메모 */}
              <div className="space-y-1.5">
                <Label className="text-xs">
                  변경사항 메모{" "}
                  <span className="text-muted-foreground font-normal">(AI에게 전달됩니다)</span>
                </Label>
                <Textarea
                  value={changeNote}
                  onChange={(e) => setChangeNote(e.target.value)}
                  rows={5}
                  placeholder="변경사항 메모를 입력하세요 (자동 생성된 내용을 수정하거나 직접 입력)"
                  className="text-xs font-mono resize-none"
                />
              </div>
            </>
          ) : (
            /* 최초 요청 — 단순 안내 */
            <p className="text-sm text-muted-foreground">
              이전 구현 이력이 없습니다. 전체 설계를 기준으로 AI에게 요청합니다.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            취소
          </Button>
          <Button
            onClick={() => onConfirm(changeNote)}
            disabled={loading || isLoading}
          >
            {loading ? "요청 중..." : "요청"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
