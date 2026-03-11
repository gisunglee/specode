/**
 * VersionDiffDialog — 버전 이력 비교 다이얼로그
 *
 * 버전 목록에서 2개를 선택하면 좌우 split diff로 비교.
 * 3번째 선택 시 첫 번째 선택 해제.
 */
"use client";

import { useState, useEffect } from "react";
import ReactDiffViewer from "react-diff-viewer-continued";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface VersionItem {
  versionId: number;
  changedBy: string;
  aiTaskId: number | null;
  createdAt: string;
}

interface Props {
  refTableName: string;
  refPkId: number;
  fieldName: string;
  /** 현재 편집기 내용 — 목록 상단에 "현재" 항목으로 표시 */
  currentContent?: string;
  onClose: () => void;
}

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// 현재 내용을 나타내는 특수 versionId
const CURRENT_VERSION_ID = -1;

export function VersionDiffDialog({ refTableName, refPkId, fieldName, currentContent, onClose }: Props) {
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [selected, setSelected] = useState<number[]>([]); // versionId 최대 2개
  const [contents, setContents] = useState<Record<number, string>>({});

  // 버전 목록 조회 + 기본 선택 (최신 2개)
  useEffect(() => {
    const url = `/api/content-versions?refTableName=${encodeURIComponent(refTableName)}&refPkId=${refPkId}&fieldName=${encodeURIComponent(fieldName)}`;
    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (!json.data) return;
        setVersions(json.data);
        // 현재 내용이 있으면 현재 + 최신 저장본, 없으면 최신 2개
        if (currentContent !== undefined && json.data.length >= 1) {
          setSelected([json.data[0].versionId, CURRENT_VERSION_ID]);
        } else if (json.data.length >= 2) {
          setSelected([json.data[1].versionId, json.data[0].versionId]);
        }
      })
      .catch(() => {});
  }, [refTableName, refPkId, fieldName, currentContent]);

  // content 조회 (선택된 버전이 캐시 없으면)
  useEffect(() => {
    selected.forEach((vId) => {
      if (contents[vId] !== undefined) return;
      // 현재 내용은 API 호출 없이 prop에서 직접 사용
      if (vId === CURRENT_VERSION_ID) {
        setContents((prev) => ({ ...prev, [vId]: currentContent ?? "" }));
        return;
      }
      const url = `/api/content-versions?refTableName=${encodeURIComponent(refTableName)}&refPkId=${refPkId}&fieldName=${encodeURIComponent(fieldName)}&versionId=${vId}`;
      fetch(url)
        .then((r) => r.json())
        .then((json) => {
          if (json.data?.content !== undefined) {
            setContents((prev) => ({ ...prev, [vId]: json.data.content }));
          }
        })
        .catch(() => {});
    });
  }, [selected, contents, refTableName, refPkId, fieldName, currentContent]);

  const toggleSelect = (vId: number) => {
    setSelected((prev) => {
      if (prev.includes(vId)) return prev.filter((id) => id !== vId);
      if (prev.length < 2) return [...prev, vId];
      return [prev[1], vId]; // 3번째 선택 시 첫 번째 해제
    });
  };

  const total = versions.length;

  // diff 대상: versionId 작은 것이 이전(left), 큰 것이 이후(right)
  // CURRENT_VERSION_ID(-1)는 항상 이후(right)로 고정
  const sorted = [...selected].sort((a, b) => {
    if (a === CURRENT_VERSION_ID) return 1;
    if (b === CURRENT_VERSION_ID) return -1;
    return a - b;
  });
  const [oldId, newId] = sorted;
  const oldContent = oldId !== undefined ? (contents[oldId] ?? null) : null;
  const newContent = newId !== undefined ? (contents[newId] ?? null) : null;

  const getVerLabel = (vId: number): string => {
    if (vId === CURRENT_VERSION_ID) return "현재";
    const idx = versions.findIndex((v) => v.versionId === vId);
    return idx >= 0 ? `v${total - idx}` : "?";
  };
  const oldVerLabel = oldId !== undefined ? getVerLabel(oldId) : null;
  const newVerLabel = newId !== undefined ? getVerLabel(newId) : null;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[95vw] w-[1800px] h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 py-3 border-b border-border shrink-0">
          <DialogTitle className="text-sm font-semibold">버전 이력 비교</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* 왼쪽: 버전 목록 */}
          <div className="w-[280px] shrink-0 border-r border-border flex flex-col">
            <p className="text-xs text-muted-foreground px-3 py-2 border-b border-border">
              2개를 선택하면 비교가 표시됩니다
            </p>
            <div className="overflow-y-auto flex-1">
              {/* 현재 내용 항목 */}
              {currentContent !== undefined && (
                <label
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 border-b border-border/50 ${selected.includes(CURRENT_VERSION_ID) ? "bg-muted" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(CURRENT_VERSION_ID)}
                    onChange={() => toggleSelect(CURRENT_VERSION_ID)}
                    className="h-3.5 w-3.5 shrink-0"
                  />
                  <span className="text-xs font-mono text-muted-foreground w-9 shrink-0">현재</span>
                  <span className="text-xs text-muted-foreground flex-1 min-w-0 truncate">편집 중인 내용</span>
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 shrink-0">
                    현재
                  </Badge>
                </label>
              )}
              {versions.map((v, idx) => {
                const num = total - idx;
                const isSelected = selected.includes(v.versionId);
                const isAi = v.changedBy === "ai";

                return (
                  <label
                    key={v.versionId}
                    className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 border-b border-border/50 ${isSelected ? "bg-muted" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(v.versionId)}
                      className="h-3.5 w-3.5 shrink-0"
                    />
                    <span className="text-xs font-mono text-muted-foreground w-9 shrink-0">v{num}</span>
                    <span className="text-xs text-muted-foreground flex-1 min-w-0 truncate">{formatDate(v.createdAt)}</span>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-1 py-0 shrink-0 ${isAi ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" : ""}`}
                    >
                      {isAi ? "AI" : "사용자"}
                    </Badge>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 오른쪽: Diff 뷰어 */}
          <div className="flex-1 overflow-auto">
            {selected.length < 2 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                왼쪽 목록에서 버전 2개를 선택하세요
              </div>
            ) : oldContent === null || newContent === null ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                로딩 중...
              </div>
            ) : (
              <ReactDiffViewer
                oldValue={oldContent}
                newValue={newContent}
                splitView
                extraLinesSurroundingDiff={9999}
                leftTitle={`${oldVerLabel} (이전)`}
                rightTitle={`${newVerLabel} (이후)`}
                useDarkTheme={false}
                styles={{
                  variables: {
                    light: {
                      diffViewerBackground: "transparent",
                      gutterBackground: "hsl(var(--muted))",
                      addedBackground: "#e6ffed",
                      removedBackground: "#ffeef0",
                    },
                  },
                  contentText: { fontSize: "12px", fontFamily: "monospace" },
                  gutter: { minWidth: "40px" },
                }}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
