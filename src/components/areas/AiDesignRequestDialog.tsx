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

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (spec: string, comment: string) => void;
  areaSpec: string | null;
  designData: string | null;
  currentComment: string;
  loading?: boolean;
}

export function AiDesignRequestDialog({
  open,
  onClose,
  onConfirm,
  areaSpec,
  designData,
  currentComment,
  loading,
}: Props) {
  const hasDesign = !!designData;

  const [includeSpec, setIncludeSpec] = useState(true);
  const [includeDesign, setIncludeDesign] = useState(true);
  const [imageRef, setImageRef] = useState<"ref" | "noref">("ref");

  // 다이얼로그가 열릴 때마다 기본값으로 리셋
  useEffect(() => {
    if (open) {
      setIncludeSpec(true);
      setIncludeDesign(true);
      setImageRef("ref");
    }
  }, [open]);

  function buildSpec(): string {
    const specPart = includeSpec && areaSpec?.trim()
      ? `## 영역 설계 명세\n\n${areaSpec.trim()}`
      : null;

    const designPart = includeDesign && hasDesign
      ? `## 디자인 설계 (Excalidraw JSON)\n\n> 아래 JSON은 Excalidraw 설계 도안 데이터입니다. elements 배열의 각 항목(type, x, y, width, height, text 등)을 분석하면 화면 레이아웃과 UI 구조를 파악할 수 있습니다.\n\n\`\`\`json\n${designData}\n\`\`\``
      : null;

    if (specPart && designPart) return `${specPart}\n\n---\n\n${designPart}`;
    if (specPart) return specPart;
    if (designPart) return designPart;
    // 둘 다 미선택 → 원본 그대로
    return areaSpec ?? "";
  }

  function buildComment(): string {
    const base = currentComment.trim();
    if (imageRef === "noref") {
      return base
        ? `${base}\n\n이미지가 존재하더라도 참고하지 마세요.`
        : "이미지가 존재하더라도 참고하지 마세요.";
    }
    return base;
  }

  function handleConfirm() {
    onConfirm(buildSpec(), buildComment());
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>AI 설계 요청 옵션</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* ── 포함할 설계 내용 ───────────────── */}
          <div className="space-y-2">
            <p className="text-sm font-medium">포함할 설계 내용</p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeSpec}
                onChange={(e) => setIncludeSpec(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              <span className="text-sm">영역 설계 (Spec)</span>
            </label>
            {hasDesign && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeDesign}
                  onChange={(e) => setIncludeDesign(e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-sm">디자인 설계 (Excalidraw 도안)</span>
              </label>
            )}
            {!hasDesign && (
              <p className="text-xs text-muted-foreground pl-6">
                디자인 도안이 없습니다.
              </p>
            )}
          </div>

          {/* ── 이미지 첨부 참조 여부 ──────────── */}
          <div className="space-y-2">
            <p className="text-sm font-medium">이미지 첨부 참조 여부</p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="imageRef"
                  value="ref"
                  checked={imageRef === "ref"}
                  onChange={() => setImageRef("ref")}
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-sm">참조</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="imageRef"
                  value="noref"
                  checked={imageRef === "noref"}
                  onChange={() => setImageRef("noref")}
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-sm">미참조</span>
              </label>
            </div>
            {imageRef === "noref" && (
              <p className="text-xs text-amber-600 pl-1">
                코멘트 끝에 &quot;이미지가 존재하더라도 참고하지 마세요.&quot;가 추가됩니다.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            취소
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? "요청 중..." : "AI 설계 요청"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
