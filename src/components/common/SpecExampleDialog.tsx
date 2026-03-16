/**
 * SpecExampleDialog — 설계 작성 예시를 팝업으로 미리보고 에디터에 삽입하는 공통 다이얼로그
 */
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SpecExampleDialogProps {
  open: boolean;
  onClose: () => void;
  /** 예시 마크다운 원문 */
  content: string;
  /** "에디터에 삽입" 클릭 시 실행 (삽입 후 자동으로 닫힘) */
  onInsert: () => void;
  title?: string;
}

export function SpecExampleDialog({
  open,
  onClose,
  content,
  onInsert,
  title = "작성 예시",
}: SpecExampleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl flex flex-col max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <pre className="flex-1 min-h-0 overflow-auto rounded-md bg-muted p-4 text-xs font-mono whitespace-pre-wrap leading-relaxed">
          {content}
        </pre>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
          <Button
            onClick={() => {
              onInsert();
              onClose();
            }}
          >
            에디터에 삽입
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
