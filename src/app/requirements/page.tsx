"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Plus, Search, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { DataGrid } from "@/components/common/DataGrid";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { RichTextEditor } from "@/components/common/RichTextEditor";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { PRIORITIES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { ColumnDef } from "@tanstack/react-table";

interface RequirementRow {
  requirementId: number;
  systemId: string;
  name: string;
  content: string | null;      // 요구사항 내용 (원문)
  description: string | null;  // 요구사항 분석 내용
  priority: string | null;
  screenCount: number;
  functionCount: number;
  updatedAt: string;
}

export default function RequirementsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<RequirementRow | null>(null);
  const [deleteItem, setDeleteItem] = useState<RequirementRow | null>(null);

  /* ── 리치텍스트 에디터 상태 (react-hook-form 외부 관리) ── */
  const [contentHtml, setContentHtml] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState("");

  /* ── 에디터 리마운트용 key: 다이얼로그 열릴 때마다 새 인스턴스 */
  const [editorKey, setEditorKey] = useState(0);

  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: { name: "", priority: "MEDIUM" },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["requirements", page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/requirements?${params}`);
      return res.json();
    },
  });

  /* ── 수정 시: 소속 화면 목록 조회 ────────────────────────── */
  const { data: reqDetail } = useQuery({
    queryKey: ["requirement-detail", editItem?.requirementId],
    queryFn: async () => {
      const res = await fetch(`/api/requirements/${editItem!.requirementId}`);
      return res.json();
    },
    enabled: !!editItem,
  });

  const createMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch("/api/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requirements"] });
      setDialogOpen(false);
      reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...body }: { id: number } & Record<string, unknown>) => {
      const res = await fetch(`/api/requirements/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requirements"] });
      setDialogOpen(false);
      setEditItem(null);
      reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/requirements/${id}`, { method: "DELETE" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requirements"] });
      setDeleteItem(null);
    },
  });

  const openCreate = () => {
    setEditItem(null);
    reset({ name: "", priority: "MEDIUM" });
    setContentHtml("");
    setDescriptionHtml("");
    setEditorKey((k) => k + 1); // 에디터 리마운트
    setDialogOpen(true);
  };

  const openEdit = (row: RequirementRow) => {
    setEditItem(row);
    reset({ name: row.name, priority: row.priority || "MEDIUM" });
    setContentHtml(row.content || "");
    setDescriptionHtml(row.description || "");
    setEditorKey((k) => k + 1); // 에디터 리마운트
    setDialogOpen(true);
  };

  const onSubmit = (formData: { name: string; priority: string }) => {
    const body = {
      name: formData.name,
      priority: formData.priority,
      content: contentHtml || null,
      description: descriptionHtml || null,
    };
    if (editItem) {
      updateMutation.mutate({ id: editItem.requirementId, ...body });
    } else {
      createMutation.mutate(body);
    }
  };

  const columns: ColumnDef<RequirementRow, unknown>[] = [
    { accessorKey: "systemId", header: "ID", size: 100 },
    { accessorKey: "name", header: "요구사항 명" },
    {
      accessorKey: "priority",
      header: "우선순위",
      cell: ({ getValue }) => {
        const v = getValue() as string;
        const label = PRIORITIES.find((p) => p.value === v)?.label ?? v;
        return <span className="text-muted-foreground">{label}</span>;
      },
      size: 80,
    },
    {
      accessorKey: "screenCount",
      header: "화면 수",
      cell: ({ getValue }) => <span className="text-center">{getValue() as number}</span>,
      size: 70,
    },
    {
      accessorKey: "functionCount",
      header: "기능 수",
      cell: ({ getValue }) => <span className="text-center">{getValue() as number}</span>,
      size: 70,
    },
    {
      accessorKey: "updatedAt",
      header: "수정일",
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">{formatDate(getValue() as string)}</span>
      ),
      size: 80,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            setDeleteItem(row.original);
          }}
        >
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      ),
      size: 50,
      enableSorting: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">요구사항 관리</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          요구사항 등록
        </Button>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="검색..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <DataGrid
        columns={columns}
        data={data?.data ?? []}
        onRowClick={openEdit}
        pagination={data?.pagination}
        onPageChange={setPage}
        emptyMessage={isLoading ? "로딩 중..." : "등록된 요구사항이 없습니다."}
      />

      {/* ═══════════════════════════════════════════════════════ */}
      {/* 등록/수정 다이얼로그                                     */}
      {/*                                                       */}
      {/* 📌 w-[92vw] max-w-6xl: 화면 92% 너비, 최대 6xl       */}
      {/* 📌 editorKey: 다이얼로그 열릴 때 RichTextEditor 리마운트  */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {/*
          📌 flex flex-col: 헤더(고정) + 스크롤영역(flex-1) 분리
          📌 overflow-hidden: DialogContent 자체는 스크롤 안 함
        */}
        <DialogContent className="w-[98vw] max-w-[100rem] max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">

          {/* ── 고정 헤더: 스크롤해도 항상 보임 ── */}
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle>
              {editItem ? "요구사항 수정" : "요구사항 등록"}
            </DialogTitle>
          </DialogHeader>

          {/* ── 스크롤 영역 ── */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* ── 1행: 요구사항 명 + 우선순위 (items-start: 라벨 상단 정렬) */}
              <div className="flex items-start gap-4">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs">요구사항 명 *</Label>
                  <Input
                    {...register("name", { required: true })}
                    placeholder="요구사항 명을 입력하세요"
                  />
                </div>
                <div className="w-28 space-y-1.5">
                  <Label className="text-xs">우선순위</Label>
                  <Select
                    value={watch("priority")}
                    onValueChange={(v) => setValue("priority", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* ── 2행: 에디터 2개 — 넓으면 가로, 좁으면 세로 ─────── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 왼쪽(위): 요구사항 내용 (원문) */}
                <RichTextEditor
                  key={`content-${editorKey}`}
                  label="요구사항 내용 (원문)"
                  value={contentHtml}
                  onChange={setContentHtml}
                  placeholder="제안요청서 원문을 입력하세요..."
                  heightClass="min-h-[30rem]"
                />

                {/* 오른쪽(아래): 요구사항 분석 내용 */}
                <RichTextEditor
                  key={`desc-${editorKey}`}
                  label="요구사항 분석 내용"
                  value={descriptionHtml}
                  onChange={setDescriptionHtml}
                  placeholder="GS가 분석·정리한 내용을 입력하세요..."
                  heightClass="min-h-[30rem]"
                />
              </div>

              {/* ── 소속 화면 목록 (수정 시만 표시) ────────────────── */}
              {editItem && reqDetail?.data?.screens?.length > 0 && (
                <div className="flex items-center gap-2 pt-1 border-t border-border">
                  <span className="text-xs text-muted-foreground shrink-0">소속 화면</span>
                  <div className="flex flex-wrap gap-1.5">
                    {reqDetail.data.screens.map((s: { screenId: number; systemId: string; name: string }) => (
                      <button
                        key={s.screenId}
                        type="button"
                        onClick={() => router.push(`/screens/${s.screenId}`)}
                        className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                      >
                        {s.systemId} {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "처리중..."
                    : "저장"}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 */}
      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={() => setDeleteItem(null)}
        title="요구사항 삭제"
        description={
          <>
            "{deleteItem?.name}"을(를) 삭제하시겠습니까?
            <br />
            <span className="text-red-500 font-bold">삭제 시 복구 불가능합니다.</span> 신중히 진행하세요.
          </>
        }
        variant="destructive"
        confirmLabel="삭제"
        onConfirm={() => deleteItem && deleteMutation.mutate(deleteItem.requirementId)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
