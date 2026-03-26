"use client";

import { Node, mergeAttributes, type CommandProps } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useRef, useState, useCallback } from "react";

/* ── ResizableImageView: 선택 시 우하단 드래그 핸들 표시 ── */
function ResizableImageView({
  node,
  updateAttributes,
  selected,
}: NodeViewProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const startXRef = useRef(0);
  const startWRef = useRef(0);
  const [resizing, setResizing] = useState(false);

  const onHandleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      startXRef.current = e.clientX;
      startWRef.current =
        imgRef.current?.offsetWidth ?? (node.attrs.width as number) ?? 400;
      setResizing(true);

      const onMove = (ev: MouseEvent) => {
        const newW = Math.max(
          60,
          startWRef.current + (ev.clientX - startXRef.current)
        );
        updateAttributes({ width: Math.round(newW) });
      };

      const onUp = () => {
        setResizing(false);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [node.attrs.width, updateAttributes]
  );

  return (
    <NodeViewWrapper
      as="span"
      style={{ display: "inline-block", position: "relative", lineHeight: 0 }}
    >
      <img
        ref={imgRef}
        src={node.attrs.src as string}
        alt={(node.attrs.alt as string) ?? ""}
        title={(node.attrs.title as string) ?? undefined}
        width={(node.attrs.width as number) ?? undefined}
        style={{
          display: "block",
          maxWidth: "100%",
          cursor: resizing ? "ew-resize" : "default",
          outline: selected ? "2px solid #3b82f6" : "none",
          outlineOffset: "1px",
        }}
        draggable={false}
      />
      {selected && (
        <span
          onMouseDown={onHandleMouseDown}
          style={{
            position: "absolute",
            bottom: 2,
            right: 2,
            width: 10,
            height: 10,
            background: "#fff",
            border: "2px solid #3b82f6",
            borderRadius: 2,
            cursor: "se-resize",
            display: "block",
          }}
        />
      )}
    </NodeViewWrapper>
  );
}

/* ── ResizableImage: @tiptap/extension-image 대체 커스텀 노드 ── */
export const ResizableImage = Node.create({
  name: "image",
  inline: true,
  group: "inline",
  draggable: true,
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      width: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "img[src]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(HTMLAttributes)];
  },

  addCommands() {
    return {
      setImage:
        (attrs: Record<string, unknown>) =>
        ({ commands }: { commands: { insertContent: (content: { type: string; attrs: Record<string, unknown> }) => boolean } }) =>
          commands.insertContent({ type: this.name, attrs }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView as never);
  },
});
