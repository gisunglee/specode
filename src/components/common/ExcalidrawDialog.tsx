"use client";

// Excalidraw 전용 스타일 (빌드 시 번들에 포함됨)
import "@excalidraw/excalidraw/index.css";

import { useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalidrawAPI = {
  getSceneElements: () => unknown[];
  getAppState: () => unknown;
  getFiles: () => Record<string, unknown>;
};

// Excalidraw은 SSR 불가 — next/dynamic으로 lazy load
const ExcalidrawComponent = dynamic(
  async () => {
    const { Excalidraw } = await import("@excalidraw/excalidraw");
    return Excalidraw;
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Excalidraw 로딩 중...
      </div>
    ),
  }
);

interface ExcalidrawDialogProps {
  /** 저장된 Excalidraw JSON 문자열 (null이면 빈 캔버스) */
  value: string | null;
  /** 저장 버튼 클릭 시 호출 — JSON 문자열 전달 */
  onSave: (json: string) => void;
  /** 저장 중 여부 */
  saving?: boolean;
  /** 버튼 텍스트 표시 여부 (기본값: true) */
  showText?: boolean;
}

export function ExcalidrawDialog({ value, onSave, saving, showText = true }: ExcalidrawDialogProps) {
  const [open, setOpen] = useState(false);
  const [mountKey, setMountKey] = useState(0);
  const apiRef = useRef<ExcalidrawAPI | null>(null);

  const handleOpenChange = useCallback((v: boolean) => {
    if (v) setMountKey((k) => k + 1);
    setOpen(v);
  }, []);

  const initialData = (() => {
    if (!value) return undefined;
    try {
      const parsed = JSON.parse(value);
      // collaborators는 Map이어야 하는데 JSON 직렬화 시 일반 객체로 변환됨
      // → 복원 시 제거해서 Excalidraw가 빈 Map으로 초기화하도록 함
      const { collaborators: _c, ...restAppState } = parsed.appState ?? {};
      return {
        elements: parsed.elements,
        appState: restAppState,
        files: parsed.files ?? {},  // 이미지 바이너리 데이터 복원
      };
    } catch {
      return undefined;
    }
  })();

  const handleSave = useCallback(() => {
    if (!apiRef.current) return;
    const elements = apiRef.current.getSceneElements();
    const appState = apiRef.current.getAppState();
    const files = apiRef.current.getFiles(); // 붙여넣은 이미지 등 바이너리 데이터
    const json = JSON.stringify({ elements, appState, files });
    onSave(json);
    setOpen(false);
  }, [onSave]);

  return (
    <>
      <Button
        variant="outline"
        size={showText ? "sm" : "icon"}
        onClick={() => handleOpenChange(true)}
        title={showText ? undefined : "디자인 설계"}
        className={cn(!showText && "h-8 w-8 relative")}
      >
        <Pencil className={cn("h-4 w-4", showText && "mr-1.5 h-3.5 w-3.5")} />
        {showText && "디자인 설계"}
        {value && (
          <span className={cn("text-[10px] text-primary font-semibold", showText ? "ml-1.5" : "absolute top-1 right-1")}>
            ●
          </span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="!max-w-none w-[calc(100vw-48px)] h-[calc(100vh-48px)] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-5 py-3 border-b border-border shrink-0 flex flex-row items-center justify-between">
            <DialogTitle className="text-base">디자인 설계 — Excalidraw</DialogTitle>
            <div className="flex items-center gap-2 pr-8">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                닫기
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "저장중..." : "저장"}
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-0">
            {open && (
              <ExcalidrawComponent
                key={mountKey}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                excalidrawAPI={async (api: any) => {
                  apiRef.current = api;
                  // 기본 UI 라이브러리 자동 탑재
                  try {
                    const res = await fetch("/excalidraw-libs/ui-wireframe.excalidrawlib");
                    const lib = await res.json();
                    api.updateLibrary({ libraryItems: lib.libraryItems, merge: false, openLibraryMenu: false });
                  } catch { /* 실패해도 무시 */ }
                }}
                initialData={initialData}
                theme="light"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
