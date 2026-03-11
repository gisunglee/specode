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

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

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
  onVersionSelect,
}: VersionButtonsProps) {
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="flex items-center gap-1">
      {versions.map((v, idx) => {
        const num = total - idx; // 최신 = total, 오래된 = 1
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
              isAi ? "bg-blue-500 hover:bg-blue-600" : "bg-red-500 hover:bg-red-600",
              isSelected && "ring-2 ring-offset-1 ring-foreground",
              loading && "opacity-50 cursor-not-allowed"
            )}
          >
            {num}
          </button>
        );
      })}
    </div>
  );
}
