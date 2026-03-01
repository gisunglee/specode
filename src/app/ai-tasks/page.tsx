"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { DataGrid } from "@/components/common/DataGrid";
import { formatDateTime } from "@/lib/utils";
import type { ColumnDef } from "@tanstack/react-table";

interface AiTaskRow {
  aiTaskId: number;
  systemId: string;
  functionId: number;
  taskType: string;
  taskStatus: string;
  requestedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  function: {
    systemId: string;
    name: string;
    displayCode: string | null;
  };
}

const TASK_TYPE_LABEL: Record<string, string> = {
  REVIEW: "설계검토",
  IMPLEMENT: "코드구현",
  IMPACT: "영향도분석",
  REPROCESS: "재처리",
};

const TASK_STATUS_LABEL: Record<string, { label: string; class: string }> = {
  PENDING: { label: "대기", class: "text-muted-foreground" },
  RUNNING: { label: "진행중", class: "text-blue-600 animate-pulse-glow" },
  DONE: { label: "완료", class: "text-emerald-400" },
  FAILED: { label: "실패", class: "text-red-400" },
};

const STATUS_TABS = [
  { value: "", label: "전체" },
  { value: "PENDING", label: "대기" },
  { value: "RUNNING", label: "진행중" },
  { value: "DONE", label: "완료" },
  { value: "FAILED", label: "실패" },
];

export default function AiTasksPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["ai-tasks", page, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20",
      });
      if (statusFilter) params.set("taskStatus", statusFilter);
      const res = await fetch(`/api/ai-tasks?${params}`);
      return res.json();
    },
    refetchInterval: 10000,
  });

  const calcDuration = (start: string | null, end: string | null) => {
    if (!start) return "-";
    const s = new Date(start).getTime();
    const e = end ? new Date(end).getTime() : Date.now();
    const diff = Math.round((e - s) / 1000 / 60);
    if (diff < 1) return "<1분";
    return `${diff}분`;
  };

  const columns: ColumnDef<AiTaskRow, unknown>[] = [
    { accessorKey: "systemId", header: "작업 ID", size: 100 },
    {
      id: "function",
      header: "대상 기능",
      cell: ({ row }) => (
        <span
          className="text-primary hover:underline cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/functions/${row.original.functionId}`);
          }}
        >
          {row.original.function.systemId} {row.original.function.name}
        </span>
      ),
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
      size: 80,
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
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">AI 작업 현황</h1>

      <div className="flex flex-wrap gap-1 p-1 bg-muted/50 rounded-lg w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setStatusFilter(tab.value);
              setPage(1);
            }}
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
