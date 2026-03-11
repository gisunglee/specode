/**
 * MarkdownEditor — 마크다운 편집/미리보기 토글 공통 컴포넌트
 *
 * 📌 역할:
 *   - 편집 모드: textarea로 마크다운 원문 작성
 *   - 미리보기 모드: ReactMarkdown으로 렌더링된 결과 표시
 *   - 상단에 라벨 + 편집/미리보기 토글 버튼
 *   - (선택) 버전 이력 버튼 표시 (refTableName, refPkId, fieldName 전달 시)
 *
 * 📌 사용처:
 *   - DesignInfoTab (기능 상세 → 기능 설명)
 *   - ScreenDetailPage (화면 상세 → 화면 설명)
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
  /** 마크다운 내용 */
  value: string;
  /** 내용 변경 콜백 */
  onChange?: (value: string) => void;
  /** 라벨 텍스트 (기본: "설명 (마크다운)") */
  label?: string;
  /** textarea 행 수 (기본: 24) */
  rows?: number;
  /** placeholder 텍스트 */
  placeholder?: string;
  /** 읽기 전용 모드 (기본: false) */
  readOnly?: boolean;
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
  refTableName,
  refPkId,
  fieldName,
}: MarkdownEditorProps) {
  const [previewMode, setPreviewMode] = useState(readOnly);

  /* ─── 미리보기 영역의 최소 높이 계산 ─────────────────────── */
  const minHeight = `${rows * 24}px`;

  /** 버전 선택 시: 해당 content로 편집기 내용을 교체하고 편집 모드로 전환 */
  const handleVersionSelect = (content: string) => {
    if (onChange) onChange(content);
    setPreviewMode(false);
  };

  const showVersionButtons = !!(refTableName && refPkId && fieldName);

  return (
    <div className="space-y-2">
      {/* ── 라벨 + 편집/미리보기 토글 + 버전 버튼 ─────────── */}
      <div className="flex items-center gap-3">
        <Label>{label}</Label>
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

      {/* ── 편집기 / 미리보기 ──────────────────────────────── */}
      {previewMode ? (
        <div
          className="rounded-md border border-border bg-muted/10 p-4 markdown-body text-sm"
          style={{ minHeight }}
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
          rows={rows}
          className="font-mono text-sm"
        />
      )}
    </div>
  );
}
