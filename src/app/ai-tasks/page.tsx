"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { DataGrid } from "@/components/common/DataGrid";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { apiFetch, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";

/* ─── 로컬 타입 (AI현황 페이지 전용) ──────────────────────── */

interface AiTaskRow {
  aiTaskId: number;
  systemId: string;
  refTableName: string;
  refPkId: number;
  taskType: string;
  taskStatus: string;
  requestedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  target: {
    systemId: string;
    name?: string;   // tb_function
    title?: string;  // tb_standard_guide
    displayCode?: string | null;
    category?: string;
  } | null;
}

/* ─── 상수 ─────────────────────────────────────────────────── */

const TASK_TYPE_LABEL: Record<string, string> = {
  DESIGN:    "설계요청",
  REVIEW:    "설계검토",
  IMPLEMENT: "코드구현",
  IMPACT:    "영향도분석",
  REPROCESS: "재처리",
  INSPECT:   "가이드점검",
};

const REF_TABLE_LABEL: Record<string, string> = {
  tb_function:       "기능",
  tb_standard_guide: "가이드",
};

const TASK_STATUS_LABEL: Record<string, { label: string; class: string }> = {
  NONE:        { label: "⏳ 처리 대기",     class: "text-muted-foreground" },
  RUNNING:     { label: "🔄 진행중",        class: "text-blue-600 animate-pulse-glow" },
  SUCCESS:     { label: "✅ 완료! 문제없음", class: "text-emerald-600 font-medium" },
  AUTO_FIXED:  { label: "🔧 자동 수정 완료", class: "text-sky-600 font-medium" },
  NEEDS_CHECK: { label: "⚠️ 확인 필요",     class: "text-amber-600 font-medium" },
  WARNING:     { label: "⚠️ 주의사항 있음", class: "text-orange-500" },
  FAILED:      { label: "❌ 실패",           class: "text-red-500 font-medium" },
  CANCELLED:   { label: "🚫 취소됨",         class: "text-muted-foreground line-through" },
  PENDING:     { label: "⏳ 처리 대기",     class: "text-muted-foreground" },
  DONE:        { label: "✅ 완료",           class: "text-emerald-600" },
};

const STATUS_TABS = [
  { value: "",            label: "전체" },
  { value: "NONE",        label: "대기" },
  { value: "RUNNING",     label: "진행중" },
  { value: "NEEDS_CHECK", label: "확인 필요 ⚠️" },
  { value: "SUCCESS",     label: "완료" },
  { value: "AUTO_FIXED",  label: "자동수정" },
  { value: "WARNING",     label: "주의" },
  { value: "FAILED",      label: "실패" },
  { value: "CANCELLED",   label: "취소됨" },
];

/* ─── 메인 컴포넌트 ─────────────────────────────────────────── */

export default function AiTasksPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["ai-tasks", page, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (statusFilter) params.set("taskStatus", statusFilter);
      const res = await fetch(`/api/ai-tasks?${params}`);
      return res.json();
    },
    refetchInterval: 10000,
  });

  const cancelMutation = useMutation({
    mutationFn: (aiTaskId: number) =>
      apiFetch(`/api/ai-tasks/${aiTaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskStatus: "CANCELLED" }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-tasks"] });
      toast.success("작업이 취소되었습니다.");
    },
  });

  const { data: taskDetail, isLoading: taskDetailLoading } = useQuery({
    queryKey: ["ai-task-detail", selectedTaskId],
    queryFn: async () => {
      const res = await fetch(`/api/ai-tasks/${selectedTaskId}`);
      return res.json();
    },
    enabled: !!selectedTaskId,
  });

  const calcDuration = (start: string | null, end: string | null) => {
    if (!start) return "-";
    const s = new Date(start).getTime();
    const e = end ? new Date(end).getTime() : Date.now();
    const diff = Math.round((e - s) / 1000 / 60);
    if (diff < 1) return "<1분";
    return `${diff}분`;
  };

  /* 대상 엔티티 표시 라벨 */
  const getTargetLabel = (row: AiTaskRow) => {
    const tableLabel = REF_TABLE_LABEL[row.refTableName] ?? row.refTableName;
    if (!row.target) return `[${tableLabel}] #${row.refPkId}`;
    if (row.refTableName === "tb_function") {
      return `${row.target.systemId} ${row.target.name ?? ""}`;
    }
    if (row.refTableName === "tb_standard_guide") {
      return `${row.target.systemId} ${row.target.title ?? ""}`;
    }
    return `${row.target.systemId}`;
  };

  /* 대상 엔티티 링크 경로 */
  const getTargetHref = (row: AiTaskRow) => {
    if (row.refTableName === "tb_function") return `/functions/${row.refPkId}`;
    if (row.refTableName === "tb_standard_guide") return `/standard-guides?openGuide=${row.refPkId}`;
    return null;
  };

  const columns: ColumnDef<AiTaskRow, unknown>[] = [
    {
      accessorKey: "systemId",
      header: "작업 ID",
      size: 100,
      cell: ({ row }) => (
        <span
          className="text-primary hover:underline cursor-pointer font-mono text-xs"
          onClick={(e) => { e.stopPropagation(); setSelectedTaskId(row.original.aiTaskId); }}
        >
          {row.original.systemId}
        </span>
      ),
    },
    {
      id: "refType",
      header: "유형",
      size: 70,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {REF_TABLE_LABEL[row.original.refTableName] ?? row.original.refTableName}
        </span>
      ),
    },
    {
      id: "target",
      header: "대상",
      cell: ({ row }) => {
        const href = getTargetHref(row.original);
        return (
          <span
            className={href ? "text-primary hover:underline cursor-pointer" : ""}
            onClick={href ? (e) => { e.stopPropagation(); router.push(href); } : undefined}
          >
            {getTargetLabel(row.original)}
          </span>
        );
      },
    },
    {
      accessorKey: "taskType",
      header: "작업유형",
      cell: ({ getValue }) => TASK_TYPE_LABEL[getValue() as string] ?? getValue(),
      size: 100,
    },
    {
      accessorKey: "taskStatus",
      header: "상태",
      cell: ({ getValue }) => {
        const status = getValue() as string;
        const config = TASK_STATUS_LABEL[status];
        return (
          <span className={config?.class ?? ""}>
            {config?.label ?? status}
          </span>
        );
      },
      size: 130,
    },
    {
      accessorKey: "requestedAt",
      header: "요청시각",
      cell: ({ getValue }) => (
        <span className="text-muted-foreground text-xs">
          {formatDateTime(getValue() as string)}
        </span>
      ),
      size: 130,
    },
    {
      accessorKey: "completedAt",
      header: "완료시각",
      cell: ({ getValue }) => {
        const v = getValue() as string | null;
        return (
          <span className="text-muted-foreground text-xs">
            {v ? formatDateTime(v) : "-"}
          </span>
        );
      },
      size: 130,
    },
    {
      id: "duration",
      header: "소요",
      cell: ({ row }) =>
        calcDuration(row.original.startedAt, row.original.completedAt),
      size: 60,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        if (row.original.taskStatus !== "NONE") return null;
        return (
          <Button
            variant="ghost"
            size="icon"
            title="작업 취소"
            onClick={(e) => {
              e.stopPropagation();
              cancelMutation.mutate(row.original.aiTaskId);
            }}
            disabled={cancelMutation.isPending}
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </Button>
        );
      },
      size: 50,
      enableSorting: false,
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">AI 작업 현황</h1>

      <div className="flex flex-wrap gap-1 p-1 bg-muted/50 rounded-lg w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setStatusFilter(tab.value); setPage(1); }}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              statusFilter === tab.value
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <DataGrid
        columns={columns}
        data={data?.data ?? []}
        pagination={data?.pagination}
        onPageChange={setPage}
        emptyMessage={isLoading ? "로딩 중..." : "AI 작업이 없습니다."}
      />
    </div>
  );
}
