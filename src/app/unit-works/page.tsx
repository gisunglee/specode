"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Monitor } from "lucide-react";
import { DataGrid } from "@/components/common/DataGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";

interface UnitWorkRow {
  unitWorkId:    number;
  systemId:      string;
  name:          string;
  description:   string | null;
  sortOrder:     number;
  screenCount:   number;
  updatedAt:     string;
  requirement:   { systemId: string; name: string };
  requirementId: number;
}

interface RequirementOption {
  requirementId: number;
  systemId:      string;
  name:          string;
}

export default function UnitWorksPage() {
  const router       = useRouter();
  const queryClient  = useQueryClient();
  const [search, setSearch]         = useState("");
  const [filterReqId, setFilterReqId] = useState("all");
  const [dialogOpen, setDialogOpen]   = useState(false);
  const [editItem, setEditItem]       = useState<UnitWorkRow | null>(null);
  const [deleteItem, setDeleteItem]   = useState<UnitWorkRow | null>(null);

  // 단위업무 목록
  const { data, isLoading } = useQuery({
    queryKey: ["unit-works", search, filterReqId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search)                    params.set("search", search);
      if (filterReqId && filterReqId !== "all") params.set("requirementId", filterReqId);
      params.set("pageSize", "100");
      return apiFetch<{ data: UnitWorkRow[] }>(`/api/unit-works?${params}`);
    },
  });

  // 요구사항 목록 (필터용)
  const { data: reqData } = useQuery({
    queryKey: ["requirements-select"],
    queryFn: () => apiFetch<{ data: RequirementOption[] }>("/api/requirements?pageSize=200"),
  });

  const rows       = data?.data ?? [];
  const reqOptions = reqData?.data ?? [];

  // 생성/수정
  const saveMutation = useMutation({
    mutationFn: (body: object) => {
      if (editItem) {
        return apiFetch(`/api/unit-works/${editItem.unitWorkId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      return apiFetch("/api/unit-works", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      toast.success(editItem ? "수정되었습니다." : "단위업무가 등록되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["unit-works"] });
      setDialogOpen(false);
      setEditItem(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // 삭제
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/unit-works/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("삭제되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["unit-works"] });
      setDeleteItem(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const [formName, setFormName]           = useState("");
  const [formDesc, setFormDesc]           = useState("");
  const [formReqId, setFormReqId]         = useState("");
  const [formSortOrder, setFormSortOrder] = useState("0");

  const openCreate = () => {
    setEditItem(null);
    setFormName(""); setFormDesc(""); setFormReqId(""); setFormSortOrder("0");
    setDialogOpen(true);
  };

  const openEdit = (row: UnitWorkRow) => {
    setEditItem(row);
    setFormName(row.name);
    setFormDesc(row.description ?? "");
    setFormReqId(String(row.requirementId));
    setFormSortOrder(String(row.sortOrder));
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formName.trim()) { toast.error("단위업무명을 입력해주세요."); return; }
    if (!formReqId)       { toast.error("요구사항을 선택해주세요.");   return; }
    saveMutation.mutate({
      name:          formName.trim(),
      description:   formDesc.trim() || null,
      requirementId: parseInt(formReqId),
      sortOrder:     parseInt(formSortOrder) || 0,
    });
  };

  const columns: ColumnDef<UnitWorkRow>[] = [
    {
      id: "systemId",
      header: "ID",
      size: 100,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.original.systemId}</span>
      ),
    },
    {
      id: "requirement",
      header: "요구사항",
      size: 140,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          [{row.original.requirement.systemId}] {row.original.requirement.name}
        </span>
      ),
    },
    {
      id: "name",
      header: "단위업무명",
      size: 220,
      cell: ({ row }) => (
        <span className="font-medium text-sm">{row.original.name}</span>
      ),
    },
    {
      id: "description",
      header: "설명",
      size: 200,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground truncate block max-w-[180px]">
          {row.original.description ?? "-"}
        </span>
      ),
    },
    {
      id: "screenCount",
      header: "화면 수",
      size: 80,
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">{row.original.screenCount}</span>
      ),
    },
    {
      id: "updatedAt",
      header: "수정일",
      size: 90,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{formatDate(row.original.updatedAt)}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      size: 100,
      cell: ({ row }) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            title="화면 목록 보기"
            onClick={() => router.push(`/screens?unitWorkId=${row.original.unitWorkId}`)}
          >
            <Monitor className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => openEdit(row.original)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => setDeleteItem(row.original)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">단위업무</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            요구사항 하위 업무 단위 — 화면 묶음 · PRD 전송 기준
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> 단위업무 등록
        </Button>
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-2">
        <Select value={filterReqId} onValueChange={(v) => setFilterReqId(v)}>
          <SelectTrigger className="h-8 w-52 text-xs">
            <SelectValue placeholder="전체 요구사항" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {reqOptions.map((r) => (
              <SelectItem key={r.requirementId} value={String(r.requirementId)} className="text-xs">
                [{r.systemId}] {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative">
          <Input
            placeholder="단위업무명 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-56 text-xs pl-3"
          />
        </div>
      </div>

      {/* 그리드 */}
      <DataGrid
        data={rows}
        columns={columns}
        loading={isLoading}
        onRowClick={(row) => router.push(`/unit-works/${row.unitWorkId}`)}
        emptyMessage="등록된 단위업무가 없습니다."
      />

      {/* 등록/수정 다이얼로그 */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) { setDialogOpen(false); setEditItem(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "단위업무 수정" : "단위업무 등록"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <div className="space-y-1.5">
              <Label>요구사항 *</Label>
              <Select value={formReqId} onValueChange={setFormReqId}>
                <SelectTrigger>
                  <SelectValue placeholder="요구사항 선택" />
                </SelectTrigger>
                <SelectContent>
                  {reqOptions.map((r) => (
                    <SelectItem key={r.requirementId} value={String(r.requirementId)} className="text-xs">
                      [{r.systemId}] {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>단위업무명 *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="예: 공지사항 관리"
              />
            </div>
            <div className="space-y-1.5">
              <Label>설명</Label>
              <Textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                rows={3}
                placeholder="업무 단위 설명 (선택)"
              />
            </div>
            <div className="space-y-1.5">
              <Label>정렬 순서</Label>
              <Input
                type="number"
                value={formSortOrder}
                onChange={(e) => setFormSortOrder(e.target.value)}
                className="w-24"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditItem(null); }}>
                취소
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "저장 중..." : "저장"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 */}
      <ConfirmDialog
        open={!!deleteItem}
        title="단위업무 삭제"
        description={`"${deleteItem?.name}"을 삭제하시겠습니까? 연결된 화면이 있으면 삭제할 수 없습니다.`}
        onConfirm={() => deleteItem && deleteMutation.mutate(deleteItem.unitWorkId)}
        onOpenChange={(o) => { if (!o) setDeleteItem(null); }}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
