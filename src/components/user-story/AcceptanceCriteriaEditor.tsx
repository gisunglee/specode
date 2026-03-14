/**
 * AcceptanceCriteriaEditor — 인수 조건(AC) 그리드 에디터
 *
 * 📌 역할:
 *   - 사용자 스토리의 인수 조건(Acceptance Criteria)을 행 단위로 등록/수정/삭제
 *   - 데이터는 [{text: string}][] JSON 배열로 직렬화하여 부모에 전달
 *
 * 📌 주의:
 *   - onChange는 RelationsEditor 패턴과 동일하게 setTimeout 내부에서 호출
 *     (React render cycle 외부에서 setState → onChange 순서 보장)
 *
 * 📌 사용처:
 *   - /user-stories/page.tsx 등록/수정 다이얼로그
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/** 인수 조건 단일 항목 */
export interface AcItem {
  text: string;
}

interface AcceptanceCriteriaEditorProps {
  /** JSON string of AcItem[] or null */
  value: string | null;
  /** 직렬화된 JSON string으로 상위에 전달 */
  onChange: (v: string) => void;
  readOnly?: boolean;
}

/** JSON string → AcItem[] 파싱 (오류 시 빈 배열) */
function parseItems(value: string | null): AcItem[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

export function AcceptanceCriteriaEditor({
  value,
  onChange,
  readOnly = false,
}: AcceptanceCriteriaEditorProps) {
  const [rows, setRows] = useState<AcItem[]>(() => parseItems(value));

  // 외부 value 변경 시 동기화 (다이얼로그 재오픈 등)
  useEffect(() => {
    setRows(parseItems(value));
  }, [value]);

  /** 행 업데이트 후 onChange 전달 */
  const updateRows = useCallback(
    (next: AcItem[]) => {
      setRows(next);
      // React render cycle 외부에서 호출해야 setState 중첩 문제 없음
      setTimeout(() => onChange(JSON.stringify(next)), 0);
    },
    [onChange]
  );

  const handleAdd = () => {
    updateRows([...rows, { text: "" }]);
  };

  const handleChange = (idx: number, text: string) => {
    const next = rows.map((r, i) => (i === idx ? { text } : r));
    updateRows(next);
  };

  const handleRemove = (idx: number) => {
    const next = rows.filter((_, i) => i !== idx);
    updateRows(next);
  };

  return (
    <div className="space-y-2">
      {/* 인수 조건 행 목록 */}
      {rows.length === 0 && (
        <p className="text-xs text-muted-foreground py-1">
          {readOnly ? "등록된 인수 조건이 없습니다." : "아래 버튼으로 조건을 추가하세요."}
        </p>
      )}

      <div className="space-y-1.5">
        {rows.map((row, idx) => (
          <div key={idx} className="flex items-center gap-2">
            {/* 순번 */}
            <span className="text-xs text-muted-foreground w-5 shrink-0 text-right">
              {idx + 1}.
            </span>

            {/* 조건 텍스트 입력 */}
            <Input
              value={row.text}
              onChange={(e) => handleChange(idx, e.target.value)}
              placeholder="인수 조건을 입력하세요"
              className="flex-1 h-8 text-sm"
              readOnly={readOnly}
            />

            {/* 삭제 버튼 */}
            {!readOnly && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => handleRemove(idx)}
                title="이 조건 삭제"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* 조건 추가 버튼 */}
      {!readOnly && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={handleAdd}
        >
          <Plus className="h-3 w-3" />
          조건 추가
        </Button>
      )}
    </div>
  );
}
