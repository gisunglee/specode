"use client";

import { use, useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DataGrid } from "@/components/common/DataGrid";
import { StatusBadge } from "@/components/common/StatusBadge";
import { MarkdownEditor } from "@/components/common/MarkdownEditor";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
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

import { AREA_TYPES, AREA_STATUS_LABEL } from "@/lib/constants";
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

const TABS = [
  { id: "basic", label: "기본정보" },
  { id: "spec", label: "명세" },
  { id: "ai-design", label: "AI설계" },
  { id: "feedback", label: "피드백" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AreaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  /* ─── 탭 & 상태 ─────────────────────────────────────────── */
  const [activeTab, setActiveTab] = useState<TabId>("basic");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<"cascade" | "detach">("detach");
  const [statusDialog, setStatusDialog] = useState<string | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHidden, setHeaderHidden] = useState(false);

  /* ─── 기본정보 폼 상태 ───────────────────────────────────── */
  const [form, setForm] = useState({
    name: "",
    areaType: "GRID",
    sortOrder: 1,
    screenId: "",
    reqComment: "",
    displayFields: "",
  });

  /* ─── 명세 / AI설계 상태 ─────────────────────────────────── */
  const [spec, setSpec] = useState("");
  const [aiDesign, setAiDesign] = useState("");

  /* ─── API 데이터 조회 ────────────────────────────────────── */
  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["area", id],
    queryFn: async () => {
      const res = await fetch(`/api/areas/${id}`);
      return res.json();
    },
    gcTime: 0,
  });

  const area = data?.data;

  /* ─── 화면 목록 조회 ─────────────────────────────────────── */
  const { data: screensData } = useQuery({
    queryKey: ["screens-all"],
    queryFn: async () => {
      const res = await fetch("/api/screens?pageSize=200");
      return res.json();
    },
  });
  const screens: { screenId: number; systemId: string; name: string }[] =
    screensData?.data ?? [];

  /* ─── 서버 데이터 → 폼 동기화 ───────────────────────────── */
  useEffect(() => {
    if (area) {
      setForm({
        name: area.name,
        areaType: area.areaType,
        sortOrder: area.sortOrder,
        screenId: area.screenId ? String(area.screenId) : "",
        reqComment: area.reqComment || "",
        displayFields: area.displayFields || "",
      });
      setSpec(area.spec || "");
      setAiDesign(area.aiDetailDesign || "");
    }
  }, [dataUpdatedAt]);

  /* ─── 헤더 숨김 감지 ─────────────────────────────────────── */
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHeaderHidden(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-56px 0px 0px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [area]);

  /* ─── 드롭다운 외부 클릭 닫기 ───────────────────────────── */
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* ─── 기본정보 저장 ──────────────────────────────────────── */
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

  /* ─── 명세 저장 ──────────────────────────────────────────── */
  const specMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/areas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["area", id] });
      toast.success("명세가 저장되었습니다.");
    },
  });

  /* ─── AI설계 저장 ────────────────────────────────────────── */
  const aiDesignMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/areas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiDetailDesign: aiDesign }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["area", id] });
      toast.success("AI 설계가 저장되었습니다.");
    },
  });

  /* ─── 상태 변경 (PATCH) ──────────────────────────────────── */
  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      apiFetch(`/api/areas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          comment: form.reqComment.trim() || undefined,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["area", id] });
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      toast.success("상태가 변경되었습니다.");
      setStatusDialog(null);
    },
  });

  /* ─── 삭제 ───────────────────────────────────────────────── */
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
      statusMutation.mutate(status);
    }
  };

  /* ─── 하위 기능 컬럼 ─────────────────────────────────────── */
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

  /* ─── 로딩 & 에러 ────────────────────────────────────────── */
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
    <div className="space-y-6">
      {/* ── Full 헤더 ──────────────────────────────────────── */}
      <div ref={headerRef} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/areas")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{area.areaCode}</h1>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">
                {areaTypeLabel}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              <span className="font-medium text-foreground">{area.name}</span>
              {area.screen?.name && (
                <span className="ml-1">— {area.screen.name}</span>
              )}
            </p>
          </div>
        </div>

        {/* 오른쪽: 삭제 버튼 + 상태 드롭다운 */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" title="영역 삭제" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
          </Button>

          <div className="relative" ref={statusRef}>
            <button
              onClick={() => setStatusOpen(!statusOpen)}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.class}`}>
                {statusCfg.label}
              </span>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", statusOpen && "rotate-180")} />
            </button>
            {statusOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 min-w-[200px] rounded-lg border border-border bg-card shadow-lg py-1">
                <p className="px-3 py-1.5 text-xs text-muted-foreground font-medium">상태 변경</p>
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

      {/* ── Sticky 탭 네비게이션 ───────────────────────────── */}
      <div className="sticky top-14 z-20 -mx-6 px-6 bg-background/95 backdrop-blur-sm border-b border-border">
        {headerHidden && (
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => router.push("/areas")}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-sm font-semibold truncate">{area.areaCode}</span>
              <span className="text-sm text-muted-foreground truncate hidden sm:inline">
                {area.name}
              </span>
            </div>
          </div>
        )}
        <nav className="flex gap-1 py-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── 탭 콘텐츠 ─────────────────────────────────────── */}

      {/* 기본정보 탭 */}
      {activeTab === "basic" && (
        <div className="space-y-4">
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

            <div className="space-y-1.5">
              <Label className="text-xs">AI 요청 코멘트</Label>
              <Textarea
                value={form.reqComment}
                onChange={(e) => setForm((f) => ({ ...f, reqComment: e.target.value }))}
                placeholder="AI에게 전달할 추가 요청 사항을 입력하세요..."
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">표시 필드</Label>
              <Textarea
                value={form.displayFields}
                onChange={(e) => setForm((f) => ({ ...f, displayFields: e.target.value }))}
                placeholder="표시할 필드 목록..."
                rows={3}
              />
            </div>
          </div>
        </div>
      )}

      {/* 명세 탭 */}
      {activeTab === "spec" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">명세</h2>
            <Button onClick={() => specMutation.mutate()} disabled={specMutation.isPending}>
              {specMutation.isPending ? "저장중..." : "저장"}
            </Button>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <MarkdownEditor
              key={`spec-${dataUpdatedAt}`}
              value={spec}
              onChange={setSpec}
              label="영역 명세 (마크다운)"
              rows={25}
              placeholder="영역 명세를 마크다운으로 작성하세요..."
            />
          </div>
        </div>
      )}

      {/* AI설계 탭 */}
      {activeTab === "ai-design" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">AI 설계</h2>
            <Button onClick={() => aiDesignMutation.mutate()} disabled={aiDesignMutation.isPending}>
              {aiDesignMutation.isPending ? "저장중..." : "저장"}
            </Button>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <MarkdownEditor
              key={`ai-design-${dataUpdatedAt}`}
              value={aiDesign}
              onChange={setAiDesign}
              label="AI 상세 설계 (마크다운)"
              rows={25}
              placeholder="AI가 생성한 상세 설계 내용입니다. 직접 수정도 가능합니다..."
            />
          </div>
        </div>
      )}

      {/* 피드백 탭 */}
      {activeTab === "feedback" && (
        <div className="space-y-4">
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
        </div>
      )}

      {/* ── 하위 기능 목록 ─────────────────────────────────── */}
      <div className="space-y-3">
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
      </div>

      {/* ── AI 설계요청 확인 다이얼로그 ───────────────────── */}
      <ConfirmDialog
        open={!!statusDialog}
        onOpenChange={() => setStatusDialog(null)}
        title="AI 설계 요청"
        description="이 영역의 AI 상세 설계를 요청하시겠습니까? reqComment가 있으면 AI에게 함께 전달됩니다."
        confirmLabel="요청"
        onConfirm={() => statusDialog && statusMutation.mutate(statusDialog)}
        loading={statusMutation.isPending}
      />

      {/* ── 영역 삭제 다이얼로그 ───────────────────────────── */}
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
