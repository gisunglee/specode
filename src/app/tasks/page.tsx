"use client";

/**
 * 과업(Task) 목록 페이지
 *
 * RFP 원문 대항목을 등록·관리하는 CRUD 페이지.
 * 행 클릭 → /tasks/[id] 상세 페이지로 이동.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Trash2 } from "lucide-react";
import { apiFetch, formatDate } from "@/lib/utils";
import { DataGrid } from "@/components/common/DataGrid";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { ColumnDef } from "@tanstack/react-table";

interface TaskRow {
  taskId:           number;
  systemId:         string;
  name:             string;
  category:         string | null;
  rfpPage:          number | null;
  requirementCount: number;
  createdAt:        string;
}

export default function TasksPage() {
  const router       = useRouter();
  const queryClient  = useQueryClient();
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem]   = useState<TaskRow | null>(null);
  const [deleteItem, setDeleteItem] = useState<TaskRow | null>(null);

  // 폼 상태
  const [formName,       setFormName]       = useState("");
  const [formCategory,   setFormCategory]   = useState("");
  const [formDefinition, setFormDefinition] = useState("");
  const [formOutputInfo, setFormOutputInfo] = useState("");
  const [formRfpPage,    setFormRfpPage]    = useState("");
  const [formContent,    setFormContent]    = useState("");

  // 목록 조회
  const { data, isLoading } = useQuery({
    queryKey: ["tasks", page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/tasks?${params}`);
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("과업이 등록되었습니다.");
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Record<string, unknown>) =>
      apiFetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("과업이 수정되었습니다.");
      setDialogOpen(false);
      setEditItem(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("삭제되었습니다.");
      setDeleteItem(null);
    },
  });

  const resetForm = () => {
    setFormName("");
    setFormCategory("");
    setFormDefinition("");
    setFormOutputInfo("");
    setFormRfpPage("");
    setFormContent("");
  };

  const openCreate = () => {
    setEditItem(null);
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (row: TaskRow) => {
    setEditItem(row);
    setFormName(row.name);
    setFormCategory(row.category ?? "");
    setFormRfpPage(row.rfpPage != null ? String(row.rfpPage) : "");
    // 상세 페이지에서 수정하도록 목록에서는 등록만, 행 클릭은 상세로 이동
    router.push(`/tasks/${row.taskId}`);
  };

  const handleSave = () => {
    if (!formName.trim()) {
      toast.error("과업명은 필수입니다.");
      return;
    }
    const body = {
      name:       formName.trim(),
      category:   formCategory.trim()   || null,
      definition: formDefinition.trim() || null,
      outputInfo: formOutputInfo.trim() || null,
      rfpPage:    formRfpPage ? parseInt(formRfpPage) : null,
      content:    formContent.trim()    || null,
    };

    if (editItem) {
      updateMutation.mutate({ id: editItem.taskId, ...body });
    } else {
      createMutation.mutate(body);
    }
  };

  const columns: ColumnDef<TaskRow, unknown>[] = [
    { accessorKey: "systemId", header: "ID", size: 100 },
    { accessorKey: "name",     header: "과업명" },
    {
      accessorKey: "category",
      header: "분류",
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">{(getValue() as string) ?? "-"}</span>
      ),
      size: 130,
    },
    {
      accessorKey: "rfpPage",
      header: "RFP 페이지",
      cell: ({ getValue }) => {
        const v = getValue() as number | null;
        return <span className="text-muted-foreground">{v != null ? `p.${v}` : "-"}</span>;
      },
      size: 90,
    },
    {
      accessorKey: "requirementCount",
      header: "요구사항",
      cell: ({ getValue }) => (
        <span className="text-center font-medium">{getValue() as number}</span>
      ),
      size: 80,
    },
    {
      accessorKey: "createdAt",
      header: "등록일",
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

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">과업 관리</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          과업 등록
        </Button>
      </div>

      {/* 검색 */}
      <div className="flex items-center gap-2 max-w-sm">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          placeholder="과업명 또는 ID 검색..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {/* 목록 */}
      <DataGrid
        columns={columns}
        data={data?.data ?? []}
        onRowClick={openEdit}
        pagination={data?.pagination}
        onPageChange={setPage}
        emptyMessage={isLoading ? "로딩 중..." : "등록된 과업이 없습니다."}
        dense={true}
      />

      {/* 등록 다이얼로그 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[85vw] max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle>
              {editItem ? "과업 수정" : "과업 등록"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* 과업명 */}
            <div className="space-y-1.5">
              <Label className="text-sm">과업명 *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="예: 시스템 관리자 - 사용자 관리"
              />
            </div>

            {/* 분류 + RFP 페이지 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">분류</Label>
                <Input
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="예: 기능 요구사항"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">RFP 페이지</Label>
                <Input
                  type="number"
                  value={formRfpPage}
                  onChange={(e) => setFormRfpPage(e.target.value)}
                  placeholder="예: 17"
                />
              </div>
            </div>

            {/* 요약 정의 */}
            <div className="space-y-1.5">
              <Label className="text-sm">요약 정의</Label>
              <Textarea
                value={formDefinition}
                onChange={(e) => setFormDefinition(e.target.value)}
                placeholder="과업의 목적과 범위를 간략히 설명합니다."
                rows={3}
              />
            </div>

            {/* 산출정보 */}
            <div className="space-y-1.5">
              <Label className="text-sm">산출정보</Label>
              <Textarea
                value={formOutputInfo}
                onChange={(e) => setFormOutputInfo(e.target.value)}
                placeholder="예: 사용자 관리 화면, 권한 설정 화면"
                rows={2}
              />
            </div>

            {/* 세부내용 원문 */}
            <div className="space-y-1.5">
              <Label className="text-sm">세부내용 원문</Label>
              <Textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="RFP 원문을 그대로 붙여넣으세요."
                rows={8}
                className="font-mono text-xs leading-relaxed"
              />
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border flex-shrink-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "저장중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 */}
      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={() => setDeleteItem(null)}
        title="과업 삭제"
        description={
          <div className="space-y-2">
            <p>"{deleteItem?.name}"을(를) 삭제하시겠습니까?</p>
            {deleteItem && deleteItem.requirementCount > 0 && (
              <p className="text-muted-foreground">
                연결된 요구사항 {deleteItem.requirementCount}건이 있습니다.
                삭제해도 요구사항은 유지되며, 과업 연결만 해제됩니다.
              </p>
            )}
          </div>
        }
        variant="destructive"
        confirmLabel="삭제"
        onConfirm={() => deleteItem && deleteMutation.mutate(deleteItem.taskId)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
