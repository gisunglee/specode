"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Trash2, Pencil } from "lucide-react";
import { apiFetch, formatDate } from "@/lib/utils";
import { DESIGN_TYPES, TOOL_TYPES, DESIGN_STATUS_LABEL } from "@/lib/constants";
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
import type { ColumnDef } from "@tanstack/react-table";

interface DesignRow {
  contentId:   number;
  systemId:    string;
  title:       string;
  designType:  string;
  toolType:    string;
  status:      string;
  description: string | null;
  updatedAt:   string;
  requirement: { requirementId: number; systemId: string; name: string } | null;
}

interface ReqOption {
  requirementId: number;
  systemId: string;
  name: string;
}

const DESIGN_TYPE_LIST = Object.entries(DESIGN_TYPES).map(([value, meta]) => ({
  value,
  label: meta.label,
  color: meta.color,
  defaultTool: meta.defaultTool,
}));

const TOOL_TYPE_LIST = Object.entries(TOOL_TYPES).map(([value, meta]) => ({
  value,
  label: meta.label,
  desc: meta.desc,
}));

export default function DesignContentsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch]             = useState("");
  const [filterType, setFilterType]     = useState("__all__");
  const [filterStatus, setFilterStatus] = useState("__all__");
  const [page, setPage]                 = useState(1);
  const [showCreate, setShowCreate]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DesignRow | null>(null);
  const [editTarget, setEditTarget]     = useState<DesignRow | null>(null);

  // 새 설계서 폼
  const [newTitle, setNewTitle]       = useState("");
  const [newType, setNewType]         = useState("ERD");
  const [newToolType, setNewToolType] = useState("MERMAID");
  const [newReqId, setNewReqId]       = useState("");
  const [newDesc, setNewDesc]         = useState("");

  // 수정 폼
  const [editTitle, setEditTitle]       = useState("");
  const [editType, setEditType]         = useState("");
  const [editToolType, setEditToolType] = useState("");
  const [editStatus, setEditStatus]     = useState("");

  const params = new URLSearchParams({ page: String(page), pageSize: "20" });
  if (search)                     params.set("search",     search);
  if (filterType !== "__all__")   params.set("designType", filterType);
  if (filterStatus !== "__all__") params.set("status",     filterStatus);

  const { data: listData, isFetching } = useQuery({
    queryKey: ["design-contents", page, search, filterType, filterStatus],
    queryFn:  () => apiFetch<{ data: DesignRow[]; meta: { total: number; totalPages: number } }>(`/api/design-contents?${params}`),
  });

  const { data: reqData } = useQuery({
    queryKey: ["requirements-simple"],
    queryFn:  () => apiFetch<{ data: ReqOption[] }>("/api/requirements?pageSize=200"),
  });

  const createMutation = useMutation({
    mutationFn: (body: object) =>
      apiFetch<{ data: DesignRow }>("/api/design-contents", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      }),
    onSuccess: (res) => {
      toast.success("설계서가 생성되었습니다.");
      setShowCreate(false);
      resetForm();
      router.push(`/design-contents/${res.data.contentId}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) =>
      apiFetch(`/api/design-contents/${id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      }),
    onSuccess: () => {
      toast.success("수정되었습니다.");
      setEditTarget(null);
      queryClient.invalidateQueries({ queryKey: ["design-contents"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/design-contents/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("삭제되었습니다.");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["design-contents"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetForm = () => {
    setNewTitle(""); setNewType("ERD"); setNewToolType("MERMAID"); setNewReqId(""); setNewDesc("");
  };

  const handleCreate = () => {
    if (!newTitle.trim()) { toast.error("설계서명을 입력하세요."); return; }
    createMutation.mutate({
      title:         newTitle,
      designType:    newType,
      toolType:      newToolType,
      requirementId: newReqId || null,
      description:   newDesc || null,
    });
  };

  const openEdit = (row: DesignRow) => {
    setEditTarget(row);
    setEditTitle(row.title);
    setEditType(row.designType);
    setEditToolType(row.toolType);
    setEditStatus(row.status);
  };

  const handleUpdate = () => {
    if (!editTarget || !editTitle.trim()) return;
    updateMutation.mutate({
      id:   editTarget.contentId,
      body: { title: editTitle, designType: editType, toolType: editToolType, status: editStatus },
    });
  };

  const handleTypeChange = (type: string) => {
    setNewType(type);
    const meta = DESIGN_TYPES[type as keyof typeof DESIGN_TYPES];
    if (meta) setNewToolType(meta.defaultTool);
  };

  const rows = listData?.data ?? [];
  const meta = (listData as { meta?: { total: number; totalPages: number } })?.meta;

  const columns: ColumnDef<DesignRow>[] = [
    {
      header:      "설계서명",
      accessorKey: "title",
      size:        260,
      cell: ({ row }) => (
        <span className="font-medium text-primary truncate block">
          {row.original.title}
        </span>
      ),
    },
    {
      header:      "유형",
      accessorKey: "designType",
      size:        100,
      cell: ({ getValue }) => {
        const t    = getValue<string>();
        const meta = DESIGN_TYPES[t as keyof typeof DESIGN_TYPES];
        return (
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${meta?.color ?? "bg-zinc-100 text-zinc-600"}`}>
            {t}
          </span>
        );
      },
    },
    {
      header:      "툴",
      accessorKey: "toolType",
      size:        100,
      cell: ({ getValue }) => (
        <span className="text-xs text-muted-foreground">{getValue<string>()}</span>
      ),
    },
    {
      header:      "상태",
      accessorKey: "status",
      size:        100,
      cell: ({ getValue }) => {
        const s = getValue<string>();
        const m = DESIGN_STATUS_LABEL[s];
        return (
          <span className={`text-xs px-1.5 py-0.5 rounded ${m?.class ?? "bg-zinc-100 text-zinc-600"}`}>
            {m?.label ?? s}
          </span>
        );
      },
    },
    {
      header:      "관련 요구사항",
      accessorKey: "requirement",
      size:        120,
      cell: ({ getValue }) => {
        const req = getValue<DesignRow["requirement"]>();
        return req
          ? <span className="text-xs text-muted-foreground">{req.systemId}</span>
          : <span className="text-xs text-muted-foreground">—</span>;
      },
    },
    {
      header:      "수정일",
      accessorKey: "updatedAt",
      size:        80,
      cell: ({ getValue }) => (
        <span className="text-xs text-muted-foreground">{formatDate(getValue<string>())}</span>
      ),
    },
    {
      id:     "actions",
      header: "",
      size:   64,
      cell:   ({ row }) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            onClick={(e) => { e.stopPropagation(); openEdit(row.original); }}
            title="수정"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            className="p-1 text-muted-foreground hover:text-destructive transition-colors"
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(row.original); }}
            title="삭제"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">설계 한마당</h1>
          {meta && <p className="text-sm text-muted-foreground">총 {meta.total}건</p>}
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" /> 새 설계서
        </Button>
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-2">
        <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(1); }}>
          <SelectTrigger className="w-36 h-8 text-sm">
            <SelectValue placeholder="전체 유형" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">전체 유형</SelectItem>
            {DESIGN_TYPE_LIST.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
          <SelectTrigger className="w-32 h-8 text-sm">
            <SelectValue placeholder="전체 상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">전체 상태</SelectItem>
            {Object.entries(DESIGN_STATUS_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="설계서명 검색..."
            className="pl-7 h-8 text-sm"
          />
        </div>
      </div>

      {/* 목록 — 행 클릭으로 상세 이동 */}
      <DataGrid
        columns={columns}
        data={rows}
        loading={isFetching}
        emptyMessage="등록된 설계서가 없습니다."
        onRowClick={(row) => router.push(`/design-contents/${row.contentId}`)}
      />

      {/* 페이지네이션 */}
      {meta && meta.totalPages > 1 && (
        <div className="flex justify-center gap-1">
          {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`px-2.5 py-1 text-sm rounded border ${
                p === page
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:bg-muted"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* 새 설계서 팝업 */}
      <Dialog open={showCreate} onOpenChange={(o) => { setShowCreate(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>새 설계서 만들기</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>설계서명 <span className="text-destructive">*</span></Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="설계서 제목을 입력하세요"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>

            <div className="space-y-1.5">
              <Label>설계 유형 <span className="text-destructive">*</span></Label>
              <div className="flex gap-2">
                {DESIGN_TYPE_LIST.map((t) => {
                  const selected = newType === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => handleTypeChange(t.value)}
                      className={`flex-1 flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg border-2 text-sm transition-all ${
                        selected
                          ? "border-primary shadow-md"
                          : "border-border hover:border-muted-foreground/40 hover:bg-muted/50"
                      }`}
                    >
                      {selected && <span className="w-2 h-2 rounded-full bg-primary" />}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${t.color}`}>
                        {t.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>편집 도구 <span className="text-destructive">*</span></Label>
              <div className="flex gap-2">
                {TOOL_TYPE_LIST.map((t) => {
                  const selected = newToolType === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setNewToolType(t.value)}
                      className={`flex-1 flex flex-col items-start gap-1 px-3 py-2.5 rounded-lg border-2 text-left transition-all ${
                        selected
                          ? "border-primary shadow-md"
                          : "border-border hover:border-muted-foreground/40 hover:bg-muted/50"
                      }`}
                    >
                      <span className="text-sm font-medium">{t.label}</span>
                      <span className="text-[11px] text-muted-foreground leading-tight">{t.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>연결 요구사항 (선택)</Label>
              <Select
                value={newReqId || "__none__"}
                onValueChange={(v) => setNewReqId(v === "__none__" ? "" : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="요구사항 선택 (선택)">
                    {newReqId ? (
                      <span className="truncate block max-w-[340px]">
                        {(reqData?.data ?? []).find((r) => String(r.requirementId) === newReqId)
                          ? `${(reqData?.data ?? []).find((r) => String(r.requirementId) === newReqId)?.systemId} — ${(reqData?.data ?? []).find((r) => String(r.requirementId) === newReqId)?.name}`
                          : ""}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">요구사항 선택 (선택)</span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">선택 안 함</SelectItem>
                  {(reqData?.data ?? []).map((r) => (
                    <SelectItem key={r.requirementId} value={String(r.requirementId)}>
                      {r.systemId} — {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>메모 (선택)</Label>
              <Textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="간단한 설명"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); resetForm(); }}>
              취소
            </Button>
            <Button onClick={handleCreate} disabled={!newTitle.trim() || createMutation.isPending}>
              {createMutation.isPending ? "생성 중..." : "생성 후 편집 →"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 수정 팝업 */}
      <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>설계서 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>설계서명</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
              />
            </div>
            <div className="space-y-1.5">
              <Label>설계 유형</Label>
              <Select value={editType} onValueChange={setEditType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DESIGN_TYPE_LIST.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>편집 도구</Label>
              <Select value={editToolType} onValueChange={setEditToolType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TOOL_TYPE_LIST.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>상태</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DESIGN_STATUS_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>취소</Button>
            <Button onClick={handleUpdate} disabled={!editTitle.trim() || updateMutation.isPending}>
              {updateMutation.isPending ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 */}
      {deleteTarget && (
        <ConfirmDialog
          open
          onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
          title="설계서 삭제"
          description={`"${deleteTarget.title}" 설계서를 삭제하시겠습니까?`}
          onConfirm={() => deleteMutation.mutate(deleteTarget.contentId)}
        />
      )}
    </div>
  );
}
