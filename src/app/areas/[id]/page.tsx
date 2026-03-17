"use client";

import { use, useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bot, ChevronDown, ChevronRight, Download, FileText, History, Trash2 } from "lucide-react";
import { ExcalidrawDialog } from "@/components/common/ExcalidrawDialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DataGrid } from "@/components/common/DataGrid";
import { StatusBadge } from "@/components/common/StatusBadge";
import { MarkdownEditor } from "@/components/common/MarkdownEditor";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { AiDesignRequestDialog } from "@/components/areas/AiDesignRequestDialog";
import { AttachmentManager } from "@/components/common/AttachmentManager";
import { HistoryTab } from "@/components/functions/HistoryTab";
import { ImplRequestDialog } from "@/components/common/ImplRequestDialog";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { LayoutEditor, type LayoutRow } from "@/components/screens/LayoutEditor";
import { AREA_TYPES, AREA_STATUS_LABEL } from "@/lib/constants";
import { AREA_TEMPLATE, AREA_EXAMPLE } from "@/lib/specTemplates";
import { SpecExampleDialog } from "@/components/common/SpecExampleDialog";
import { apiFetch, cn, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";

interface FunctionRow {
  functionId: number;
  systemId: string;
  displayCode: string | null;
  name: string;
  status: string;
  updatedAt: string;
}

export default function AreaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<"cascade" | "detach">("detach");
  const [statusDialog, setStatusDialog] = useState<string | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [implDialogOpen, setImplDialogOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackViewMode, setFeedbackViewMode] = useState<"preview" | "code">("preview");
  const [exampleOpen, setExampleOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    name: "",
    areaType: "GRID",
    sortOrder: 1,
    screenId: "",
    reqComment: "",
  });

  const [spec, setSpec] = useState("");
  const [layoutRows, setLayoutRows] = useState<LayoutRow[]>([]);
  const [designData, setDesignData] = useState<string | null>(null);

  const [saveVersionLog, setSaveVersionLog] = useState(true);
  useEffect(() => {
    const stored = localStorage.getItem("specode_save_version_log");
    setSaveVersionLog(stored === null ? true : stored === "true");
  }, []);
  const handleVersionLogChange = (checked: boolean) => {
    setSaveVersionLog(checked);
    localStorage.setItem("specode_save_version_log", String(checked));
  };

  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["area", id],
    queryFn: async () => {
      const res = await fetch(`/api/areas/${id}`);
      return res.json();
    },
    gcTime: 0,
  });

  const area = data?.data;

  const { data: screensData } = useQuery({
    queryKey: ["screens-all"],
    queryFn: async () => {
      const res = await fetch("/api/screens?pageSize=200");
      return res.json();
    },
  });
  const screens: { screenId: number; systemId: string; name: string }[] =
    screensData?.data ?? [];

  useEffect(() => {
    if (area) {
      setForm({
        name: area.name,
        areaType: area.areaType,
        sortOrder: area.sortOrder,
        screenId: area.screenId ? String(area.screenId) : "",
        reqComment: area.reqComment || "",
      });
      setSpec(area.spec || "");
      setLayoutRows(parseLayoutData(area.layoutData));
      setDesignData(area.designData || null);
    }
  }, [dataUpdatedAt]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch(`/api/areas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["area", id] });
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      toast.success("저장되었습니다.");
    },
  });

  const designMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/areas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spec,
          layoutData: JSON.stringify(layoutRows),
          reqComment: form.reqComment,
          ...(saveVersionLog ? { saveVersionLog: true } : {}),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["area", id] });
      toast.success("설계 정보가 저장되었습니다.");
    },
  });

  const saveDesignMutation = useMutation({
    mutationFn: (json: string) =>
      apiFetch(`/api/areas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ designData: json }),
      }),
    onSuccess: (_data, json) => {
      setDesignData(json);
      queryClient.invalidateQueries({ queryKey: ["area", id] });
      toast.success("설계 도안이 저장되었습니다.");
    },
  });

  const statusMutation = useMutation({
    mutationFn: (payload: { status: string; aiSpec?: string; comment?: string }) =>
      apiFetch(`/api/areas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["area", id] });
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      toast.success("상태가 변경되었습니다.");
      setStatusDialog(null);
    },
  });

  const implMutation = useMutation({
    mutationFn: (changeNote: string) =>
      apiFetch(`/api/areas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "IMPL_REQ", changeNote }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["area", id] });
      toast.success("구현 요청이 등록되었습니다.");
      setImplDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (mode?: "cascade" | "detach") => {
      const url = mode ? `/api/areas/${id}?mode=${mode}` : `/api/areas/${id}`;
      return apiFetch(url, { method: "DELETE" });
    },
    onSuccess: () => {
      toast.success("영역이 삭제되었습니다.");
      router.push("/areas");
    },
  });

  const handleStatusChange = (status: string) => {
    setStatusOpen(false);
    if (status === "DESIGN_REQ") {
      setStatusDialog(status);
    } else {
      statusMutation.mutate({ status });
    }
  };

  const handleAttachmentChanged = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["area", id] });
  }, [queryClient, id]);

  const handleExportPrd = async () => {
    if (!area) return;
    const res = await fetch(`/api/areas/${id}/prd`);
    if (!res.ok) { toast.error("PRD 생성에 실패했습니다."); return; }
    const md = await res.text();
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PRD_area-v1_${area.areaCode}_${area.name}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const funcColumns: ColumnDef<FunctionRow, unknown>[] = [
    { accessorKey: "systemId", header: "ID", size: 110 },
    { accessorKey: "displayCode", header: "표시코드", size: 100 },
    { accessorKey: "name", header: "기능명" },
    {
      accessorKey: "status",
      header: "상태",
      cell: ({ getValue }) => <StatusBadge status={getValue() as string} />,
      size: 100,
    },
    {
      accessorKey: "updatedAt",
      header: "수정일",
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">{formatDate(getValue() as string)}</span>
      ),
      size: 80,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        로딩 중...
      </div>
    );
  }

  if (!area) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        영역을 찾을 수 없습니다.
      </div>
    );
  }

  const funcCount = area.functions?.length ?? 0;
  const areaTypeLabel = AREA_TYPES.find((t) => t.value === area.areaType)?.label ?? area.areaType;
  const statusCfg = AREA_STATUS_LABEL[area.status] ?? { label: area.status, class: "" };

  return (
    <div>
      {/* ─── 슬림 Sticky 헤더 ────────────────────────────────── */}
      <div className="sticky top-0 z-20 -mx-6 -mt-6 px-6 bg-background/95 backdrop-blur-sm mb-2">
        <div className="flex items-center gap-2 h-12">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => router.push("/areas")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1.5 flex-1 min-w-0 text-sm overflow-hidden">
            <span className="font-bold shrink-0">{area.areaCode}</span>
            <span className="text-xs text-muted-foreground shrink-0">({areaTypeLabel})</span>
            <span className="text-muted-foreground/40 mx-0.5 shrink-0">·</span>
            <span className="font-medium truncate">{area.name}</span>
            {area.screen?.name && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                <button
                  onClick={() => router.push(`/screens/${area.screen.screenId}`)}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors shrink-0 max-w-[160px] truncate"
                >
                  {area.screen.name}
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setImplDialogOpen(true)}>
              <Bot className="h-3.5 w-3.5 mr-1.5" />
              구현 요청
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPrd} title="영역+기능을 PRD.md로 내보내기">
              <Download className="h-3.5 w-3.5 mr-1.5" />
              PRD 내보내기
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="영역 삭제"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
            </Button>

            <div className="relative" ref={statusRef}>
              <button
                onClick={() => setStatusOpen(!statusOpen)}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1 hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.class}`}>
                  {statusCfg.label}
                </span>
                <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", statusOpen && "rotate-180")} />
              </button>
              {statusOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 min-w-[200px] rounded-lg border border-border bg-card shadow-lg py-1">
                  <p className="px-3 py-1.5 text-xs text-muted-foreground font-medium">
                    상태 변경{" "}
                    <span className="text-[10px] opacity-60">— 선택 시 바로 저장됩니다</span>
                  </p>
                  {Object.entries(AREA_STATUS_LABEL).map(([status, cfg]) => {
                    if (status === area.status) return null;
                    return (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(status)}
                        className="flex items-center gap-2 w-full px-3 py-2 hover:bg-muted/50 transition-colors text-sm cursor-pointer"
                      >
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.class}`}>
                          {cfg.label}
                        </span>
                        {status === "DESIGN_REQ" && (
                          <span className="text-[11px] text-amber-600 font-medium">AI요청</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 콘텐츠 섹션 ─────────────────────────────────────── */}
      <div className="space-y-6">
        {/* 기본정보 섹션 */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">기본정보</h2>
            <Button
              onClick={() =>
                updateMutation.mutate({
                  ...form,
                  sortOrder: Number(form.sortOrder),
                  screenId: form.screenId ? parseInt(form.screenId) : undefined,
                })
              }
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "저장중..." : "저장"}
            </Button>
          </div>
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">영역코드</Label>
                <Input value={area.areaCode} disabled className="bg-muted/30" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">영역명 *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">순서</Label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                  min={1}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">영역 유형 *</Label>
                <Select
                  value={form.areaType}
                  onValueChange={(v) => setForm((f) => ({ ...f, areaType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AREA_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">소속 화면</Label>
                <Select
                  value={form.screenId || "NONE"}
                  onValueChange={(v) => setForm((f) => ({ ...f, screenId: v === "NONE" ? "" : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="화면 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">
                      <span className="text-muted-foreground">— 미지정 —</span>
                    </SelectItem>
                    {screens.map((s) => (
                      <SelectItem key={s.screenId} value={String(s.screenId)}>
                        {s.systemId} {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </section>

        {/* 설계 섹션 */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">설계</h2>
            <div className="flex items-center gap-2">
              <ExcalidrawDialog
                value={designData}
                onSave={(json) => saveDesignMutation.mutate(json)}
                saving={saveDesignMutation.isPending}
              />
              <Button variant="outline" size="sm" onClick={() => setFeedbackOpen(true)}>
                <Bot className="h-3.5 w-3.5 mr-1.5" />
                AI 피드백
              </Button>
              <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
                <History className="h-3.5 w-3.5 mr-1.5" />
                AI 요청 이력
              </Button>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={saveVersionLog}
                  onChange={(e) => handleVersionLogChange(e.target.checked)}
                  className="h-3.5 w-3.5 accent-primary"
                />
                버전 이력 저장
              </label>
              <Button onClick={() => designMutation.mutate()} disabled={designMutation.isPending}>
                {designMutation.isPending ? "저장중..." : "저장"}
              </Button>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="grid grid-cols-5 gap-6">
              <div className="col-span-3 space-y-4">
                <MarkdownEditor
                  key={`spec-${dataUpdatedAt}`}
                  value={spec}
                  onChange={setSpec}
                  label="영역 설계 (마크다운)"
                  rows={25}
                  placeholder="영역 설계 내용을 마크다운으로 작성하세요..."
                  refTableName="tb_area"
                  refPkId={area?.areaId}
                  fieldName="spec"
                  headerExtra={
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        onClick={() => setExampleOpen(true)}
                      >
                        <FileText className="h-3 w-3" />
                        예시
                      </button>
                      <button
                        type="button"
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        onClick={() => {
                          if (!spec.trim() || window.confirm("기존 내용을 템플릿으로 덮어쓰시겠습니까?")) {
                            setSpec(AREA_TEMPLATE);
                          }
                        }}
                      >
                        <FileText className="h-3 w-3" />
                        템플릿 삽입
                      </button>
                    </div>
                  }
                />
              </div>
              <div className="col-span-2 space-y-5 pt-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">AI 요청 코멘트</Label>
                  <Textarea
                    value={form.reqComment}
                    onChange={(e) => setForm((f) => ({ ...f, reqComment: e.target.value }))}
                    placeholder="AI에게 전달할 추가 요청 사항을 입력하세요..."
                    rows={6}
                  />
                </div>
                <LayoutEditor
                  key={`layout-${dataUpdatedAt}`}
                  value={layoutRows}
                  onChange={setLayoutRows}
                  areas={[]}
                />
                <div className="pt-2 border-t border-border">
                  <AttachmentManager
                    refTableName="tb_area"
                    refPkId={area.areaId}
                    attachments={area.attachments ?? []}
                    onChanged={handleAttachmentChanged}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* AI 피드백 섹션 */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">AI 피드백</h2>
          <div className="rounded-lg border border-border bg-card p-6">
            {area.aiFeedback ? (
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm">
                {area.aiFeedback}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">AI 피드백이 없습니다.</p>
            )}
          </div>
        </section>

        {/* 하위 기능 섹션 */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              하위 기능
              {funcCount > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">({funcCount}건)</span>
              )}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/functions?areaId=${id}`)}
            >
              기능 관리
            </Button>
          </div>
          <DataGrid
            columns={funcColumns}
            data={area.functions ?? []}
            onRowClick={(row: FunctionRow) => router.push(`/functions/${row.functionId}`)}
            emptyMessage="하위 기능이 없습니다."
          />
        </section>
      </div>

      {/* ─── 예시 다이얼로그 ─────────────────────────────────── */}
      <SpecExampleDialog
        open={exampleOpen}
        onClose={() => setExampleOpen(false)}
        content={AREA_EXAMPLE}
        onInsert={() => setSpec(AREA_EXAMPLE)}
        title="영역 설계 예시 (공지사항 검색 영역)"
      />

      {/* ─── AI 요청 이력 팝업 ───────────────────────────────── */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI 요청 이력</DialogTitle>
          </DialogHeader>
          <HistoryTab tasks={area.tasks ?? []} />
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
                  className={`px-3 py-1 rounded-md transition-colors ${feedbackViewMode === "preview" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                >
                  미리보기
                </button>
                <button
                  onClick={() => setFeedbackViewMode("code")}
                  className={`px-3 py-1 rounded-md transition-colors ${feedbackViewMode === "code" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                >
                  마크다운
                </button>
              </div>
            </div>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 px-6 py-4">
            {area.aiFeedback ? (
              feedbackViewMode === "preview" ? (
                <div className="markdown-body text-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {area.aiFeedback}
                  </ReactMarkdown>
                </div>
              ) : (
                <pre className="text-sm font-mono whitespace-pre-wrap bg-muted/30 rounded-md p-4 border border-border leading-relaxed">
                  {area.aiFeedback}
                </pre>
              )
            ) : (
              <p className="text-muted-foreground text-sm text-center py-10">
                아직 AI 피드백이 없습니다.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── 구현 요청 다이얼로그 ──────────────────────────────── */}
      {area && (
        <ImplRequestDialog
          open={implDialogOpen}
          onClose={() => setImplDialogOpen(false)}
          entityType="area"
          entityId={area.areaId}
          currentSnapshot={{
            area: { spec: area.spec || "" },
            functions: (area.functions ?? []).map((f: { functionId: number; name: string; spec: string | null; aiDesignContent: string | null; refContent: string | null }) => ({
              functionId: f.functionId,
              name: f.name,
              spec: f.spec || "",
              aiDesignContent: f.aiDesignContent || "",
              refContent: f.refContent || "",
            })),
          }}
          loading={implMutation.isPending}
          onConfirm={(changeNote) => implMutation.mutate(changeNote)}
        />
      )}

      {/* ─── AI 설계요청 옵션 다이얼로그 ─────────────────────── */}
      <AiDesignRequestDialog
        open={!!statusDialog}
        onClose={() => setStatusDialog(null)}
        onConfirm={(aiSpec, comment) => {
          if (statusDialog) {
            statusMutation.mutate({
              status: statusDialog,
              aiSpec: aiSpec || undefined,
              comment: comment || undefined,
            });
          }
        }}
        areaSpec={spec}
        designData={designData}
        currentComment={form.reqComment}
        loading={statusMutation.isPending}
      />

      {/* ─── 영역 삭제 다이얼로그 ───────────────────────────── */}
      {funcCount === 0 ? (
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="영역 삭제"
          description={`"${area.name}"을(를) 삭제하시겠습니까?`}
          variant="destructive"
          confirmLabel="삭제"
          onConfirm={() => deleteMutation.mutate(undefined)}
          loading={deleteMutation.isPending}
        />
      ) : (
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>영역 삭제</DialogTitle>
              <DialogDescription>
                <span className="font-medium text-foreground">&quot;{area.name}&quot;</span>에 연결된{" "}
                <span className="font-semibold text-destructive">{funcCount}건</span>의 기능이 있습니다.
                <br />어떻게 처리하시겠습니까?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <button
                onClick={() => setDeleteMode("cascade")}
                className={`w-full text-left rounded-lg border px-4 py-3 text-sm transition-colors cursor-pointer ${
                  deleteMode === "cascade"
                    ? "border-destructive bg-destructive/5 text-destructive"
                    : "border-border hover:border-destructive/50"
                }`}
              >
                <p className="font-medium">전체 삭제 (기능도 함께 삭제)</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  영역과 연결된 기능 {funcCount}건이 모두 삭제됩니다.
                </p>
              </button>
              <button
                onClick={() => setDeleteMode("detach")}
                className={`w-full text-left rounded-lg border px-4 py-3 text-sm transition-colors cursor-pointer ${
                  deleteMode === "detach"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <p className="font-medium">영역만 삭제 (기능 유지)</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  기능 {funcCount}건의 영역 연결이 해제되고 기능은 유지됩니다.
                </p>
              </button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleteMutation.isPending}>
                취소
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate(deleteMode)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "처리중..." : "삭제"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function parseLayoutData(layoutData: string | null): LayoutRow[] {
  if (!layoutData) return [];
  try {
    const parsed = JSON.parse(layoutData);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
