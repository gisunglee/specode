"use client";

import { use, useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Trash2,
  Plus,
  Layers,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";

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
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { MarkdownEditor } from "@/components/common/MarkdownEditor";
import { LayoutEditor, type LayoutRow } from "@/components/screens/LayoutEditor";

import {
  SCREEN_TYPES,
  AREA_TYPES,
  AREA_STATUS_LABEL,
  FUNC_STATUS_LABEL,
  FUNC_STATUS_COLOR,
  USER_SELECTABLE_STATUSES,
  PRIORITIES,
} from "@/lib/constants";
import { apiFetch, cn } from "@/lib/utils";

/* ─── Types ──────────────────────────────────────────────── */
interface FunctionRow {
  functionId: number;
  systemId: string;
  name: string;
  status: string;
  priority: string;
}

interface AreaRow {
  areaId: number;
  areaCode: string;
  name: string;
  areaType: string;
  status: string;
  sortOrder: number;
  functions: FunctionRow[];
}

interface ScreenDetail {
  screenId: number;
  systemId: string;
  name: string;
  screenType: string | null;
  spec: string | null;
  layoutData: string | null;
  categoryL: string | null;
  categoryM: string | null;
  categoryS: string | null;
  sortOrder: number | null;
  requirementId: number | null;
  requirement: { name: string; systemId: string } | null;
  areas: AreaRow[];
}

function parseLayoutData(raw: string | null): LayoutRow[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/* ─── Helpers ────────────────────────────────────────────── */
function AreaTypeBadge({
  areaId,
  value,
  onSave,
}: {
  areaId: number;
  value: string;
  onSave: (areaId: number, areaType: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onSave(areaId, e.target.value)}
      onClick={(e) => e.stopPropagation()}
      className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground cursor-pointer border-0 outline-none appearance-none"
    >
      {AREA_TYPES.map((t) => (
        <option key={t.value} value={t.value}>
          {t.label}
        </option>
      ))}
    </select>
  );
}

function AreaStatusBadge({
  areaId,
  value,
  onSave,
}: {
  areaId: number;
  value: string;
  onSave: (areaId: number, status: string) => void;
}) {
  const info = AREA_STATUS_LABEL[value] ?? { label: value, class: "bg-zinc-100 text-zinc-500" };
  return (
    <select
      value={value}
      onChange={(e) => onSave(areaId, e.target.value)}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "text-xs font-medium px-2 py-0.5 rounded-full cursor-pointer border-0 outline-none appearance-none",
        info.class
      )}
    >
      {Object.entries(AREA_STATUS_LABEL).map(([v, { label }]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </select>
  );
}

function FuncStatusBadge({
  funcId,
  value,
  onSave,
}: {
  funcId: number;
  value: string;
  onSave: (funcId: number, status: string) => void;
}) {
  const color = FUNC_STATUS_COLOR[value] ?? { bg: "bg-zinc-100", text: "text-zinc-600" };
  return (
    <select
      value={value}
      onChange={(e) => onSave(funcId, e.target.value)}
      className={cn(
        "text-xs font-medium px-2 py-0.5 rounded-full cursor-pointer border-0 outline-none appearance-none",
        color.bg,
        color.text
      )}
    >
      {USER_SELECTABLE_STATUSES.map((s) => (
        <option key={s} value={s}>
          {FUNC_STATUS_LABEL[s] ?? s}
        </option>
      ))}
    </select>
  );
}

function FuncPriorityBadge({
  funcId,
  value,
  onSave,
}: {
  funcId: number;
  value: string;
  onSave: (funcId: number, priority: string) => void;
}) {
  const colorMap: Record<string, string> = {
    HIGH: "bg-red-100 text-red-700",
    MEDIUM: "bg-amber-100 text-amber-700",
    LOW: "bg-sky-100 text-sky-700",
  };
  return (
    <select
      value={value}
      onChange={(e) => onSave(funcId, e.target.value)}
      className={cn(
        "text-xs font-medium px-2 py-0.5 rounded-full cursor-pointer border-0 outline-none appearance-none",
        colorMap[value] ?? "bg-zinc-100 text-zinc-600"
      )}
    >
      {PRIORITIES.map((p) => (
        <option key={p.value} value={p.value}>
          {p.label}
        </option>
      ))}
    </select>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export default function CompositionDetailPage({
  params,
}: {
  params: Promise<{ screenId: string }>;
}) {
  const { screenId: screenIdStr } = use(params);
  const screenId = parseInt(screenIdStr);
  const router = useRouter();
  const queryClient = useQueryClient();

  /* Screen info state */
  const [screenName, setScreenName] = useState("");
  const [screenType, setScreenType] = useState<string>("");
  const [spec, setSpec] = useState("");
  const [layoutRows, setLayoutRows] = useState<LayoutRow[]>([]);
  const [categoryL, setCategoryL] = useState("");
  const [categoryM, setCategoryM] = useState("");
  const [categoryS, setCategoryS] = useState("");
  const [sortOrder, setSortOrder] = useState<number | null>(null);

  /* Area search */
  const [areaSearch, setAreaSearch] = useState("");

  /* Inline edit state */
  const [editAreaId, setEditAreaId] = useState<number | null>(null);
  const [editAreaName, setEditAreaName] = useState("");
  const [editFuncId, setEditFuncId] = useState<number | null>(null);
  const [editFuncName, setEditFuncName] = useState("");

  /* Per-area new function inputs */
  const [newFuncInputs, setNewFuncInputs] = useState<Record<number, string>>({});

  /* Expanded areas */
  const [expandedAreas, setExpandedAreas] = useState<Set<number>>(new Set());

  /* Add area dialog */
  const [addAreaOpen, setAddAreaOpen] = useState(false);
  const [addAreaName, setAddAreaName] = useState("");
  const [addAreaType, setAddAreaType] = useState<string>("FORM");

  /* Delete area confirm */
  const [deleteAreaId, setDeleteAreaId] = useState<number | null>(null);

  /* Ref for add func inputs */
  const addFuncRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const queryKey = ["comp-screen", screenIdStr];

  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/screens/${screenId}`);
      return res.json();
    },
    gcTime: 0,
  });

  const screen: ScreenDetail | undefined = data?.data;

  useEffect(() => {
    if (screen) {
      setScreenName(screen.name);
      setScreenType(screen.screenType ?? "");
      setSpec(screen.spec ?? "");
      setLayoutRows(parseLayoutData(screen.layoutData ?? null));
      setCategoryL(screen.categoryL ?? "");
      setCategoryM(screen.categoryM ?? "");
      setCategoryS(screen.categoryS ?? "");
      setSortOrder(screen.sortOrder ?? null);
      if (screen.areas?.length) {
        setExpandedAreas(new Set(screen.areas.map((a) => a.areaId)));
      }
    }
  }, [dataUpdatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── Mutations ───────────────────────────────────────── */
  const updateScreenMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch(`/api/screens/${screenId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      invalidate();
      toast.success("저장되었습니다.");
    },
    onError: () => toast.error("저장에 실패했습니다."),
  });

  const updateAreaMutation = useMutation({
    mutationFn: ({ areaId, body }: { areaId: number; body: Record<string, unknown> }) =>
      apiFetch(`/api/areas/${areaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => invalidate(),
    onError: () => toast.error("영역 수정에 실패했습니다."),
  });

  const patchAreaStatusMutation = useMutation({
    mutationFn: ({ areaId, status }: { areaId: number; status: string }) =>
      apiFetch(`/api/areas/${areaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => invalidate(),
    onError: () => toast.error("상태 변경에 실패했습니다."),
  });

  const patchFuncStatusMutation = useMutation({
    mutationFn: ({ funcId, status }: { funcId: number; status: string }) =>
      apiFetch(`/api/functions/${funcId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => invalidate(),
    onError: () => toast.error("상태 변경에 실패했습니다."),
  });

  const updateFuncMutation = useMutation({
    mutationFn: ({ funcId, body }: { funcId: number; body: Record<string, unknown> }) =>
      apiFetch(`/api/functions/${funcId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => invalidate(),
    onError: () => toast.error("기능 수정에 실패했습니다."),
  });

  const addFuncMutation = useMutation({
    mutationFn: (body: { name: string; areaId: number }) =>
      apiFetch("/api/functions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: (_, vars) => {
      invalidate();
      setNewFuncInputs((prev) => ({ ...prev, [vars.areaId]: "" }));
      toast.success("기능이 추가되었습니다.");
    },
    onError: () => toast.error("기능 추가에 실패했습니다."),
  });

  const addAreaMutation = useMutation({
    mutationFn: (body: { name: string; areaType: string; screenId: number }) =>
      apiFetch("/api/areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      invalidate();
      setAddAreaOpen(false);
      setAddAreaName("");
      setAddAreaType("FORM");
      toast.success("영역이 추가되었습니다.");
    },
    onError: () => toast.error("영역 추가에 실패했습니다."),
  });

  const deleteAreaMutation = useMutation({
    mutationFn: (areaId: number) =>
      apiFetch(`/api/areas/${areaId}?mode=cascade`, { method: "DELETE" }),
    onSuccess: () => {
      invalidate();
      setDeleteAreaId(null);
      toast.success("영역이 삭제되었습니다.");
    },
    onError: () => toast.error("영역 삭제에 실패했습니다."),
  });

  /* ─── Handlers ────────────────────────────────────────── */
  const handleSaveScreen = () => {
    if (!screen) return;
    updateScreenMutation.mutate({
      name: screenName,
      displayCode: screen.systemId,
      screenType: screenType || null,
      requirementId: screen.requirementId,
      spec,
      layoutData: JSON.stringify(layoutRows),
      categoryL: categoryL || null,
      categoryM: categoryM || null,
      categoryS: categoryS || null,
      sortOrder,
    });
  };

  const saveAreaName = (areaId: number) => {
    const name = editAreaName.trim();
    if (!name) { setEditAreaId(null); return; }
    setEditAreaId(null);
    updateAreaMutation.mutate({ areaId, body: { name } });
  };

  const saveAreaType = (areaId: number, areaType: string) => {
    updateAreaMutation.mutate({ areaId, body: { areaType } });
  };

  const saveAreaStatus = (areaId: number, status: string) => {
    patchAreaStatusMutation.mutate({ areaId, status });
  };

  const saveFuncName = (funcId: number) => {
    const name = editFuncName.trim();
    if (!name) { setEditFuncId(null); return; }
    setEditFuncId(null);
    updateFuncMutation.mutate({ funcId, body: { name } });
  };

  const saveFuncStatus = (funcId: number, status: string) => {
    patchFuncStatusMutation.mutate({ funcId, status });
  };

  const saveFuncPriority = (funcId: number, priority: string) => {
    updateFuncMutation.mutate({ funcId, body: { priority } });
  };

  const addFunction = (areaId: number) => {
    const name = (newFuncInputs[areaId] ?? "").trim();
    if (!name) return;
    addFuncMutation.mutate({ name, areaId });
  };

  const toggleArea = (areaId: number) => {
    setExpandedAreas((prev) => {
      const next = new Set(prev);
      if (next.has(areaId)) next.delete(areaId);
      else next.add(areaId);
      return next;
    });
  };

  /* ─── Loading / Error states ──────────────────────────── */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        로딩 중...
      </div>
    );
  }

  if (!screen) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        화면을 찾을 수 없습니다.
      </div>
    );
  }

  const areas: AreaRow[] = screen.areas ?? [];
  const filteredAreas = areaSearch.trim()
    ? areas.filter(
        (a) =>
          a.name.toLowerCase().includes(areaSearch.toLowerCase()) ||
          a.areaType.toLowerCase().includes(areaSearch.toLowerCase()) ||
          a.areaCode.toLowerCase().includes(areaSearch.toLowerCase())
      )
    : areas;
  const totalFunc = areas.reduce((acc, a) => acc + (a.functions?.length ?? 0), 0);
  const confirmedFunc = areas.reduce(
    (acc, a) => acc + (a.functions?.filter((f) => f.status === "CONFIRM_Y").length ?? 0),
    0
  );
  const progressPct = totalFunc > 0 ? Math.round((confirmedFunc / totalFunc) * 100) : 0;

  const deleteArea = areas.find((a) => a.areaId === deleteAreaId);

  return (
    <div>
      {/* ─── Sticky Header ──────────────────────────────── */}
      <div className="sticky top-0 z-20 -mx-6 -mt-6 px-6 bg-background/95 backdrop-blur-sm mb-4">
        <div className="flex items-center gap-2 h-12">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => router.push("/composition")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex items-center gap-1.5 flex-1 min-w-0 text-sm overflow-hidden">
            <span className="font-bold shrink-0">{screen.systemId}</span>
            <span className="text-muted-foreground/40 mx-0.5 shrink-0">·</span>
            <span className="font-medium truncate">{screenName || screen.name}</span>
            {screen.requirement && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                <span className="text-xs text-muted-foreground shrink-0 max-w-[140px] truncate">
                  {screen.requirement.name}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── 2-column layout ────────────────────────────── */}
      <div className="grid gap-6" style={{ gridTemplateColumns: "35% 1fr" }}>
        {/* ── LEFT: Screen info panel ─────────────────── */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              화면 정보
            </p>

            {/* 화면명 + 유형 */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-muted-foreground shrink-0 w-10">화면명</label>
                <Input
                  value={screenName}
                  onChange={(e) => setScreenName(e.target.value)}
                  placeholder="화면명"
                  className="h-7 text-xs flex-1 min-w-0"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-muted-foreground shrink-0 w-8">유형</label>
                <Select value={screenType} onValueChange={setScreenType}>
                  <SelectTrigger className="h-7 text-xs flex-1 min-w-0">
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {SCREEN_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 요구사항 */}
            {screen.requirement && (
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-muted-foreground shrink-0 w-12">요구사항</label>
                <div className="text-xs bg-secondary rounded px-2 py-1 text-muted-foreground flex-1 truncate">
                  {screen.requirement.systemId} · {screen.requirement.name}
                </div>
              </div>
            )}

            {/* 대분류 + 중분류 */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-muted-foreground shrink-0 w-10">대분류</label>
                <Input
                  value={categoryL}
                  onChange={(e) => setCategoryL(e.target.value)}
                  placeholder="대분류"
                  className="h-7 text-xs flex-1 min-w-0"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-muted-foreground shrink-0 w-10">중분류</label>
                <Input
                  value={categoryM}
                  onChange={(e) => setCategoryM(e.target.value)}
                  placeholder="중분류"
                  className="h-7 text-xs flex-1 min-w-0"
                />
              </div>
            </div>

            {/* 소분류 + 메뉴순서 */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-muted-foreground shrink-0 w-10">소분류</label>
                <Input
                  value={categoryS}
                  onChange={(e) => setCategoryS(e.target.value)}
                  placeholder="소분류"
                  className="h-7 text-xs flex-1 min-w-0"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-muted-foreground shrink-0 w-10">메뉴순서</label>
                <Input
                  type="number"
                  value={sortOrder ?? ""}
                  onChange={(e) => setSortOrder(e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="0"
                  className="h-7 text-xs flex-1 min-w-0"
                />
              </div>
            </div>
          </div>

          {/* Spec editor */}
          <div className="rounded-lg border border-border bg-card p-4">
            <MarkdownEditor
              key={`spec-${dataUpdatedAt}`}
              value={spec}
              onChange={setSpec}
              label="상세 명세"
              rows={16}
              placeholder="화면 명세를 작성하세요..."
            />
          </div>

          {/* Layout editor */}
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              화면 레이아웃
            </p>
            <LayoutEditor
              key={`layout-${dataUpdatedAt}`}
              value={layoutRows}
              onChange={setLayoutRows}
              areas={areas.map((a) => ({ areaId: a.areaId, areaCode: a.areaCode, name: a.name }))}
            />
          </div>

          <Button
            onClick={handleSaveScreen}
            disabled={updateScreenMutation.isPending}
            className="w-full"
          >
            {updateScreenMutation.isPending ? "저장중..." : "저장"}
          </Button>
        </div>

        {/* ── RIGHT: Areas + Functions ─────────────────── */}
        <div className="space-y-3">
          {/* Summary bar */}
          <div className="flex items-center gap-4 px-1 mb-2">
            <span className="text-sm text-muted-foreground">
              영역 {areas.length}개 · 기능 {totalFunc}개
            </span>
            <div className="flex items-center gap-2 flex-1 max-w-xs">
              <div className="flex-1 bg-secondary rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {confirmedFunc}/{totalFunc} 컨펌
              </span>
            </div>
          </div>

          {/* Area search */}
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-border bg-card">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              value={areaSearch}
              onChange={(e) => setAreaSearch(e.target.value)}
              placeholder="영역명 / 유형 검색..."
              className="text-xs text-foreground bg-transparent outline-none flex-1 placeholder:text-muted-foreground/50"
            />
            {areaSearch && (
              <button
                onClick={() => setAreaSearch("")}
                className="text-muted-foreground hover:text-foreground shrink-0"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Area cards */}
          {areas.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center border border-dashed rounded-lg">
              등록된 영역이 없습니다.
              <br />
              아래 버튼으로 영역을 추가하세요.
            </div>
          ) : filteredAreas.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-lg">
              검색 결과가 없습니다.
            </div>
          ) : (
            filteredAreas.map((area) => {
              const expanded = expandedAreas.has(area.areaId);
              return (
                <div
                  key={area.areaId}
                  className="rounded-lg border border-border bg-card overflow-hidden"
                >
                  {/* Card header */}
                  <div className="flex items-center gap-2 px-3 py-2.5 hover:bg-muted/20 transition-colors">
                    {/* Toggle */}
                    <button
                      onClick={() => toggleArea(area.areaId)}
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      {expanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>

                    {/* Area code */}
                    <span className="font-mono text-xs text-muted-foreground shrink-0 w-16">
                      {area.areaCode}
                    </span>

                    {/* Type badge (select) */}
                    <AreaTypeBadge
                      areaId={area.areaId}
                      value={area.areaType}
                      onSave={saveAreaType}
                    />

                    {/* Area name — inline edit */}
                    {editAreaId === area.areaId ? (
                      <input
                        value={editAreaName}
                        onChange={(e) => setEditAreaName(e.target.value)}
                        onBlur={() => saveAreaName(area.areaId)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveAreaName(area.areaId);
                          if (e.key === "Escape") setEditAreaId(null);
                        }}
                        autoFocus
                        className="flex-1 text-sm font-medium bg-transparent border-b border-border outline-none px-1"
                      />
                    ) : (
                      <span
                        className="flex-1 text-sm font-medium cursor-pointer hover:text-primary truncate"
                        onClick={() => {
                          setEditAreaId(area.areaId);
                          setEditAreaName(area.name);
                        }}
                        title="클릭하여 편집"
                      >
                        {area.name}
                      </span>
                    )}

                    {/* Status badge (select) */}
                    <AreaStatusBadge
                      areaId={area.areaId}
                      value={area.status ?? "NONE"}
                      onSave={saveAreaStatus}
                    />

                    {/* Go to detail */}
                    <button
                      onClick={() => router.push(`/areas/${area.areaId}`)}
                      className="text-muted-foreground hover:text-foreground shrink-0"
                      title="영역 상세"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => setDeleteAreaId(area.areaId)}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      title="영역 삭제"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Functions list */}
                  {expanded && (
                    <div className="border-t border-border">
                      {area.functions?.length === 0 && (
                        <div className="px-4 py-2 text-xs text-muted-foreground">
                          기능이 없습니다.
                        </div>
                      )}
                      {area.functions?.map((func, idx) => (
                        <div
                          key={func.functionId}
                          className={cn(
                            "flex items-center gap-2 px-4 py-1.5 text-sm group",
                            idx % 2 === 0 ? "bg-background" : "bg-muted/20"
                          )}
                        >
                          {/* System ID */}
                          <span className="font-mono text-xs text-muted-foreground w-20 shrink-0">
                            {func.systemId}
                          </span>

                          {/* Func name — inline edit */}
                          {editFuncId === func.functionId ? (
                            <input
                              value={editFuncName}
                              onChange={(e) => setEditFuncName(e.target.value)}
                              onBlur={() => saveFuncName(func.functionId)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveFuncName(func.functionId);
                                if (e.key === "Escape") setEditFuncId(null);
                              }}
                              autoFocus
                              className="flex-1 text-sm bg-transparent border-b border-border outline-none px-1"
                            />
                          ) : (
                            <span
                              className="flex-1 cursor-pointer hover:text-primary truncate"
                              onClick={() => {
                                setEditFuncId(func.functionId);
                                setEditFuncName(func.name);
                              }}
                              title="클릭하여 편집"
                            >
                              {func.name}
                            </span>
                          )}

                          {/* Status */}
                          <FuncStatusBadge
                            funcId={func.functionId}
                            value={func.status}
                            onSave={saveFuncStatus}
                          />

                          {/* Priority */}
                          <FuncPriorityBadge
                            funcId={func.functionId}
                            value={func.priority}
                            onSave={saveFuncPriority}
                          />

                          {/* Go to func detail */}
                          <button
                            onClick={() => router.push(`/functions/${func.functionId}`)}
                            className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            title="기능 상세"
                          >
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}

                      {/* Add function input */}
                      <div className="px-4 py-2">
                        <input
                          ref={(el) => { addFuncRefs.current[area.areaId] = el; }}
                          value={newFuncInputs[area.areaId] ?? ""}
                          onChange={(e) =>
                            setNewFuncInputs((prev) => ({
                              ...prev,
                              [area.areaId]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") addFunction(area.areaId);
                          }}
                          onBlur={() => {
                            if ((newFuncInputs[area.areaId] ?? "").trim()) {
                              addFunction(area.areaId);
                            }
                          }}
                          placeholder="+ 기능명을 입력하고 Enter..."
                          className="w-full text-xs text-muted-foreground bg-transparent outline-none placeholder:text-muted-foreground/50 py-0.5"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Add area button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2"
            onClick={() => setAddAreaOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            영역 추가
          </Button>
        </div>
      </div>

      {/* ─── Add Area Dialog ─────────────────────────────── */}
      <Dialog open={addAreaOpen} onOpenChange={setAddAreaOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>영역 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>영역명 *</Label>
              <Input
                value={addAreaName}
                onChange={(e) => setAddAreaName(e.target.value)}
                placeholder="예: 검색폼"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && addAreaName.trim()) {
                    addAreaMutation.mutate({
                      name: addAreaName.trim(),
                      areaType: addAreaType,
                      screenId,
                    });
                  }
                }}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>영역 유형</Label>
              <Select value={addAreaType} onValueChange={setAddAreaType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AREA_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddAreaOpen(false)}>
              취소
            </Button>
            <Button
              onClick={() =>
                addAreaMutation.mutate({
                  name: addAreaName.trim(),
                  areaType: addAreaType,
                  screenId,
                })
              }
              disabled={!addAreaName.trim() || addAreaMutation.isPending}
            >
              {addAreaMutation.isPending ? "추가중..." : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Area Confirm ─────────────────────────── */}
      <ConfirmDialog
        open={!!deleteAreaId}
        onOpenChange={() => setDeleteAreaId(null)}
        title="영역 삭제"
        description={
          deleteArea
            ? `"${deleteArea.name}" 영역과 하위 기능 ${deleteArea.functions?.length ?? 0}건이 모두 삭제됩니다.`
            : "영역을 삭제하시겠습니까?"
        }
        variant="destructive"
        confirmLabel="삭제"
        onConfirm={() => deleteAreaId && deleteAreaMutation.mutate(deleteAreaId)}
        loading={deleteAreaMutation.isPending}
      />
    </div>
  );
}
