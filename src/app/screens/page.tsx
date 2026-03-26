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
import { Plus, Search, Trash2, Pencil, List, Layers, Loader2, LayoutDashboard } from "lucide-react";
import { useForm } from "react-hook-form";
import { DataGrid } from "@/components/common/DataGrid";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import {
  DialogDescription,
} from "@/components/ui/dialog";
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
import { SCREEN_TYPES, AI_TASK_STATUS_LABEL } from "@/lib/constants";
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
  unitWorkId: number | null;
  requirement: { name: string; systemId: string };
  unitWork: { unitWorkId: number; systemId: string; name: string } | null;
  _count: { areas: number };
  categoryL: string | null;
  categoryM: string | null;
  updatedAt: string;
  latestTask: { taskStatus: string; taskType: string; completedAt: string | null } | null;
}

interface UnitWorkOption {
  unitWorkId: number;
  systemId: string;
  name: string;
  requirementId: number;
  requirement: { systemId: string; name: string };
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
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [mockupDialogOpen, setMockupDialogOpen] = useState(false);
  const [mockupComment, setMockupComment] = useState("");

  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      name: "",
      displayCode: "",
      screenType: "LIST",
      unitWorkId: "",
    },
  });

  const { data: uwData } = useQuery({
    queryKey: ["unit-works-all"],
    queryFn: () => apiFetch<{ data: UnitWorkOption[] }>("/api/unit-works?pageSize=200"),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["screens", page, search, filterReqId],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: "25" });
      if (search) params.set("search", search);
      if (filterReqId) params.set("unitWorkId", filterReqId);
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
    mutationFn: (id: number) => apiFetch(`/api/screens/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["screens"] });
      toast.success("삭제되었습니다.");
      setDeleteItem(null);
    },
  });

  const mockupMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(
        ids.map((id) =>
          apiFetch(`/api/screens/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "MOCKUP_REQ", comment: mockupComment.trim() || null }),
          })
        )
      );
    },
    onSuccess: () => {
      toast.success(`${selectedIds.size}개 화면 목업 요청이 등록되었습니다.`);
      setMockupDialogOpen(false);
      setMockupComment("");
      setSelectedIds(new Set());
    },
    onError: () => toast.error("목업 요청 중 오류가 발생했습니다."),
  });

  const openCreate = () => {
    setEditItem(null);
    reset({ name: "", displayCode: "", screenType: "LIST", unitWorkId: "" });
    setDialogOpen(true);
  };

  const openEdit = (row: ScreenRow) => {
    setEditItem(row);
    reset({
      name: row.name,
      displayCode: row.displayCode || "",
      screenType: row.screenType || "LIST",
      unitWorkId: row.unitWorkId ? String(row.unitWorkId) : "",
    });
    setDialogOpen(true);
  };

  const onSubmit = (formData: {
    name: string;
    displayCode: string;
    screenType: string;
    unitWorkId: string;
  }) => {
    const unitWork = unitWorks.find((u) => String(u.unitWorkId) === formData.unitWorkId);
    const payload = {
      name: formData.name,
      displayCode: formData.displayCode,
      screenType: formData.screenType,
      unitWorkId: formData.unitWorkId ? parseInt(formData.unitWorkId) : null,
      requirementId: unitWork?.requirementId ?? editItem?.requirementId ?? 0,
    };
    if (editItem) {
      updateMutation.mutate({ id: editItem.screenId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const unitWorks = uwData?.data ?? [];

  const rows: ScreenRow[] = data?.data ?? [];
  const allPageSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.screenId));

  const toggleAll = () => {
    if (allPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        rows.forEach((r) => next.delete(r.screenId));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        rows.forEach((r) => next.add(r.screenId));
        return next;
      });
    }
  };

  const columns: ColumnDef<ScreenRow, unknown>[] = [
    {
      id: "select",
      header: () => (
        <Checkbox
          checked={allPageSelected}
          onCheckedChange={toggleAll}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedIds.has(row.original.screenId)}
          onCheckedChange={() => {
            setSelectedIds((prev) => {
              const next = new Set(prev);
              if (next.has(row.original.screenId)) next.delete(row.original.screenId);
              else next.add(row.original.screenId);
              return next;
            });
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      size: 40,
      enableSorting: false,
    },
    { accessorKey: "systemId", header: "ID", size: 100 },
    {
      id: "unitWork",
      header: "단위업무",
      size: 150,
      cell: ({ row }) => {
        const uw = row.original.unitWork;
        const prevUwId = rows[row.index - 1]?.unitWork?.unitWorkId;
        if (!uw || prevUwId === uw.unitWorkId) return null;
        return (
          <span className="text-muted-foreground text-xs">
            {`[${uw.systemId}] ${uw.name}`}
          </span>
        );
      },
    },
    { accessorKey: "displayCode", header: "표시코드", size: 100 },
    {
      accessorKey: "categoryL",
      header: "대분류",
      cell: ({ getValue }) => (
        <span className="text-muted-foreground text-xs">{getValue() as string ?? "-"}</span>
      ),
      size: 100,
    },
    {
      accessorKey: "categoryM",
      header: "중분류",
      cell: ({ getValue }) => (
        <span className="text-muted-foreground text-xs">{getValue() as string ?? "-"}</span>
      ),
      size: 100,
    },
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
      header: "영역 수",
      cell: ({ row }) => row.original._count?.areas ?? 0,
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
            title="시스템 일괄 설계"
            onClick={(e) => {
              e.stopPropagation();
              const uwId = row.original.unitWork?.unitWorkId;
              router.push(uwId ? `/bulk-design?unitWorkId=${uwId}` : "/bulk-design");
            }}
          >
            <LayoutDashboard className="h-4 w-4 text-violet-500" />
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (selectedIds.size === 0) { toast.info("목업을 요청할 화면을 선택하세요."); return; }
              setMockupDialogOpen(true);
            }}
          >
            <Layers className="h-4 w-4 mr-1" />
            목업 요청{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            화면 등록
          </Button>
        </div>
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
            <SelectValue placeholder="단위업무: 전체" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">전체</SelectItem>
            {unitWorks.map((u) => (
              <SelectItem key={u.unitWorkId} value={String(u.unitWorkId)}>
                [{u.requirement.systemId}] {u.name}
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
        data={rows}
        onRowClick={(row) => router.push(`/screens/${row.screenId}`)}
        pagination={data?.pagination}
        onPageChange={setPage}
        emptyMessage={isLoading ? "로딩 중..." : "등록된 화면이 없습니다."}
        dense={true}
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
              <Label>단위업무</Label>
              <Select
                value={watch("unitWorkId")}
                onValueChange={(v) => setValue("unitWorkId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="단위업무 선택 (선택)" />
                </SelectTrigger>
                <SelectContent>
                  {unitWorks.map((u) => (
                    <SelectItem key={u.unitWorkId} value={String(u.unitWorkId)}>
                      [{u.requirement.systemId}] {u.name}
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

      {/* ── 목업 요청 다이얼로그 ──────────────────────────────── */}
      <Dialog open={mockupDialogOpen} onOpenChange={setMockupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>목업 요청 ({selectedIds.size}개 화면)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              선택된 화면의 영역·기능 설계 내용을 AI에게 전달하여 HTML 목업을 생성합니다.
            </p>
            <div className="space-y-1">
              <Label>추가 요청사항 (선택)</Label>
              <Textarea
                placeholder="AI에게 전달할 추가 지시사항..."
                value={mockupComment}
                onChange={(e) => setMockupComment(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMockupDialogOpen(false)}>취소</Button>
            <Button
              disabled={mockupMutation.isPending}
              onClick={() => mockupMutation.mutate([...selectedIds])}
            >
              {mockupMutation.isPending ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />요청 중...</> : "목업 요청"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 화면 삭제 다이얼로그 ──────────────────────────────── */}
      {deleteItem && (() => {
        const areaCount = deleteItem._count?.areas ?? 0;
        if (areaCount > 0) {
          return (
            <Dialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>화면 삭제 불가</DialogTitle>
                  <DialogDescription>
                    <span className="font-medium text-foreground">&quot;{deleteItem.name}&quot;</span>에 연결된{" "}
                    <span className="font-semibold text-destructive">{areaCount}개</span>의 영역이 있습니다.
                    <br />영역에서 화면 연결을 해제한 후 삭제할 수 있습니다.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button onClick={() => setDeleteItem(null)}>확인</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          );
        }
        return (
          <ConfirmDialog
            open={!!deleteItem}
            onOpenChange={() => setDeleteItem(null)}
            title="화면 삭제"
            description={`"${deleteItem.name}"을(를) 삭제하시겠습니까?`}
            variant="destructive"
            confirmLabel="삭제"
            onConfirm={() => deleteMutation.mutate(deleteItem.screenId)}
            loading={deleteMutation.isPending}
          />
        );
      })()}
    </div>
  );
}
