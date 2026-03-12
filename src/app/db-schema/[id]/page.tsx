"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { MarkdownEditor } from "@/components/common/MarkdownEditor";
import { RelationsEditor } from "@/components/db-schema/RelationsEditor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

interface DbSchemaData {
  schemaId: number;
  tableName: string;
  tableComment: string | null;
  tableGroup: string | null;
  ddlScript: string;
  relationsJson: string | null;
  updatedAt: string;
}

export default function DbSchemaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [tableName, setTableName] = useState("");
  const [tableComment, setTableComment] = useState("");
  const [tableGroup, setTableGroup] = useState("");
  const [ddlScript, setDdlScript] = useState("");
  const [relationsJson, setRelationsJson] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [versionKey, setVersionKey] = useState(0);

  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["db-schema", id],
    queryFn: async () => {
      const res = await fetch(`/api/db-schema/${id}`);
      return res.json();
    },
    gcTime: 0,
  });

  const schema: DbSchemaData | undefined = data?.data;

  // 업무그룹 목록 — 기존 등록된 값들
  const { data: allData } = useQuery({
    queryKey: ["db-schema-groups"],
    queryFn: () => fetch("/api/db-schema").then((r) => r.json()),
    staleTime: 60 * 1000,
  });
  const groups = Array.from(
    new Set(
      ((allData?.data ?? []) as DbSchemaData[])
        .map((r) => r.tableGroup)
        .filter(Boolean)
    )
  ).sort() as string[];

  useEffect(() => {
    if (schema) {
      setTableName(schema.tableName ?? "");
      setTableComment(schema.tableComment ?? "");
      setTableGroup(schema.tableGroup ?? "");
      setDdlScript(schema.ddlScript ?? "");
      setRelationsJson(schema.relationsJson ?? null);
    }
  }, [dataUpdatedAt]);

  const deleteMutation = useMutation({
    mutationFn: () => apiFetch(`/api/db-schema/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("스키마가 삭제되었습니다.");
      router.push("/db-schema");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch(`/api/db-schema/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["db-schema", id] });
      queryClient.invalidateQueries({ queryKey: ["db-schema"] });
      toast.success("저장되었습니다.");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      setVersionKey((k) => k + 1); // VersionButtons 즉시 재fetch
    },
    onError: async (err: unknown) => {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("동일한 테이블명")) {
        toast.error("동일한 테이블명이 있습니다. 수정 불가 합니다.");
      } else {
        toast.error("저장에 실패했습니다.");
      }
    },
  });

  const handleSave = useCallback(() => {
    if (!schema) return;
    updateMutation.mutate({
      tableName: tableName || schema.tableName,
      tableComment: tableComment || null,
      tableGroup: tableGroup || null,
      ddlScript,
      relationsJson: relationsJson || null,
    });
  }, [schema, tableName, tableComment, tableGroup, ddlScript, relationsJson, updateMutation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        로딩 중...
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        스키마를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div>
      {/* ─── Sticky 헤더 ─────────────────────────────────────── */}
      <div className="sticky top-0 z-20 -mx-6 -mt-6 px-6 bg-background/95 backdrop-blur-sm mb-2">
        <div className="flex items-center gap-2 h-12">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => router.push("/db-schema")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1.5 flex-1 min-w-0 text-sm overflow-hidden">
            <span className="font-medium font-mono truncate">{tableName || schema.tableName}</span>
            {tableComment && (
              <span className="text-xs text-muted-foreground truncate shrink-0 max-w-[220px]">
                — {tableComment}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {saveSuccess && (
              <span className="text-xs text-emerald-600 font-medium animate-pulse">저장됨 ✓</span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="삭제"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
            </Button>
            <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "저장중..." : "저장"}
            </Button>
          </div>
        </div>
      </div>

      {/* ─── 콘텐츠 ──────────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="grid grid-cols-10 gap-6">

          {/* 왼쪽: DDL 스크립트 */}
          <div className="col-span-5 space-y-2">
            <MarkdownEditor
              key={versionKey}
              label="DDL 스크립트"
              value={ddlScript}
              onChange={setDdlScript}
              rows={34}
              placeholder={"CREATE TABLE tb_xxx (\n  col_id SERIAL PRIMARY KEY,\n  col_name VARCHAR(100) NOT NULL,\n  ...\n);"}
              refTableName="tb_db_schema"
              refPkId={schema.schemaId}
              fieldName="ddl_script"
            />
          </div>

          {/* 오른쪽: 메타 + 관계 */}
          <div className="col-span-5 space-y-5 pt-6">
            {/* 메타 정보 */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">테이블명</label>
                <Input
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  placeholder="테이블명"
                  maxLength={100}
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">설명</label>
                <Input
                  value={tableComment}
                  onChange={(e) => setTableComment(e.target.value)}
                  placeholder="테이블 설명"
                  maxLength={200}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">업무그룹</label>
                <div className="flex gap-1.5">
                  <Input
                    value={tableGroup}
                    onChange={(e) => setTableGroup(e.target.value)}
                    placeholder="예: 사용자관리"
                    maxLength={50}
                    className="flex-1"
                  />
                  {groups.length > 0 && (
                    <Select
                      value={tableGroup || "_none"}
                      onValueChange={(v) => setTableGroup(v === "_none" ? "" : v)}
                    >
                      <SelectTrigger className="w-8 px-0 justify-center shrink-0">
                        <span className="text-xs text-muted-foreground">▾</span>
                      </SelectTrigger>
                      <SelectContent align="end">
                        <SelectItem value="_none">없음</SelectItem>
                        {groups.map((g) => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">수정일시</label>
                <p className="text-xs text-muted-foreground">{formatDateTime(schema.updatedAt)}</p>
              </div>
            </div>

            {/* 구분선 */}
            <div className="border-t border-border" />

            {/* 관계 에디터 */}
            <RelationsEditor
              ddlScript={ddlScript}
              value={relationsJson}
              onChange={setRelationsJson}
            />
          </div>
        </div>
      </div>

      {/* ─── 삭제 다이얼로그 ─────────────────────────────────── */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="스키마 삭제"
        description={`"${schema.tableName}"을(를) 삭제하시겠습니까?`}
        variant="destructive"
        confirmLabel="삭제"
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
