/**
 * RichTextEditor — Tiptap 기반 간단한 리치텍스트 에디터
 *
 * 📌 역할:
 *   - Bold / Italic / Underline / 목록 / 문단 서식 편집
 *   - HTML 형식으로 내용 저장 (나중에 Word 문서 변환에 활용)
 *   - 편집 내용이 바뀔 때마다 onChange(html) 콜백 호출
 *
 * 📌 사용 예:
 *   <RichTextEditor
 *     label="요구사항 내용"
 *     value={contentHtml}
 *     onChange={setContentHtml}
 *   />
 */
"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/* ─── 아이콘 (lucide 대신 텍스트 기호 사용 — 의존성 최소화) ── */

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, active, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault(); // 포커스 유지
        onClick();
      }}
      className={cn(
        "h-6 min-w-6 px-1.5 rounded text-xs font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "hover:bg-muted text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

interface RichTextEditorProps {
  /** 라벨 텍스트 */
  label?: string;
  /** 현재 HTML 값 */
  value: string;
  /** 값 변경 콜백 (HTML 문자열) */
  onChange: (html: string) => void;
  /** 플레이스홀더 */
  placeholder?: string;
  /** 에디터 높이 (Tailwind 클래스) */
  heightClass?: string;
}

export function RichTextEditor({
  label,
  value,
  onChange,
  placeholder = "내용을 입력하세요...",
  heightClass = "min-h-48",
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false, // SSR hydration 불일치 방지 (Next.js App Router 필수)
    extensions: [
      StarterKit.configure({
        // 줄바꿈: 기본 하드브레이크 사용
        hardBreak: {},
      }),
      Underline,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      /* HTML이 빈 단락(<p></p>)만 남으면 빈 문자열로 처리 */
      const html = editor.isEmpty ? "" : editor.getHTML();
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: cn(
          "outline-none prose prose-sm max-w-none",
          heightClass,
          "px-3 py-2 text-sm"
        ),
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="flex flex-col gap-1.5">
      {label && <Label className="text-xs">{label}</Label>}

      {/* ── 툴바 + 에디터를 하나의 border로 묶음 ────────────── */}
      <div className="rounded-md border border-border overflow-hidden flex flex-col">

      {/* ── 툴바 ──────────────────────────────────────────── */}
      <div className="flex items-center gap-0.5 flex-wrap border-b border-border bg-muted/40 px-2 py-1">
        {/* 텍스트 서식 */}
        <ToolbarButton
          title="굵게 (Ctrl+B)"
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          title="기울임 (Ctrl+I)"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          title="밑줄 (Ctrl+U)"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
        >
          <span className="underline">U</span>
        </ToolbarButton>

        <span className="mx-1 text-border">|</span>

        {/* 제목 */}
        <ToolbarButton
          title="제목 1"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive("heading", { level: 1 })}
        >
          H1
        </ToolbarButton>
        <ToolbarButton
          title="제목 2"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          title="제목 3"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
        >
          H3
        </ToolbarButton>

        <span className="mx-1 text-border">|</span>

        {/* 목록 */}
        <ToolbarButton
          title="글머리 목록"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
        >
          •≡
        </ToolbarButton>
        <ToolbarButton
          title="번호 목록"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
        >
          1≡
        </ToolbarButton>

        <span className="mx-1 text-border">|</span>

        {/* 실행 취소/다시 실행 */}
        <ToolbarButton
          title="실행 취소 (Ctrl+Z)"
          onClick={() => editor.chain().focus().undo().run()}
        >
          ↩
        </ToolbarButton>
        <ToolbarButton
          title="다시 실행 (Ctrl+Y)"
          onClick={() => editor.chain().focus().redo().run()}
        >
          ↪
        </ToolbarButton>
      </div>

      {/* ── 에디터 본문 ──────────────────────────────────── */}
      <div
        className="relative bg-white cursor-text overflow-auto flex-1"
        onClick={() => editor.chain().focus().run()}
      >
        {/* placeholder */}
        {editor.isEmpty && (
          <p className="absolute top-0 left-0 pointer-events-none text-muted-foreground text-sm px-3 py-2 select-none">
            {placeholder}
          </p>
        )}
        <EditorContent editor={editor} />
      </div>

      </div>{/* end border wrapper */}
    </div>
  );
}
