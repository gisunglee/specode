/**
 * LayoutEditor — 화면 레이아웃을 블록 단위로 편집하는 컴포넌트
 *
 * 📌 역할:
 *   - 행(Row) 추가/삭제
 *   - 행 내 열(Column) 추가/삭제
 *   - 열 너비(widthRatio: 1~100, 퍼센트), 라벨, 기능 매핑 편집
 *   - 편집 결과를 JSON으로 변환하여 부모에 전달
 *
 * 📌 데이터 구조 (DB에 JSON 문자열로 저장):
 *   [
 *     { id: "uuid", columns: [{ id: "uuid", widthRatio: 70, label: "검색조건", functionId: 1 }, ...] },
 *     { id: "uuid", columns: [{ id: "uuid", widthRatio: 100, label: "목록" }] },
 *   ]
 *
 * 📌 사용처:
 *   - ScreenDetailPage (화면 상세 → 오른쪽 영역)
 */
"use client";

import { useState } from "react";
import { Plus, X, Columns2, FileText, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* ─── 타입 정의 ──────────────────────────────────────────── */

/** 레이아웃 열 (하나의 영역) */
export interface LayoutColumn {
  id: string;
  /** 너비 비율 (%, 1~100) */
  widthRatio: number;
  /** 영역 이름 (예: "검색조건", "목록") */
  label: string;
  /** 매핑된 기능 ID (선택) */
  functionId?: number;
}

/** 레이아웃 행 (열들의 묶음) */
export interface LayoutRow {
  id: string;
  columns: LayoutColumn[];
}

/** 기능 매핑용 간소화된 기능 정보 */
interface FunctionOption {
  functionId: number;
  systemId: string;
  name: string;
}

interface LayoutEditorProps {
  /** 현재 레이아웃 데이터 */
  value: LayoutRow[];
  /** 레이아웃 변경 콜백 */
  onChange: (rows: LayoutRow[]) => void;
  /** 하위 기능 목록 (Select 옵션으로 사용) */
  functions: FunctionOption[];
}

/* ─── 유틸 ────────────────────────────────────────────────── */

/** 고유 ID 생성 */
const uid = () => crypto.randomUUID();

/** 빈 열 생성 */
const emptyColumn = (): LayoutColumn => ({
  id: uid(),
  widthRatio: 100,
  label: "",
});

/** 빈 행 생성 */
const emptyRow = (): LayoutRow => ({
  id: uid(),
  columns: [emptyColumn()],
});

/** 입력 텍스트에서 숫자 추출 ("50%" → 50, "50" → 50), 유효하지 않으면 null */
const parseWidth = (text: string): number | null => {
  const num = parseInt(text);
  if (isNaN(num) || num < 1 || num > 100) return null;
  return num;
};

/* ─── 컴포넌트 ────────────────────────────────────────────── */

export function LayoutEditor({ value, onChange, functions }: LayoutEditorProps) {
  /* ── 텍스트 내보내기 상태 ──────────────────────────────── */
  const [textOpen, setTextOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"text" | "json">("text");
  const [copied, setCopied] = useState(false);

  /**
   * 레이아웃 → 마크다운 테이블 변환
   * AI가 이해하기 쉬운 형식 (사람도 읽기 좋음)
   */
  const formatAsMarkdown = (): string => {
    if (value.length === 0) return "레이아웃이 없습니다.";
    const lines: string[] = [];
    value.forEach((row, i) => {
      lines.push(`### 행 ${i + 1}`);
      lines.push("| 영역 | 너비 | 기능 |");
      lines.push("|------|------|------|");
      row.columns.forEach((col) => {
        const func = col.functionId
          ? functions.find((f) => f.functionId === col.functionId)
          : null;
        lines.push(
          `| ${col.label || "-"} | ${col.widthRatio}% | ${func ? `${func.systemId} ${func.name}` : "-"} |`
        );
      });
      lines.push("");
    });
    return lines.join("\n");
  };

  /**
   * 레이아웃 → 정리된 JSON 변환
   * 내부 id 제외, 기능 systemId 포함
   */
  const formatAsJson = (): string => {
    return JSON.stringify(
      value.map((row) => ({
        columns: row.columns.map((col) => {
          const func = col.functionId
            ? functions.find((f) => f.functionId === col.functionId)
            : null;
          return {
            label: col.label || "",
            width: `${col.widthRatio}%`,
            ...(func ? { function: `${func.systemId} ${func.name}` } : {}),
          };
        }),
      })),
      null,
      2
    );
  };

  /** 현재 보기 모드의 텍스트를 클립보드에 복사 */
  const handleCopy = async () => {
    const text = viewMode === "json" ? formatAsJson() : formatAsMarkdown();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  /* ── 행 조작 ─────────────────────────────────────────── */
  const addRow = () => onChange([...value, emptyRow()]);

  const removeRow = (rowId: string) =>
    onChange(value.filter((r) => r.id !== rowId));

  /* ── 열 조작 ─────────────────────────────────────────── */
  const addColumn = (rowId: string) =>
    onChange(
      value.map((r) =>
        r.id === rowId
          ? { ...r, columns: [...r.columns, emptyColumn()] }
          : r
      )
    );

  const removeColumn = (rowId: string, colId: string) =>
    onChange(
      value.map((r) =>
        r.id === rowId
          ? { ...r, columns: r.columns.filter((c) => c.id !== colId) }
          : r
      )
    );

  /** 열 속성 업데이트 (widthRatio, label, functionId) */
  const updateColumn = (
    rowId: string,
    colId: string,
    patch: Partial<LayoutColumn>
  ) =>
    onChange(
      value.map((r) =>
        r.id === rowId
          ? {
              ...r,
              columns: r.columns.map((c) =>
                c.id === colId ? { ...c, ...patch } : c
              ),
            }
          : r
      )
    );

  /* ── 렌더링 ──────────────────────────────────────────── */
  return (
    <div className="space-y-3">
      {/* ── 라벨 + 텍스트 보기 버튼 ─────────────────────── */}
      <div className="flex items-center justify-between">
        <Label className="text-xs">레이아웃 구성</Label>
        {value.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => { setTextOpen(true); setCopied(false); }}
            title="텍스트로 보기 / 복사"
          >
            <FileText className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* ── 행 목록 ────────────────────────────────────── */}
      {value.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center border border-dashed border-border rounded-md">
          레이아웃이 없습니다. 아래 버튼으로 행을 추가하세요.
        </p>
      ) : (
        <div className="space-y-3">
          {value.map((row, rowIdx) => (
            <div
              key={row.id}
              className="rounded-md border border-border bg-muted/10 p-3 space-y-2"
            >
              {/* 행 헤더: 행 번호 + 열 추가 + 행 삭제 */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">
                  행 {rowIdx + 1}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => addColumn(row.id)}
                    title="열 추가"
                  >
                    <Columns2 className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removeRow(row.id)}
                    title="행 삭제"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* 열 목록 — widthRatio 비율로 시각화 */}
              <div className="flex gap-2">
                {row.columns.map((col) => (
                  <div
                    key={col.id}
                    className="flex-1 rounded border border-border bg-card p-2 space-y-1.5"
                    style={{
                      flex: `${col.widthRatio} 0 0`,
                    }}
                  >
                    {/*
                     * 열 너비 — datalist 콤보박스
                     * 프리셋(25%~100%) 선택 또는 직접 입력 가능
                     * key에 widthRatio를 포함 → 값 확정 시 리마운트하여 표시 갱신
                     */}
                    <input
                      key={`w-${col.id}-${col.widthRatio}`}
                      list="width-presets"
                      defaultValue={`${col.widthRatio}%`}
                      onFocus={(e) => {
                        /* 포커스 시 입력값 비움 → datalist 전체 옵션 표시 */
                        e.target.value = "";
                      }}
                      onBlur={(e) => {
                        /* 포커스 해제 시에만 저장 (타이핑 중 리마운트 방지) */
                        if (e.target.value.trim() === "") {
                          e.target.value = `${col.widthRatio}%`;
                          return;
                        }
                        const w = parseWidth(e.target.value);
                        if (w) updateColumn(row.id, col.id, { widthRatio: w });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      }}
                      placeholder={`${col.widthRatio}%`}
                      className="h-7 text-[11px] w-full rounded-md border border-input bg-transparent px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                    />

                    {/* 영역 라벨 입력 */}
                    <Input
                      value={col.label}
                      onChange={(e) =>
                        updateColumn(row.id, col.id, {
                          label: e.target.value,
                        })
                      }
                      placeholder="영역명"
                      className="h-7 text-[11px]"
                    />

                    {/* 기능 매핑 선택 */}
                    <Select
                      value={col.functionId ? String(col.functionId) : "NONE"}
                      onValueChange={(v) =>
                        updateColumn(row.id, col.id, {
                          functionId: v === "NONE" ? undefined : parseInt(v),
                        })
                      }
                    >
                      <SelectTrigger className="h-7 text-[11px]">
                        <SelectValue placeholder="기능 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">미지정</SelectItem>
                        {functions.map((fn) => (
                          <SelectItem
                            key={fn.functionId}
                            value={String(fn.functionId)}
                          >
                            {fn.systemId} {fn.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* 열 삭제 (열이 2개 이상일 때만) */}
                    {row.columns.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeColumn(row.id, col.id)}
                        className="text-[10px] text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                      >
                        열 삭제
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 행 추가 버튼 ─────────────────────────────────── */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addRow}
        className="w-full"
      >
        <Plus className="h-3 w-3 mr-1" />
        행 추가
      </Button>

      {/* 너비 프리셋 datalist (모든 열 입력이 공유) */}
      <datalist id="width-presets">
        <option value="100%" />
        <option value="75%" />
        <option value="66%" />
        <option value="50%" />
        <option value="33%" />
        <option value="25%" />
      </datalist>

      {/* ═══════════════════════════════════════════════════ */}
      {/* 텍스트 보기 다이얼로그                               */}
      {/* 마크다운 테이블(AI 친화) / JSON 두 가지 형식 전환     */}
      {/* ═══════════════════════════════════════════════════ */}
      <Dialog open={textOpen} onOpenChange={setTextOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>레이아웃 텍스트</DialogTitle>
          </DialogHeader>

          {/* 형식 전환 + 복사 버튼 */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              <Button
                variant={viewMode === "text" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("text")}
              >
                텍스트
              </Button>
              <Button
                variant={viewMode === "json" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("json")}
              >
                JSON
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? (
                <Check className="h-3 w-3 mr-1" />
              ) : (
                <Copy className="h-3 w-3 mr-1" />
              )}
              {copied ? "복사됨" : "복사"}
            </Button>
          </div>

          {/* 텍스트 내용 */}
          <pre className="rounded-md bg-muted p-4 text-xs whitespace-pre-wrap overflow-auto max-h-80">
            {viewMode === "json" ? formatAsJson() : formatAsMarkdown()}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
