/**
 * MarkdownEditor — 마크다운 편집/미리보기 토글 공통 컴포넌트
 *
 * 📌 역할:
 *   - 편집 모드: textarea로 마크다운 원문 작성
 *   - 미리보기 모드: ReactMarkdown으로 렌더링된 결과 표시
 *   - 상단에 라벨 + 편집/미리보기 토글 버튼
 *   - (선택) 버전 이력 버튼 표시 (refTableName, refPkId, fieldName 전달 시)
 *   - (선택) fillHeight=true 시 부모 flex 컨테이너를 꽉 채우는 레이아웃
 */
"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { VersionButtons } from "@/components/common/VersionButtons";

interface MarkdownEditorProps {
  value: string;
  onChange?: (value: string) => void;
  label?: string;
  rows?: number;
  placeholder?: string;
  readOnly?: boolean;
  /** true → flex flex-col h-full で親コンテナを埋める (Textarea が flex-1 になる) */
  fillHeight?: boolean;
  /** ルートdivへの追加クラス */
  className?: string;
  /* ── 버전 이력 버튼 관련 (선택) ─────────────────────────── */
  refTableName?: string;
  refPkId?: number;
  fieldName?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  label = "설명 (마크다운)",
  rows = 24,
  placeholder = "마크다운으로 작성하세요...",
  readOnly = false,
  fillHeight = false,
  className,
  refTableName,
  refPkId,
  fieldName,
}: MarkdownEditorProps) {
  const [previewMode, setPreviewMode] = useState(readOnly);

  const minHeight = `${rows * 24}px`;

  const handleVersionSelect = (content: string) => {
    if (onChange) onChange(content);
    setPreviewMode(false);
  };

  const showVersionButtons = !!(refTableName && refPkId && fieldName);

  return (
    <div
      className={cn(
        fillHeight ? "flex flex-col h-full" : "space-y-2",
        className
      )}
    >
      {/* ── 라벨 + 편집/미리보기 토글 + 버전 버튼 ─────────── */}
      {(label || !readOnly || showVersionButtons) && (
        <div className={cn("flex items-center gap-3", fillHeight && "shrink-0 mb-2")}>
          {label && <Label>{label}</Label>}
          {!readOnly && (
            <div className="flex rounded-md border border-border overflow-hidden">
              <button
                type="button"
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
                type="button"
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
          )}
          {showVersionButtons && (
            <VersionButtons
              refTableName={refTableName!}
              refPkId={refPkId!}
              fieldName={fieldName!}
              currentContent={value}
              onVersionSelect={handleVersionSelect}
            />
          )}
        </div>
      )}

      {/* ── 편집기 / 미리보기 ──────────────────────────────── */}
      {previewMode ? (
        <div
          className={cn(
            "rounded-md border border-border bg-muted/10 p-4 markdown-body text-sm",
            fillHeight ? "flex-1 overflow-y-auto min-h-0" : ""
          )}
          style={!fillHeight ? { minHeight } : undefined}
        >
          {value ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {value}
            </ReactMarkdown>
          ) : (
            <p className="text-muted-foreground">내용이 없습니다.</p>
          )}
        </div>
      ) : (
        <Textarea
          value={value}
          onChange={(e) => onChange && onChange(e.target.value)}
          placeholder={placeholder}
          rows={fillHeight ? undefined : rows}
          className={cn(
            "font-mono text-sm",
            fillHeight && "flex-1 resize-none min-h-0"
          )}
        />
      )}
    </div>
  );
}
