"use client";

/**
 * 과업(Task) 상세 페이지
 *
 * 레이아웃:
 *  - 좌측 (col-span-5): RFP 원문 뷰어 (요약 정의 · 산출정보 · 세부내용)
 *  - 우측 (col-span-7): 연결된 요구사항 목록 + 추적성 아코디언
 *
 * 추적성: 요구사항 → 사용자 스토리 → 화면 (펼침/접힘)
 */
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronRight, ChevronDown, Plus, Pencil, Trash2,
  ArrowLeft, Monitor, BookMarked, Eye, ExternalLink,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { apiFetch, formatDate } from "@/lib/utils";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { RichTextEditor } from "@/components/common/RichTextEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── 타입 정의 ───────────────────────────────────────────────

interface ScreenRef {
  screenId: number;
  systemId: string;
  name:     string;
}
interface StoryRef {
  userStoryId: number;
  systemId:    string;
  name:        string;
  screenMaps:  { screen: ScreenRef }[];
}
interface RequirementRef {
  requirementId: number;
  systemId:      string;
  name:          string;
  source:        string;
  priority:      string | null;
  _count:        { screens: number; userStories: number };
  userStories:   StoryRef[];
}
interface TaskDetail {
  taskId:       number;
  systemId:     string;
  taskNo:       string | null;
  name:         string;
  category:     string | null;
  definition:   string | null;
  outputInfo:   string | null;
  rfpPage:      number | null;
  content:      string | null;
  createdAt:    string;
  requirements: RequirementRef[];
}
interface RequirementOption {
  requirementId: number;
  systemId:      string;
  name:          string;
}
interface RequirementDetail {
  requirementId:   number;
  systemId:        string;
  name:            string;
  source:          string;
  priority:        string | null;
  originalContent: string | null;
  currentContent:  string | null;
  detailSpec:      string | null;
  screens: { screenId: number; systemId: string; name: string; _count: { areas: number } }[];
}
interface StoryDetail {
  userStoryId:        number;
  systemId:           string;
  name:               string;
  persona:            string | null;
  scenario:           string | null;
  acceptanceCriteria: { text: string }[] | null;
  requirement:        { requirementId: number; systemId: string; name: string };
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────

export default function TaskDetailPage() {
  const { id }      = useParams<{ id: string }>();
  const router      = useRouter();
  const queryClient = useQueryClient();

  // 수정 다이얼로그 (과업 자체)
  const [editOpen,        setEditOpen]        = useState(false);
  const [deleteOpen,      setDeleteOpen]      = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);

  // 요구사항 등록 다이얼로그
  const [reqDialogOpen, setReqDialogOpen] = useState(false);

  // 요구사항 폼 상태
  const [formName,        setFormName]        = useState("");
  const [formContent,     setFormContent]     = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPriority,    setFormPriority]    = useState("");
  const [formSource,      setFormSource]      = useState("RFP");

  // 과업 수정 폼 상태
  const [editTaskNo,     setEditTaskNo]     = useState("");
  const [editName,       setEditName]       = useState("");
  const [editCategory,   setEditCategory]   = useState("");
  const [editDefinition, setEditDefinition] = useState("");
  const [editOutputInfo, setEditOutputInfo] = useState("");
  const [editRfpPage,    setEditRfpPage]    = useState("");
  const [editContent,    setEditContent]    = useState("");

  // 추적성 아코디언 열린 요구사항 ID
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // 팝업 상세보기
  const [reqDetailId,   setReqDetailId]   = useState<number | null>(null);
  const [storyDetailId, setStoryDetailId] = useState<number | null>(null);

  // ── 과업 상세 조회 ──────────────────────────────────────────
  const { data: taskData, isLoading } = useQuery({
    queryKey: ["task-detail", id],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${id}`);
      return res.json();
    },
    enabled: !!id,
  });
  const task: TaskDetail | undefined = taskData?.data;

  // ── 요구사항 상세 (팝업용) ─────────────────────────────────
  const { data: reqDetailData } = useQuery({
    queryKey: ["req-detail", reqDetailId],
    queryFn: async () => {
      const res = await fetch(`/api/requirements/${reqDetailId}`);
      return res.json();
    },
    enabled: !!reqDetailId,
  });
  const reqDetail: RequirementDetail | undefined = reqDetailData?.data;

  // ── 스토리 상세 (팝업용) ──────────────────────────────────
  const { data: storyDetailData } = useQuery({
    queryKey: ["story-detail", storyDetailId],
    queryFn: async () => {
      const res = await fetch(`/api/user-stories/${storyDetailId}`);
      return res.json();
    },
    enabled: !!storyDetailId,
  });
  const storyDetail: StoryDetail | undefined = storyDetailData?.data;

  // ── 요구사항 목록 (등록 폼용 — 기존 요구사항 없음, 신규만) ──
  // 과업 필터용 requirements는 task.requirements로 충분

  // ── Mutations ─────────────────────────────────────────────

  // 과업 수정
  const updateTaskMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("과업이 수정되었습니다.");
      setConfirmSaveOpen(false);
      setEditOpen(false);
    },
  });

  // 과업 삭제
  const deleteTaskMutation = useMutation({
    mutationFn: () => apiFetch(`/api/tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("삭제되었습니다.");
      router.push("/tasks");
    },
  });

  // 요구사항 등록
  const createReqMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["requirements"] });
      toast.success("요구사항이 등록되었습니다.");
      setReqDialogOpen(false);
      resetReqForm();
    },
  });

  // ── 헬퍼 함수 ──────────────────────────────────────────────

  const resetReqForm = () => {
    setFormName("");
    setFormContent("");
    setFormDescription("");
    setFormPriority("");
    setFormSource("RFP");
  };

  const openEditTask = () => {
    if (!task) return;
    setEditTaskNo(task.taskNo ?? "");
    setEditName(task.name);
    setEditCategory(task.category ?? "");
    setEditDefinition(task.definition ?? "");
    setEditOutputInfo(task.outputInfo ?? "");
    setEditRfpPage(task.rfpPage != null ? String(task.rfpPage) : "");
    setEditContent(task.content ?? "");
    setEditOpen(true);
  };

  const handleSaveTask = () => {
    if (!editName.trim()) { toast.error("과업명은 필수입니다."); return; }
    updateTaskMutation.mutate({
      taskNo:     editTaskNo.trim()     || null,
      name:       editName.trim(),
      category:   editCategory.trim()   || null,
      definition: editDefinition.trim() || null,
      outputInfo: editOutputInfo.trim() || null,
      rfpPage:    editRfpPage ? parseInt(editRfpPage) : null,
      content:    editContent.trim()    || null,
    });
  };

  const handleSaveReq = () => {
    if (!formName.trim()) { toast.error("요구사항명은 필수입니다."); return; }
    createReqMutation.mutate({
      name:        formName.trim(),
      content:     formContent.trim()     || null,
      description: formDescription.trim() || null,
      priority:    formPriority           || null,
      taskId:      task?.taskId,
      source:      formSource,
    });
  };

  const toggleExpand = (reqId: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(reqId) ? next.delete(reqId) : next.add(reqId);
      return next;
    });
  };

  // ── 로딩 / 에러 ────────────────────────────────────────────

  if (isLoading) {
    return <div className="text-muted-foreground p-8">로딩 중...</div>;
  }
  if (!task) {
    return (
      <div className="p-8 text-muted-foreground">
        과업을 찾을 수 없습니다.
        <Button variant="link" onClick={() => router.push("/tasks")}>목록으로</Button>
      </div>
    );
  }

  // ── 렌더 ──────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* ── 상단 헤더 ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="mt-1 shrink-0"
            onClick={() => router.push("/tasks")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-1.5">
            {/* 타이틀 먼저 */}
            <h1 className="text-2xl font-bold leading-tight">{task.name}</h1>
            {/* 메타 뱃지 아래 */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-mono text-muted-foreground">{task.systemId}</span>
              {task.taskNo && (
                <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">
                  {task.taskNo}
                </span>
              )}
              {task.category && (
                <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                  {task.category}
                </span>
              )}
              {task.rfpPage != null && (
                <span className="text-sm text-muted-foreground">RFP p.{task.rfpPage}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 mt-1">
          <Button variant="outline" size="sm" onClick={openEditTask}>
            <Pencil className="h-3.5 w-3.5 mr-1" />
            수정
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            삭제
          </Button>
        </div>
      </div>

      {/* ── 2컬럼 레이아웃 ── */}
      <div className="grid grid-cols-12 gap-6 items-start">

        {/* ── 좌측: RFP 원문 뷰어 ── */}
        <div className="col-span-5 sticky top-4">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            {/* 카드 헤더 — 메타 정보 나열 */}
            <div className="px-4 py-3 border-b border-border bg-muted/30 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">RFP 원문</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <span className="text-muted-foreground">
                  시스템ID: <span className="font-mono text-foreground">{task.systemId}</span>
                </span>
                {task.taskNo && (
                  <span className="text-muted-foreground">
                    과업번호: <span className="font-mono text-primary font-medium">{task.taskNo}</span>
                  </span>
                )}
                {task.category && (
                  <span className="text-muted-foreground">
                    분류: <span className="text-foreground">{task.category}</span>
                  </span>
                )}
                {task.rfpPage != null && (
                  <span className="text-muted-foreground">
                    RFP p.<span className="text-foreground font-medium">{task.rfpPage}</span>
                  </span>
                )}
                <span className="text-muted-foreground ml-auto">
                  등록: {formatDate(task.createdAt)}
                </span>
              </div>
            </div>

            <div className="p-4 space-y-5">
              {/* 요약 정의 */}
              {task.definition && (
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-muted-foreground">요약 정의</p>
                  <p className="text-base leading-relaxed">{task.definition}</p>
                </div>
              )}

              {/* 세부내용 원문 */}
              {task.content ? (
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-muted-foreground">세부내용 원문</p>
                  <div
                    className="text-sm leading-relaxed overflow-auto max-h-[50vh] bg-muted/30 rounded p-3 prose prose-base max-w-none"
                    dangerouslySetInnerHTML={{ __html: task.content }}
                  />
                </div>
              ) : (
                <p className="text-base text-muted-foreground text-center py-4">세부내용 원문이 없습니다.</p>
              )}

              {/* 산출정보 */}
              {task.outputInfo && (
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-muted-foreground">산출정보</p>
                  <p className="text-base leading-relaxed">{task.outputInfo}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── 우측: 연결 요구사항 + 추적성 ── */}
        <div className="col-span-7 rounded-lg border border-border bg-card overflow-hidden">

          {/* 섹션 헤더 — 좌측 카드 헤더와 동일한 높이/스타일 */}
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
            <div className="space-y-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">연결된 요구사항</p>
              <p className="text-xs text-muted-foreground">
                {task.requirements.length}건
              </p>
            </div>
            <Button size="sm" onClick={() => { resetReqForm(); setReqDialogOpen(true); }}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              요구사항 등록
            </Button>
          </div>

          {/* 요구사항 카드 목록 */}
          <div className="p-3">
          {task.requirements.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-base text-muted-foreground">
              연결된 요구사항이 없습니다.
              <br />
              우측 상단 버튼으로 요구사항을 추가하세요.
            </div>
          ) : (
            <div className="space-y-2">
              {task.requirements.map((req) => {
                const isExpanded = expandedIds.has(req.requirementId);
                const hasTrace   = req.userStories.length > 0;

                return (
                  <div
                    key={req.requirementId}
                    className="rounded-lg border border-border bg-card overflow-hidden"
                  >
                    {/* 요구사항 헤더 */}
                    <div className="flex items-center justify-between px-3 py-2.5 hover:bg-muted/40 transition-colors">
                      {/* 왼쪽: 펼침 + ID + 이름 */}
                      <div
                        className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                        onClick={() => hasTrace && toggleExpand(req.requirementId)}
                      >
                        {hasTrace ? (
                          isExpanded
                            ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                            : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <span className="w-4 shrink-0" />
                        )}
                        <span className="text-xs font-mono text-muted-foreground shrink-0">
                          {req.systemId}
                        </span>
                        <span className="text-sm font-medium truncate">{req.name}</span>
                      </div>

                      {/* 오른쪽: 뱃지 + 카운트 + 액션 버튼 */}
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">
                          {req.source}
                        </span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          화면 {req._count.screens} · 스토리 {req._count.userStories}
                        </span>
                        {/* 상세보기 팝업 */}
                        <button
                          onClick={() => setReqDetailId(req.requirementId)}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="상세 보기"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* 추적성 펼침 */}
                    {isExpanded && hasTrace && (
                      <div className="border-t border-border px-4 py-3 space-y-2 bg-muted/20">
                        {req.userStories.map((story) => (
                          <div key={story.userStoryId} className="space-y-1">
                            {/* 사용자 스토리 — 클릭 시 상세 팝업 */}
                            <div className="flex items-center gap-2 group">
                              <BookMarked className="h-3 w-3 text-primary shrink-0" />
                              <button
                                className="flex items-center gap-1.5 min-w-0 text-left hover:text-primary transition-colors"
                                onClick={() => setStoryDetailId(story.userStoryId)}
                              >
                                <span className="text-xs font-mono text-muted-foreground group-hover:text-primary/70 shrink-0">
                                  {story.systemId}
                                </span>
                                <span className="text-xs truncate">{story.name}</span>
                              </button>
                              <Eye className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 cursor-pointer transition-opacity"
                                onClick={() => setStoryDetailId(story.userStoryId)} />
                            </div>

                            {/* 연결 화면 */}
                            {story.screenMaps.map((sm, idx) => (
                              <div key={idx} className="flex items-center gap-2 pl-5">
                                <span className="text-xs text-muted-foreground">→</span>
                                <Monitor className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="text-xs font-mono text-muted-foreground mr-1">
                                  {sm.screen.systemId}
                                </span>
                                <span className="text-xs text-muted-foreground truncate">
                                  {sm.screen.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>
      </div>

      {/* ══ 과업 수정 다이얼로그 ══ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-[85vw] max-w-4xl max-h-[92vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle>과업 수정</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* 과업명 + 과업번호 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">과업명 *</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">과업 번호</Label>
                <Input value={editTaskNo} onChange={(e) => setEditTaskNo(e.target.value)} placeholder="예: 1.1, A-01" />
              </div>
            </div>
            {/* 분류 + RFP 페이지 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">분류</Label>
                <Input value={editCategory} onChange={(e) => setEditCategory(e.target.value)} placeholder="예: 기능 요구사항" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">RFP 페이지</Label>
                <Input type="number" value={editRfpPage} onChange={(e) => setEditRfpPage(e.target.value)} placeholder="예: 17" />
              </div>
            </div>
            {/* 요약 정의 */}
            <div className="space-y-1.5">
              <Label className="text-sm">요약 정의</Label>
              <Textarea value={editDefinition} onChange={(e) => setEditDefinition(e.target.value)} rows={3} />
            </div>
            {/* 세부내용 원문 — 리치 에디터 (이미지 붙여넣기 base64 지원) */}
            <RichTextEditor
              label="세부내용 원문"
              value={editContent}
              onChange={setEditContent}
              placeholder="세부내용 원문을 입력하세요. 이미지는 Ctrl+V로 붙여넣기 가능합니다."
              heightClass="min-h-64"
            />
            {/* 산출정보 */}
            <div className="space-y-1.5">
              <Label className="text-sm">산출정보</Label>
              <Textarea value={editOutputInfo} onChange={(e) => setEditOutputInfo(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border flex-shrink-0">
            <Button variant="outline" onClick={() => setEditOpen(false)}>취소</Button>
            <Button onClick={() => setConfirmSaveOpen(true)} disabled={updateTaskMutation.isPending}>
              {updateTaskMutation.isPending ? "저장중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ 저장 확인 ConfirmDialog ══ */}
      <ConfirmDialog
        open={confirmSaveOpen}
        onOpenChange={setConfirmSaveOpen}
        title="정말 수정할까요?"
        description={
          <>
            <span className="block">정보를 수정할라고 하면 이거 진짜? 수정할꺼야?</span>
            <span className="block mt-2 font-semibold text-destructive">이력 관리 되지 않는다. 조심해</span>
          </>
        }
        confirmLabel="네, 저장합니다"
        onConfirm={handleSaveTask}
        loading={updateTaskMutation.isPending}
      />

      {/* ══ 요구사항 등록 다이얼로그 ══ */}
      <Dialog open={reqDialogOpen} onOpenChange={setReqDialogOpen}>
        <DialogContent className="w-[85vw] max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle>요구사항 등록</DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              과업 <span className="font-medium text-foreground">{task.systemId}</span>에 요구사항을 추가합니다.
            </p>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* 요구사항명 */}
            <div className="space-y-1.5">
              <Label className="text-sm">요구사항명 *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="예: 사용자 계정 생성 및 권한 부여"
              />
            </div>

            {/* 우선순위 + 출처 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">우선순위</Label>
                <Select value={formPriority} onValueChange={setFormPriority}>
                  <SelectTrigger>
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HIGH">상</SelectItem>
                    <SelectItem value="MEDIUM">중</SelectItem>
                    <SelectItem value="LOW">하</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">출처</Label>
                <Input
                  value={formSource}
                  onChange={(e) => setFormSource(e.target.value)}
                  placeholder="RFP"
                />
              </div>
            </div>

            {/* 요구사항 내용 */}
            <div className="space-y-1.5">
              <Label className="text-sm">요구사항 내용</Label>
              <Textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="요구사항 원문을 입력합니다."
                rows={4}
              />
            </div>

            {/* 분석 내용 */}
            <div className="space-y-1.5">
              <Label className="text-sm">분석 내용</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="요구사항을 분석한 내용을 입력합니다."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border flex-shrink-0">
            <Button variant="outline" onClick={() => setReqDialogOpen(false)}>취소</Button>
            <Button onClick={handleSaveReq} disabled={createReqMutation.isPending}>
              {createReqMutation.isPending ? "저장중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ 요구사항 상세 팝업 ══ */}
      <Dialog open={!!reqDetailId} onOpenChange={(o) => !o && setReqDetailId(null)}>
        <DialogContent className="w-[90vw] max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="flex-shrink-0 px-5 pt-5 pb-3 border-b border-border">
            <div className="space-y-0.5 min-w-0 pr-8">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground shrink-0">
                  {reqDetail?.systemId}
                </span>
                {reqDetail?.priority && (
                  <span className="text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">
                    {reqDetail.priority === "HIGH" ? "상" : reqDetail.priority === "MEDIUM" ? "중" : "하"}
                  </span>
                )}
                <span className="text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">
                  {reqDetail?.source}
                </span>
              </div>
              <DialogTitle className="text-base leading-snug">{reqDetail?.name ?? "로딩 중..."}</DialogTitle>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {!reqDetail ? (
              <p className="text-sm text-muted-foreground text-center py-8">로딩 중...</p>
            ) : (
              <>
                {/* 요구사항 원문 */}
                {reqDetail.originalContent && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">요구사항 원문</p>
                    <div className="text-sm leading-relaxed bg-muted/30 rounded-md p-3 whitespace-pre-wrap">
                      {reqDetail.originalContent}
                    </div>
                  </div>
                )}

                {/* 현재 내용 (협의/변경본) */}
                {reqDetail.currentContent && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">현재 내용</p>
                    <div className="text-sm leading-relaxed bg-muted/30 rounded-md p-3 whitespace-pre-wrap">
                      {reqDetail.currentContent}
                    </div>
                  </div>
                )}

                {/* 요구사항 명세서 — 마크다운 렌더 */}
                {reqDetail.detailSpec && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">요구사항 명세서</p>
                    <div className="markdown-body text-sm bg-muted/30 rounded-md p-3">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {reqDetail.detailSpec}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                {/* 연결 화면 */}
                {reqDetail.screens.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      연결 화면 ({reqDetail.screens.length}건)
                    </p>
                    <div className="space-y-1">
                      {reqDetail.screens.map((sc) => (
                        <div key={sc.screenId} className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/30 text-sm">
                          <Monitor className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="font-mono text-xs text-muted-foreground shrink-0">{sc.systemId}</span>
                          <span className="truncate">{sc.name}</span>
                          <span className="ml-auto text-xs text-muted-foreground shrink-0">영역 {sc._count.areas}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 아무 내용도 없을 때 */}
                {!reqDetail.originalContent && !reqDetail.currentContent && !reqDetail.detailSpec && reqDetail.screens.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">등록된 상세 내용이 없습니다.</p>
                )}
              </>
            )}
          </div>

          <div className="flex-shrink-0 px-5 py-3 border-t border-border flex items-center justify-between">
            <button
              onClick={() => router.push("/requirements")}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              요구사항 관리로 이동
            </button>
            <Button variant="outline" size="sm" onClick={() => setReqDetailId(null)}>닫기</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══ 스토리 상세 팝업 ══ */}
      <Dialog open={!!storyDetailId} onOpenChange={(o) => !o && setStoryDetailId(null)}>
        <DialogContent className="w-[90vw] max-w-xl max-h-[80vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="flex-shrink-0 px-5 pt-5 pb-3 border-b border-border">
            <div className="space-y-0.5">
              <span className="text-xs font-mono text-muted-foreground">{storyDetail?.systemId}</span>
              <DialogTitle className="text-base leading-snug">{storyDetail?.name ?? "로딩 중..."}</DialogTitle>
              {storyDetail?.requirement && (
                <p className="text-xs text-muted-foreground">
                  요구사항:{" "}
                  <span className="font-mono text-foreground">{storyDetail.requirement.systemId}</span>{" "}
                  {storyDetail.requirement.name}
                </p>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {!storyDetail ? (
              <p className="text-sm text-muted-foreground text-center py-8">로딩 중...</p>
            ) : (
              <>
                {/* 페르소나 */}
                {storyDetail.persona && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">페르소나</p>
                    <p className="text-sm bg-muted/30 rounded-md px-3 py-2">{storyDetail.persona}</p>
                  </div>
                )}

                {/* 시나리오 */}
                {storyDetail.scenario && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">시나리오</p>
                    <div className="text-sm leading-relaxed bg-muted/30 rounded-md p-3 whitespace-pre-wrap">
                      {storyDetail.scenario}
                    </div>
                  </div>
                )}

                {/* 인수 조건 */}
                {storyDetail.acceptanceCriteria && storyDetail.acceptanceCriteria.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      인수 조건 ({storyDetail.acceptanceCriteria.length}개)
                    </p>
                    <ul className="space-y-1">
                      {storyDetail.acceptanceCriteria.map((ac, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm px-3 py-1.5 rounded-md bg-muted/30">
                          <span className="text-muted-foreground shrink-0 mt-0.5 text-xs">{i + 1}.</span>
                          <span className="leading-relaxed">{ac.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 아무 내용도 없을 때 */}
                {!storyDetail.persona && !storyDetail.scenario && (!storyDetail.acceptanceCriteria || storyDetail.acceptanceCriteria.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-6">등록된 상세 내용이 없습니다.</p>
                )}
              </>
            )}
          </div>

          <div className="flex-shrink-0 px-5 py-3 border-t border-border flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setStoryDetailId(null)}>닫기</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══ 과업 삭제 확인 ══ */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="과업 삭제"
        description={
          <>
            <span className="block">"{task.name}"을(를) 삭제하시겠습니까?</span>
            {task.requirements.length > 0 && (
              <span className="block mt-2 text-muted-foreground">
                연결된 요구사항 {task.requirements.length}건이 있습니다.
                삭제해도 요구사항은 유지되며, 과업 연결만 해제됩니다.
              </span>
            )}
          </>
        }
        variant="destructive"
        confirmLabel="삭제"
        onConfirm={() => deleteTaskMutation.mutate()}
        loading={deleteTaskMutation.isPending}
      />
    </div>
  );
}
