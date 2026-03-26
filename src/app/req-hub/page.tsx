"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch, cn, formatDate } from "@/lib/utils";
import {
  Plus, Search, Trash2, ChevronDown, ChevronRight,
  Network, Pencil, LayoutList, ExternalLink,
  BookMarked, ClipboardList, FileSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { AcceptanceCriteriaEditor } from "@/components/user-story/AcceptanceCriteriaEditor";
import { AutocompleteInput } from "@/components/common/AutocompleteInput";
import { RichTextEditor } from "@/components/common/RichTextEditor";
import { MarkdownEditor } from "@/components/common/MarkdownEditor";
import { PRIORITIES } from "@/lib/constants";

/* ─── Types ─────────────────────────────────────────── */
interface TaskItem {
  taskId: number;
  systemId: string;
  name: string;
  category: string | null;
  rfpPage: number | null;
  requirementCount: number;
}

interface ReqItem {
  requirementId: number;
  systemId: string;
  name: string;
  priority: string | null;
  source: string;
  taskId: number | null;
  task: { taskId: number; systemId: string; name: string } | null;
  screenCount: number;
  functionCount: number;
  userStoryCount: number;
  originalContent: string | null;
  currentContent: string | null;
  discussionMd: string | null;
  updatedAt: string;
}

interface StoryItem {
  userStoryId: number;
  systemId: string;
  name: string;
  persona: string | null;
  scenario: string | null;
  acceptanceCriteria: { text: string }[] | null;
  acCount: number;
  updatedAt: string;
}

/* ─── Priority Badge ─────────────────────────────────── */
function PriorityBadge({ value }: { value: string | null }) {
  const label = PRIORITIES.find((p) => p.value === value)?.label ?? value ?? "-";
  const color =
    value === "CRITICAL" ? "bg-destructive/10 text-destructive border-destructive/20"
    : value === "HIGH"   ? "bg-orange-500/10 text-orange-600 border-orange-300/30 dark:text-orange-400"
    : value === "MEDIUM" ? "bg-blue-500/10 text-blue-600 border-blue-300/30 dark:text-blue-400"
    :                      "bg-muted text-muted-foreground border-border";
  return (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border", color)}>
      {label}
    </span>
  );
}

/* ─── Page ───────────────────────────────────────────── */
export default function ReqHubPage() {
  const queryClient = useQueryClient();

  /* ── Selection ── */
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [selectedReqId, setSelectedReqId]   = useState<number | null>(null);

  /* ── Search ── */
  const [taskSearch,  setTaskSearch]  = useState("");
  const [reqSearch,   setReqSearch]   = useState("");
  const [storySearch, setStorySearch] = useState("");

  /* ── Story expand ── */
  const [expandedStories, setExpandedStories] = useState<Set<number>>(new Set());

  /* ── Detail tab ── */
  const [detailTab, setDetailTab] = useState<"original" | "content" | "discussion">("content");

  /* ── Req edit tab ── */
  const [reqEditTab, setReqEditTab] = useState<"content" | "discussion">("content");

  /* ── Dialogs ── */
  const [taskDialogOpen,  setTaskDialogOpen]  = useState(false);
  const [editTask,        setEditTask]        = useState<TaskItem | null>(null);
  const [reqDialogOpen,   setReqDialogOpen]   = useState(false);
  const [editReq,         setEditReq]         = useState<ReqItem | null>(null);
  const [storyDialogOpen, setStoryDialogOpen] = useState(false);
  const [editStory,       setEditStory]       = useState<StoryItem | null>(null);

  const [deleteTaskItem,  setDeleteTaskItem]  = useState<TaskItem | null>(null);
  const [deleteReqItem,   setDeleteReqItem]   = useState<ReqItem | null>(null);
  const [deleteStoryItem, setDeleteStoryItem] = useState<StoryItem | null>(null);

  /* ── Task form ── */
  const [taskName,     setTaskName]     = useState("");
  const [taskCategory, setTaskCategory] = useState("");
  const [taskRfpPage,  setTaskRfpPage]  = useState("");

  /* ── Req form ── */
  const [reqName,           setReqName]           = useState("");
  const [reqPriority,       setReqPriority]       = useState("MEDIUM");
  const [reqTaskId,         setReqTaskId]         = useState("");
  const [reqSource,         setReqSource]         = useState("RFP");
  const [reqCurrentContent, setReqCurrentContent] = useState("");
  const [reqDiscussionMd,   setReqDiscussionMd]   = useState("");

  /* ── Story form ── */
  const [storyReqId,    setStoryReqId]    = useState("");
  const [storyName,     setStoryName]     = useState("");
  const [storyPersona,  setStoryPersona]  = useState("");
  const [storyScenario, setStoryScenario] = useState("");
  const [storyAc,       setStoryAc]       = useState("[]");

  /* ─── Queries ─────────────────────────────────────── */
  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ["hub-tasks", taskSearch],
    queryFn: async () => {
      const p = new URLSearchParams({ pageSize: "200" });
      if (taskSearch) p.set("search", taskSearch);
      return (await fetch(`/api/tasks?${p}`)).json();
    },
  });
  const tasks: TaskItem[] = tasksData?.data ?? [];

  const { data: reqsData, isLoading: reqsLoading } = useQuery({
    queryKey: ["hub-reqs", selectedTaskId, reqSearch],
    queryFn: async () => {
      const p = new URLSearchParams({ pageSize: "200" });
      if (selectedTaskId) p.set("taskId", String(selectedTaskId));
      if (reqSearch) p.set("search", reqSearch);
      return (await fetch(`/api/requirements?${p}`)).json();
    },
  });
  const reqs: ReqItem[] = reqsData?.data ?? [];

  const { data: storiesData, isLoading: storiesLoading } = useQuery({
    queryKey: ["hub-stories", selectedReqId],
    queryFn: async () => {
      const p = new URLSearchParams({ pageSize: "200" });
      if (selectedReqId) p.set("requirementId", String(selectedReqId));
      return (await fetch(`/api/user-stories?${p}`)).json();
    },
    enabled: !!selectedReqId,
  });
  const stories: StoryItem[] = storiesData?.data ?? [];

  const { data: personasData } = useQuery({
    queryKey: ["user-story-personas"],
    queryFn: async () => (await fetch("/api/user-stories/personas")).json(),
  });
  const personaSuggestions: string[] = personasData?.data ?? [];

  const { data: statsData } = useQuery({
    queryKey: ["hub-stats"],
    queryFn: async () => {
      const [t, r, s] = await Promise.all([
        fetch("/api/tasks?pageSize=1").then((r) => r.json()),
        fetch("/api/requirements?pageSize=1").then((r) => r.json()),
        fetch("/api/user-stories?pageSize=1").then((r) => r.json()),
      ]);
      return {
        taskTotal:  t.pagination?.total  ?? 0,
        reqTotal:   r.pagination?.total  ?? 0,
        storyTotal: s.pagination?.total  ?? 0,
      };
    },
  });

  const selectedReq = reqs.find((r) => r.requirementId === selectedReqId) ?? null;

  /* ─── Mutations: Task ──────────────────────────────── */
  const createTaskMut = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hub-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["hub-stats"] });
      toast.success("과업이 등록되었습니다.");
      setTaskDialogOpen(false);
    },
  });
  const updateTaskMut = useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Record<string, unknown>) =>
      apiFetch(`/api/tasks/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hub-tasks"] });
      toast.success("과업이 수정되었습니다.");
      setTaskDialogOpen(false);
      setEditTask(null);
    },
  });
  const deleteTaskMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hub-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["hub-stats"] });
      if (selectedTaskId === deleteTaskItem?.taskId) setSelectedTaskId(null);
      toast.success("삭제되었습니다.");
      setDeleteTaskItem(null);
    },
  });

  /* ─── Mutations: Requirement ───────────────────────── */
  const createReqMut = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/requirements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["hub-reqs"] });
      queryClient.invalidateQueries({ queryKey: ["hub-stats"] });
      queryClient.invalidateQueries({ queryKey: ["hub-tasks"] });
      const newId = (res as { data: { requirementId: number } }).data.requirementId;
      setSelectedReqId(newId);
      toast.success("요구사항이 등록되었습니다.");
      setReqDialogOpen(false);
    },
  });
  const updateReqMut = useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Record<string, unknown>) =>
      apiFetch(`/api/requirements/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hub-reqs"] });
      toast.success("요구사항이 수정되었습니다.");
      setReqDialogOpen(false);
      setEditReq(null);
    },
  });
  const deleteReqMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/requirements/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hub-reqs"] });
      queryClient.invalidateQueries({ queryKey: ["hub-stats"] });
      queryClient.invalidateQueries({ queryKey: ["hub-tasks"] });
      if (selectedReqId === deleteReqItem?.requirementId) setSelectedReqId(null);
      toast.success("삭제되었습니다.");
      setDeleteReqItem(null);
    },
  });

  /* ─── Mutations: Story ─────────────────────────────── */
  const createStoryMut = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/user-stories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hub-stories"] });
      queryClient.invalidateQueries({ queryKey: ["hub-reqs"] });
      queryClient.invalidateQueries({ queryKey: ["hub-stats"] });
      toast.success("스토리가 등록되었습니다.");
      setStoryDialogOpen(false);
    },
  });
  const updateStoryMut = useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Record<string, unknown>) =>
      apiFetch(`/api/user-stories/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hub-stories"] });
      toast.success("스토리가 수정되었습니다.");
      setStoryDialogOpen(false);
      setEditStory(null);
    },
  });
  const deleteStoryMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/user-stories/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hub-stories"] });
      queryClient.invalidateQueries({ queryKey: ["hub-reqs"] });
      queryClient.invalidateQueries({ queryKey: ["hub-stats"] });
      toast.success("삭제되었습니다.");
      setDeleteStoryItem(null);
    },
  });

  /* ─── Open helpers ─────────────────────────────────── */
  const openCreateTask = () => {
    setEditTask(null);
    setTaskName(""); setTaskCategory(""); setTaskRfpPage("");
    setTaskDialogOpen(true);
  };
  const openEditTask = (t: TaskItem) => {
    setEditTask(t);
    setTaskName(t.name);
    setTaskCategory(t.category ?? "");
    setTaskRfpPage(t.rfpPage != null ? String(t.rfpPage) : "");
    setTaskDialogOpen(true);
  };
  const handleSaveTask = () => {
    if (!taskName.trim()) { toast.error("과업명은 필수입니다."); return; }
    const body = { name: taskName.trim(), category: taskCategory.trim() || null, rfpPage: taskRfpPage ? parseInt(taskRfpPage) : null };
    if (editTask) updateTaskMut.mutate({ id: editTask.taskId, ...body });
    else createTaskMut.mutate(body);
  };

  const openCreateReq = () => {
    setEditReq(null);
    setReqName(""); setReqPriority("MEDIUM");
    setReqTaskId(selectedTaskId ? String(selectedTaskId) : "");
    setReqSource("RFP"); setReqCurrentContent(""); setReqDiscussionMd("");
    setReqEditTab("content");
    setReqDialogOpen(true);
  };
  const openEditReq = (r: ReqItem) => {
    setEditReq(r);
    setReqName(r.name); setReqPriority(r.priority || "MEDIUM");
    setReqTaskId(r.taskId ? String(r.taskId) : "");
    setReqSource(r.source || "RFP");
    setReqCurrentContent(r.currentContent || "");
    setReqDiscussionMd(r.discussionMd || "");
    setReqEditTab("content");
    setReqDialogOpen(true);
  };
  const handleSaveReq = () => {
    if (!reqName.trim()) { toast.error("요구사항 명은 필수입니다."); return; }
    const body = {
      name: reqName.trim(), priority: reqPriority,
      taskId: reqTaskId ? parseInt(reqTaskId) : null,
      source: reqSource || "RFP",
      currentContent: reqCurrentContent || null,
      discussionMd: reqDiscussionMd || null,
    };
    if (editReq) updateReqMut.mutate({ id: editReq.requirementId, ...body });
    else createReqMut.mutate(body);
  };

  const openCreateStory = () => {
    setEditStory(null);
    setStoryReqId(selectedReqId ? String(selectedReqId) : "");
    setStoryName(""); setStoryPersona(""); setStoryScenario(""); setStoryAc("[]");
    setStoryDialogOpen(true);
  };
  const openEditStory = (s: StoryItem) => {
    setEditStory(s);
    setStoryReqId(selectedReqId ? String(selectedReqId) : "");
    setStoryName(s.name); setStoryPersona(s.persona ?? "");
    setStoryScenario(s.scenario ?? "");
    setStoryAc(s.acceptanceCriteria ? JSON.stringify(s.acceptanceCriteria) : "[]");
    setStoryDialogOpen(true);
  };
  const handleSaveStory = () => {
    if (!storyReqId || !storyName.trim()) {
      toast.error("소속 요구사항과 스토리 내용은 필수입니다."); return;
    }
    let acParsed: { text: string }[] | null = null;
    try {
      const parsed = JSON.parse(storyAc);
      acParsed = Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
    } catch { acParsed = null; }
    const body = {
      requirementId: parseInt(storyReqId),
      name: storyName.trim(),
      persona: storyPersona.trim() || null,
      scenario: storyScenario.trim() || null,
      acceptanceCriteria: acParsed,
    };
    if (editStory) updateStoryMut.mutate({ id: editStory.userStoryId, ...body });
    else createStoryMut.mutate(body);
  };

  const toggleStoryExpand = (id: number) => {
    setExpandedStories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filteredStories = storySearch
    ? stories.filter((s) =>
        s.name.toLowerCase().includes(storySearch.toLowerCase()) ||
        (s.persona ?? "").toLowerCase().includes(storySearch.toLowerCase())
      )
    : stories;

  /* ─── Render ───────────────────────────────────────── */
  return (
    <div className="-mx-6 -my-6 h-screen flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b bg-card">
        <div className="flex items-center gap-2.5">
          <Network className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">요구사항 허브</h1>
          <span className="text-xs text-muted-foreground ml-1 hidden sm:block">
            과업 · 요구사항 · 사용자 스토리
          </span>
        </div>
        <div className="flex items-center gap-5 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <FileSearch className="h-3.5 w-3.5" />
            <span>과업</span>
            <strong className="text-foreground tabular-nums">{statsData?.taskTotal ?? "—"}</strong>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <ClipboardList className="h-3.5 w-3.5" />
            <span>요구사항</span>
            <strong className="text-foreground tabular-nums">{statsData?.reqTotal ?? "—"}</strong>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <BookMarked className="h-3.5 w-3.5" />
            <span>스토리</span>
            <strong className="text-foreground tabular-nums">{statsData?.storyTotal ?? "—"}</strong>
          </div>
        </div>
      </div>

      {/* ── 3-column body ── */}
      <div className="flex-1 flex min-h-0">

        {/* ── Column 1: Tasks ── */}
        <div className="w-[242px] shrink-0 flex flex-col border-r bg-sidebar/20">
          <div className="shrink-0 px-3 pt-3 pb-2.5 border-b space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <FileSearch className="h-3.5 w-3.5" /> 과업
              </span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={openCreateTask} title="과업 추가">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                className="pl-6 h-7 text-xs"
                placeholder="과업 검색..."
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-1">
            {tasksLoading && (
              <p className="text-xs text-muted-foreground text-center py-8">로딩 중...</p>
            )}
            {!tasksLoading && tasks.length === 0 && (
              <div className="text-center py-10 space-y-2.5 px-4">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mx-auto">
                  <FileSearch className="h-5 w-5 text-muted-foreground/40" />
                </div>
                <p className="text-xs text-muted-foreground">과업이 없습니다</p>
                <Button variant="outline" size="sm" className="text-xs h-7 w-full" onClick={openCreateTask}>
                  <Plus className="h-3 w-3 mr-1" /> 과업 추가
                </Button>
              </div>
            )}

            {/* 전체 보기 */}
            {tasks.length > 0 && (
              <button
                onClick={() => { setSelectedTaskId(null); setSelectedReqId(null); }}
                className={cn(
                  "w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-1.5 border-b border-border/30",
                  selectedTaskId === null
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <LayoutList className="h-3 w-3 shrink-0" />
                <span>전체 요구사항</span>
                <span className="ml-auto font-mono text-[10px] tabular-nums">
                  {statsData?.reqTotal ?? ""}
                </span>
              </button>
            )}

            {tasks.map((task) => (
              <button
                key={task.taskId}
                onClick={() => { setSelectedTaskId(task.taskId); setSelectedReqId(null); }}
                className={cn(
                  "group w-full text-left px-3 py-2.5 transition-colors hover:bg-accent border-b border-border/20 last:border-0",
                  selectedTaskId === task.taskId && "bg-primary/10 border-l-2 border-l-primary"
                )}
              >
                <div className="flex items-start gap-1">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        "text-xs font-mono shrink-0",
                        selectedTaskId === task.taskId ? "text-primary" : "text-muted-foreground"
                      )}>
                        {task.systemId}
                      </span>
                      {task.category && (
                        <span className="text-xs bg-secondary text-secondary-foreground rounded px-1 truncate max-w-[70px]">
                          {task.category}
                        </span>
                      )}
                    </div>
                    <p className={cn(
                      "text-sm mt-0.5 leading-snug truncate",
                      selectedTaskId === task.taskId ? "text-foreground font-medium" : "text-foreground/80"
                    )}>
                      {task.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      요구사항 {task.requirementCount}개{task.rfpPage && ` · p.${task.rfpPage}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pt-0.5">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); openEditTask(task); }}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); openEditTask(task); } }}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <Pencil className="h-2.5 w-2.5" />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Column 2: Requirements ── */}
        <div className="w-[342px] shrink-0 flex flex-col border-r">
          <div className="shrink-0 px-3 pt-3 pb-2.5 border-b space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <ClipboardList className="h-3.5 w-3.5" /> 요구사항
                {selectedTaskId !== null && (
                  <span className="text-primary font-mono normal-case text-xs bg-primary/10 px-1.5 rounded ml-0.5">
                    {tasks.find((t) => t.taskId === selectedTaskId)?.systemId}
                  </span>
                )}
              </span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={openCreateReq} title="요구사항 추가">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                className="pl-6 h-7 text-xs"
                placeholder="요구사항 검색..."
                value={reqSearch}
                onChange={(e) => setReqSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {reqsLoading && (
              <p className="text-xs text-muted-foreground text-center py-8">로딩 중...</p>
            )}
            {!reqsLoading && reqs.length === 0 && (
              <div className="text-center py-10 space-y-2.5 px-4">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mx-auto">
                  <ClipboardList className="h-5 w-5 text-muted-foreground/40" />
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedTaskId ? "이 과업의 요구사항이 없습니다" : "요구사항이 없습니다"}
                </p>
                <Button variant="outline" size="sm" className="text-xs h-7 w-full" onClick={openCreateReq}>
                  <Plus className="h-3 w-3 mr-1" /> 요구사항 추가
                </Button>
              </div>
            )}

            {reqs.map((req) => (
              <button
                key={req.requirementId}
                onClick={() => setSelectedReqId(req.requirementId)}
                className={cn(
                  "group w-full text-left px-3 py-3 transition-colors hover:bg-accent border-b border-border/40 last:border-0",
                  selectedReqId === req.requirementId && "bg-primary/10 border-l-2 border-l-primary"
                )}
              >
                <div className="flex items-start gap-1">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground shrink-0">{req.systemId}</span>
                      <PriorityBadge value={req.priority} />
                      {req.source && req.source !== "RFP" && (
                        <span className="text-xs bg-secondary text-secondary-foreground px-1 rounded">
                          {req.source}
                        </span>
                      )}
                    </div>
                    <p className={cn(
                      "text-sm mt-1 leading-snug",
                      selectedReqId === req.requirementId ? "text-foreground font-medium" : "text-foreground/80"
                    )}>
                      {req.name}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span>화면 {req.screenCount}</span>
                      <span>기능 {req.functionCount}</span>
                      <span className={cn("font-medium", req.userStoryCount > 0 ? "text-primary" : "")}>
                        스토리 {req.userStoryCount}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pt-0.5">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); openEditReq(req); }}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); openEditReq(req); } }}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <Pencil className="h-2.5 w-2.5" />
                    </div>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); setDeleteReqItem(req); }}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); setDeleteReqItem(req); } }}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Column 3: Detail + Stories ── */}
        <div className="flex-1 flex flex-col min-w-0 bg-card">
          {!selectedReqId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center">
                <BookMarked className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <div className="space-y-1.5">
                <p className="font-semibold text-muted-foreground">요구사항을 선택하세요</p>
                <p className="text-xs text-muted-foreground/60 leading-relaxed">
                  좌측에서 과업 → 요구사항 순으로 선택하면<br />
                  상세 정보와 사용자 스토리를 확인할 수 있습니다.
                </p>
              </div>
              {reqs.length > 0 && (
                <p className="text-xs text-muted-foreground/50">
                  {reqs.length}개의 요구사항이 있습니다
                </p>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

              {/* Requirement header */}
              {selectedReq && (
                <div className="shrink-0 px-6 py-4 border-b">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="text-xs font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                          {selectedReq.systemId}
                        </span>
                        <PriorityBadge value={selectedReq.priority} />
                        {selectedReq.source && (
                          <span className="text-xs text-muted-foreground">{selectedReq.source}</span>
                        )}
                        {selectedReq.task && (
                          <span className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-300/30 px-1.5 py-0.5 rounded font-mono">
                            {selectedReq.task.systemId}
                          </span>
                        )}
                      </div>
                      <h2 className="text-base font-semibold leading-snug">{selectedReq.name}</h2>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>화면 <strong className="text-foreground tabular-nums">{selectedReq.screenCount}</strong></span>
                        <span>기능 <strong className="text-foreground tabular-nums">{selectedReq.functionCount}</strong></span>
                        <span>
                          스토리{" "}
                          <strong className={cn("tabular-nums", selectedReq.userStoryCount > 0 ? "text-primary" : "text-foreground")}>
                            {selectedReq.userStoryCount}
                          </strong>
                        </span>
                        <span className="text-muted-foreground/40">수정: {formatDate(selectedReq.updatedAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => openEditReq(selectedReq)}>
                        <Pencil className="h-3 w-3" /> 편집
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-muted-foreground" asChild>
                        <a href="/requirements" target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" /> 전체 편집기
                        </a>
                      </Button>
                    </div>
                  </div>

                  {/* Detail Tabs */}
                  <div className="mt-3">
                    <div className="flex gap-0 border-b border-border">
                      {(["original", "content", "discussion"] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setDetailTab(tab)}
                          className={cn(
                            "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
                            detailTab === tab
                              ? "border-primary text-primary"
                              : "border-transparent text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {tab === "original" ? "원본" : tab === "content" ? "최종본" : "분석내용"}
                        </button>
                      ))}
                    </div>
                    <div className="pt-3 max-h-52 overflow-y-auto">
                      {detailTab === "original" ? (
                        selectedReq.originalContent ? (
                          <div className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">
                            {selectedReq.originalContent}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground/60 italic">원본이 없습니다.</p>
                        )
                      ) : detailTab === "content" ? (
                        selectedReq.currentContent ? (
                          <div
                            className="prose prose-sm max-w-none text-sm leading-relaxed [&>*]:text-foreground/80 [&>p]:mb-1.5 [&>ul]:mb-1.5 [&>li]:mb-1"
                            dangerouslySetInnerHTML={{ __html: selectedReq.currentContent }}
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground/60 italic">내용이 없습니다.</p>
                        )
                      ) : (
                        selectedReq.discussionMd ? (
                          <MarkdownEditor value={selectedReq.discussionMd} readOnly />
                        ) : (
                          <p className="text-sm text-muted-foreground/60 italic">분석내용이 없습니다.</p>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Stories section */}
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="shrink-0 px-5 py-2.5 border-b bg-muted/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookMarked className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">사용자 스토리</span>
                    {stories.length > 0 && (
                      <span className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 font-bold tabular-nums">
                        {stories.length}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {stories.length > 3 && (
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                        <Input
                          className="pl-6 h-6 text-xs w-36"
                          placeholder="스토리 검색..."
                          value={storySearch}
                          onChange={(e) => setStorySearch(e.target.value)}
                        />
                      </div>
                    )}
                    <Button size="sm" className="h-7 text-xs gap-1" onClick={openCreateStory}>
                      <Plus className="h-3 w-3" /> 스토리 추가
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                  {storiesLoading && (
                    <p className="text-xs text-muted-foreground text-center py-6">로딩 중...</p>
                  )}
                  {!storiesLoading && filteredStories.length === 0 && (
                    <div className="text-center py-12 space-y-3">
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto">
                        <BookMarked className="h-6 w-6 text-muted-foreground/30" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">사용자 스토리가 없습니다</p>
                        <p className="text-xs text-muted-foreground/60 mt-0.5">
                          이 요구사항에 대한 스토리를 추가해보세요
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="text-xs" onClick={openCreateStory}>
                        <Plus className="h-3 w-3 mr-1" /> 첫 스토리 작성
                      </Button>
                    </div>
                  )}

                  {filteredStories.map((story) => {
                    const hasAc = story.acceptanceCriteria && story.acceptanceCriteria.length > 0;
                    return (
                      <div
                        key={story.userStoryId}
                        className="rounded-lg border border-border bg-background hover:border-primary/40 transition-colors"
                      >
                        <div className="px-4 py-3.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-mono text-muted-foreground shrink-0">
                                  {story.systemId}
                                </span>
                                {story.persona && (
                                  <span className="text-xs bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-300/30 px-1.5 py-0.5 rounded font-medium">
                                    {story.persona}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">사용자 스토리</p>
                              <p className="text-sm leading-snug text-foreground">{story.name}</p>
                              {story.scenario && (
                                <div className="mt-3">
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">시나리오</p>
                                  <p className="text-sm text-muted-foreground leading-relaxed">
                                    {story.scenario}
                                  </p>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                onClick={() => openEditStory(story)}
                                className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title="편집"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => setDeleteStoryItem(story)}
                                className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                title="삭제"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {hasAc && (
                          <div className="px-4 pb-3.5 border-t border-border/40 bg-muted/20">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide pt-3 mb-2">
                              인수 조건 ({story.acceptanceCriteria!.length})
                            </p>
                            <ul className="space-y-1.5">
                              {story.acceptanceCriteria!.map((ac, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm">
                                  <span className="shrink-0 w-4 h-4 rounded bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">
                                    {idx + 1}
                                  </span>
                                  <span className="text-foreground/80 leading-relaxed">{ac.text}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Task Dialog ── */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTask ? "과업 수정" : "과업 등록"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm">과업명 *</Label>
              <Input value={taskName} onChange={(e) => setTaskName(e.target.value)} placeholder="예: 사용자 관리" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">분류</Label>
                <Input value={taskCategory} onChange={(e) => setTaskCategory(e.target.value)} placeholder="예: 기능 요구사항" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">RFP 페이지</Label>
                <Input type="number" value={taskRfpPage} onChange={(e) => setTaskRfpPage(e.target.value)} placeholder="17" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>취소</Button>
            <Button onClick={handleSaveTask} disabled={createTaskMut.isPending || updateTaskMut.isPending}>
              {createTaskMut.isPending || updateTaskMut.isPending ? "저장중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Requirement Dialog ── */}
      <Dialog open={reqDialogOpen} onOpenChange={setReqDialogOpen}>
        <DialogContent className="w-[88vw] max-w-5xl h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="shrink-0 px-6 pt-5 pb-4 border-b">
            <DialogTitle>{editReq ? "요구사항 수정" : "요구사항 등록"}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">요구사항 명 *</Label>
              <Input value={reqName} onChange={(e) => setReqName(e.target.value)} placeholder="예: 사용자 로그인" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">우선순위</Label>
                <Select value={reqPriority} onValueChange={setReqPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">과업</Label>
                <Select value={reqTaskId || "none"} onValueChange={(v) => setReqTaskId(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="과업 선택" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">과업 없음</SelectItem>
                    {tasks.map((t) => (
                      <SelectItem key={t.taskId} value={String(t.taskId)}>{t.systemId} {t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">출처</Label>
                <Input value={reqSource} onChange={(e) => setReqSource(e.target.value)} placeholder="RFP" />
              </div>
            </div>

            {/* Edit Tabs */}
            <div>
              <div className="flex gap-0 border-b border-border mb-4">
                {(["content", "discussion"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setReqEditTab(tab)}
                    className={cn(
                      "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
                      reqEditTab === tab
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab === "content" ? "최종본" : "분석내용"}
                  </button>
                ))}
              </div>
              {reqEditTab === "content" ? (
                <div className="space-y-1.5">
                  <RichTextEditor
                    value={reqCurrentContent}
                    onChange={setReqCurrentContent}
                  />
                  <p className="text-xs text-muted-foreground">
                    ※ 원본·명세서·이력 등 고급 편집은{" "}
                    <a href="/requirements" className="text-primary underline" target="_blank" rel="noopener noreferrer">
                      요구사항 관리
                    </a>{" "}
                    페이지에서 사용하세요.
                  </p>
                </div>
              ) : (
                <MarkdownEditor
                  label="분석내용"
                  value={reqDiscussionMd}
                  onChange={setReqDiscussionMd}
                  placeholder="요구사항 분석 내용을 마크다운으로 작성하세요..."
                  rows={14}
                />
              )}
            </div>
          </div>
          <DialogFooter className="shrink-0 px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setReqDialogOpen(false)}>취소</Button>
            <Button onClick={handleSaveReq} disabled={createReqMut.isPending || updateReqMut.isPending}>
              {createReqMut.isPending || updateReqMut.isPending ? "저장중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Story Dialog ── */}
      <Dialog open={storyDialogOpen} onOpenChange={setStoryDialogOpen}>
        <DialogContent className="w-[85vw] max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="shrink-0 px-6 pt-5 pb-4 border-b">
            <DialogTitle>{editStory ? "사용자 스토리 수정" : "사용자 스토리 등록"}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">소속 요구사항 *</Label>
                <Select value={storyReqId} onValueChange={setStoryReqId}>
                  <SelectTrigger><SelectValue placeholder="요구사항 선택" /></SelectTrigger>
                  <SelectContent>
                    {reqs.map((r) => (
                      <SelectItem key={r.requirementId} value={String(r.requirementId)}>
                        {r.systemId} {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">페르소나</Label>
                <AutocompleteInput
                  value={storyPersona}
                  onChange={setStoryPersona}
                  suggestions={personaSuggestions}
                  placeholder="예: 예산 담당자"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label className="text-sm">사용자 스토리 *</Label>
                <span className="text-xs text-muted-foreground">— "[페르소나]가 [목적]을 [할 수 있다]" 형식</span>
              </div>
              <Textarea
                value={storyName}
                onChange={(e) => setStoryName(e.target.value)}
                placeholder="예: 예산 담당자가 신규 회계연도 예산안을 항목별로 편성하고 기안 상신할 수 있다"
                rows={2}
                className="resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">시나리오</Label>
              <Textarea
                value={storyScenario}
                onChange={(e) => setStoryScenario(e.target.value)}
                placeholder="업무 맥락과 목적을 설명합니다."
                rows={4}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label className="text-sm">인수 조건 (Acceptance Criteria)</Label>
                <span className="text-xs text-muted-foreground">— 검사기준서에 활용됩니다.</span>
              </div>
              <AcceptanceCriteriaEditor value={storyAc} onChange={setStoryAc} />
            </div>
          </div>
          <DialogFooter className="shrink-0 px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setStoryDialogOpen(false)}>취소</Button>
            <Button onClick={handleSaveStory} disabled={createStoryMut.isPending || updateStoryMut.isPending}>
              {createStoryMut.isPending || updateStoryMut.isPending ? "저장중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm dialogs ── */}
      <ConfirmDialog
        open={!!deleteReqItem} onOpenChange={() => setDeleteReqItem(null)}
        title="요구사항 삭제"
        description={`"${deleteReqItem?.name}"을(를) 삭제하시겠습니까?`}
        variant="destructive" confirmLabel="삭제"
        onConfirm={() => deleteReqItem && deleteReqMut.mutate(deleteReqItem.requirementId)}
        loading={deleteReqMut.isPending}
      />
      <ConfirmDialog
        open={!!deleteStoryItem} onOpenChange={() => setDeleteStoryItem(null)}
        title="스토리 삭제"
        description={`"${deleteStoryItem?.name}"을(를) 삭제하시겠습니까?`}
        variant="destructive" confirmLabel="삭제"
        onConfirm={() => deleteStoryItem && deleteStoryMut.mutate(deleteStoryItem.userStoryId)}
        loading={deleteStoryMut.isPending}
      />
    </div>
  );
}
