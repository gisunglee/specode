/**
 * ImplRequestDialog (공통) — 기능/영역/화면 구현 요청 확인 다이얼로그
 *
 * 역할:
 *   - entityType에 따라 적절한 baseline API를 호출
 *   - 이전 구현 이력이 있으면 → diff 표시 + changeNote 입력
 *   - 최초 요청이면 → 단순 확인
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
import { formatDateTime } from "@/lib/utils";
import {
  diffFromBaseline,
  buildChangeNoteDraft,
  diffFromAreaBaseline,
  buildAreaChangeNoteDraft,
  diffFromScreenBaseline,
  buildScreenChangeNoteDraft,
  type ContextSnapshot,
  type AreaSnapshot,
  type ScreenSnapshot,
} from "@/lib/implBaseline";

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
  /** "function" | "area" | "screen" */
  entityType: "function" | "area" | "screen";
  entityId: number;
  /** 현재 엔티티 상태 (diff 계산용) */
  currentSnapshot: ContextSnapshot | AreaSnapshot | ScreenSnapshot;
  loading?: boolean;
  onConfirm: (changeNote: string) => void;
}

const taskTypeLabel: Record<string, string> = {
  IMPLEMENT: "구현 요청",
  PRD_EXPORT: "PRD 내보내기",
  DESIGN: "설계 요청",
};

const entityLabel: Record<string, string> = {
  function: "기능",
  area: "영역",
  screen: "화면",
};

export function ImplRequestDialog({
  open,
  onClose,
  entityType,
  entityId,
  currentSnapshot,
  loading,
  onConfirm,
}: ImplRequestDialogProps) {
  const [baseline, setBaseline] = useState<BaselineTask | null | undefined>(undefined);
  const [changeNote, setChangeNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setBaseline(undefined);
    setChangeNote("");

    const tableMap: Record<string, string> = {
      function: "functions",
      area: "areas",
      screen: "screens",
    };

    fetch(`/api/${tableMap[entityType]}/${entityId}/baseline`)
      .then((r) => r.json())
      .then((res) => {
        const task: BaselineTask | null = res.data;
        setBaseline(task);

        if (task?.contextSnapshot) {
          const snapshot = JSON.parse(task.contextSnapshot);
          let draft = "";

          if (entityType === "function") {
            const diffs = diffFromBaseline(snapshot as ContextSnapshot, currentSnapshot as ContextSnapshot);
            draft = buildChangeNoteDraft(diffs);
          } else if (entityType === "area") {
            const diff = diffFromAreaBaseline(snapshot as AreaSnapshot, currentSnapshot as AreaSnapshot);
            draft = buildAreaChangeNoteDraft(diff);
          } else if (entityType === "screen") {
            const diff = diffFromScreenBaseline(snapshot as ScreenSnapshot, currentSnapshot as ScreenSnapshot);
            draft = buildScreenChangeNoteDraft(diff);
          }

          setChangeNote(draft);
        }
      })
      .catch(() => setBaseline(null));
  }, [open, entityType, entityId]);  // currentSnapshot 의도적으로 제외 (열리는 시점 snapshot만 사용)

  const isLoading = baseline === undefined;
  const hasBaseline = !!baseline;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {entityLabel[entityType]} 구현 요청
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

              {/* 변경사항 메모 */}
              <div className="space-y-1.5">
                <Label className="text-xs">
                  변경사항 메모{" "}
                  <span className="text-muted-foreground font-normal">(AI에게 전달됩니다)</span>
                </Label>
                <Textarea
                  value={changeNote}
                  onChange={(e) => setChangeNote(e.target.value)}
                  rows={8}
                  placeholder="변경사항 메모를 입력하세요 (자동 생성된 내용을 수정하거나 직접 입력)"
                  className="text-xs font-mono resize-none"
                />
              </div>
            </>
          ) : (
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
