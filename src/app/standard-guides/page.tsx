/**
 * StandardGuidesPage — 표준 가이드 관리 목록 페이지 (/standard-guides)
 *
 * 📌 역할:
 *   - AI 코드 생성 시 참조할 프로젝트 표준 패턴을 관리
 *   - 카테고리 탭 필터 (전체 + 10개 카테고리)
 *   - is_active 목록 내 즉시 토글
 *   - 등록/수정: 넓은 다이얼로그 (2-컬럼 레이아웃)
 *     - 왼쪽: 가이드 내용 + 관련 파일
 *     - 오른쪽: AI 피드백 내용 + 피드백 수정 일시
 *   - 상태(status) 변경 시 tb_ai_task 자동 등록 (REVIEW_REQ → INSPECT 태스크)
 *   - AI 점검 이력 다이얼로그
 */
"use client";

import { useState, useEffect, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, Search, Trash2, Pencil, ScanSearch, ChevronDown, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { DataGrid } from "@/components/common/DataGrid";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { MarkdownEditor } from "@/components/common/MarkdownEditor";
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
import { apiFetch, cn, formatDate, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import type { StandardGuide, AiTask } from "@/types";

/* ─── 카테고리 상수 ─────────────────────────────────────────── */

const CATEGORIES = [
  { value: "UI",       label: "UI",       color: "bg-blue-100 text-blue-800" },
  { value: "DATA",     label: "DATA",     color: "bg-amber-100 text-amber-800" },
  { value: "AUTH",     label: "AUTH",     color: "bg-red-100 text-red-800" },
  { value: "API",      label: "API",      color: "bg-green-100 text-green-800" },
  { value: "COMMON",   label: "COMMON",   color: "bg-zinc-100 text-zinc-800" },
  { value: "SECURITY", label: "SECURITY", color: "bg-orange-100 text-orange-800" },
  { value: "FILE",     label: "FILE",     color: "bg-teal-100 text-teal-800" },
  { value: "ERROR",    label: "ERROR",    color: "bg-rose-100 text-rose-800" },
  { value: "BATCH",    label: "BATCH",    color: "bg-indigo-100 text-indigo-800" },
  { value: "REPORT",   label: "REPORT",   color: "bg-purple-100 text-purple-800" },
] as const;

const CATEGORY_COLOR: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.color])
);

/* ─── 가이드 상태 표시 (status 컬럼) ────────────────────────── */

const GUIDE_STATUS_LABEL: Record<string, { label: string; class: string }> = {
  REVIEW_REQ:  { label: "🔄 검토 요청",  class: "bg-blue-100 text-blue-700" },
  REVIEW_DONE: { label: "✅ 검토 완료", class: "bg-emerald-100 text-emerald-700" },
};

/* ─── AI 태스크 상태 표시 (점검 이력 다이얼로그용) ─────────── */

const TASK_STATUS_LABEL: Record<string, { label: string; class: string }> = {
  NONE:        { label: "⏳ 대기",     class: "bg-zinc-100 text-zinc-500" },
  RUNNING:     { label: "🔄 점검중",  class: "bg-blue-100 text-blue-700" },
  SUCCESS:     { label: "✅ 정상",     class: "bg-emerald-100 text-emerald-700" },
  NEEDS_CHECK: { label: "⚠️ 확인필요", class: "bg-amber-100 text-amber-700" },
  FAILED:      { label: "❌ 실패",     class: "bg-red-100 text-red-700" },
};

/* ─── 폼 기본값 ─────────────────────────────────────────────── */

const EMPTY_FORM = {
  category: "UI",
  title: "",
  content: "",
  isActive: "Y",
  relatedFiles: "",
  aiFeedbackContent: "",
  status: "",
};

/* ─── 메인 컴포넌트 (Suspense 경계 래핑) ───────────────────── */

export default function StandardGuidesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">로딩 중...</div>}>
      <StandardGuidesContent />
    </Suspense>
  );
}

function StandardGuidesContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  /* 필터 상태 */
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  /* 등록/수정 다이얼로그 */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<StandardGuide | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  /* 버전 이력 저장 체크박스 */
  const [saveVersionLog, setSaveVersionLog] = useState(() => {
    if (typeof window === "undefined") return true;
    const v = localStorage.getItem("specode_save_version_log");
    return v === null ? true : v === "true";
  });

  useEffect(() => {
    localStorage.setItem("specode_save_version_log", String(saveVersionLog));
  }, [saveVersionLog]);

  /* 삭제 다이얼로그 */
  const [deleteItem, setDeleteItem] = useState<StandardGuide | null>(null);

  /* 피드백 다이얼로그 (점검 이력 조회) */
  const [feedbackGuide, setFeedbackGuide] = useState<StandardGuide | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());

  /* ─── API 쿼리 ─────────────────────────────────────────────── */

  const { data, isLoading } = useQuery({
    queryKey: ["standard-guides", filterCategory, search, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: "10" });
      if (filterCategory !== "ALL") params.set("category", filterCategory);
      if (search) params.set("search", search);
      const res = await fetch(`/api/standard-guides?${params}`);
      return res.json();
    },
    refetchInterval: 8000, // 상태 변경 감지용 폴링
  });

  /* 점검 이력 조회 (피드백 다이얼로그용) */
  const { data: feedbackData } = useQuery({
    queryKey: ["standard-guide-tasks", feedbackGuide?.guideId],
    queryFn: async () => {
      const res = await fetch(`/api/standard-guides/${feedbackGuide!.guideId}`);
      return res.json();
    },
    enabled: !!feedbackGuide,
    refetchInterval: feedbackGuide ? 5000 : false,
  });
  const guideTasks: AiTask[] = feedbackData?.data?.tasks ?? [];

  /* URL query "openGuide" 처리 */
  useEffect(() => {
    const openGuideId = searchParams?.get("openGuide");
    if (openGuideId && data?.data) {
      const guideToOpen = data.data.find((g: StandardGuide) => String(g.guideId) === openGuideId);
      if (guideToOpen) {
        openEdit(guideToOpen);
        router.replace("/standard-guides"); // URL 파라미터 정리
      }
    }
  }, [searchParams, data?.data, router]);

  /*
   * 수정 다이얼로그용: editItem의 가장 최근 AiTask 조회
   * 📌 status = "REVIEW_DONE"일 때 task_status 배지를 오른쪽 컬럼에 표시
   */
  const { data: editDetailData } = useQuery({
    queryKey: ["standard-guide-detail", editItem?.guideId],
    queryFn: async () => {
      const res = await fetch(`/api/standard-guides/${editItem!.guideId}`);
      return res.json();
    },
    enabled: !!editItem && dialogOpen,
  });
  const latestTask: AiTask | undefined = editDetailData?.data?.tasks?.[0];

  /* editDetailData 로드 시 AI 피드백 내용 폼에 반영 (tb_ai_task에서 조회) */
  useEffect(() => {
    const feedback = editDetailData?.data?.aiFeedbackContent;
    if (feedback !== undefined) {
      setForm((f) => ({ ...f, aiFeedbackContent: feedback ?? "" }));
    }
  }, [editDetailData?.data?.aiFeedbackContent]);

  /* ─── 뮤테이션 ─────────────────────────────────────────────── */

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["standard-guides"] });

  const createMutation = useMutation({
    mutationFn: (body: typeof EMPTY_FORM) =>
      apiFetch("/api/standard-guides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => { invalidate(); toast.success("가이드가 등록되었습니다."); closeDialog(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: number; saveVersionLog?: boolean } & typeof EMPTY_FORM) =>
      apiFetch(`/api/standard-guides/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => { invalidate(); toast.success("가이드가 수정되었습니다."); closeDialog(); },
  });

  /* is_active 즉시 토글 */
  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: string }) =>
      apiFetch(`/api/standard-guides/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/standard-guides/${id}`, { method: "DELETE" }),
    onSuccess: () => { invalidate(); toast.success("삭제되었습니다."); setDeleteItem(null); },
  });

  /* AI 점검 요청 (ScanSearch 버튼) */
  const inspectMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/standard-guides/${id}/inspect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    onSuccess: () => { invalidate(); toast.success("AI 점검 요청이 등록되었습니다."); },
  });

  /* ─── 다이얼로그 헬퍼 ──────────────────────────────────────── */

  const openCreate = () => {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (row: StandardGuide) => {
    setEditItem(row);
    setForm({
      category: row.category,
      title: row.title,
      content: row.content ?? "",
      isActive: row.isActive,
      relatedFiles: row.relatedFiles ?? "",
      aiFeedbackContent: row.aiFeedbackContent ?? "",
      status: row.status ?? "",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditItem(null);
  };

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    if (editItem) {
      updateMutation.mutate({ id: editItem.guideId, ...form, saveVersionLog });
    } else {
      createMutation.mutate(form);
    }
  };

  const toggleTask = (id: number) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /* ─── 컬럼 정의 ────────────────────────────────────────────── */

  const columns: ColumnDef<StandardGuide, unknown>[] = [
    {
      accessorKey: "systemId",
      header: "ID",
      size: 90,
    },
    {
      accessorKey: "category",
      header: "카테고리",
      size: 90,
      cell: ({ getValue }) => {
        const v = getValue() as string;
        return (
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", CATEGORY_COLOR[v] ?? "bg-zinc-100 text-zinc-700")}>
            {v}
          </span>
        );
      },
    },
    {
      accessorKey: "title",
      header: "제목",
      cell: ({ getValue }) => (
        <span className="font-medium">{getValue() as string}</span>
      ),
    },
    {
      id: "contentPreview",
      header: "내용 요약",
      cell: ({ row }) => {
        const preview = row.original.content
          ?.replace(/^#+\s*/gm, "")
          .replace(/[*`\[\]]/g, "")
          .trim()
          .split("\n")
          .find((l) => l.trim().length > 5) ?? "";
        return (
          <span className="text-xs text-muted-foreground truncate block max-w-xs">
            {preview ? (preview.length > 60 ? preview.slice(0, 60) + "…" : preview) : "-"}
          </span>
        );
      },
    },
    {
      /* 가이드 상태 컬럼 (REVIEW_REQ / REVIEW_DONE) */
      id: "status",
      header: "상태",
      size: 100,
      cell: ({ row }) => {
        const s = row.original.status;
        if (!s) return null;
        const cfg = GUIDE_STATUS_LABEL[s];
        if (!cfg) return null;
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setFeedbackGuide(row.original);
              setExpandedTasks(new Set());
            }}
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium cursor-pointer hover:opacity-80",
              cfg.class
            )}
          >
            {cfg.label}
          </button>
        );
      },
    },
    {
      id: "latestTask",
      header: "AI 작업",
      size: 100,
      cell: ({ row }) => {
        const task = row.original.latestTask;
        if (!task) return null;
        const cfg = TASK_STATUS_LABEL[task.taskStatus] ?? TASK_STATUS_LABEL.NONE;
        return (
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", cfg.class)}>
            {cfg.label}
          </span>
        );
      },
    },
    {
      id: "isActive",
      header: "활성",
      size: 70,
      cell: ({ row }) => {
        const active = row.original.isActive === "Y";
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleMutation.mutate({
                id: row.original.guideId,
                isActive: active ? "N" : "Y",
              });
            }}
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer",
              active
                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
            )}
          >
            {active ? "활성" : "비활성"}
          </button>
        );
      },
    },
    {
      accessorKey: "updatedAt",
      header: "수정일",
      size: 80,
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">{formatDate(getValue() as string)}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      size: 110,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {/* AI 점검 버튼 */}
          <Button
            variant="ghost"
            size="icon"
            title="AI 점검 요청"
            onClick={(e) => {
              e.stopPropagation();
              inspectMutation.mutate(row.original.guideId);
            }}
            disabled={
              inspectMutation.isPending ||
              row.original.status === "REVIEW_REQ"
            }
          >
            <ScanSearch className="h-4 w-4 text-primary/70" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="수정"
            onClick={(e) => { e.stopPropagation(); openEdit(row.original); }}
          >
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="삭제"
            onClick={(e) => { e.stopPropagation(); setDeleteItem(row.original); }}
          >
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      ),
    },
  ];

  /* ─── 렌더링 ───────────────────────────────────────────────── */

  const guides: StandardGuide[] = data?.data ?? [];

  return (
    <div className="space-y-5">
      {/* ── 헤더 ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">표준 가이드</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          가이드 등록
        </Button>
      </div>

      {/* ── 카테고리 탭 필터 ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border pb-3">
        {[{ value: "ALL", label: "전체" }, ...CATEGORIES].map((cat) => (
          <button
            key={cat.value}
            onClick={() => { setFilterCategory(cat.value); setPage(1); }}
            className={cn(
              "px-3 py-1 text-sm font-medium rounded-md transition-colors cursor-pointer",
              filterCategory === cat.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* ── 검색 ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 max-w-xs">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          placeholder="제목 검색..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {/* ── 목록 ─────────────────────────────────────────────── */}
      <DataGrid
        columns={columns}
        data={guides}
        onRowClick={(row) => openEdit(row)}
        pagination={data?.pagination}
        onPageChange={setPage}
        emptyMessage={isLoading ? "로딩 중..." : "등록된 가이드가 없습니다."}
      />

      {/* ── 등록/수정 다이얼로그 ─────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-[90vw] max-h-[96vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
            <DialogTitle>{editItem ? "가이드 수정" : "가이드 등록"}</DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
            {/* ── 상단 메타 필드: 카테고리, 제목, 상태, 활성 여부 ── */}
            <div className="flex items-end gap-3">
              <div className="space-y-1.5 w-36 shrink-0">
                <Label className="text-xs">카테고리 *</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 flex-1">
                <Label className="text-xs">제목 *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="가이드 제목"
                />
              </div>

              {/*
               * 📌 상태 변경 시 동작:
               *   REVIEW_REQ → 저장 시 AiTask(INSPECT) 자동 등록
               *   REVIEW_DONE → 저장만, AiTask 미생성
               */}
              <div className="space-y-1.5 w-36 shrink-0">
                <Label className="text-xs">상태</Label>
                <Select
                  value={form.status || "__NONE__"}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v === "__NONE__" ? "" : v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__NONE__">없음</SelectItem>
                    <SelectItem value="REVIEW_REQ">🔄 검토 요청</SelectItem>
                    <SelectItem value="REVIEW_DONE">✅ 검토 완료</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 w-28 shrink-0">
                <Label className="text-xs">활성 여부</Label>
                <Select
                  value={form.isActive}
                  onValueChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Y">활성 (Y)</SelectItem>
                    <SelectItem value="N">비활성 (N)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/*
             * ── 2-컬럼 본문 ────────────────────────────────────
             * 왼쪽 (1/2): 가이드 내용 + 관련 파일
             * 오른쪽 (1/2): AI 피드백 내용 + 피드백 수정 일시
             */}
            <div className="grid grid-cols-2 gap-6">
              {/* 왼쪽: 가이드 내용 + 관련 파일 */}
              <div className="space-y-4 flex flex-col min-w-0">
                <MarkdownEditor
                  value={form.content}
                  onChange={(v) => setForm((f) => ({ ...f, content: v }))}
                  label="가이드 내용 (마크다운)"
                  rows={24}
                  placeholder={`# 가이드 제목\n\n## 개요\n\n## 사용법\n\n\`\`\`typescript\n// 예시 코드\n\`\`\``}
                  refTableName="tb_standard_guide"
                  refPkId={editItem?.guideId}
                  fieldName="content"
                />

                {/* 관련 파일 목록 */}
                <div className="space-y-1.5">
                  <Label className="text-xs">관련 파일</Label>
                  <textarea
                    value={form.relatedFiles}
                    onChange={(e) => setForm((f) => ({ ...f, relatedFiles: e.target.value }))}
                    rows={4}
                    placeholder={"src/main/java/com/example/SomeService.java\nsrc/main/java/com/example/SomeMapper.java"}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs resize-y font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <p className="text-[11px] text-muted-foreground">한 줄에 파일 경로 하나씩</p>
                </div>

                {/* 최근 수정 일시 */}
                {editItem?.updatedAt && (
                  <p className="text-xs text-muted-foreground">
                    최근 수정: {formatDateTime(editItem.updatedAt)}
                  </p>
                )}
              </div>

              {/* 오른쪽: AI 피드백 내용 + 수정 일시 */}
              <div className="space-y-4 flex flex-col min-w-0">
                <MarkdownEditor
                  value={form.aiFeedbackContent}
                  onChange={(v) => setForm((f) => ({ ...f, aiFeedbackContent: v }))}
                  label="AI 피드백 내용 (마크다운)"
                  rows={24}
                  placeholder="AI가 점검 후 자동으로 작성하거나, 직접 입력할 수 있습니다..."
                />

                {/* 최종 응답일 시: 최근 AiTask의 완료 시각으로 대체 */}
                {editItem?.tasks?.[0]?.completedAt && (
                  <p className="text-xs text-muted-foreground">
                    최종 응답: {formatDateTime(editItem.tasks[0].completedAt)}
                  </p>
                )}

                {/* 검토 완료 시: 가장 최근 AiTask의 task_status 표시 */}
                {form.status === "REVIEW_DONE" && latestTask && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">AI 작업 결과:</span>
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      TASK_STATUS_LABEL[latestTask.taskStatus]?.class ?? "bg-zinc-100 text-zinc-500"
                    )}>
                      {TASK_STATUS_LABEL[latestTask.taskStatus]?.label ?? latestTask.taskStatus}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-3 border-t border-border shrink-0 bg-muted/30">
            {editItem && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer mr-auto">
                <input
                  type="checkbox"
                  checked={saveVersionLog}
                  onChange={(e) => setSaveVersionLog(e.target.checked)}
                  className="h-3.5 w-3.5"
                />
                버전 이력 저장
              </label>
            )}
            <Button variant="outline" onClick={closeDialog}>취소</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.title.trim() || createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? "저장중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 삭제 확인 다이얼로그 ─────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={() => setDeleteItem(null)}
        title="가이드 삭제"
        description={`"${deleteItem?.title}"을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        variant="destructive"
        confirmLabel="삭제"
        onConfirm={() => deleteItem && deleteMutation.mutate(deleteItem.guideId)}
        loading={deleteMutation.isPending}
      />

      {/* ── AI 점검 이력 다이얼로그 ──────────────────────────── */}
      <Dialog open={!!feedbackGuide} onOpenChange={() => setFeedbackGuide(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <ScanSearch className="h-4 w-4" />
              AI 점검 이력 — {feedbackGuide?.title}
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 px-6 py-4">
            {guideTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                점검 이력이 없습니다.
              </p>
            ) : (
              <div className="space-y-1">
                {guideTasks.map((task) => {
                  const isExpanded = expandedTasks.has(task.aiTaskId);
                  const statusCfg = TASK_STATUS_LABEL[task.taskStatus] ?? TASK_STATUS_LABEL.NONE;
                  return (
                    <div key={task.aiTaskId}>
                      <button
                        onClick={() => toggleTask(task.aiTaskId)}
                        className="flex items-center gap-2 w-full text-left rounded-md hover:bg-muted/30 px-3 py-2.5 transition-colors cursor-pointer"
                      >
                        {isExpanded
                          ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        }
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTime(task.requestedAt)}
                        </span>
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusCfg.class)}>
                          {statusCfg.label}
                        </span>
                        <span className="text-sm truncate">{task.systemId}</span>
                      </button>

                      {isExpanded && (
                        <div className="ml-9 space-y-3 mb-2">
                          {task.comment && (
                            <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-4">
                              <p className="text-xs font-medium text-amber-600 mb-1">요청 코멘트</p>
                              <p className="text-sm">{task.comment}</p>
                            </div>
                          )}
                          {task.feedback ? (
                            <div className="rounded-md bg-primary/5 border border-primary/20 p-4">
                              <p className="text-xs font-medium text-primary mb-2">AI 점검 결과</p>
                              <div className="prose prose-sm max-w-none text-sm">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {task.feedback}
                                </ReactMarkdown>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground px-1">
                              {task.taskStatus === "NONE" || task.taskStatus === "RUNNING"
                                ? "AI 점검 진행 중입니다..."
                                : "피드백 없음"}
                            </p>
                          )}
                          {task.resultFiles && (
                            <div className="rounded-md bg-muted/20 p-3">
                              <p className="text-xs font-medium text-muted-foreground mb-1.5">처리 파일</p>
                              <div className="space-y-0.5">
                                {task.resultFiles.split("\n").filter(f => f.trim()).map((f, i) => (
                                  <p key={i} className="text-xs font-mono">{f.trim()}</p>
                                ))}
                              </div>
                            </div>
                          )}
                          {task.completedAt && (
                            <p className="text-xs text-muted-foreground">
                              완료: {formatDateTime(task.completedAt)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-3 border-t border-border shrink-0 bg-muted/30">
            <Button variant="outline" onClick={() => setFeedbackGuide(null)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
