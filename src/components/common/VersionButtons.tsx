/**
 * VersionButtons — 콘텐츠 버전 이력 버튼 컴포넌트
 *
 * 📌 역할:
 *   - 특정 필드의 버전 이력 목록을 가로 버튼으로 표시
 *   - AI 변경: 파란색 / 사용자 변경: 빨간색
 *   - 클릭 시 해당 버전 content를 부모로 전달
 *   - 버전 없으면 아무것도 렌더링하지 않음
 *
 * 📌 사용처:
 *   - MarkdownEditor의 라벨 행 오른쪽에 배치
 */
"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { VersionDiffDialog } from "./VersionDiffDialog";

interface VersionItem {
  versionId: number;
  changedBy: string;
  aiTaskId: number | null;
  createdAt: string;
}

interface VersionButtonsProps {
  refTableName: string;
  refPkId: number;
  fieldName: string;
  /** 현재 편집기 내용 (비교 팝업에서 "현재" 항목으로 표시) */
  currentContent?: string;
  /** 버전 선택 시 콜백 (content, versionId) */
  onVersionSelect: (content: string, versionId: number) => void;
}

/** createdAt ISO 문자열 → "YYYY-MM-DD HH:mm" */
const formatDate = (iso: string): string => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function VersionButtons({
  refTableName,
  refPkId,
  fieldName,
  currentContent,
  onVersionSelect,
}: VersionButtonsProps) {
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [diffOpen, setDiffOpen] = useState(false);

  // 버전 미선택 상태일 때만 원본 내용 업데이트 — 버전 클릭 후에는 동결
  const originalContentRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (selectedId === null) {
      originalContentRef.current = currentContent;
    }
  }, [currentContent, selectedId]);

  useEffect(() => {
    if (!refPkId) return;

    const url = `/api/content-versions?refTableName=${encodeURIComponent(refTableName)}&refPkId=${refPkId}&fieldName=${encodeURIComponent(fieldName)}`;

    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setVersions(json.data);
      })
      .catch(() => {/* 무시 */});
  }, [refTableName, refPkId, fieldName]);

  if (versions.length === 0) return null;

  const handleClick = async (v: VersionItem) => {
    if (loading) return;
    setLoading(true);
    try {
      const url = `/api/content-versions?refTableName=${encodeURIComponent(refTableName)}&refPkId=${refPkId}&fieldName=${encodeURIComponent(fieldName)}&versionId=${v.versionId}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.data?.content) {
        setSelectedId(v.versionId);
        onVersionSelect(json.data.content, v.versionId);
      }
    } catch {/* 무시 */} finally {
      setLoading(false);
    }
  };

  // 최신이 왼쪽 (index 0 = 가장 최신) → 버튼 번호는 총 개수부터 역순
  const total = versions.length;
  // 버튼은 최근 7개만 표시 (비교 다이얼로그는 전체 versions 사용)
  const visibleVersions = versions.slice(0, 7);

  return (
    <div className="flex items-center gap-1">
      {visibleVersions.map((v, idx) => {
        const num = total - idx; // 최신 = total, 오래된 = total-6
        const isAi = v.changedBy === "ai";
        const isSelected = selectedId === v.versionId;

        return (
          <button
            key={v.versionId}
            type="button"
            title={formatDate(v.createdAt)}
            onClick={() => handleClick(v)}
            disabled={loading}
            className={cn(
              "w-6 h-6 rounded text-[10px] font-bold text-white transition-all cursor-pointer",
              isAi ? "bg-blue-500 hover:bg-blue-600" : "bg-slate-400 hover:bg-slate-500",
              isSelected && "ring-2 ring-offset-1 ring-foreground",
              loading && "opacity-50 cursor-not-allowed"
            )}
          >
            {num}
          </button>
        );
      })}
      {selectedId !== null && (
        <button
          type="button"
          onClick={() => {
            setSelectedId(null);
            if (originalContentRef.current !== undefined) {
              onVersionSelect(originalContentRef.current, 0);
            }
          }}
          className="ml-1 text-[10px] text-orange-500 hover:text-orange-600 underline underline-offset-2 cursor-pointer"
          title="원래 내용으로 복원"
        >
          ↩ 복원
        </button>
      )}
      {versions.length >= 2 && (
        <button
          type="button"
          onClick={() => setDiffOpen(true)}
          className="ml-1 text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2 cursor-pointer"
        >
          비교
        </button>
      )}

      {diffOpen && (
        <VersionDiffDialog
          refTableName={refTableName}
          refPkId={refPkId}
          fieldName={fieldName}
          currentContent={originalContentRef.current}
          onClose={() => setDiffOpen(false)}
        />
      )}
    </div>
  );
}
