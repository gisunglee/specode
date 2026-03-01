"use client";

import { useState, useRef } from "react";
import { X, FileText, Pencil } from "lucide-react";
import { ImageLightbox } from "./ImageLightbox";
import type { Attachment } from "@/types";

interface FileListProps {
  files: Attachment[];
  onDelete: (id: number) => void;
  onDescriptionChange?: () => void;
}

const IMAGE_EXTS = ["png", "jpg", "jpeg", "gif", "webp", "svg"];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function DescriptionInput({
  file,
  onSaved,
}: {
  file: Attachment;
  onSaved?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(file.description ?? "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const save = async () => {
    const trimmed = value.trim();
    if (trimmed === (file.description ?? "")) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await fetch(`/api/attachments/${file.attachmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: trimmed || null }),
      });
      onSaved?.();
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer truncate w-full text-left"
        title={file.description || "설명 추가"}
      >
        {file.description ? (
          <span className="truncate">{file.description}</span>
        ) : (
          <>
            <Pencil className="h-2.5 w-2.5 shrink-0" />
            <span className="text-muted-foreground/50">설명 추가</span>
          </>
        )}
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      autoFocus
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") save();
        if (e.key === "Escape") {
          setValue(file.description ?? "");
          setEditing(false);
        }
      }}
      onClick={(e) => e.stopPropagation()}
      disabled={saving}
      placeholder="이미지/파일 설명 입력"
      className="w-full text-[10px] bg-transparent border-b border-muted-foreground/30 focus:border-primary outline-none py-0.5 text-foreground placeholder:text-muted-foreground/40"
    />
  );
}

export function FileList({ files, onDelete, onDescriptionChange }: FileListProps) {
  const [lightbox, setLightbox] = useState<Attachment | null>(null);

  if (files.length === 0) return null;

  const isImage = (file: Attachment) =>
    IMAGE_EXTS.includes(file.fileExt?.toLowerCase() ?? "");

  const handleDelete = (file: Attachment) => {
    if (confirm(`"${file.logicalName}"을(를) 삭제하시겠습니까?`)) {
      onDelete(file.attachmentId);
    }
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {files.map((file) =>
          isImage(file) ? (
            <div
              key={file.attachmentId}
              className="group relative rounded-md border border-border overflow-hidden cursor-pointer"
              onClick={() => setLightbox(file)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/attachments/${file.attachmentId}`}
                alt={file.description || file.logicalName}
                className="w-full h-20 object-cover"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(file);
                }}
                className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <X className="h-3 w-3 text-white" />
              </button>
              <div className="px-1.5 py-1 space-y-0.5">
                <p className="text-[10px] text-muted-foreground truncate">
                  {file.logicalName}
                </p>
                <DescriptionInput file={file} onSaved={onDescriptionChange} />
              </div>
            </div>
          ) : (
            <div
              key={file.attachmentId}
              className="group relative rounded-md border border-border p-2 space-y-1"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs truncate">{file.logicalName}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatFileSize(file.fileSize)}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(file)}
                  className="rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted cursor-pointer"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              </div>
              <DescriptionInput file={file} onSaved={onDescriptionChange} />
            </div>
          )
        )}
      </div>

      {lightbox && (
        <ImageLightbox
          src={`/api/attachments/${lightbox.attachmentId}`}
          alt={lightbox.description || lightbox.logicalName}
          open={!!lightbox}
          onOpenChange={(open) => !open && setLightbox(null)}
        />
      )}
    </>
  );
}
