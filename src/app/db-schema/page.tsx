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
  DialogDescription,
} from "@/components/ui/dialog";
import { apiFetch, cn, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";

interface SchemaRow {
  schemaId: number;
  tableName: string;
  tableComment: string | null;
  tableGroup: string | null;
  updatedAt: string;
}

interface CreateForm {
  tableName: string;
  tableComment: string;
  tableGroup: string;
  ddlScript: string;
}

export default function DbSchemaPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SchemaRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["db-schema", search, filterGroup],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterGroup !== "ALL") params.set("tableGroup", filterGroup);
      return fetch(`/api/db-schema?${params}`).then((r) => r.json());
    },
  });

  const rows: SchemaRow[] = data?.data ?? [];

  // 그룹 목록 — 필터와 무관하게 전체에서 추출
  const { data: allData } = useQuery({
    queryKey: ["db-schema-groups"],
    queryFn: () => fetch("/api/db-schema").then((r) => r.json()),
    staleTime: 60 * 1000,
  });
  const groups = Array.from(
    new Set(
      ((allData?.data ?? []) as SchemaRow[])
        .map((r) => r.tableGroup)
        .filter(Boolean)
    )
  ).sort() as string[];

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } =
    useForm<CreateForm>({
      defaultValues: { tableName: "", tableComment: "", tableGroup: "", ddlScript: "" },
    });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/db-schema", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["db-schema"] });
      queryClient.invalidateQueries({ queryKey: ["db-schema-groups"] });
      toast.success("등록되었습니다.");
      setCreateOpen(false);
      reset();
      router.push(`/db-schema/${(res as { data: { schemaId: number } }).data.schemaId}`);
    },
    onError: () => toast.error("등록에 실패했습니다."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/db-schema/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["db-schema"] });
      queryClient.invalidateQueries({ queryKey: ["db-schema-groups"] });
      toast.success("삭제되었습니다.");
      setDeleteTarget(null);
    },
  });

  const onSubmit = (values: CreateForm) => {
    createMutation.mutate({
      tableName: values.tableName,
      tableComment: values.tableComment || null,
      tableGroup: values.tableGroup || null,
      ddlScript: values.ddlScript,
    });
  };

  const columns: ColumnDef<SchemaRow, unknown>[] = [
    {
      accessorKey: "tableName",
      header: "테이블명",
      size: 220,
      cell: ({ getValue }) => (
        <span className="font-medium font-mono text-sm">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: "tableComment",
      header: "설명",
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">{(getValue() as string) || "-"}</span>
      ),
    },
    {
      accessorKey: "tableGroup",
      header: "업무그룹",
      size: 130,
      cell: ({ getValue }) => {
        const v = getValue() as string | null;
        return v ? (
          <span className="rounded-full bg-secondary text-secondary-foreground px-2 py-0.5 text-xs">
            {v}
          </span>
        ) : (
          <span className="text-muted-foreground/40">-</span>
        );
      },
    },
    {
      accessorKey: "updatedAt",
      header: "수정일",
      size: 130,
      cell: ({ getValue }) => (
        <span className="text-muted-foreground text-xs">
          {formatDateTime(getValue() as string)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      size: 40,
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            setDeleteTarget(row.original);
          }}
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
        </Button>
      ),
    },
  ];

  const watchedGroup = watch("tableGroup");

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">DB 스키마</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {rows.length}개 테이블
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          추가
        </Button>
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 w-56"
            placeholder="테이블명, 설명 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={filterGroup} onValueChange={setFilterGroup}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="업무그룹" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">전체 그룹</SelectItem>
            {groups.map((g) => (
              <SelectItem key={g} value={g}>{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>


      </div>

      {/* 목록 */}
      <DataGrid
        columns={columns}
        data={rows}
        loading={isLoading}
        onRowClick={(row: SchemaRow) => router.push(`/db-schema/${row.schemaId}`)}
        emptyMessage="등록된 스키마가 없습니다."
      />

      {/* 등록 다이얼로그 */}
      <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) reset(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>DB 스키마 추가</DialogTitle>
            <DialogDescription>새 테이블 스키마를 등록합니다.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="tableName">테이블명 *</Label>
                <Input
                  id="tableName"
                  placeholder="예: tb_user"
                  maxLength={100}
                  {...register("tableName", { required: true })}
                />
                {errors.tableName && <p className="text-xs text-destructive">필수입니다.</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="tableGroup">업무그룹</Label>
                <div className="flex gap-1.5">
                  <Input
                    id="tableGroup"
                    placeholder="예: 사용자관리"
                    maxLength={50}
                    className="flex-1"
                    {...register("tableGroup")}
                  />
                  {groups.length > 0 && (
                    <Select
                      value={watchedGroup || "_none"}
                      onValueChange={(v) => setValue("tableGroup", v === "_none" ? "" : v)}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue placeholder="선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">직접입력</SelectItem>
                        {groups.map((g) => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="tableComment">테이블 설명</Label>
              <Input
                id="tableComment"
                placeholder="예: 사용자 마스터"
                maxLength={200}
                {...register("tableComment")}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ddlScript">DDL 스크립트</Label>
              <Textarea
                id="ddlScript"
                rows={10}
                placeholder={"CREATE TABLE tb_user (\n  user_id SERIAL PRIMARY KEY,\n  ...\n);"}
                className="font-mono text-sm"
                {...register("ddlScript")}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setCreateOpen(false); reset(); }}>
                취소
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "등록중..." : "등록"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="스키마 삭제"
        description={`"${deleteTarget?.tableName}"을(를) 삭제하시겠습니까?`}
        variant="destructive"
        confirmLabel="삭제"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.schemaId)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
