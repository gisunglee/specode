/**
 * RelationsEditor — DB 스키마 관계(Relationship) 그리드 에디터
 *
 * ⚠️  모든 onChange(notify) 호출은 반드시 이벤트 핸들러 / setTimeout에서만.
 *     setState 함수형 업데이터 내부에서 호출하면 렌더 중 setState 오류 발생.
 */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Trash2, Sparkles, ChevronDown, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { parseDdlColumns, parseDdlRelations } from "@/lib/ddlParser";

/* ── 타입 ──────────────────────────────────────────────────── */
export interface RelationItem {
  from_col: string;
  to_tbl: string;
  to_col: string;
  cardinality: "1:1" | "1:N" | "N:M";
  identifying: boolean;
}

interface Props {
  ddlScript: string;
  value: string | null;
  onChange: (json: string) => void;
}

/* ── 자동완성 드롭다운 ─────────────────────────────────────── */
interface AutocompleteProps {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  onSelect?: (v: string) => void;
  onFocus?: () => void;
}

function Autocomplete({ value, onChange, options, placeholder, className, onSelect, onFocus }: AutocompleteProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const filtered = options.filter((o) => o.toLowerCase().includes(value.toLowerCase())).slice(0, 20);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <Input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => { setOpen(true); onFocus?.(); }}
        placeholder={placeholder}
        className="h-8 text-sm pr-6"
      />
      {options.length > 0 && (
        <button type="button" className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground cursor-pointer" onClick={() => setOpen((o) => !o)} tabIndex={-1}>
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      )}
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 top-full mt-0.5 left-0 right-0 max-h-48 overflow-y-auto rounded-md border border-border bg-popover shadow-md">
          {filtered.map((opt) => (
            <li key={opt} className="px-3 py-2 text-sm cursor-pointer hover:bg-muted" onMouseDown={(e) => { e.preventDefault(); onChange(opt); onSelect?.(opt); setOpen(false); }}>
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── 빈 행 팩토리 ───────────────────────────────────────────── */
const newRow = (): RelationItem => ({ from_col: "", to_tbl: "", to_col: "", cardinality: "1:N", identifying: false });

/* ── 메인 컴포넌트 ──────────────────────────────────────────── */
export function RelationsEditor({ ddlScript, value, onChange }: Props) {
  const [rows, setRows] = useState<RelationItem[]>([]);
  const [allTables, setAllTables] = useState<string[]>([]);
  const [colCache, setColCache] = useState<Record<string, string[]>>({});

  const srcCols = parseDdlColumns(ddlScript);

  /* value → rows 초기화 */
  useEffect(() => {
    try {
      const parsed = value ? JSON.parse(value) : [];
      setRows(Array.isArray(parsed) ? parsed : []);
    } catch { setRows([]); }
  }, [value]);

  /* 전체 테이블 목록 */
  useEffect(() => {
    fetch("/api/db-schema")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setAllTables((json.data as { tableName: string }[]).map((r) => r.tableName));
      })
      .catch(() => {});
  }, []);

  /* 대상 컬럼 캐시 */
  const fetchTargetCols = useCallback((tbl: string) => {
    if (!tbl || colCache[tbl] !== undefined) return;
    fetch(`/api/db-schema/columns?tableName=${encodeURIComponent(tbl)}`)
      .then((r) => r.json())
      .then((json) => setColCache((prev) => ({ ...prev, [tbl]: json.data?.columns ?? [] })))
      .catch(() => setColCache((prev) => ({ ...prev, [tbl]: [] })));
  }, [colCache]);

  /* ── 행 조작 — onChange는 항상 setTimeout으로 렌더 사이클 밖에서 ── */
  const updateRow = useCallback((idx: number, patch: Partial<RelationItem>) => {
    setRows((prev) => {
      const next = prev.map((r, i) => i === idx ? { ...r, ...patch } : r);
      setTimeout(() => onChange(JSON.stringify(next)), 0);
      return next;
    });
  }, [onChange]);

  const addRow = useCallback(() => {
    setRows((prev) => {
      const next = [...prev, newRow()];
      setTimeout(() => onChange(JSON.stringify(next)), 0);
      return next;
    });
  }, [onChange]);

  const removeRow = useCallback((idx: number) => {
    setRows((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      setTimeout(() => onChange(JSON.stringify(next)), 0);
      return next;
    });
  }, [onChange]);

  /* AI 추천 */
  const handleAiSuggest = useCallback(() => {
    const suggested = parseDdlRelations(ddlScript).map((s) => ({
      ...s,
      cardinality: "1:N" as const,
      identifying: false,
    }));
    if (suggested.length === 0) {
      alert("DDL에서 관계를 찾을 수 없습니다.\n\nAI 추천은 다음 패턴을 인식합니다:\n• REFERENCES tb_xxx(col)\n• -- FK: tb_xxx.col\n• -- ref: col → tb_xxx.col");
      return;
    }
    setRows((prev) => {
      const existing = new Set(prev.map((r) => `${r.from_col}|${r.to_tbl}|${r.to_col}`));
      const next = [...prev, ...suggested.filter((s) => !existing.has(`${s.from_col}|${s.to_tbl}|${s.to_col}`))];
      setTimeout(() => onChange(JSON.stringify(next)), 0);
      return next;
    });
  }, [ddlScript, onChange]);

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">관계 (Relations)</h3>
          <p className="text-sm text-muted-foreground">
            현재 테이블이 <strong>FK를 보유한 쪽(자식)</strong>인 관계만 등록하세요.<br />
            <span className="text-xs">예: tb_order.user_id → tb_user.user_id</span>
          </p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <Button type="button" variant="outline" size="sm" className="h-8 px-3 text-sm gap-1.5" onClick={handleAiSuggest}
            title="DDL에서 FK 패턴을 파싱하여 관계를 자동 추가합니다">
            <Sparkles className="h-3.5 w-3.5 text-blue-500" />
            DDL 파싱하여 생성
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-8 px-3 text-sm gap-1.5" onClick={addRow}>
            <Plus className="h-3.5 w-3.5" />
            추가
          </Button>
        </div>
      </div>

      {/* 도움말 — DDL 파싱 패턴 안내 */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2.5 space-y-0">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <div className="space-y-1.5">
          <p className="font-semibold text-foreground/70">DDL 파싱하여 생성 — 인식 패턴</p>
          <p>DDL에 아래 패턴이 있으면 자동으로 관계 행을 생성합니다. 현재 테이블(Source) → 대상 테이블(Target) 방향입니다.</p>
          <ul className="space-y-1 pl-1">
            <li>
              <code className="font-mono bg-muted px-1 rounded">user_id INTEGER REFERENCES tb_user(user_id)</code>
              <span className="ml-1 text-muted-foreground/60">— SQL FK 구문 (REFERENCES)</span>
            </li>
            <li>
              <code className="font-mono bg-muted px-1 rounded">user_id INTEGER, -- FK: tb_user.user_id</code>
              <span className="ml-1 text-muted-foreground/60">— 주석 힌트: 해당 줄의 컬럼이 Source</span>
            </li>
            <li>
              <code className="font-mono bg-muted px-1 rounded">-- ref: user_id → tb_user.user_id</code>
              <span className="ml-1 text-muted-foreground/60">— 주석 힌트: 화살표 기준 Source → Target</span>
            </li>
          </ul>
        </div>
      </div>

      {/* 그리드 */}
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground/60 py-6 text-center border border-dashed border-border rounded-md">
          관계가 없습니다. &apos;추가&apos; 또는 &apos;AI 추천&apos;으로 생성하세요.
        </p>
      ) : (
        <div className="rounded-md border border-border overflow-x-auto">
          {/* 헤더 */}
          <div className="min-w-[680px] grid grid-cols-[1fr_1fr_1fr_90px_72px_32px] bg-muted text-xs font-semibold text-muted-foreground px-3 py-2 gap-2">
            <span>Source Column</span>
            <span>Target Table</span>
            <span>Target Column</span>
            <span>Cardinality</span>
            <span>식별관계</span>
            <span />
          </div>

          {/* 데이터 행 */}
          <div className="min-w-[680px] divide-y divide-border">
            {rows.map((row, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_90px_72px_32px] gap-2 items-center px-3 py-2 bg-card hover:bg-muted/20">
                <Autocomplete value={row.from_col} onChange={(v) => updateRow(idx, { from_col: v })} options={srcCols} placeholder="컬럼 선택" />
                <Autocomplete value={row.to_tbl} onChange={(v) => updateRow(idx, { to_tbl: v, to_col: "" })} onSelect={(v) => fetchTargetCols(v)} options={allTables} placeholder="tb_xxx" />
                <Autocomplete value={row.to_col} onChange={(v) => updateRow(idx, { to_col: v })} onFocus={() => fetchTargetCols(row.to_tbl)} options={colCache[row.to_tbl] ?? []} placeholder="컬럼 (직접입력 가능)" />

                <select value={row.cardinality} onChange={(e) => updateRow(idx, { cardinality: e.target.value as RelationItem["cardinality"] })}
                  className="h-8 text-sm rounded-md border border-input bg-background px-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring w-full">
                  <option value="1:1">1 : 1</option>
                  <option value="1:N">1 : N</option>
                  <option value="N:M">N : M</option>
                </select>

                <label className="flex items-center justify-center gap-1.5 cursor-pointer select-none text-sm text-muted-foreground">
                  <input type="checkbox" checked={row.identifying}
                    onChange={(e) => updateRow(idx, { identifying: e.target.checked })}
                    className="h-4 w-4 cursor-pointer" />
                  식별
                </label>

                <button type="button" onClick={() => removeRow(idx)}
                  className="h-7 w-7 flex items-center justify-center rounded hover:bg-red-100 hover:text-red-600 text-muted-foreground/40 transition-colors cursor-pointer"
                  title="이 관계 삭제">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* JSON 미리보기 */}
      {rows.length > 0 && (
        <details className="text-xs text-muted-foreground/60">
          <summary className="cursor-pointer select-none">JSON 미리보기</summary>
          <pre className="mt-1.5 p-2.5 rounded bg-muted/40 overflow-x-auto font-mono text-xs">
            {JSON.stringify(rows, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
