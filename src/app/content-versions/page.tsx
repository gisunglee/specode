"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { History, Trash2 } from "lucide-react";
import { DataGrid } from "@/components/common/DataGrid";
import { MarkdownEditor } from "@/components/common/MarkdownEditor";
import { Button } from "@/components/ui/button";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { apiFetch, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";

interface VersionRow {
  versionId:    number;
  refTableName: string;
  refPkId:      number;
  fieldName:    string;
  changedBy:    string;
  aiTaskId:     number | null;
  createdAt:    string;
}

interface VersionDetail extends VersionRow {
  content: string;
}

const TABLE_LABELS: Record<string, string> = {
  tb_function:       "기능",
  tb_area:           "영역",
  tb_standard_guide: "표준가이드",
  tb_db_schema:      "DB 스키마",
  tb_planning_draft: "기획 보드",
};

const FIELD_LABELS: Record<string, string> = {
  spec:               "설계명세",
  ai_design_content:  "AI 설계",
  ref_content:        "참고내용",
  content:            "내용",
  ddl_script:         "DDL",
  result_content:     "AI 결과",
};

const CHANGED_BY_LABEL: Record<string, { label: string; class: string }> = {
  user: { label: "사용자", class: "text-blue-600" },
  ai:   { label: "AI",    class: "text-emerald-600" },
};

const ALL_TABLES = Object.keys(TABLE_LABELS);
const ALL_FIELDS = Object.keys(FIELD_LABELS);

export default function ContentVersionsPage() {
  const queryClient = useQueryClient();
  const [page,           setPage]           = useState(1);
  const [tableFilter,    setTableFilter]    = useState("");
  const [fieldFilter,    setFieldFilter]    = useState("");
  const [changedByFilter,setChangedByFilter]= useState("");
  const [selectedId,     setSelectedId]     = useState<number | null>(null);
  const [deleteTarget,   setDeleteTarget]   = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["content-versions", page, tableFilter, fieldFilter, changedByFilter],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (tableFilter)     p.set("refTableName", tableFilter);
      if (fieldFilter)     p.set("fieldName",    fieldFilter);
      if (changedByFilter) p.set("changedBy",    changedByFilter);
      const res = await fetch(`/api/content-versions?${p}`);
      return res.json();
    },
  });

  const { data: detailData, isLoading: detailLoading } = useQuery<{ data: VersionDetail }>({
    queryKey: ["content-version-detail", selectedId],
    queryFn: async () => {
      const res = await fetch(`/api/content-versions/${selectedId}`);
      return res.json();
    },
    enabled: !!selectedId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/content-versions/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("삭제되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["content-versions"] });
      setSelectedId(null);
      setDeleteTarget(null);
    },
    onError: () => toast.error("삭제에 실패했습니다."),
  });

  const detail = detailData?.data;

  const columns: ColumnDef<VersionRow, unknown>[] = [
    {
      accessorKey: "versionId",
      header: "ID",
      size: 70,
      cell: ({ getValue }) => (
        <span className="font-mono text-sm text-muted-foreground">#{getValue() as number}</span>
      ),
    },
    {
      accessorKey: "refTableName",
      header: "테이블",
      size: 120,
      cell: ({ getValue }) => {
        const v = getValue() as string;
        return <span className="text-sm">{TABLE_LABELS[v] ?? v}</span>;
      },
    },
    {
      accessorKey: "refPkId",
      header: "PK",
      size: 60,
      cell: ({ getValue }) => (
        <span className="font-mono text-sm text-muted-foreground">{getValue() as number}</span>
      ),
    },
    {
      accessorKey: "fieldName",
      header: "필드",
      size: 110,
      cell: ({ getValue }) => {
        const v = getValue() as string;
        return <span className="text-sm text-muted-foreground">{FIELD_LABELS[v] ?? v}</span>;
      },
    },
    {
      accessorKey: "changedBy",
      header: "변경자",
      size: 70,
      cell: ({ getValue }) => {
        const v = getValue() as string;
        const cfg = CHANGED_BY_LABEL[v];
        return <span className={`text-sm font-medium ${cfg?.class ?? ""}`}>{cfg?.label ?? v}</span>;
      },
    },
    {
      accessorKey: "aiTaskId",
      header: "AI Task",
      size: 80,
      cell: ({ getValue }) => {
        const v = getValue() as number | null;
        return v ? (
          <span className="font-mono text-sm text-muted-foreground">#{v}</span>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "저장일시",
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground">
          {formatDateTime(getValue() as string)}
        </span>
      ),
      size: 140,
    },
    {
      id: "actions",
      header: "",
      size: 50,
      enableSorting: false,
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation();
            setDeleteTarget(row.original.versionId);
          }}
          disabled={deleteMutation.isPending}
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
        </Button>
      ),
    },
  ];

  const resetFilters = () => {
    setTableFilter("");
    setFieldFilter("");
    setChangedByFilter("");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <History className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold">변경 이력</h1>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={tableFilter || "__all__"}
          onValueChange={(v) => { setTableFilter(v === "__all__" ? "" : v); setPage(1); }}
        >
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue placeholder="테이블 전체" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">테이블 전체</SelectItem>
            {ALL_TABLES.map((t) => (
              <SelectItem key={t} value={t}>{TABLE_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={fieldFilter || "__all__"}
          onValueChange={(v) => { setFieldFilter(v === "__all__" ? "" : v); setPage(1); }}
        >
          <SelectTrigger className="h-8 w-36 text-sm">
            <SelectValue placeholder="필드 전체" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">필드 전체</SelectItem>
            {ALL_FIELDS.map((f) => (
              <SelectItem key={f} value={f}>{FIELD_LABELS[f]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={changedByFilter || "__all__"}
          onValueChange={(v) => { setChangedByFilter(v === "__all__" ? "" : v); setPage(1); }}
        >
          <SelectTrigger className="h-8 w-28 text-sm">
            <SelectValue placeholder="변경자 전체" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">변경자 전체</SelectItem>
            <SelectItem value="user">사용자</SelectItem>
            <SelectItem value="ai">AI</SelectItem>
          </SelectContent>
        </Select>

        {(tableFilter || fieldFilter || changedByFilter) && (
          <Button variant="ghost" size="sm" className="h-8 text-sm" onClick={resetFilters}>
            필터 초기화
          </Button>
        )}

        <span className="ml-auto text-sm text-muted-foreground">
          총 {data?.pagination?.total ?? 0}건
        </span>
      </div>

      <DataGrid
        columns={columns}
        data={data?.data ?? []}
        pagination={data?.pagination}
        onPageChange={setPage}
        onRowClick={(row) => setSelectedId(row.versionId)}
        emptyMessage={isLoading ? "로딩 중..." : "변경 이력이 없습니다."}
      />

      {/* 상세 내용 팝업 */}
      <Dialog open={!!selectedId} onOpenChange={() => setSelectedId(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-border flex-shrink-0">
            <DialogTitle className="text-sm flex items-center gap-3">
              <span>변경 이력 상세</span>
              {detail && (
                <span className="font-normal text-muted-foreground text-sm">
                  {TABLE_LABELS[detail.refTableName] ?? detail.refTableName}
                  {" · "}#{detail.refPkId}
                  {" · "}{FIELD_LABELS[detail.fieldName] ?? detail.fieldName}
                  {" · "}{formatDateTime(detail.createdAt)}
                  {" · "}
                  <span className={CHANGED_BY_LABEL[detail.changedBy]?.class ?? ""}>
                    {CHANGED_BY_LABEL[detail.changedBy]?.label ?? detail.changedBy}
                  </span>
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6">
            {detailLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">로딩 중...</div>
            ) : detail ? (
              <MarkdownEditor value={detail.content} readOnly rows={22} />
            ) : null}
          </div>

          <DialogFooter className="px-6 py-3 border-t border-border bg-muted/30 flex justify-between sm:justify-between w-full">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => detail && setDeleteTarget(detail.versionId)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              삭제
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSelectedId(null)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 */}
      {deleteTarget !== null && (
        <Dialog open onOpenChange={() => setDeleteTarget(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>이력 삭제</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground py-2">
              이 변경 이력을 삭제하시겠습니까? 복구할 수 없습니다.
            </p>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>취소</Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteMutation.mutate(deleteTarget)}
                disabled={deleteMutation.isPending}
              >
                삭제
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
