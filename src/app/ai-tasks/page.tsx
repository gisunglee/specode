"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { X, RotateCcw } from "lucide-react";
import { DataGrid } from "@/components/common/DataGrid";
import { MarkdownEditor } from "@/components/common/MarkdownEditor";
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

/* ─── Spec 파싱 헬퍼 ───────────────────────────────────────── */

function parseSpec(spec: string): { isJson: boolean; markdown: string } {
  try {
    const parsed = JSON.parse(spec);

    // PLANNING 전용 포맷 (planType 필드 존재 시)
    if (parsed.planType !== undefined) {
      const lines: string[] = [];
      lines.push(`## 기획 유형: ${parsed.planType}`);

      lines.push("\n### 상세 아이디어 (manualInfo)");
      lines.push(parsed.manualInfo?.trim() || "_없음_");

      lines.push("\n### AI 지시사항 (comment)");
      lines.push(parsed.comment?.trim() || "_없음_");

      if (Array.isArray(parsed.requirements) && parsed.requirements.length > 0) {
        lines.push(`\n### 연결 요구사항 (${parsed.requirements.length}건)`);
        for (const req of parsed.requirements) {
          lines.push(`\n---\n**${req.systemId} ${req.name}**`);
          if (req.detailSpec)   lines.push(`- **명세:** ${req.detailSpec.replace(/<[^>]+>/g, "")}`);
          if (req.discussionMd) lines.push(`- **협의:** ${req.discussionMd}`);
          if (req.content)      lines.push(`- **원문:** ${req.content.replace(/<[^>]+>/g, "")}`);
        }
      }

      if (parsed.prevContext) {
        lines.push("\n### 이전 기획 컨텍스트");
        lines.push(`**${parsed.prevContext.planNm}** (${parsed.prevContext.resultType})`);
      }

      return { isJson: true, markdown: lines.join("\n") };
    }

    // 그 외 JSON → 코드블록
    return {
      isJson: true,
      markdown: "```json\n" + JSON.stringify(parsed, null, 2) + "\n```",
    };
  } catch {
    return { isJson: false, markdown: spec };
  }
}

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
    systemId?: string;
    name?: string;       // tb_function, tb_area
    title?: string;      // tb_standard_guide
    areaCode?: string;   // tb_area
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
  PLANNING:  "기획생성",
};

const REF_TABLE_LABEL: Record<string, string> = {
  tb_function:       "기능",
  tb_standard_guide: "가이드",
  tb_area:           "영역화면설계",
  tb_planning_draft: "기획캔버스",
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
  const [specRawView, setSpecRawView] = useState(false);

  useEffect(() => { setSpecRawView(false); }, [selectedTaskId]);

  const { data, isLoading } = useQuery({
    queryKey: ["ai-tasks", page, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: "10" });
      if (statusFilter) params.set("taskStatus", statusFilter);
      const res = await fetch(`/api/ai-tasks?${params}`);
      return res.json();
    },
    refetchInterval: 10000,
  });

  const retryMutation = useMutation({
    mutationFn: (aiTaskId: number) =>
      apiFetch(`/api/ai-tasks/${aiTaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskStatus: "NONE" }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["ai-task-detail"] });
      toast.success("재실행 대기 상태로 변경되었습니다.");
    },
  });

  const forceFailMutation = useMutation({
    mutationFn: (aiTaskId: number) =>
      apiFetch(`/api/ai-tasks/${aiTaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskStatus: "FAILED" }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["ai-task-detail"] });
      toast.success("작업이 강제 종료되었습니다.");
    },
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

  const deleteMutation = useMutation({
    mutationFn: (aiTaskId: number) =>
      apiFetch(`/api/ai-tasks/${aiTaskId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-tasks"] });
      toast.success("작업이 삭제되었습니다.");
      setSelectedTaskId(null);
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
    if (diff < 1) return "1분 미만";
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
    if (row.refTableName === "tb_area") {
      return `${row.target.areaCode ?? ""} ${row.target.name ?? ""}`.trim();
    }
    if (row.refTableName === "tb_planning_draft") {
      return (row.target as { planNm?: string }).planNm ?? `#${row.refPkId}`;
    }
    return `${row.target.systemId ?? `#${row.refPkId}`}`;
  };

  /* 대상 엔티티 링크 경로 */
  const getTargetHref = (row: AiTaskRow) => {
    if (row.refTableName === "tb_function") return `/functions/${row.refPkId}`;
    if (row.refTableName === "tb_standard_guide") return `/standard-guides?openGuide=${row.refPkId}`;
    if (row.refTableName === "tb_area") return `/areas/${row.refPkId}`;
    if (row.refTableName === "tb_planning_draft") return `/planning/${row.refPkId}`;
    return null;
  };

  const columns: ColumnDef<AiTaskRow, unknown>[] = [
    {
      accessorKey: "systemId",
      header: "작업 ID",
      size: 100,
      cell: ({ row }) => (
        <span className="text-primary font-mono text-xs">
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
        const { taskStatus, aiTaskId } = row.original;
        const RETRYABLE = ["FAILED", "NEEDS_CHECK", "WARNING", "CANCELLED"];
        return (
          <div className="flex items-center gap-1 h-5">
            {RETRYABLE.includes(taskStatus) && (
              <button
                title="재실행"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm("다시 실행하겠습니까?")) {
                    retryMutation.mutate(aiTaskId);
                  }
                }}
                disabled={retryMutation.isPending}
                className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted transition-colors disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5 text-blue-500" />
              </button>
            )}
            {taskStatus === "NONE" && (
              <button
                title="작업 취소"
                onClick={(e) => {
                  e.stopPropagation();
                  cancelMutation.mutate(aiTaskId);
                }}
                disabled={cancelMutation.isPending}
                className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted transition-colors disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        );
      },
      size: 60,
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
        onRowClick={(row) => setSelectedTaskId(row.aiTaskId)}
        emptyMessage={isLoading ? "로딩 중..." : "AI 작업이 없습니다."}
        spacious
      />

      {/* ── 상세 팝업 다이얼로그 ─────────────────────────────── */}
      <Dialog open={!!selectedTaskId} onOpenChange={() => setSelectedTaskId(null)}>
        <DialogContent className="max-w-[96vw] max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
            <DialogTitle>
              AI 작업 현황 상세 - {taskDetail?.data?.systemId || "로딩 중..."}
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 px-6 py-5">
            {!taskDetailLoading && taskDetail?.data ? (
              <div className="space-y-6">
                {/* 메타 정보 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-muted/30 p-4 rounded-lg border border-border/50">
                  <div>
                    <span className="text-muted-foreground mr-2 font-medium">상태:</span>
                    <span className={TASK_STATUS_LABEL[taskDetail.data.taskStatus]?.class || ""}>
                      {TASK_STATUS_LABEL[taskDetail.data.taskStatus]?.label || taskDetail.data.taskStatus}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground mr-2 font-medium">요청시각:</span>
                    <span>{formatDateTime(taskDetail.data.requestedAt)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground mr-2 font-medium">완료시각:</span>
                    <span>{taskDetail.data.completedAt ? formatDateTime(taskDetail.data.completedAt) : "-"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground mr-2 font-medium">작업유형:</span>
                    <span>{TASK_TYPE_LABEL[taskDetail.data.taskType] || taskDetail.data.taskType}</span>
                  </div>
                </div>

                {/* 요청 코멘트 (전체 너비, 상단 배치) */}
                {taskDetail.data.comment && (
                  <div className="space-y-1.5">
                    <span className="text-sm font-semibold text-amber-600">요청 코멘트</span>
                    <div className="rounded-md bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-foreground">
                      {taskDetail.data.comment}
                    </div>
                  </div>
                )}

                {/* 명세 및 피드백 (2-컬럼 레이아웃) */}
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* 왼쪽: 명세서 */}
                  <div className="min-w-0 space-y-1.5">
                    {(() => {
                      const { isJson, markdown } = parseSpec(taskDetail.data.spec || "");
                      const prettyJson = (() => {
                        try { return JSON.stringify(JSON.parse(taskDetail.data.spec || ""), null, 2); }
                        catch { return taskDetail.data.spec || ""; }
                      })();
                      const displayValue = specRawView
                        ? ("```json\n" + prettyJson + "\n```")
                        : markdown;
                      return (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-muted-foreground">작업 명세서 (Spec)</span>
                            {isJson && (
                              <button
                                type="button"
                                onClick={() => setSpecRawView((v) => !v)}
                                className="text-xs px-1.5 py-0.5 rounded border border-border hover:bg-muted transition-colors font-mono"
                              >
                                {specRawView ? "MD" : "JSON"}
                              </button>
                            )}
                          </div>
                          <MarkdownEditor value={displayValue} readOnly rows={20} />
                        </>
                      );
                    })()}
                  </div>

                  {/* 오른쪽: AI 피드백 */}
                  <div className="min-w-0">
                    <MarkdownEditor
                      value={taskDetail.data.feedback || ""}
                      label="AI 피드백 (Feedback 결과)"
                      readOnly
                      rows={20}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 flex items-center justify-center text-muted-foreground text-sm">
                상세 정보를 불러오는 중입니다...
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-3 border-t border-border shrink-0 bg-muted/30 flex justify-between sm:justify-between w-full">
            <Button
              variant="destructive"
              onClick={() => {
                if (window.confirm("삭제 하시겠습니까?")) {
                  if (selectedTaskId) deleteMutation.mutate(selectedTaskId);
                }
              }}
              disabled={deleteMutation.isPending}
            >
              삭제
            </Button>

            {/* 상태별 액션 버튼 */}
            {taskDetail?.data && (() => {
              const status = taskDetail.data.taskStatus;
              const id = taskDetail.data.aiTaskId;
              const RETRYABLE = ["FAILED", "NEEDS_CHECK", "WARNING", "CANCELLED", "RUNNING"];
              return (
                <div className="flex items-center gap-2">
                  {status === "RUNNING" && (
                    <Button
                      variant="outline"
                      className="text-red-500 border-red-200 hover:bg-red-50"
                      onClick={() => {
                        if (window.confirm("진행중 작업을 강제 종료하겠습니까?")) {
                          forceFailMutation.mutate(id);
                        }
                      }}
                      disabled={forceFailMutation.isPending}
                    >
                      강제 종료
                    </Button>
                  )}
                  {RETRYABLE.includes(status) && (
                    <Button
                      variant="outline"
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      onClick={() => {
                        if (window.confirm("다시 실행하겠습니까?")) {
                          retryMutation.mutate(id);
                        }
                      }}
                      disabled={retryMutation.isPending}
                    >
                      <RotateCcw className="h-4 w-4 mr-1.5" />
                      재실행
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setSelectedTaskId(null)}>닫기</Button>
                </div>
              );
            })()}
            {!taskDetail?.data && (
              <Button variant="outline" onClick={() => setSelectedTaskId(null)}>닫기</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
