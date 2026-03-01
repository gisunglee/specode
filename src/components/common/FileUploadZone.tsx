"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadZoneProps {
  refTableName: string;
  refPkId: number;
  onUploadComplete: () => void;
}

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function FileUploadZone({
  refTableName,
  refPkId,
  onUploadComplete,
}: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const uploadFile = useCallback(
    async (file: File) => {
      if (file.size > MAX_SIZE) {
        alert("파일 크기는 10MB 이하만 가능합니다.");
        return;
      }

      setUploading(true);
      try {
        const form = new FormData();
        form.append("file", file);
        form.append("refTableName", refTableName);
        form.append("refPkId", String(refPkId));

        const res = await fetch("/api/attachments", {
          method: "POST",
          body: form,
        });

        if (!res.ok) throw new Error("Upload failed");
        onUploadComplete();
      } catch {
        alert("파일 업로드에 실패했습니다.");
      } finally {
        setUploading(false);
      }
    },
    [refTableName, refPkId, onUploadComplete]
  );

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      for (const file of Array.from(files)) {
        await uploadFile(file);
      }
    },
    [uploadFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer.files.length > 0) {
        uploadFiles(e.dataTransfer.files);
      }
    },
    [uploadFiles]
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (const item of Array.from(items)) {
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }

      if (files.length > 0) {
        e.preventDefault();
        uploadFiles(files);
      }
    },
    [uploadFiles]
  );

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed p-4 transition-colors",
        dragging
          ? "border-primary bg-primary/5"
          : "border-border",
        uploading && "opacity-50 pointer-events-none"
      )}
    >
      <Upload className="h-5 w-5 text-muted-foreground" />
      <p className="text-xs text-muted-foreground text-center">
        {uploading ? "업로드 중..." : "드래그하여 파일 업로드"}
      </p>
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="underline hover:text-foreground transition-colors cursor-pointer"
        >
          파일 선택
        </button>
        <span>·</span>
        <span>Ctrl+V 붙여넣기</span>
        <span>·</span>
        <span>최대 10MB</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            uploadFiles(e.target.files);
            e.target.value = "";
          }
        }}
      />
    </div>
  );
}
