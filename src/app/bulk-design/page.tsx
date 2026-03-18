"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Monitor, LayoutGrid, Cog, Plus, Save, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarkdownEditor } from "@/components/common/MarkdownEditor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { SCREEN_TYPES, AREA_TYPES } from "@/lib/constants";
import { apiFetch, cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UnitWorkItem {
  unitWorkId: number;
  systemId: string;
  name: string;
}

interface ScreenListItem {
  screenId: number;
  systemId: string;
  name: string;
  screenType: string | null;
}

interface AreaListItem {
  areaId: number;
  areaCode: string;
  name: string;
  areaType: string;
  screenId: number;
  screen: { name: string; systemId: string } | null;
}

interface FuncListItem {
  functionId: number;
  systemId: string;
  name: string;
  priority: string;
  areaId: number | null;
  area: { areaCode: string; name: string; screen: { systemId: string; name: string } } | null;
}

type SelectedItem = { type: "screen" | "area" | "function"; id: number } | null;

const PRIORITY_OPTIONS = [
  { value: "HIGH",   label: "높음" },
  { value: "MEDIUM", label: "중간" },
  { value: "LOW",    label: "낮음" },
];

// ─── Section: 화면 ────────────────────────────────────────────────────────────

function ScreenSection({ screenId, allAreas, isTarget }: { screenId: number; allAreas: AreaListItem[]; isTarget: boolean }) {
  const queryClient = useQueryClient();
  const { data: raw, dataUpdatedAt } = useQuery({
    queryKey: ["screen", String(screenId)],
    queryFn: () => apiFetch<{ data: Record<string, unknown> }>(`/api/screens/${screenId}`),
  });
  const screen = raw?.data as Record<string, unknown> | null | undefined;

  const [spec, setSpec]             = useState("");
  const [name, setName]             = useState("");
  const [displayCode, setDisplayCode] = useState("");
  const [screenType, setScreenType] = useState("");
  const [categoryL, setCategoryL]   = useState("");
  const [categoryM, setCategoryM]   = useState("");
  const [categoryS, setCategoryS]   = useState("");
  const [sortOrder, setSortOrder]   = useState<number | null>(null);

  useEffect(() => {
    if (screen) {
      setSpec((screen.spec as string) || "");
      setName((screen.name as string) || "");
      setDisplayCode((screen.displayCode as string) || "");
      setScreenType((screen.screenType as string) || "");
      setCategoryL((screen.categoryL as string) || "");
      setCategoryM((screen.categoryM as string) || "");
      setCategoryS((screen.categoryS as string) || "");
      setSortOrder((screen.sortOrder as number | null) ?? null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataUpdatedAt]);

  const mutation = useMutation({
    mutationFn: (body: object) => apiFetch(`/api/screens/${screenId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    }),
    onSuccess: () => { toast.success("화면 저장되었습니다."); queryClient.invalidateQueries({ queryKey: ["screen", String(screenId)] }); },
    onError: () => toast.error("저장 실패"),
  });

  if (!screen) return (
    <div id={`section-screen-${screenId}`} className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground animate-pulse scroll-mt-[60px]">화면 로딩 중...</div>
  );

  const typeLabel = SCREEN_TYPES.find(t => t.value === screen.screenType)?.label ?? (screen.screenType as string) ?? "";
  const ownAreas = allAreas.filter(a => a.screenId === screenId);

  return (
    <div id={`section-screen-${screenId}`}
      className={cn("rounded-lg border bg-card overflow-hidden scroll-mt-[60px]", isTarget ? "border-blue-400 ring-2 ring-blue-200" : "border-border")}
    >
      <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border-b border-blue-200">
        <Monitor className="h-3.5 w-3.5 text-blue-600" />
        <span className="text-xs font-semibold text-blue-700">화면</span>
        <span className="text-xs font-mono text-blue-500">{screen.systemId as string}</span>
        <span className="text-xs font-medium text-blue-800">{screen.name as string}</span>
        {typeLabel && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 ml-1">{typeLabel}</span>}
      </div>
      <div className="grid grid-cols-10 gap-0">
        <div className="col-span-6 p-4 border-r border-border">
          <MarkdownEditor key={`md-screen-${dataUpdatedAt}`} value={spec} onChange={setSpec}
            label="화면 설명 (마크다운)" rows={14} placeholder="화면 설명을 마크다운으로 작성하세요..."
            refTableName="tb_screen" refPkId={screenId} fieldName="spec" />
        </div>
        <div className="col-span-4 p-4 space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">화면명 *</label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">표시코드</label>
              <Input value={displayCode} onChange={e => setDisplayCode(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">화면 유형</label>
              <Select value={screenType || ""} onValueChange={setScreenType}>
                <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                <SelectContent>{SCREEN_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><label className="text-xs text-muted-foreground">대분류</label><Input value={categoryL} onChange={e => setCategoryL(e.target.value)} /></div>
            <div className="space-y-1"><label className="text-xs text-muted-foreground">중분류</label><Input value={categoryM} onChange={e => setCategoryM(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><label className="text-xs text-muted-foreground">소분류</label><Input value={categoryS} onChange={e => setCategoryS(e.target.value)} /></div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">메뉴순서</label>
              <Input type="number" value={sortOrder ?? ""} onChange={e => setSortOrder(e.target.value ? parseInt(e.target.value) : null)} />
            </div>
          </div>
          {ownAreas.length > 0 && (
            <div className="pt-1">
              <p className="text-xs text-muted-foreground mb-1">소속 영역 ({ownAreas.length})</p>
              <div className="flex flex-wrap gap-1">
                {ownAreas.map(a => <span key={a.areaId} className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">{a.areaCode}</span>)}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex justify-end px-4 py-2.5 border-t border-border bg-muted/30">
        <Button size="sm" onClick={() => mutation.mutate({ name, displayCode: displayCode || null, screenType: screenType || null, spec, categoryL: categoryL || null, categoryM: categoryM || null, categoryS: categoryS || null, sortOrder })} disabled={mutation.isPending}>
          {mutation.isPending ? "저장 중..." : <><Save className="h-3.5 w-3.5 mr-1" />화면 저장</>}
        </Button>
      </div>
    </div>
  );
}

// ─── Section: 영역 ────────────────────────────────────────────────────────────

function AreaSection({ areaId, allScreens, isTarget }: { areaId: number; allScreens: ScreenListItem[]; isTarget: boolean }) {
  const queryClient = useQueryClient();
  const { data: raw, dataUpdatedAt } = useQuery({
    queryKey: ["area", String(areaId)],
    queryFn: () => apiFetch<{ data: Record<string, unknown> }>(`/api/areas/${areaId}`),
  });
  const area = raw?.data as Record<string, unknown> | null | undefined;

  const [spec, setSpec]           = useState("");
  const [name, setName]           = useState("");
  const [areaType, setAreaType]   = useState("");
  const [screenId, setScreenId]   = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState<number | null>(null);

  useEffect(() => {
    if (area) {
      setSpec((area.spec as string) || "");
      setName((area.name as string) || "");
      setAreaType((area.areaType as string) || "");
      setScreenId((area.screenId as number) ?? null);
      setSortOrder((area.sortOrder as number | null) ?? null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataUpdatedAt]);

  const mutation = useMutation({
    mutationFn: (body: object) => apiFetch(`/api/areas/${areaId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    }),
    onSuccess: () => { toast.success("영역 저장되었습니다."); queryClient.invalidateQueries({ queryKey: ["area", String(areaId)] }); },
    onError: () => toast.error("저장 실패"),
  });

  if (!area) return (
    <div id={`section-area-${areaId}`} className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground animate-pulse scroll-mt-[60px]">영역 로딩 중...</div>
  );

  const typeLabel = AREA_TYPES.find(t => t.value === area.areaType)?.label ?? (area.areaType as string) ?? "";

  return (
    <div id={`section-area-${areaId}`}
      className={cn("rounded-lg border bg-card overflow-hidden scroll-mt-[60px]", isTarget ? "border-green-400 ring-2 ring-green-200" : "border-border")}
    >
      <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border-b border-green-200">
        <LayoutGrid className="h-3.5 w-3.5 text-green-600" />
        <span className="text-xs font-semibold text-green-700">영역</span>
        <span className="text-xs font-mono text-green-500">{area.areaCode as string}</span>
        <span className="text-xs font-medium text-green-800">{area.name as string}</span>
        {typeLabel && <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-600 ml-1">{typeLabel}</span>}
      </div>
      <div className="grid grid-cols-10 gap-0">
        <div className="col-span-6 p-4 border-r border-border">
          <MarkdownEditor key={`md-area-${dataUpdatedAt}`} value={spec} onChange={setSpec}
            label="영역 설명 (마크다운)" rows={12} placeholder="영역 설명을 마크다운으로 작성하세요..."
            refTableName="tb_area" refPkId={areaId} fieldName="spec" />
        </div>
        <div className="col-span-4 p-4 space-y-3">
          <div className="space-y-1"><label className="text-xs text-muted-foreground">영역명 *</label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><label className="text-xs text-muted-foreground">영역코드</label><Input value={area.areaCode as string} disabled className="text-muted-foreground" /></div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">영역 유형</label>
              <Select value={areaType || ""} onValueChange={setAreaType}>
                <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                <SelectContent>{AREA_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">소속 화면</label>
            <Select value={screenId ? String(screenId) : ""} onValueChange={v => setScreenId(v ? parseInt(v) : null)}>
              <SelectTrigger><SelectValue placeholder="화면 선택" /></SelectTrigger>
              <SelectContent>{allScreens.map(s => <SelectItem key={s.screenId} value={String(s.screenId)}>{s.systemId} {s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">정렬 순서</label>
            <Input type="number" value={sortOrder ?? ""} onChange={e => setSortOrder(e.target.value ? parseInt(e.target.value) : null)} />
          </div>
        </div>
      </div>
      <div className="flex justify-end px-4 py-2.5 border-t border-border bg-muted/30">
        <Button size="sm" onClick={() => mutation.mutate({ name, areaType, screenId, sortOrder, spec })} disabled={mutation.isPending}>
          {mutation.isPending ? "저장 중..." : <><Save className="h-3.5 w-3.5 mr-1" />영역 저장</>}
        </Button>
      </div>
    </div>
  );
}

// ─── Section: 기능 ────────────────────────────────────────────────────────────

function FunctionSection({ funcId, allAreas, isTarget }: { funcId: number; allAreas: AreaListItem[]; isTarget: boolean }) {
  const queryClient = useQueryClient();
  const { data: raw, dataUpdatedAt } = useQuery({
    queryKey: ["function", String(funcId)],
    queryFn: () => apiFetch<{ data: Record<string, unknown> }>(`/api/functions/${funcId}`),
  });
  const fn = raw?.data as Record<string, unknown> | null | undefined;

  const [spec, setSpec]             = useState("");
  const [name, setName]             = useState("");
  const [displayCode, setDisplayCode] = useState("");
  const [priority, setPriority]     = useState("MEDIUM");
  const [areaId, setAreaId]         = useState<number | null>(null);
  const [sortOrder, setSortOrder]   = useState<number | null>(null);

  useEffect(() => {
    if (fn) {
      setSpec((fn.spec as string) || "");
      setName((fn.name as string) || "");
      setDisplayCode((fn.displayCode as string) || "");
      setPriority((fn.priority as string) || "MEDIUM");
      setAreaId((fn.areaId as number | null) ?? null);
      setSortOrder((fn.sortOrder as number | null) ?? null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataUpdatedAt]);

  const mutation = useMutation({
    mutationFn: (body: object) => apiFetch(`/api/functions/${funcId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    }),
    onSuccess: () => { toast.success("기능 저장되었습니다."); queryClient.invalidateQueries({ queryKey: ["function", String(funcId)] }); },
    onError: () => toast.error("저장 실패"),
  });

  if (!fn) return (
    <div id={`section-func-${funcId}`} className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground animate-pulse scroll-mt-[60px]">기능 로딩 중...</div>
  );

  const priorityLabel = PRIORITY_OPTIONS.find(p => p.value === fn.priority)?.label ?? (fn.priority as string);

  return (
    <div id={`section-func-${funcId}`}
      className={cn("rounded-lg border bg-card overflow-hidden scroll-mt-[60px]", isTarget ? "border-purple-400 ring-2 ring-purple-200" : "border-border")}
    >
      <div className="flex items-center gap-2 px-4 py-2.5 bg-purple-50 border-b border-purple-200">
        <Cog className="h-3.5 w-3.5 text-purple-600" />
        <span className="text-xs font-semibold text-purple-700">기능</span>
        <span className="text-xs font-mono text-purple-500">{fn.systemId as string}</span>
        <span className="text-xs font-medium text-purple-800">{fn.name as string}</span>
        {priorityLabel && <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-600 ml-1">우선순위: {priorityLabel}</span>}
      </div>
      <div className="grid grid-cols-10 gap-0">
        <div className="col-span-6 p-4 border-r border-border">
          <MarkdownEditor key={`md-func-${dataUpdatedAt}`} value={spec} onChange={setSpec}
            label="기능 상세 설명 (마크다운)" rows={12} placeholder="기능 상세 설명을 마크다운으로 작성하세요..."
            refTableName="tb_function" refPkId={funcId} fieldName="spec" />
        </div>
        <div className="col-span-4 p-4 space-y-3">
          <div className="space-y-1"><label className="text-xs text-muted-foreground">기능명 *</label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><label className="text-xs text-muted-foreground">기능ID</label><Input value={fn.systemId as string} disabled className="text-muted-foreground" /></div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">우선순위</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITY_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">소속 영역</label>
            <Select value={areaId ? String(areaId) : ""} onValueChange={v => setAreaId(v ? parseInt(v) : null)}>
              <SelectTrigger><SelectValue placeholder="영역 선택" /></SelectTrigger>
              <SelectContent>{allAreas.map(a => <SelectItem key={a.areaId} value={String(a.areaId)}>{a.areaCode} {a.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><label className="text-xs text-muted-foreground">표시코드</label><Input value={displayCode} onChange={e => setDisplayCode(e.target.value)} placeholder="FN_CODE" /></div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">정렬 순서</label>
              <Input type="number" value={sortOrder ?? ""} onChange={e => setSortOrder(e.target.value ? parseInt(e.target.value) : null)} />
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-end px-4 py-2.5 border-t border-border bg-muted/30">
        <Button size="sm" onClick={() => mutation.mutate({ name, displayCode: displayCode || null, priority, areaId, sortOrder, spec })} disabled={mutation.isPending}>
          {mutation.isPending ? "저장 중..." : <><Save className="h-3.5 w-3.5 mr-1" />기능 저장</>}
        </Button>
      </div>
    </div>
  );
}

// ─── List Panel Wrapper ───────────────────────────────────────────────────────

function ListPanel({ title, icon, count, onNew, children }: {
  title: string; icon: React.ReactNode; count: number; onNew: () => void; children: React.ReactNode;
}) {
  return (
    <div className="bg-card border-r border-border last:border-r-0 flex flex-col min-w-0">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/40 shrink-0">
        <span className="text-xs font-semibold flex items-center gap-1.5">
          {icon} {title}
          <span className="font-normal text-muted-foreground">({count})</span>
        </span>
        <Button size="sm" variant="outline" className="h-6 text-xs px-2 gap-1" onClick={onNew}>
          <Plus className="h-3 w-3" /> 신규 등록
        </Button>
      </div>
      <div className="overflow-y-auto flex-1 max-h-44">{children}</div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BulkDesignPage() {
  const router = useRouter();

  // ── 단위업무 선택 ──────────────────────────────────────────
  const [unitWorkId, setUnitWorkId] = useState<string>("");

  const { data: uwListData } = useQuery({
    queryKey: ["unit-works-list"],
    queryFn: () => apiFetch<{ data: UnitWorkItem[] }>("/api/unit-works?pageSize=200"),
  });
  const unitWorks: UnitWorkItem[] = uwListData?.data ?? [];
  const selectedUW = unitWorks.find(u => String(u.unitWorkId) === unitWorkId) ?? null;

  // ── 스크롤 방향 감지 → 패널 접기/펼치기 ──────────────────
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const lastScrollY   = useRef(0);
  const [panelsExpanded, setPanelsExpanded] = useState(true);

  const handleScroll = useCallback(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const currentY = el.scrollTop;
    if (currentY > lastScrollY.current + 10 && currentY > 40) {
      setPanelsExpanded(false); // 아래로 스크롤 → 접기
    }
    lastScrollY.current = currentY;
  }, []);

  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    lastScrollY.current = 0;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll, unitWorkId]);

  // ── 전체 목록 조회 (단위업무 선택 시에만) ─────────────────
  const { data: screensData } = useQuery({
    queryKey: ["bulk-screens", unitWorkId],
    queryFn: () => apiFetch<{ data: ScreenListItem[] }>(`/api/screens?pageSize=500&unitWorkId=${unitWorkId}`),
    enabled: !!unitWorkId,
  });
  const { data: areasData } = useQuery({
    queryKey: ["bulk-areas", unitWorkId],
    queryFn: () => apiFetch<{ data: AreaListItem[] }>(`/api/areas?pageSize=500&unitWorkId=${unitWorkId}`),
    enabled: !!unitWorkId,
  });
  const { data: funcsData } = useQuery({
    queryKey: ["bulk-funcs", unitWorkId],
    queryFn: () => apiFetch<{ data: FuncListItem[] }>(`/api/functions?pageSize=500&unitWorkId=${unitWorkId}`),
    enabled: !!unitWorkId,
  });

  const allScreens: ScreenListItem[] = screensData?.data ?? [];
  const allAreas: AreaListItem[]     = areasData?.data ?? [];
  const allFuncs: FuncListItem[]     = funcsData?.data ?? [];

  // ── 선택에 따라 표시할 섹션 계산 ──────────────────────────
  const [selected, setSelected] = useState<SelectedItem>(null);

  // 단위업무 변경 시 선택 초기화
  useEffect(() => { setSelected(null); }, [unitWorkId]);

  type Section = { type: "screen" | "area" | "function"; id: number; isTarget: boolean };

  const sections = useMemo((): Section[] => {
    if (!selected) return [];
    if (selected.type === "screen") {
      return [{ type: "screen", id: selected.id, isTarget: true }];
    }
    if (selected.type === "area") {
      const area = allAreas.find(a => a.areaId === selected.id);
      const result: Section[] = [];
      if (area?.screenId) result.push({ type: "screen", id: area.screenId, isTarget: false });
      result.push({ type: "area", id: selected.id, isTarget: true });
      return result;
    }
    if (selected.type === "function") {
      const func = allFuncs.find(f => f.functionId === selected.id);
      const area = allAreas.find(a => a.areaId === func?.areaId);
      const result: Section[] = [];
      if (area?.screenId) result.push({ type: "screen", id: area.screenId, isTarget: false });
      if (func?.areaId)   result.push({ type: "area",   id: func.areaId,   isTarget: false });
      result.push({ type: "function", id: selected.id, isTarget: true });
      return result;
    }
    return [];
  }, [selected, allAreas, allFuncs]);

  // ── 선택 시 해당 섹션으로 스크롤 ──────────────────────────
  useEffect(() => {
    if (!selected) return;
    const target = sections.find(s => s.isTarget);
    if (!target) return;
    setTimeout(() => {
      document.getElementById(`section-${target.type}-${target.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const isSelected = (type: "screen" | "area" | "function", id: number) =>
    selected?.type === type && selected.id === id;

  const handleSelect = (type: "screen" | "area" | "function", id: number) =>
    setSelected(s => (s?.type === type && s.id === id) ? null : { type, id });

  return (
    <div className="-mx-6 -mt-6 flex flex-col h-[calc(100vh-48px)]">

      {/* ── 페이지 헤더 ─────────────────────────────────────── */}
      <div className="px-6 py-3 border-b border-border bg-background shrink-0 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-semibold">시스템 일괄 설계</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            단위업무를 선택하면 소속 화면·영역·기능을 일괄 편집할 수 있습니다.
          </p>
        </div>
        {/* 단위업무 선택기 */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">단위업무</span>
          <Select value={unitWorkId} onValueChange={setUnitWorkId}>
            <SelectTrigger className="w-56 h-8 text-xs">
              <SelectValue placeholder="단위업무 선택..." />
            </SelectTrigger>
            <SelectContent>
              {unitWorks.map(u => (
                <SelectItem key={u.unitWorkId} value={String(u.unitWorkId)}>
                  <span className="font-mono text-muted-foreground mr-2">{u.systemId}</span>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedUW && (
            <span className="text-xs text-muted-foreground">
              화면 {allScreens.length} · 영역 {allAreas.length} · 기능 {allFuncs.length}
            </span>
          )}
        </div>
      </div>

      {/* ── 단위업무 미선택 상태 ────────────────────────────── */}
      {!unitWorkId ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <div className="text-4xl">📋</div>
          <p className="text-sm font-medium">단위업무를 선택해주세요</p>
          <p className="text-xs">오른쪽 상단 단위업무 선택기에서 작업할 단위업무를 선택하면 화면이 활성화됩니다.</p>
        </div>
      ) : (
        <>
          {/* ── 목록 패널 + 토글 버튼 ────────────────────────── */}
          <div className="shrink-0 border-b border-border bg-card relative">
            {/* 접기/펼치기 트리거 (패널 하단 중앙) */}
            <button
              onClick={() => setPanelsExpanded(v => !v)}
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 px-3 py-0.5 text-xs text-muted-foreground bg-background border border-border rounded-full shadow-sm hover:bg-muted transition-colors"
            >
              {panelsExpanded
                ? <><ChevronUp className="h-3 w-3" />목록 접기</>
                : <><ChevronDown className="h-3 w-3" />목록 펼치기</>}
            </button>

            <div className={cn(
              "grid grid-cols-3 overflow-hidden transition-all duration-300",
              panelsExpanded ? "max-h-[220px]" : "max-h-0"
            )}>
              {/* 화면 목록 */}
              <ListPanel title="화면 목록" icon={<Monitor className="h-3.5 w-3.5 text-blue-600" />}
                count={allScreens.length} onNew={() => router.push("/screens")}
              >
                {allScreens.map(s => (
                  <button key={s.screenId} onClick={() => handleSelect("screen", s.screenId)}
                    className={cn("w-full flex items-center gap-2 px-4 py-2 border-b border-border/50 text-left hover:bg-muted/40 transition-colors",
                      isSelected("screen", s.screenId) && "bg-blue-50 border-l-2 border-l-blue-400"
                    )}
                  >
                    <span className="font-mono text-xs text-muted-foreground w-20 shrink-0">{s.systemId}</span>
                    <span className="text-xs flex-1 truncate">{s.name}</span>
                    {s.screenType && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                        {SCREEN_TYPES.find(t => t.value === s.screenType)?.label ?? s.screenType}
                      </span>
                    )}
                  </button>
                ))}
                {allScreens.length === 0 && <p className="px-4 py-3 text-xs text-muted-foreground">화면이 없습니다.</p>}
              </ListPanel>

              {/* 영역 목록 */}
              <ListPanel title="영역 목록" icon={<LayoutGrid className="h-3.5 w-3.5 text-green-600" />}
                count={allAreas.length} onNew={() => router.push("/areas")}
              >
                {allAreas.map(a => (
                  <button key={a.areaId} onClick={() => handleSelect("area", a.areaId)}
                    className={cn("w-full flex items-center gap-2 px-4 py-2 border-b border-border/50 text-left hover:bg-muted/40 transition-colors",
                      isSelected("area", a.areaId) && "bg-green-50 border-l-2 border-l-green-400"
                    )}
                  >
                    <span className="font-mono text-xs text-muted-foreground w-20 shrink-0">{a.areaCode}</span>
                    <span className="text-xs flex-1 truncate">{a.name}</span>
                    {a.areaType && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                        {AREA_TYPES.find(t => t.value === a.areaType)?.label ?? a.areaType}
                      </span>
                    )}
                  </button>
                ))}
                {allAreas.length === 0 && <p className="px-4 py-3 text-xs text-muted-foreground">영역이 없습니다.</p>}
              </ListPanel>

              {/* 기능 목록 */}
              <ListPanel title="기능 목록" icon={<Cog className="h-3.5 w-3.5 text-purple-600" />}
                count={allFuncs.length} onNew={() => router.push("/functions")}
              >
                {allFuncs.map(f => (
                  <button key={f.functionId} onClick={() => handleSelect("function", f.functionId)}
                    className={cn("w-full flex items-center gap-2 px-4 py-2 border-b border-border/50 text-left hover:bg-muted/40 transition-colors",
                      isSelected("function", f.functionId) && "bg-purple-50 border-l-2 border-l-purple-400"
                    )}
                  >
                    <span className="font-mono text-xs text-muted-foreground w-24 shrink-0">{f.systemId}</span>
                    <span className="text-xs flex-1 truncate">{f.name}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                      {PRIORITY_OPTIONS.find(p => p.value === f.priority)?.label ?? f.priority}
                    </span>
                  </button>
                ))}
                {allFuncs.length === 0 && <p className="px-4 py-3 text-xs text-muted-foreground">기능이 없습니다.</p>}
              </ListPanel>
            </div>
          </div>

          {/* ── 편집 섹션 ──────────────────────────────────────── */}
          <div ref={scrollAreaRef} className="flex-1 overflow-y-auto">
            {sections.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                <p className="text-sm">위 목록에서 화면·영역·기능을 클릭하면 편집 폼이 표시됩니다.</p>
                <p className="text-xs">화면 클릭 → 화면 편집 | 영역 클릭 → 화면+영역 편집 | 기능 클릭 → 화면+영역+기능 편집</p>
              </div>
            ) : (
              <div className="px-6 py-4 space-y-4 pb-10">
                {sections.map(section => {
                  if (section.type === "screen") return (
                    <ScreenSection key={`screen-${section.id}`} screenId={section.id} allAreas={allAreas} isTarget={section.isTarget} />
                  );
                  if (section.type === "area") return (
                    <AreaSection key={`area-${section.id}`} areaId={section.id} allScreens={allScreens} isTarget={section.isTarget} />
                  );
                  if (section.type === "function") return (
                    <FunctionSection key={`func-${section.id}`} funcId={section.id} allAreas={allAreas} isTarget={section.isTarget} />
                  );
                  return null;
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
