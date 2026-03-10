"use client";

import { use, useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronRight, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataGrid } from "@/components/common/DataGrid";
import { StatusBadge } from "@/components/common/StatusBadge";
import { MarkdownEditor } from "@/components/common/MarkdownEditor";
import { AttachmentManager } from "@/components/common/AttachmentManager";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  LayoutEditor,
  type LayoutRow,
} from "@/components/screens/LayoutEditor";
import { AutocompleteInput } from "@/components/common/AutocompleteInput";

import { SCREEN_TYPES, AREA_TYPES } from "@/lib/constants";
import { apiFetch, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { DEFAULT_SCREEN_SPEC } from "@/lib/templates/screenSpec";
import type { ColumnDef } from "@tanstack/react-table";

interface FunctionRow {
  functionId: number;
  systemId: string;
  displayCode: string | null;
  name: string;
  status: string;
  updatedAt: string;
}

interface AreaRow {
  areaId: number;
  areaCode: string;
  name: string;
  areaType: string;
  functions: FunctionRow[];
}

export default function ScreenDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [spec, setSpec] = useState("");
  const [name, setName] = useState("");
  const [layoutRows, setLayoutRows] = useState<LayoutRow[]>([]);
  const [categoryL, setCategoryL] = useState("");
  const [categoryM, setCategoryM] = useState("");
  const [categoryS, setCategoryS] = useState("");
  const [menuOrder, setMenuOrder] = useState<number | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [expandedAreas, setExpandedAreas] = useState<Set<number>>(new Set());

  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHidden, setHeaderHidden] = useState(false);

  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["screen", id],
    queryFn: async () => {
      const res = await fetch(`/api/screens/${id}`);
      return res.json();
    },
    gcTime: 0,
  });

  const { data: catData } = useQuery({
    queryKey: ["screen-categories"],
    queryFn: () => fetch("/api/screens/categories").then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });
  const catL: string[] = catData?.data?.categoryL ?? [];
  const catM: string[] = catData?.data?.categoryM ?? [];

  const screen = data?.data;

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHeaderHidden(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-56px 0px 0px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isLoading]);

  useEffect(() => {
    if (screen) {
      setSpec(screen.spec || DEFAULT_SCREEN_SPEC);
      setLayoutRows(parseLayoutData(screen.layoutData));
      setCategoryL(screen.categoryL ?? "");
      setCategoryM(screen.categoryM ?? "");
      setCategoryS(screen.categoryS ?? "");
      setMenuOrder(screen.menuOrder ?? null);
      if (!name) setName(screen.name); // 초기 로드 시 한 번만 세팅
      // 초기 로드 시 모든 영역 펼침
      if (screen.areas?.length) {
        setExpandedAreas(new Set(screen.areas.map((a: AreaRow) => a.areaId)));
      }
    }
  }, [dataUpdatedAt]);

  const deleteMutation = useMutation({
    mutationFn: () => apiFetch(`/api/screens/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("화면이 삭제되었습니다.");
      router.push("/screens");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch(`/api/screens/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["screen", id] });
      queryClient.invalidateQueries({ queryKey: ["screens"] });
      toast.success("저장되었습니다.");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    },
  });

  const handleFileChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["screen", id] });
  }, [queryClient, id]);

  const handleSave = () => {
    if (!screen) return;
    updateMutation.mutate({
      name: name,
      displayCode: screen.displayCode,
      screenType: screen.screenType,
      requirementId: screen.requirementId,
      spec,
      layoutData: JSON.stringify(layoutRows),
      categoryL: categoryL || null,
      categoryM: categoryM || null,
      categoryS: categoryS || null,
      menuOrder: menuOrder,
    });
  };

  const toggleArea = (areaId: number) => {
    setExpandedAreas((prev) => {
      const next = new Set(prev);
      if (next.has(areaId)) next.delete(areaId);
      else next.add(areaId);
      return next;
    });
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

  if (!screen) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        화면을 찾을 수 없습니다.
      </div>
    );
  }

  const screenTypeLabel =
    SCREEN_TYPES.find((t) => t.value === screen.screenType)?.label ?? screen.screenType;

  const areas: AreaRow[] = screen.areas ?? [];
  const areaCount = areas.length;
  const totalFuncCount = areas.reduce((acc: number, a: AreaRow) => acc + (a.functions?.length ?? 0), 0);

  // LayoutEditor용 전체 기능 목록 (플랫)
  const allFunctions = areas.flatMap((a: AreaRow) => a.functions ?? []);

  return (
    <div className="space-y-6">
      {/* ── Full 헤더 ───────────────────────────────────── */}
      <div ref={headerRef} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/screens")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">
                {screen.systemId}
                {screen.displayCode && (
                  <span className="text-muted-foreground ml-1">({screen.displayCode})</span>
                )}
              </h1>
              {screenTypeLabel && (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">
                  {screenTypeLabel}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              <span className="font-medium text-foreground">{name}</span>
              {screen.requirement?.name && (
                <span className="ml-1">— {screen.requirement.name}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="text-sm text-green-600 animate-in fade-in">저장됨 ✓</span>
          )}
          <Button variant="ghost" size="icon" title="화면 삭제" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "저장중..." : "저장"}
          </Button>
        </div>
      </div>

      {/* ── Sticky 컴팩트 헤더 ─────────────────────────── */}
      <div className="sticky top-14 z-20 -mx-6 px-6 bg-background/95 backdrop-blur-sm border-b border-border">
        {headerHidden && (
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => router.push("/screens")}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-sm font-semibold truncate">{screen.systemId}</span>
              <span className="text-sm text-muted-foreground truncate hidden sm:inline">
                {screen.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {saveSuccess && <span className="text-xs text-green-600">저장됨 ✓</span>}
              <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "저장중..." : "저장"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── 메인 카드: 6:4 레이아웃 ────────────────────── */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="grid grid-cols-10 gap-6">
          <div className="col-span-6">
            <MarkdownEditor
              key={`md-${dataUpdatedAt}`}
              value={spec}
              onChange={setSpec}
              label="화면 설명 (마크다운) *"
              rows={30}
              placeholder="화면 설명을 마크다운으로 작성하세요..."
            />
          </div>
          <div className="col-span-4 space-y-5 pt-8">
            {/* ── 기본 정보 ─────────────────────────────── */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">기본 정보</p>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">화면명 *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={handleSave}
                  placeholder="화면명 입력"
                />
              </div>
            </div>

            {/* ── 메뉴 분류 ─────────────────────────────── */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">메뉴 분류</p>
              <div className="grid grid-cols-2 gap-2">
                <AutocompleteInput
                  id="categoryL"
                  label="대분류"
                  value={categoryL}
                  onChange={setCategoryL}
                  suggestions={catL}
                  placeholder="예: 예산관리"
                />
                <AutocompleteInput
                  id="categoryM"
                  label="중분류"
                  value={categoryM}
                  onChange={setCategoryM}
                  suggestions={catM}
                  placeholder="예: 감축량관리"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label htmlFor="categoryS" className="text-xs text-muted-foreground">소분류</label>
                  <Input
                    id="categoryS"
                    value={categoryS}
                    onChange={(e) => setCategoryS(e.target.value)}
                    placeholder="3depth 메뉴"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="menuOrder" className="text-xs text-muted-foreground">메뉴순서</label>
                  <Input
                    id="menuOrder"
                    type="number"
                    value={menuOrder ?? ""}
                    onChange={(e) => setMenuOrder(e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
            <LayoutEditor
              key={`layout-${dataUpdatedAt}`}
              value={layoutRows}
              onChange={setLayoutRows}
              functions={allFunctions}
            />
            <AttachmentManager
              refTableName="tb_screen"
              refPkId={screen.screenId}
              attachments={screen.attachments ?? []}
              onChanged={handleFileChange}
            />
          </div>
        </div>
      </div>

      {/* ── 하위 영역 + 기능 목록 ──────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            하위 영역 / 기능
            {(areaCount > 0 || totalFuncCount > 0) && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                (영역 {areaCount}개 / 기능 {totalFuncCount}건)
              </span>
            )}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/areas?screenId=${id}`)}
          >
            영역 관리
          </Button>
        </div>

        {areas.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">등록된 영역이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {areas.map((area: AreaRow) => {
              const expanded = expandedAreas.has(area.areaId);
              const areaTypeLabel =
                AREA_TYPES.find((t) => t.value === area.areaType)?.label ?? area.areaType;
              return (
                <div key={area.areaId} className="rounded-lg border border-border bg-card overflow-hidden">
                  <button
                    onClick={() => toggleArea(area.areaId)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-3">
                      {expanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-xs text-muted-foreground font-mono">
                        {area.areaCode}
                      </span>
                      <span className="font-medium">{area.name}</span>
                      <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                        {areaTypeLabel}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      기능 {area.functions?.length ?? 0}건
                    </span>
                  </button>
                  {expanded && (
                    <div className="px-4 pb-3">
                      <DataGrid
                        columns={funcColumns}
                        data={area.functions ?? []}
                        onRowClick={(row: FunctionRow) =>
                          router.push(`/functions/${row.functionId}`)
                        }
                        emptyMessage="기능이 없습니다."
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 화면 삭제 다이얼로그 ────────────────────────── */}
      {areaCount > 0 ? (
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>화면 삭제 불가</DialogTitle>
              <DialogDescription>
                <span className="font-medium text-foreground">&quot;{screen.name}&quot;</span>에 연결된{" "}
                <span className="font-semibold text-destructive">{areaCount}개</span>의 영역이 있습니다.
                <br />영역에서 화면 연결을 해제한 후 삭제할 수 있습니다.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setDeleteOpen(false)}>확인</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : (
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="화면 삭제"
          description={`"${screen.name}"을(를) 삭제하시겠습니까?`}
          variant="destructive"
          confirmLabel="삭제"
          onConfirm={() => deleteMutation.mutate()}
          loading={deleteMutation.isPending}
        />
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
