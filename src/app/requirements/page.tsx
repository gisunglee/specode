"use client";

import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiFetch, cn, formatDate } from "@/lib/utils";
import { Plus, Search, Trash2 } from "lucide-react";
import { DataGrid } from "@/components/common/DataGrid";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { MarkdownEditor } from "@/components/common/MarkdownEditor";
import { RichTextEditor } from "@/components/common/RichTextEditor";
import { VersionDiffDialog } from "@/components/common/VersionDiffDialog";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { PRIORITIES } from "@/lib/constants";
import type { ColumnDef } from "@tanstack/react-table";

/* ─────────────────────────────────────────────── types ── */
interface RequirementRow {
  requirementId:   number;
  systemId:        string;
  name:            string;
  originalContent: string | null;
  currentContent:  string | null;
  detailSpec:      string | null;
  priority:        string | null;
  taskId:          number | null;
  source:          string;
  discussionMd:    string | null;
  task:            { taskId: number; systemId: string; name: string } | null;
  screenCount:     number;
  functionCount:   number;
  userStoryCount:  number;
  updatedAt:       string;
}

interface TaskOption {
  taskId:   number;
  systemId: string;
  name:     string;
}

interface InitialState {
  name:            string;
  priority:        string;
  taskId:          string;
  source:          string;
  originalContent: string;
  currentContent:  string;
  detailSpec:      string;
  discussionMd:    string;
}

/* ── 최종본/명세서 이력 목록 다이얼로그 (아코디언 스타일) ── */
interface HistoryVersion { versionId: number; changedBy: string; aiTaskId: number | null; createdAt: string; }

const formatFullDate = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function HistoryListDialog({ requirementId, fieldName, label, onClose }: {
  requirementId: number; fieldName: string; label: string; onClose: () => void;
}) {
  const [versions, setVersions]   = useState<HistoryVersion[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [contents, setContents]   = useState<Record<number, string>>({});

  useEffect(() => {
    fetch(`/api/content-versions?refTableName=tb_requirement&refPkId=${requirementId}&fieldName=${encodeURIComponent(fieldName)}`)
      .then(r => r.json())
      .then(json => { if (json.data) setVersions(json.data); })
      .catch(() => {});
  }, [requirementId, fieldName]);

  const handleExpand = (vId: number) => {
    if (expandedId === vId) { setExpandedId(null); return; }
    setExpandedId(vId);
    if (contents[vId] !== undefined) return;
    fetch(`/api/content-versions?refTableName=tb_requirement&refPkId=${requirementId}&fieldName=${encodeURIComponent(fieldName)}&versionId=${vId}`)
      .then(r => r.json())
      .then(json => { if (json.data?.content !== undefined) setContents(prev => ({ ...prev, [vId]: json.data.content })); })
      .catch(() => {});
  };

  const total = versions.length;
  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl h-[70vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <DialogTitle className="text-sm">{label} 변경 이력</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          {total === 0 && <p className="text-sm text-muted-foreground text-center py-10">저장된 이력이 없습니다.</p>}
          {versions.map((v, idx) => {
            const isExpanded = expandedId === v.versionId;
            const isAi = v.changedBy === "ai";
            return (
              <div key={v.versionId} className="border-b border-border last:border-b-0">
                <button type="button" onClick={() => handleExpand(v.versionId)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 text-left cursor-pointer">
                  <span className="text-xs font-mono text-muted-foreground w-7 shrink-0">v{total - idx}</span>
                  <span className="text-xs flex-1 text-muted-foreground">{formatFullDate(v.createdAt)}</span>
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0",
                    isAi ? "bg-blue-100 text-blue-700" : "bg-secondary text-secondary-foreground")}>
                    {isAi ? "AI" : "사용자"}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">{isExpanded ? "▲" : "▼"}</span>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 bg-muted/10">
                    {contents[v.versionId] === undefined
                      ? <p className="text-xs text-muted-foreground py-2">로딩 중...</p>
                      : <div className="prose prose-sm max-w-none text-sm rounded border border-border bg-card p-3"
                          dangerouslySetInnerHTML={{ __html: contents[v.versionId] }} />
                    }
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="shrink-0 flex justify-end px-4 py-3 border-t bg-muted/10">
          <Button size="sm" onClick={onClose}>닫기</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ────────────────────────────────────────────── page ── */
export default function RequirementsPage() {
  const router       = useRouter();
  const queryClient  = useQueryClient();

  /* ── 목록 필터 ── */
  const [page,          setPage]          = useState(1);
  const [search,        setSearch]        = useState("");
  const [filterTaskId,  setFilterTaskId]  = useState<string>("all");

  /* ── 다이얼로그 제어 ── */
  const [dialogOpen,  setDialogOpen]  = useState(false);
  const [editItem,    setEditItem]    = useState<RequirementRow | null>(null);
  const [deleteItem,  setDeleteItem]  = useState<RequirementRow | null>(null);
  const [activeTab,   setActiveTab]   = useState<string>("original");

  /* ── 폼 필드 (전부 state → dirty 체크 용이) ── */
  const [formName,         setFormName]         = useState("");
  const [formPriority,     setFormPriority]     = useState("MEDIUM");
  const [formTaskId,       setFormTaskId]       = useState("");
  const [formSource,       setFormSource]       = useState("RFP");
  const [originalContent,  setOriginalContent]  = useState("");
  const [currentContent,   setCurrentContent]   = useState("");
  const [detailSpec,       setDetailSpec]       = useState("");
  const [discussionMd,     setDiscussionMd]     = useState("");
  const [editorKey,        setEditorKey]        = useState(0);

  /* ── 저장 플로우 다이얼로그 ── */
  const [showOriginalConfirm, setShowOriginalConfirm] = useState(false);
  const [showHistoryAsk,      setShowHistoryAsk]      = useState(false);

  /* ── 이력 저장 체크박스 (최종본 / 명세서 / 협의내용) ── */
  type HistoryFieldEntry = { dirty: boolean; selected: boolean };
  type HistoryFieldMap   = { current_content: HistoryFieldEntry; detail_spec: HistoryFieldEntry; discussion_md: HistoryFieldEntry };
  const [historyFields, setHistoryFields] = useState<HistoryFieldMap | null>(null);

  /* ── 이력 보기 팝업 ── */
  type HistoryViewInfo = { requirementId: number; fieldName: string; label: string };
  const [historyViewInfo, setHistoryViewInfo] = useState<HistoryViewInfo | null>(null);
  const [showDiffViewForDiscussion, setShowDiffViewForDiscussion] = useState(false);

  /* ── 초기 상태 ref (dirty 체크 기준) ── */
  const initialStateRef = useRef<InitialState | null>(null);

  /* ── dirty 체크 ── */
  const isDirty = useMemo(() => {
    if (!editItem) return formName.trim().length > 0;        // 신규: 이름 입력 시 활성화
    const i = initialStateRef.current;
    if (!i) return false;
    return (
      formName        !== i.name            ||
      formPriority    !== i.priority        ||
      formTaskId      !== i.taskId          ||
      formSource      !== i.source          ||
      originalContent !== i.originalContent ||
      currentContent  !== i.currentContent  ||
      detailSpec      !== i.detailSpec      ||
      discussionMd    !== i.discussionMd
    );
  }, [editItem, formName, formPriority, formTaskId, formSource,
      originalContent, currentContent, detailSpec, discussionMd]);

  /* ─────────────────────────────────── queries ── */
  const { data: tasksData } = useQuery({
    queryKey: ["tasks-simple"],
    queryFn:  async () => (await fetch("/api/tasks?pageSize=200")).json(),
  });
  const taskOptions: TaskOption[] = tasksData?.data ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ["requirements", page, search, filterTaskId],
    queryFn:  async () => {
      const p = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (search)                 p.set("search", search);
      if (filterTaskId !== "all") p.set("taskId", filterTaskId);
      return (await fetch(`/api/requirements?${p}`)).json();
    },
  });

  const { data: reqDetail } = useQuery({
    queryKey: ["requirement-detail", editItem?.requirementId],
    queryFn:  async () =>
      (await fetch(`/api/requirements/${editItem!.requirementId}`)).json(),
    enabled: !!editItem,
  });

  /* ─────────────────────────────────── mutations ── */
  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/requirements", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requirements"] });
      toast.success("요구사항이 등록되었습니다.");
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Record<string, unknown>) =>
      apiFetch(`/api/requirements/${id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requirements"] });
      toast.success("요구사항이 수정되었습니다.");
      setDialogOpen(false);
      setEditItem(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/requirements/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requirements"] });
      toast.success("삭제되었습니다.");
      setDeleteItem(null);
    },
  });

  /* ─────────────────────────────────── save flow ── */
  const buildBody = (saveHistoryFields: string[] = []) => ({
    name:              formName,
    priority:          formPriority,
    originalContent:   originalContent || null,
    currentContent:    currentContent  || null,
    detailSpec:        detailSpec      || null,
    taskId:            formTaskId ? parseInt(formTaskId) : null,
    source:            formSource || "RFP",
    discussionMd:      discussionMd    || null,
    saveHistoryFields: saveHistoryFields.length > 0 ? saveHistoryFields : undefined,
  });

  const doSave = (saveHistoryFields: string[] = []) => {
    const body = buildBody(saveHistoryFields);
    if (editItem) {
      updateMutation.mutate({ id: editItem.requirementId, ...body });
    } else {
      createMutation.mutate(body);
    }
  };

  const openHistoryAsk = () => {
    const i = initialStateRef.current;
    setHistoryFields({
      current_content: { dirty: currentContent !== (i?.currentContent ?? ""), selected: currentContent !== (i?.currentContent ?? "") },
      detail_spec:     { dirty: detailSpec      !== (i?.detailSpec      ?? ""), selected: detailSpec      !== (i?.detailSpec      ?? "") },
      discussion_md:   { dirty: discussionMd    !== (i?.discussionMd    ?? ""), selected: discussionMd    !== (i?.discussionMd    ?? "") },
    });
    setShowHistoryAsk(true);
  };

  const handleSave = () => {
    if (!formName.trim()) {
      toast.error("요구사항 명을 입력해주세요.");
      return;
    }
    if (!editItem) { doSave(); return; }

    const i = initialStateRef.current;
    const origDirty = originalContent !== (i?.originalContent ?? "");
    const currDirty = currentContent  !== (i?.currentContent  ?? "");
    const specDirty = detailSpec      !== (i?.detailSpec      ?? "");
    const discDirty = discussionMd    !== (i?.discussionMd    ?? "");

    if (origDirty) {
      setShowOriginalConfirm(true);
    } else if (currDirty || specDirty || discDirty) {
      openHistoryAsk();
    } else {
      doSave();
    }
  };

  const handleOriginalConfirmed = () => {
    setShowOriginalConfirm(false);
    const i = initialStateRef.current;
    const currDirty = currentContent !== (i?.currentContent ?? "");
    const specDirty = detailSpec     !== (i?.detailSpec     ?? "");
    const discDirty = discussionMd   !== (i?.discussionMd   ?? "");
    if (currDirty || specDirty || discDirty) {
      openHistoryAsk();
    } else {
      doSave();
    }
  };

  /* ─────────────────────────────────── open helpers ── */
  const openCreate = () => {
    setEditItem(null);
    setFormName("");
    setFormPriority("MEDIUM");
    setOriginalContent("");
    setCurrentContent("");
    setDetailSpec("");
    setFormTaskId(filterTaskId !== "all" ? filterTaskId : "");
    setFormSource("RFP");
    setDiscussionMd("");
    initialStateRef.current = null;
    setActiveTab("original");
    setEditorKey((k) => k + 1);
    setDialogOpen(true);
  };

  const openEdit = (row: RequirementRow) => {
    setEditItem(row);
    setFormName(row.name);
    setFormPriority(row.priority || "MEDIUM");
    setOriginalContent(row.originalContent || "");
    setCurrentContent(row.currentContent   || "");
    setDetailSpec(row.detailSpec           || "");
    setFormTaskId(row.taskId ? String(row.taskId) : "");
    setFormSource(row.source || "RFP");
    setDiscussionMd(row.discussionMd || "");
    initialStateRef.current = {
      name:            row.name,
      priority:        row.priority        || "MEDIUM",
      taskId:          row.taskId ? String(row.taskId) : "",
      source:          row.source          || "RFP",
      originalContent: row.originalContent || "",
      currentContent:  row.currentContent  || "",
      detailSpec:      row.detailSpec      || "",
      discussionMd:    row.discussionMd    || "",
    };
    setActiveTab("current");
    setEditorKey((k) => k + 1);
    setDialogOpen(true);
  };

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setEditItem(null);
    setShowDiffViewForDiscussion(false);
  }, []);

  /* ─────────────────────────────────── columns ── */
  const columns: ColumnDef<RequirementRow, unknown>[] = [
    { accessorKey: "systemId", header: "ID", size: 100 },
    { accessorKey: "name",     header: "요구사항 명" },
    {
      id: "taskBadge",
      header: "과업",
      accessorFn: (row) => row.task ?? null,
      cell: ({ getValue }) => {
        const t = getValue() as TaskOption | null;
        if (!t) return <span className="text-muted-foreground text-xs">-</span>;
        return (
          <span className="text-xs font-mono bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded whitespace-nowrap">
            {t.systemId}
          </span>
        );
      },
      size: 90,
    },
    {
      accessorKey: "source",
      header: "출처",
      cell: ({ getValue }) => (
        <span className="text-xs text-muted-foreground">{(getValue() as string) ?? "-"}</span>
      ),
      size: 65,
    },
    {
      accessorKey: "priority",
      header: "우선순위",
      cell: ({ getValue }) => {
        const v = getValue() as string;
        return (
          <span className="text-sm text-muted-foreground">
            {PRIORITIES.find((p) => p.value === v)?.label ?? v}
          </span>
        );
      },
      size: 80,
    },
    {
      accessorKey: "screenCount",
      header: "화면",
      cell: ({ getValue }) => <span className="text-sm text-center block">{getValue() as number}</span>,
      size: 55,
    },
    {
      accessorKey: "functionCount",
      header: "기능",
      cell: ({ getValue }) => <span className="text-sm text-center block">{getValue() as number}</span>,
      size: 55,
    },
    {
      accessorKey: "userStoryCount",
      header: "스토리",
      cell: ({ getValue }) => <span className="text-sm text-center block">{getValue() as number}</span>,
      size: 60,
    },
    {
      accessorKey: "updatedAt",
      header: "수정일",
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground">{formatDate(getValue() as string)}</span>
      ),
      size: 80,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => { e.stopPropagation(); setDeleteItem(row.original); }}
        >
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      ),
      size: 50,
      enableSorting: false,
    },
  ];

  const isSaving = createMutation.isPending || updateMutation.isPending;

  /* ─────────────────────────────────── render ── */
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">요구사항 관리</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          요구사항 등록
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={filterTaskId} onValueChange={(v) => { setFilterTaskId(v); setPage(1); }}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="과업 전체" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">과업 전체</SelectItem>
            {taskOptions.map((t) => (
              <SelectItem key={t.taskId} value={String(t.taskId)}>
                {t.systemId} {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            placeholder="검색..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <DataGrid
        columns={columns}
        data={data?.data ?? []}
        onRowClick={openEdit}
        pagination={data?.pagination}
        onPageChange={setPage}
        emptyMessage={isLoading ? "로딩 중..." : "등록된 요구사항이 없습니다."}
        dense={true}
      />

      {/* ════════════════════════════════════════════════════════
          등록 / 수정 다이얼로그
          ════════════════════════════════════════════════════════ */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="w-[98vw] max-w-[100rem] h-[96vh] flex flex-col gap-0 p-0 overflow-hidden">

          {/* ── 상단 헤더: 1행 Grid (ID / 이름 / 과업 / 우선순위 / 출처) ── */}
          <DialogHeader className="shrink-0 border-b border-border">
            <div className="flex items-center gap-3 px-3 py-2 flex-wrap">
              {editItem ? (
                <span className="font-mono text-xs text-muted-foreground bg-secondary px-2 py-1 rounded shrink-0">
                  {editItem.systemId}
                </span>
              ) : (
                <span className="text-xs font-semibold text-muted-foreground shrink-0 bg-secondary px-2 py-1 rounded">
                  신규
                </span>
              )}

              <div className="flex items-center gap-1.5 shrink-0">
                <Label className="text-sm text-muted-foreground whitespace-nowrap shrink-0">요구사항 명</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="요구사항 명 *"
                  className="w-120 h-7 text-base min-w-0"
                />
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Label className="text-sm text-muted-foreground whitespace-nowrap">과업</Label>
                <Select
                  value={formTaskId || "none"}
                  onValueChange={(v) => setFormTaskId(v === "none" ? "" : v)}
                >
                  <SelectTrigger className="h-7 w-120 text-xs">
                    <SelectValue placeholder="과업 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">과업 없음</SelectItem>
                    {taskOptions.map((t) => (
                      <SelectItem key={t.taskId} value={String(t.taskId)}>
                        {t.systemId} {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Label className="text-sm text-muted-foreground whitespace-nowrap">우선순위</Label>
                <Select value={formPriority} onValueChange={setFormPriority}>
                  <SelectTrigger className="h-7 w-24 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Label className="text-sm text-muted-foreground whitespace-nowrap">출처</Label>
                <Input
                  value={formSource}
                  onChange={(e) => setFormSource(e.target.value)}
                  placeholder="RFP"
                  className="h-7 w-35 text-xs"
                />
              </div>

              {/* 접근성용 숨김 title */}
              <DialogTitle className="sr-only">
                {editItem ? "요구사항 수정" : "요구사항 등록"}
              </DialogTitle>
            </div>
          </DialogHeader>

          {/* ── 본문 ── */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

            {/* 중단: 50:50 Split */}
            <div className="flex-[4] flex min-h-0">

              {/* 좌측: 원본 / 최종본 탭 */}
              <div className="w-1/2 flex flex-col min-h-0 border-r border-border">
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="flex flex-col h-full"
                >
                  <div className="shrink-0 flex items-center gap-1 mx-4 mt-4">
                    <TabsList className="flex-1 grid grid-cols-2 h-8">
                      <TabsTrigger value="original" className="text-xs">원본</TabsTrigger>
                      <TabsTrigger value="current" className="text-xs">최종본</TabsTrigger>
                    </TabsList>
                    {editItem && (
                      <Button variant="outline" size="sm" className="h-7 text-xs px-2.5 shrink-0"
                        onClick={() => setHistoryViewInfo({ requirementId: editItem.requirementId, fieldName: "current_content", label: "최종본" })}>
                        이력
                      </Button>
                    )}
                  </div>

                  <TabsContent
                    value="original"
                    className="flex-1 min-h-0 mt-0 p-4 overflow-hidden data-[state=inactive]:hidden"
                  >
                    <RichTextEditor
                      key={`orig-${editorKey}`}
                      value={originalContent}
                      onChange={setOriginalContent}
                      fillHeight
                      placeholder="계약 근거 원문을 입력하세요..."
                    />
                  </TabsContent>

                  <TabsContent
                    value="current"
                    className="flex-1 min-h-0 mt-0 p-4 overflow-hidden data-[state=inactive]:hidden"
                  >
                    <RichTextEditor
                      key={`curr-${editorKey}`}
                      value={currentContent}
                      onChange={setCurrentContent}
                      fillHeight
                      placeholder="협의/변경이 반영된 최종본을 입력하세요..."
                    />
                  </TabsContent>
                </Tabs>
              </div>

              {/* 우측: 요구사항 명세서 */}
              <div className="w-1/2 flex flex-col min-h-0 p-4 overflow-hidden">
                <div className="shrink-0 flex items-center justify-between mb-1.5">
                  <Label className="text-xs">요구사항 명세서</Label>
                  {editItem && (
                    <Button variant="outline" size="sm" className="h-6 text-xs px-2"
                      onClick={() => setHistoryViewInfo({ requirementId: editItem.requirementId, fieldName: "detail_spec", label: "요구사항 명세서" })}>
                      이력
                    </Button>
                  )}
                </div>
                <RichTextEditor
                  key={`spec-${editorKey}`}
                  value={detailSpec}
                  onChange={setDetailSpec}
                  fillHeight
                  placeholder="요구사항 명세 내용을 입력하세요..."
                />
              </div>
            </div>

            {/* 하단: 상세 협의 내용 (전체 너비) */}
            <div className="flex-[4] min-h-0 flex flex-col border-t border-border p-4">
              <div className="shrink-0 flex items-center justify-between mb-1.5">
                <Label className="text-xs">상세 협의 내용 (AI 참조용)</Label>
                {editItem && (
                  <Button variant="outline" size="sm" className="h-6 text-xs px-2"
                    onClick={() => setShowDiffViewForDiscussion(true)}>
                    이력
                  </Button>
                )}
              </div>
              <MarkdownEditor
                key={`disc-${editorKey}`}
                value={discussionMd}
                onChange={setDiscussionMd}
                fillHeight
                placeholder="고객 인터뷰 내용, 추가 맥락 등 AI가 참조할 내용을 자유롭게 기록합니다."
              />
            </div>
          </div>

          {/* ── 푸터: 소속 화면 + 저장/취소 ── */}
          <div className="shrink-0 flex items-center justify-between px-3 py-2 border-t border-border bg-muted/20">
            {/* 소속 화면 뱃지 */}
            <div className="flex items-center gap-1.5 flex-1 overflow-x-auto mr-4 min-w-0">
              {editItem && reqDetail?.data?.screens?.length > 0 && (
                <>
                  <span className="text-xs text-muted-foreground shrink-0">화면</span>
                  {reqDetail.data.screens.map(
                    (s: { screenId: number; systemId: string; name: string }) => (
                      <button
                        key={s.screenId}
                        type="button"
                        onClick={() => router.push(`/screens/${s.screenId}`)}
                        className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer shrink-0"
                      >
                        {s.systemId}
                      </button>
                    )
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={closeDialog}>
                취소
              </Button>
              <Button
                size="sm"
                disabled={!isDirty || isSaving}
                className={cn(isDirty && !isSaving && "ring-2 ring-primary/60 ring-offset-1")}
                onClick={handleSave}
              >
                {isSaving ? "처리중..." : "저장"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── 원본 수정 확인 다이얼로그 ── */}
      <Dialog open={showOriginalConfirm} onOpenChange={setShowOriginalConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>원본 내용 수정 확인</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            원본(original_content)은{" "}
            <span className="text-destructive font-semibold">계약 근거 데이터</span>
            입니다.
            <br />
            정말 수정하시겠습니까?
          </p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowOriginalConfirm(false)}>
              취소
            </Button>
            <Button variant="destructive" size="sm" onClick={handleOriginalConfirmed}>
              수정합니다
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 이력 저장 여부 다이얼로그 ── */}
      <Dialog open={showHistoryAsk} onOpenChange={setShowHistoryAsk}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>변경 이력 저장</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground pt-2">
            변경 내용을 <span className="font-semibold">이력으로 남기시겠습니까?</span>
          </p>
          <div className="space-y-2 py-3">
            {([
              { key: "current_content" as const, label: "최종본" },
              { key: "detail_spec"     as const, label: "명세서" },
              { key: "discussion_md"   as const, label: "협의내용" },
            ]).map(({ key, label }) => {
              const entry = historyFields?.[key];
              return (
                <label
                  key={key}
                  className={cn(
                    "flex items-center gap-2 text-sm",
                    entry?.dirty ? "cursor-pointer" : "opacity-40 cursor-not-allowed"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={!!entry?.selected}
                    disabled={!entry?.dirty}
                    onChange={(e) =>
                      setHistoryFields((prev) =>
                        prev ? { ...prev, [key]: { ...prev[key], selected: e.target.checked } } : prev
                      )
                    }
                    className="h-4 w-4"
                  />
                  {label}
                  {!entry?.dirty && <span className="text-xs text-muted-foreground">(변경없음)</span>}
                </label>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowHistoryAsk(false)}>
              취소
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { setShowHistoryAsk(false); doSave(); }}
            >
              이력 없이 저장
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const fieldsToSave = historyFields
                  ? (Object.entries(historyFields) as [string, { dirty: boolean; selected: boolean }][])
                      .filter(([, v]) => v.selected)
                      .map(([k]) => k)
                  : [];
                setShowHistoryAsk(false);
                doSave(fieldsToSave);
              }}
            >
              이력과 함께 저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 최종본/명세서 이력 목록 팝업 ── */}
      {historyViewInfo && (
        <HistoryListDialog
          requirementId={historyViewInfo.requirementId}
          fieldName={historyViewInfo.fieldName}
          label={historyViewInfo.label}
          onClose={() => setHistoryViewInfo(null)}
        />
      )}

      {/* ── 상세 협의 내용 이력 diff 팝업 ── */}
      {showDiffViewForDiscussion && editItem && (
        <VersionDiffDialog
          refTableName="tb_requirement"
          refPkId={editItem.requirementId}
          fieldName="discussion_md"
          currentContent={discussionMd}
          onClose={() => setShowDiffViewForDiscussion(false)}
        />
      )}

      {/* ── 삭제 확인 ── */}
      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={() => setDeleteItem(null)}
        title="요구사항 삭제"
        description={
          <>
            &quot;{deleteItem?.name}&quot;을(를) 삭제하시겠습니까?
            <br />
            <span className="text-red-500 font-bold">삭제 시 복구 불가능합니다.</span>
          </>
        }
        variant="destructive"
        confirmLabel="삭제"
        onConfirm={() => deleteItem && deleteMutation.mutate(deleteItem.requirementId)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
