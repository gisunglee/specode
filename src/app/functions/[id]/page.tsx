"use client";

/* ─── React / Next.js 임포트 ─────────────────────────────── */
import { use, useRef, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronRight, Download, History, Bot, Trash2 } from "lucide-react";

/* ─── UI 컴포넌트 임포트 ─────────────────────────────────── */
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

/* ─── 상수 & 유틸 임포트 ─────────────────────────────────── */
import {
  USER_SELECTABLE_STATUSES,
  AI_REQUEST_STATUSES,
  FUNC_STATUS_LABEL,
} from "@/lib/constants";
import { apiFetch, cn } from "@/lib/utils";
import { toast } from "sonner";
 
/* ─── 탭 컴포넌트 임포트 ─────────────────────────────────── */
import { BasicInfoTab } from "@/components/functions/BasicInfoTab";
import { DesignInfoTab } from "@/components/functions/DesignInfoTab";
import { AiFeedbackTab } from "@/components/functions/AiFeedbackTab";
import { HistoryTab } from "@/components/functions/HistoryTab";
import { ImplRequestDialog } from "@/components/functions/ImplRequestDialog";
import { StoryCompass } from "@/components/user-story/StoryCompass";

export default function FunctionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [statusDialog, setStatusDialog] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [gsComment, setGsComment] = useState("");
  const [statusOpen, setStatusOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackViewMode, setFeedbackViewMode] = useState<"preview" | "code">("preview");
  const [statusSaved, setStatusSaved] = useState(false);

  const statusRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["function", id],
    queryFn: async () => {
      const res = await fetch(`/api/functions/${id}`);
      return res.json();
    },
    gcTime: 0,
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiFetch(`/api/functions/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("기능이 삭제되었습니다.");
      router.push("/functions");
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ status, changeNote }: { status: string; changeNote?: string }) =>
      apiFetch(`/api/functions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          comment: gsComment.trim() || undefined,
          changeNote: changeNote?.trim() || undefined,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["function", id] });
      queryClient.invalidateQueries({ queryKey: ["functions"] });
      toast.success("상태가 변경되었습니다.");
      setStatusDialog(null);
      setGsComment("");
      setStatusSaved(true);
      setTimeout(() => setStatusSaved(false), 2000);
    },
  });

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleStatusChange = (status: string) => {
    setStatusOpen(false);
    if ((AI_REQUEST_STATUSES as readonly string[]).includes(status)) {
      setStatusDialog(status);
    } else {
      statusMutation.mutate({ status });
    }
  };

  const handleExportPrd = async () => {
    const fn = data?.data;
    if (!fn) return;
    const res = await fetch(`/api/functions/${id}/prd`);
    if (!res.ok) { toast.error("PRD 생성에 실패했습니다."); return; }
    const md = await res.text();
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PRD_func-v1_${fn.systemId}_${fn.name}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        로딩 중...
      </div>
    );
  }

  const func = data?.data;
  if (!func) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        기능을 찾을 수 없습니다.
      </div>
    );
  }

  const availableStatuses = USER_SELECTABLE_STATUSES.filter(
    (s) => s !== func.status
  );

  const isAiWorking =
    func.status === "AI_REVIEWING" || func.status === "AI_IMPLEMENTING";

  return (
    <div>
      {/* ─── 슬림 Sticky 헤더 ────────────────────────────────── */}
      <div className="sticky top-0 z-20 -mx-6 -mt-6 px-6 bg-background/95 backdrop-blur-sm mb-2">
        <div className="flex items-center gap-2 h-12">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => router.push("/functions")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1.5 flex-1 min-w-0 text-sm overflow-hidden">
            <span className="font-bold shrink-0">{func.systemId}</span>
            {func.displayCode && (
              <span className="text-xs text-muted-foreground shrink-0">
                ({func.displayCode})
              </span>
            )}
            <span className="text-muted-foreground/40 mx-0.5 shrink-0">·</span>
            <span className="font-medium truncate">{func.name}</span>
            {func.screen?.name && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                <button
                  onClick={() => router.push(`/screens/${func.screen.screenId}`)}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors shrink-0 max-w-[140px] truncate"
                >
                  {func.screen.name}
                </button>
              </>
            )}
            {func.area?.name && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                <button
                  onClick={() => router.push(`/areas/${func.area.areaId}`)}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors shrink-0 max-w-[140px] truncate"
                >
                  {func.area.name}
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handleExportPrd} title="기능을 PRD.md로 내보내기">
              <Download className="h-3.5 w-3.5 mr-1.5" />
              PRD 내보내기
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="기능 삭제"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
            </Button>
            <StatusSelector
              currentStatus={func.status}
              availableStatuses={availableStatuses}
              isAiWorking={isAiWorking}
              statusOpen={statusOpen}
              setStatusOpen={setStatusOpen}
              onStatusChange={handleStatusChange}
              statusRef={statusRef}
              statusSaved={statusSaved}
              compact
            />
          </div>
        </div>
      </div>

      {/* ─── 콘텐츠 섹션 ─────────────────────────────────────── */}
      <div className="space-y-6">
        <section>
          <BasicInfoTab key={`basic-${dataUpdatedAt}`} func={func} />
        </section>

        <section>
          <DesignInfoTab
            key={`design-${dataUpdatedAt}`}
            func={func}
            gsComment={gsComment}
            onGsCommentChange={setGsComment}
            headerExtra={
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFeedbackOpen(true)}
                >
                  <Bot className="h-3.5 w-3.5 mr-1.5" />
                  AI 피드백
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHistoryOpen(true)}
                >
                  <History className="h-3.5 w-3.5 mr-1.5" />
                  AI 요청 이력
                </Button>
              </>
            }
          />
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">AI 피드백</h2>
          <AiFeedbackTab func={func} />
        </section>

        {func.area?.screen?.screenId && (
          <section>
            <h2 className="text-lg font-semibold mb-3">🧭 나침반</h2>
            <StoryCompass screenId={func.area.screen.screenId} />
          </section>
        )}
      </div>

      {/* ─── AI 요청 이력 팝업 ───────────────────────────────── */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI 요청 이력</DialogTitle>
          </DialogHeader>
          <HistoryTab func={func} />
        </DialogContent>
      </Dialog>

      {/* ─── AI 피드백 팝업 ──────────────────────────────────── */}
      <Dialog
        open={feedbackOpen}
        onOpenChange={(v) => {
          setFeedbackOpen(v);
          if (!v) setFeedbackViewMode("preview");
        }}
      >
        <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="bg-primary/10 border-b border-primary/20 px-6 py-3 rounded-t-lg">
            <div className="flex items-center justify-between pr-8">
              <DialogTitle>AI 피드백</DialogTitle>
              <div className="flex gap-1 text-xs">
                <button
                  onClick={() => setFeedbackViewMode("preview")}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    feedbackViewMode === "preview"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  미리보기
                </button>
                <button
                  onClick={() => setFeedbackViewMode("code")}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    feedbackViewMode === "code"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  마크다운
                </button>
              </div>
            </div>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 px-6 py-4">
            {feedbackViewMode === "preview" ? (
              <AiFeedbackTab func={func} />
            ) : (
              <div className="space-y-4">
                {func.aiInspFeedback && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">
                      AI 피드백
                    </p>
                    <pre className="text-sm font-mono whitespace-pre-wrap bg-muted/30 rounded-md p-4 border border-border leading-relaxed">
                      {func.aiInspFeedback}
                    </pre>
                  </div>
                )}
                {func.aiImplFeedback && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">
                      구현 피드백
                    </p>
                    <pre className="text-sm font-mono whitespace-pre-wrap bg-muted/30 rounded-md p-4 border border-border leading-relaxed">
                      {func.aiImplFeedback}
                    </pre>
                  </div>
                )}
                {!func.aiInspFeedback && !func.aiImplFeedback && (
                  <p className="text-muted-foreground text-sm text-center py-10">
                    아직 AI 피드백이 없습니다.
                  </p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── AI 요청 확인 대화상자 ───────────────────────────── */}
      {statusDialog && (
        <ImplRequestDialog
          open={!!statusDialog}
          onClose={() => setStatusDialog(null)}
          targetStatus={statusDialog}
          func={func}
          loading={statusMutation.isPending}
          onConfirm={(changeNote) =>
            statusMutation.mutate({ status: statusDialog, changeNote })
          }
        />
      )}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="기능 삭제"
        description={`"${func.name}"을(를) 삭제하시겠습니까?`}
        variant="destructive"
        confirmLabel="삭제"
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/* StatusSelector — 상태 선택 드롭다운 컴포넌트                     */
/* ═══════════════════════════════════════════════════════════════ */

function StatusSelector({
  currentStatus,
  availableStatuses,
  isAiWorking,
  statusOpen,
  setStatusOpen,
  onStatusChange,
  statusRef,
  compact = false,
  statusSaved = false,
}: {
  currentStatus: string;
  availableStatuses: string[];
  isAiWorking: boolean;
  statusOpen: boolean;
  setStatusOpen: (open: boolean) => void;
  onStatusChange: (status: string) => void;
  statusRef: React.RefObject<HTMLDivElement | null>;
  compact?: boolean;
  statusSaved?: boolean;
}) {
  if (isAiWorking) {
    return (
      <div className="flex items-center gap-2">
        <StatusBadge status={currentStatus} />
        <span className="text-sm text-muted-foreground animate-pulse-glow">
          처리중...
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {!compact && (
        statusSaved ? (
          <span className="text-xs text-emerald-600 font-medium animate-pulse">
            저장됨 ✓
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">
            즉시 저장
          </span>
        )
      )}

      <div className="relative" ref={statusRef}>
        <button
          onClick={() => availableStatuses.length > 0 && setStatusOpen(!statusOpen)}
          className={cn(
            "flex items-center gap-2 rounded-lg border border-border bg-card transition-colors",
            compact ? "px-2 py-1" : "px-3 py-2",
            availableStatuses.length > 0
              ? "hover:bg-muted/50 cursor-pointer"
              : "cursor-default"
          )}
        >
          <StatusBadge status={currentStatus} />
          {availableStatuses.length > 0 && (
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                statusOpen && "rotate-180"
              )}
            />
          )}
        </button>

        {statusOpen && availableStatuses.length > 0 && (
          <div className="absolute right-0 top-full mt-1 z-50 min-w-[200px] rounded-lg border border-border bg-card shadow-lg py-1">
            <p className="px-3 py-1.5 text-xs text-muted-foreground font-medium">
              상태 변경{" "}
              <span className="text-[10px] opacity-60">
                — 선택 시 바로 저장됩니다
              </span>
            </p>
            {availableStatuses.map((status) => (
              <button
                key={status}
                onClick={() => onStatusChange(status)}
                className="flex items-center gap-2 w-full px-3 py-2 hover:bg-muted/50 transition-colors text-sm cursor-pointer"
              >
                <StatusBadge status={status} />
                {(AI_REQUEST_STATUSES as readonly string[]).includes(status) && (
                  <span className="text-[11px] text-amber-600 font-medium">
                    AI요청
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
