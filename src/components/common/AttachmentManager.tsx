/**
 * AttachmentManager — 첨부파일 관리 공통 컴포넌트
 *
 * 📌 역할:
 *   - 첨부파일 목록 표시 (FileList)
 *   - 파일 업로드 영역 (FileUploadZone)
 *   - 파일 삭제 처리 (DELETE API 호출 후 부모에게 알림)
 *
 * 📌 사용처:
 *   - DesignInfoTab (기능 상세 → 첨부파일)
 *   - ScreenDetailPage (화면 상세 → 첨부파일)
 *
 * 📌 다형성(polymorphic) 첨부 테이블 기반:
 *   refTableName으로 어떤 테이블의 첨부인지 구분
 *   (예: "tb_function", "tb_screen")
 */
"use client";

import { useCallback } from "react";
import { Label } from "@/components/ui/label";
import { FileList } from "@/components/common/FileList";
import { FileUploadZone } from "@/components/common/FileUploadZone";
import type { Attachment } from "@/types";

interface AttachmentManagerProps {
  /** 첨부 대상 테이블명 (예: "tb_function", "tb_screen") */
  refTableName: string;
  /** 대상 레코드 PK */
  refPkId: number;
  /** 현재 첨부파일 목록 */
  attachments: Attachment[];
  /** 업로드/삭제 후 콜백 (부모에서 캐시 무효화용) */
  onChanged: () => void;
}

export function AttachmentManager({
  refTableName,
  refPkId,
  attachments,
  onChanged,
}: AttachmentManagerProps) {
  /** handleDelete — 파일 삭제 (논리 삭제 후 목록 갱신) */
  const handleDelete = useCallback(
    async (attachmentId: number) => {
      await fetch(`/api/attachments/${attachmentId}`, { method: "DELETE" });
      onChanged();
    },
    [onChanged]
  );

  return (
    <div className="space-y-2">
      {/* ── 라벨 + 즉시 저장 안내 ────────────────────────── */}
      <div className="flex items-center gap-2">
        <Label className="text-xs">첨부파일</Label>
        <span className="text-[10px] text-muted-foreground">
          (파일은 즉시 서버에 저장됩니다)
        </span>
      </div>

      {/* ── 파일 목록 ────────────────────────────────────── */}
      <FileList
        files={attachments}
        onDelete={handleDelete}
        onDescriptionChange={onChanged}
      />

      {/* ── 업로드 영역 ──────────────────────────────────── */}
      <FileUploadZone
        refTableName={refTableName}
        refPkId={refPkId}
        onUploadComplete={onChanged}
      />
    </div>
  );
}
