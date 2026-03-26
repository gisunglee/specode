"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Trash2, CheckCircle } from "lucide-react";
import { AI_TASK_STATUS_LABEL } from "@/lib/constants";
import { apiFetch, formatDate } from "@/lib/utils";
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

const PLAN_TYPES = [
  { value: "IA",      label: "IA (정보구조)" },
  { value: "PROCESS", label: "PROCESS (프로세스)" },
  { value: "MOCKUP",  label: "MOCKUP (목업)" },
  { value: "ERD",     label: "ERD (데이터 모델)" },
];

const PLAN_TYPE_COLORS: Record<string, string> = {
  IA:      "bg-blue-100 text-blue-700",
  PROCESS: "bg-amber-100 text-amber-700",
  MOCKUP:  "bg-purple-100 text-purple-700",
  ERD:     "bg-emerald-100 text-emerald-700",
};

interface PlanningRow {
  planSn:        number;
  planNm:        string;
  planType:      string | null;
  groupUuid:     string;
  sortOrd:       number;
  isPicked:      boolean;
  reqCount:      number;
  reqMaps:       { requirement: { systemId: string; name: string } }[];
  createdAt:     string;
  latestTask:    { taskStatus: string; taskType: string; completedAt: string | null } | null;
}

interface GroupOption {
  groupUuid: string;
  planNm:    string;
}

export default function PlanningPage() {
  const router      = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<PlanningRow | null>(null);

  const [formPlanNm,    setFormPlanNm]    = useState("");
  const [formPlanType,  setFormPlanType]  = useState<string>("IA");
  const [formManualInfo, setFormManualInfo] = useState("");
  // "new" 또는 선택한 groupUuid 문자열
  const [formGroupMode, setFormGroupMode] = useState<string>("new");

  const { data, isLoading } = useQuery({
    queryKey: ["planning", page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/planning?${params}`);
      return res.json();
    },
  });

  // 기존 그룹 목록 (그룹 UUID 선택 시)
  const groupOptions: GroupOption[] = (data?.data ?? []).reduce(
    (acc: GroupOption[], row: PlanningRow) => {
      if (!acc.find((g) => g.groupUuid === row.groupUuid)) {
        acc.push({ groupUuid: row.groupUuid, planNm: row.planNm });
      }
      return acc;
    },
    []
  );

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<{ data: { planSn: number } }>("/api/planning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: (res: { data: { planSn: number } }) => {
      queryClient.invalidateQueries({ queryKey: ["planning"] });
      toast.success("기획이 등록되었습니다.");
      setDialogOpen(false);
      router.push(`/planning/${res.data.planSn}`);
    },
    onError: () => toast.error("등록에 실패했습니다."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/planning/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planning"] });
      toast.success("삭제되었습니다.");
      setDeleteItem(null);
    },
  });

  const openCreate = () => {
    setFormPlanNm("");
    setFormPlanType("IA");
    setFormManualInfo("");
    setFormGroupMode("new");
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formPlanNm.trim()) {
      toast.error("기획명은 필수입니다.");
      return;
    }
    createMutation.mutate({
      planNm:    formPlanNm.trim(),
      planType:  formPlanType || null,
      manualInfo: formManualInfo.trim() || null,
      groupUuid: formGroupMode !== "new" ? formGroupMode : undefined,
    });
  };

  const columns: ColumnDef<PlanningRow, unknown>[] = [
    {
      accessorKey: "planNm",
      header: "기획명",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.planNm}</span>
      ),
    },
    {
      accessorKey: "planType",
      header: "타입",
      cell: ({ getValue }) => {
        const v = getValue() as string | null;
        if (!v) return <span className="text-muted-foreground">-</span>;
        return (
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${PLAN_TYPE_COLORS[v] ?? ""}`}>
            {v}
          </span>
        );
      },
      size: 100,
    },
    {
      accessorKey: "groupUuid",
      header: "그룹",
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {(getValue() as string).slice(0, 8)}
        </span>
      ),
      size: 90,
    },
    {
      accessorKey: "sortOrd",
      header: "순서",
      cell: ({ getValue }) => (
        <span className="text-muted-foreground text-center">{getValue() as number}</span>
      ),
      size: 60,
    },
    {
      accessorKey: "isPicked",
      header: "확정",
      cell: ({ getValue }) =>
        getValue() ? (
          <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
        ) : (
          <span className="text-muted-foreground text-center block">-</span>
        ),
      size: 55,
    },
    {
      accessorKey: "reqCount",
      header: "요구사항",
      cell: ({ getValue }) => (
        <span className="text-center font-medium">{getValue() as number}</span>
      ),
      size: 70,
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
        <h1 className="text-2xl font-bold">기획 보드</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          새 기획
        </Button>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          placeholder="기획명 검색..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <DataGrid
        columns={columns}
        data={data?.data ?? []}
        onRowClick={(row) => router.push(`/planning/${row.planSn}`)}
        pagination={data?.pagination}
        onPageChange={setPage}
        emptyMessage={isLoading ? "로딩 중..." : "등록된 기획이 없습니다."}
        getRowClassName={(row) =>
          row.isPicked ? "bg-green-500/5" : ""
        }
        dense={true}
      />

      {/* 등록 다이얼로그 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[85vw] max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle>새 기획</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">기획명 *</Label>
              <Input
                value={formPlanNm}
                onChange={(e) => setFormPlanNm(e.target.value)}
                placeholder="예: 회원 관리 - 목록 화면"
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">타입</Label>
                <Select value={formPlanType} onValueChange={setFormPlanType}>
                  <SelectTrigger>
                    <SelectValue placeholder="타입 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAN_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">그룹</Label>
                <Select value={formGroupMode} onValueChange={setFormGroupMode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">새 그룹 (자동 생성)</SelectItem>
                    {groupOptions.map((g) => (
                      <SelectItem key={g.groupUuid} value={g.groupUuid}>
                        {g.planNm} ({g.groupUuid.slice(0, 8)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formGroupMode !== "new" && formGroupMode !== "" && (
                  <p className="text-xs text-muted-foreground">
                    선택한 그룹에 연속 기획으로 추가됩니다.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">상세 아이디어 (manual_info)</Label>
              <Textarea
                value={formManualInfo}
                onChange={(e) => setFormManualInfo(e.target.value)}
                placeholder="이 화면에서 다루고자 하는 주요 기능과 아이디어를 자유롭게 작성하세요."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border flex-shrink-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending}>
              {createMutation.isPending ? "저장중..." : "저장 후 캔버스 열기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={() => setDeleteItem(null)}
        title="기획 삭제"
        description={`"${deleteItem?.planNm}"을(를) 삭제하시겠습니까?`}
        variant="destructive"
        confirmLabel="삭제"
        onConfirm={() => deleteItem && deleteMutation.mutate(deleteItem.planSn)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
