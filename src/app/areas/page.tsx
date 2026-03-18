"use client";

import { Suspense, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, Trash2, Wand2 } from "lucide-react";

import { DataGrid } from "@/components/common/DataGrid";
import { ExcalidrawDialog } from "@/components/common/ExcalidrawDialog";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { AREA_TYPES, AREA_STATUS_LABEL, AI_TASK_STATUS_LABEL } from "@/lib/constants";
import { apiFetch, formatDate } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";

interface AreaRow {
  areaId: number;
  areaCode: string;
  name: string;
  areaType: string;
  status: string;
  updatedAt: string;
  designData: string | null;
  screen: { screenId: number; name: string; systemId: string } | null;
  _count: { functions: number };
  latestTask: { taskStatus: string; taskType: string; completedAt: string | null } | null;
}

interface ScreenOption {
  screenId: number;
  systemId: string;
  name: string;
}

function AreaStatusBadge({ status }: { status: string }) {
  const cfg = AREA_STATUS_LABEL[status] ?? { label: status, class: "bg-zinc-100 text-zinc-500" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.class}`}>
      {cfg.label}
    </span>
  );
}

export default function AreasPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          로딩 중...
        </div>
      }
    >
      <AreasContent />
    </Suspense>
  );
}

function AreasContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const initialScreenId = searchParams.get("screenId") || "";

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [screenFilter, setScreenFilter] = useState(initialScreenId);
  const [statusFilter, setStatusFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<AreaRow | null>(null);
  const [deleteMode, setDeleteMode] = useState<"cascade" | "detach">("detach");
  const [designReqItem, setDesignReqItem] = useState<AreaRow | null>(null);
  const [designComment, setDesignComment] = useState("");

  const [createForm, setCreateForm] = useState({
    name: "",
    areaType: "GRID",
    screenId: initialScreenId,
  });

  /* ─── 영역 목록 조회 ────────────────────────────────────── */
  const { data, isLoading } = useQuery({
    queryKey: ["areas", page, search, screenFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: "10" });
      if (search) params.set("search", search);
      if (screenFilter) params.set("screenId", screenFilter);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/areas?${params}`);
      return res.json();
    },
    gcTime: 0,
  });

  /* ─── 화면 목록 조회 (필터 콤보박스용) ────────────────────── */
  const { data: screensData } = useQuery({
    queryKey: ["screens-all"],
    queryFn: async () => {
      const res = await fetch("/api/screens?pageSize=200");
      return res.json();
    },
  });
  const screens: ScreenOption[] = screensData?.data ?? [];

  /* ─── 영역 등록 뮤테이션 ─────────────────────────────────── */
  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<{ data: { areaId: number } }>("/api/areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: (result) => {
      setCreateOpen(false);
      router.push(`/areas/${result.data.areaId}`);
    },
  });

  /* ─── 디자인 설계 저장 뮤테이션 ────────────────────────────── */
  const saveDesignMutation = useMutation({
    mutationFn: ({ id, json }: { id: number; json: string }) =>
      apiFetch(`/api/areas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ designData: json }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      toast.success("설계 도안이 저장되었습니다.");
    },
  });

  /* ─── 설계 요청 뮤테이션 ─────────────────────────────────── */
  const designReqMutation = useMutation({
    mutationFn: ({ id, comment }: { id: number; comment: string }) =>
      apiFetch(`/api/areas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DESIGN_REQ", comment: comment.trim() || null }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      toast.success("설계 요청이 등록되었습니다.");
      setDesignReqItem(null);
      setDesignComment("");
    },
    onError: () => toast.error("설계 요청에 실패했습니다."),
  });

  /* ─── 영역 삭제 뮤테이션 ─────────────────────────────────── */
  const deleteMutation = useMutation({
    mutationFn: ({ id, mode }: { id: number; mode?: "cascade" | "detach" }) => {
      const url = mode ? `/api/areas/${id}?mode=${mode}` : `/api/areas/${id}`;
      return apiFetch(url, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      toast.success("삭제되었습니다.");
      setDeleteItem(null);
    },
  });

  const handleCreate = () => {
    if (!createForm.name || !createForm.screenId) return;
    createMutation.mutate({
      name: createForm.name,
      areaType: createForm.areaType,
      screenId: parseInt(createForm.screenId),
    });
  };

  /* ─── 테이블 컬럼 정의 ───────────────────────────────────── */
  const columns: ColumnDef<AreaRow, unknown>[] = [
    { accessorKey: "areaCode", header: "영역코드", size: 110 },
    {
      id: "screen",
      header: "소속 화면",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.screen?.name ?? "-"}
        </span>
      ),
    },
    { accessorKey: "name", header: "영역명" },
    {
      accessorKey: "areaType",
      header: "유형",
      cell: ({ getValue }) => {
        const v = getValue() as string;
        return (
          <span className="text-muted-foreground">
            {AREA_TYPES.find((t) => t.value === v)?.label ?? v}
          </span>
        );
      },
      size: 80,
    },
    {
      accessorKey: "status",
      header: "상태",
      cell: ({ getValue }) => <AreaStatusBadge status={getValue() as string} />,
      size: 100,
    },
    {
      id: "funcCount",
      header: "기능 수",
      cell: ({ row }) => row.original._count?.functions ?? 0,
      size: 70,
    },
    {
      id: "latestAi",
      header: "AI 결과",
      cell: ({ row }) => {
        const latest = row.original.latestTask;
        if (!latest) return <span className="text-muted-foreground">-</span>;
        const cfg = AI_TASK_STATUS_LABEL[latest.taskStatus];
        return (
          <div>
            <span className={`text-xs ${cfg?.class ?? ""}`}>{cfg?.label ?? latest.taskStatus}</span>
            {latest.completedAt && (
              <p className="text-[11px] text-muted-foreground">{formatDate(latest.completedAt)}</p>
            )}
          </div>
        );
      },
      size: 120,
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
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <ExcalidrawDialog
            value={row.original.designData}
            onSave={(json) => saveDesignMutation.mutate({ id: row.original.areaId, json })}
            saving={saveDesignMutation.isPending}
            showText={false}
          />
          <Button
            variant="ghost"
            size="icon"
            title="설계 요청"
            onClick={(e) => {
              e.stopPropagation();
              setDesignComment("");
              setDesignReqItem(row.original);
            }}
          >
            <Wand2 className="h-4 w-4 text-violet-500" />
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
      {/* ── 타이틀 ─────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">영역 관리</h1>
        <Button onClick={() => {
          setCreateForm({ name: "", areaType: "GRID", screenId: screenFilter });
          setCreateOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-1" />
          영역 등록
        </Button>
      </div>

      {/* ── 검색 + 필터 ────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="영역명, 영역코드 검색..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select
          value={screenFilter || "ALL"}
          onValueChange={(v) => { setScreenFilter(v === "ALL" ? "" : v); setPage(1); }}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="화면: 전체" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">화면: 전체</SelectItem>
            {screens.map((s) => (
              <SelectItem key={s.screenId} value={String(s.screenId)}>
                {s.systemId} {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter || "ALL"}
          onValueChange={(v) => { setStatusFilter(v === "ALL" ? "" : v); setPage(1); }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="상태: 전체" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">상태: 전체</SelectItem>
            {Object.entries(AREA_STATUS_LABEL).map(([value, cfg]) => (
              <SelectItem key={value} value={value}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── 데이터 그리드 ──────────────────────────────── */}
      <DataGrid
        columns={columns}
        data={data?.data ?? []}
        onRowClick={(row) => router.push(`/areas/${row.areaId}`)}
        pagination={data?.pagination}
        onPageChange={setPage}
        emptyMessage={isLoading ? "로딩 중..." : "등록된 영역이 없습니다."}
        dense={true}
      />

      {/* ── 영역 등록 다이얼로그 ────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>영역 등록</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">영역명 *</Label>
              <Input
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="영역명"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">영역 유형 *</Label>
              <Select
                value={createForm.areaType}
                onValueChange={(v) => setCreateForm((f) => ({ ...f, areaType: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AREA_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">소속 화면 *</Label>
              <Select
                value={createForm.screenId || "NONE"}
                onValueChange={(v) => setCreateForm((f) => ({ ...f, screenId: v === "NONE" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="화면 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">
                    <span className="text-muted-foreground">— 화면 선택 —</span>
                  </SelectItem>
                  {screens.map((s) => (
                    <SelectItem key={s.screenId} value={String(s.screenId)}>
                      {s.systemId} {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>취소</Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || !createForm.name || !createForm.screenId}
            >
              {createMutation.isPending ? "등록중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 설계 요청 다이얼로그 ────────────────────────── */}
      {designReqItem && (
        <Dialog open={!!designReqItem} onOpenChange={() => setDesignReqItem(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>AI 설계 요청</DialogTitle>
              <DialogDescription>
                <span className="font-medium text-foreground">{designReqItem.areaCode} {designReqItem.name}</span>의
                상태를 <span className="font-medium text-foreground">설계 요청</span>으로 변경하고 AI 태스크를 생성합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5 py-2">
              <Label className="text-xs">추가 요청사항 (선택)</Label>
              <Textarea
                value={designComment}
                onChange={(e) => setDesignComment(e.target.value)}
                placeholder="AI에게 전달할 추가 요청사항을 입력하세요"
                rows={3}
                className="text-sm resize-none"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDesignReqItem(null)} disabled={designReqMutation.isPending}>
                취소
              </Button>
              <Button
                onClick={() => designReqMutation.mutate({ id: designReqItem.areaId, comment: designComment })}
                disabled={designReqMutation.isPending}
              >
                {designReqMutation.isPending ? "요청 중..." : "설계 요청"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── 영역 삭제 다이얼로그 ────────────────────────── */}
      {deleteItem && (() => {
        const funcCount = deleteItem._count?.functions ?? 0;
        if (funcCount === 0) {
          return (
            <ConfirmDialog
              open={!!deleteItem}
              onOpenChange={() => setDeleteItem(null)}
              title="영역 삭제"
              description={`"${deleteItem.name}"을(를) 삭제하시겠습니까?`}
              variant="destructive"
              confirmLabel="삭제"
              onConfirm={() => deleteMutation.mutate({ id: deleteItem.areaId })}
              loading={deleteMutation.isPending}
            />
          );
        }
        return (
          <Dialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>영역 삭제</DialogTitle>
                <DialogDescription>
                  <span className="font-medium text-foreground">&quot;{deleteItem.name}&quot;</span>에 연결된{" "}
                  <span className="font-semibold text-destructive">{funcCount}건</span>의 기능이 있습니다.
                  <br />어떻게 처리하시겠습니까?
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-2">
                <button
                  onClick={() => setDeleteMode("cascade")}
                  className={`w-full text-left rounded-lg border px-4 py-3 text-sm transition-colors cursor-pointer ${
                    deleteMode === "cascade"
                      ? "border-destructive bg-destructive/5 text-destructive"
                      : "border-border hover:border-destructive/50"
                  }`}
                >
                  <p className="font-medium">전체 삭제 (기능도 함께 삭제)</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    영역과 연결된 기능 {funcCount}건이 모두 삭제됩니다.
                  </p>
                </button>
                <button
                  onClick={() => setDeleteMode("detach")}
                  className={`w-full text-left rounded-lg border px-4 py-3 text-sm transition-colors cursor-pointer ${
                    deleteMode === "detach"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <p className="font-medium">영역만 삭제 (기능 유지)</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    기능 {funcCount}건의 영역 연결이 해제되고 기능은 유지됩니다.
                  </p>
                </button>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteItem(null)} disabled={deleteMutation.isPending}>
                  취소
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteMutation.mutate({ id: deleteItem.areaId, mode: deleteMode })}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? "처리중..." : "삭제"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
}
