"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Plus, Search, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { DataGrid } from "@/components/common/DataGrid";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: { name: "", description: "", priority: "MEDIUM" },
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
    reset({ name: "", description: "", priority: "MEDIUM" });
    setDialogOpen(true);
  };

  const openEdit = (row: RequirementRow) => {
    setEditItem(row);
    reset({ name: row.name, description: "", priority: row.priority || "MEDIUM" });
    setDialogOpen(true);
  };

  const onSubmit = (formData: { name: string; description: string; priority: string }) => {
    if (editItem) {
      updateMutation.mutate({ id: editItem.requirementId, ...formData });
    } else {
      createMutation.mutate(formData);
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editItem ? "요구사항 수정" : "요구사항 등록"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>요구사항 명 *</Label>
              <Input {...register("name", { required: true })} placeholder="요구사항 명을 입력하세요" />
            </div>
            <div className="space-y-2">
              <Label>설명</Label>
              <Textarea {...register("description")} placeholder="설명을 입력하세요" rows={3} />
            </div>
            <div className="space-y-2">
              <Label>우선순위</Label>
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
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={() => setDeleteItem(null)}
        title="요구사항 삭제"
        // DialogDescription은 <p>로 렌더되므로 <div> 대신 Fragment(<>...</>) 사용 (HTML 유효성)
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
