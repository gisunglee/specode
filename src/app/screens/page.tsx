/**
 * ScreensPage — 화면 관리 목록 페이지 (/screens)
 *
 * 📌 역할:
 *   - 등록된 화면(Screen) 목록을 테이블로 표시
 *   - 행 클릭 → 화면 상세 페이지로 이동
 *   - 기능 목록(리스트) 버튼 → 기능 관리 페이지로 이동
 *   - 수정(연필) 버튼 → 화면 수정 다이얼로그
 *   - 삭제(휴지통) 버튼 → 삭제 확인 다이얼로그
 *   - 화면 등록 → 등록 다이얼로그
 *
 * 📌 핵심 동작:
 *   행 클릭 → router.push(`/screens/${screenId}`)
 *   리스트 아이콘 클릭 → router.push(`/functions?screenId=${screenId}`)
 *   연필 아이콘 클릭 → openEdit(row) → Dialog 열림 (e.stopPropagation으로 행 클릭 방지)
 */
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation"; // 페이지 이동용 라우터
import { Plus, Search, Trash2, Pencil, List } from "lucide-react";
import { useForm } from "react-hook-form";
import { DataGrid } from "@/components/common/DataGrid";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
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
import { SCREEN_TYPES } from "@/lib/constants";
import { apiFetch, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";

interface ScreenRow {
  screenId: number;
  systemId: string;
  displayCode: string | null;
  name: string;
  screenType: string | null;
  requirementId: number;
  requirement: { name: string; systemId: string };
  _count: { functions: number };
  updatedAt: string;
}

export default function ScreensPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterReqId, setFilterReqId] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<ScreenRow | null>(null);
  const [deleteItem, setDeleteItem] = useState<ScreenRow | null>(null);

  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      name: "",
      displayCode: "",
      screenType: "LIST",
      requirementId: "",
    },
  });

  const { data: reqData } = useQuery({
    queryKey: ["requirements-all"],
    queryFn: async () => {
      const res = await fetch("/api/requirements?pageSize=100");
      return res.json();
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["screens", page, search, filterReqId],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (search) params.set("search", search);
      if (filterReqId) params.set("requirementId", filterReqId);
      const res = await fetch(`/api/screens?${params}`);
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/screens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["screens"] });
      toast.success("화면이 등록되었습니다.");
      setDialogOpen(false);
      reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Record<string, unknown>) =>
      apiFetch(`/api/screens/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["screens"] });
      toast.success("화면이 수정되었습니다.");
      setDialogOpen(false);
      setEditItem(null);
      reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/screens/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["screens"] });
      toast.success("삭제되었습니다.");
      setDeleteItem(null);
    },
  });

  const openCreate = () => {
    setEditItem(null);
    reset({ name: "", displayCode: "", screenType: "LIST", requirementId: "" });
    setDialogOpen(true);
  };

  const openEdit = (row: ScreenRow) => {
    setEditItem(row);
    reset({
      name: row.name,
      displayCode: row.displayCode || "",
      screenType: row.screenType || "LIST",
      requirementId: String(row.requirementId),
    });
    setDialogOpen(true);
  };

  const onSubmit = (formData: {
    name: string;
    displayCode: string;
    screenType: string;
    requirementId: string;
  }) => {
    const payload = {
      ...formData,
      requirementId: parseInt(formData.requirementId),
    };
    if (editItem) {
      updateMutation.mutate({ id: editItem.screenId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const requirements = reqData?.data ?? [];

  const columns: ColumnDef<ScreenRow, unknown>[] = [
    { accessorKey: "systemId", header: "ID", size: 100 },
    { accessorKey: "displayCode", header: "표시코드", size: 100 },
    { accessorKey: "name", header: "화면명" },
    {
      accessorKey: "screenType",
      header: "유형",
      cell: ({ getValue }) => {
        const v = getValue() as string;
        const label = SCREEN_TYPES.find((t) => t.value === v)?.label ?? v;
        return <span className="text-muted-foreground">{label}</span>;
      },
      size: 80,
    },
    {
      id: "funcCount",
      header: "기능 수",
      cell: ({ row }) => row.original._count?.functions ?? 0,
      size: 70,
    },
    {
      id: "requirement",
      header: "소속 요구사항",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.requirement?.name}</span>
      ),
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
      /**
       * 📌 actions 컬럼 — 기능목록/수정/삭제 버튼
       *
       * 리스트 아이콘: 기능 관리 페이지로 이동 (해당 화면의 기능만 필터링)
       * 연필 아이콘: openEdit(row) → 화면 수정 다이얼로그 열기
       * 휴지통 아이콘: setDeleteItem(row) → 삭제 확인 다이얼로그 열기
       *
       * e.stopPropagation(): 버튼 클릭이 행(row) 클릭으로 전파되는 것을 방지
       * → 버튼 없이 행 자체를 클릭하면 화면 상세 페이지로 이동
       */
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            title="기능 목록"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/functions?screenId=${row.original.screenId}`);
            }}
          >
            <List className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="수정"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(row.original);
            }}
          >
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="삭제"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteItem(row.original);
            }}
          >
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      ),
      size: 120,
      enableSorting: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">화면 관리</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          화면 등록
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 max-w-xs">
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
        <Select value={filterReqId} onValueChange={(v) => { setFilterReqId(v === "ALL" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="요구사항: 전체" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">전체</SelectItem>
            {requirements.map((r: { requirementId: number; name: string }) => (
              <SelectItem key={r.requirementId} value={String(r.requirementId)}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/*
       * 📌 행 클릭 → 화면 상세 페이지로 이동
       *    → /screens/7 형태
       *    → 화면 설명(spec), 레이아웃, 첨부파일, 하위 기능 목록 표시
       *
       * 📌 기능 목록은 actions 컬럼의 리스트(📋) 아이콘 버튼으로 이동
       * 📌 수정은 연필(✏️) 아이콘 버튼으로 진행
       */}
      <DataGrid
        columns={columns}
        data={data?.data ?? []}
        onRowClick={(row) => router.push(`/screens/${row.screenId}`)}
        pagination={data?.pagination}
        onPageChange={setPage}
        emptyMessage={isLoading ? "로딩 중..." : "등록된 화면이 없습니다."}
      />

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "화면 수정" : "화면 등록"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>화면명 *</Label>
              <Input {...register("name", { required: true })} placeholder="화면명" />
            </div>
            <div className="space-y-2">
              <Label>표시용 코드</Label>
              <Input {...register("displayCode")} placeholder="예: BGT-001" />
            </div>
            <div className="space-y-2">
              <Label>화면 유형 *</Label>
              <Select value={watch("screenType")} onValueChange={(v) => setValue("screenType", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCREEN_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>소속 요구사항 *</Label>
              <Select
                value={watch("requirementId")}
                onValueChange={(v) => setValue("requirementId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="요구사항 선택" />
                </SelectTrigger>
                <SelectContent>
                  {requirements.map((r: { requirementId: number; systemId: string; name: string }) => (
                    <SelectItem key={r.requirementId} value={String(r.requirementId)}>
                      {r.systemId} {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                취소
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? "처리중..." : "저장"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={() => setDeleteItem(null)}
        title="화면 삭제"
        description={`"${deleteItem?.name}"을(를) 삭제하시겠습니까?`}
        variant="destructive"
        confirmLabel="삭제"
        onConfirm={() => deleteItem && deleteMutation.mutate(deleteItem.screenId)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
