"use client";

import { use, useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bot, ChevronDown, ChevronRight, Download, FileText, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataGrid } from "@/components/common/DataGrid";
import { StatusBadge } from "@/components/common/StatusBadge";
import { MarkdownEditor } from "@/components/common/MarkdownEditor";
import { AttachmentManager } from "@/components/common/AttachmentManager";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ImplRequestDialog } from "@/components/common/ImplRequestDialog";
import { StoryCompass } from "@/components/user-story/StoryCompass";
import { StoryMapDialog } from "@/components/user-story/StoryMapDialog";
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
import { buildScreenTemplate, SCREEN_EXAMPLE } from "@/lib/specTemplates";
import { SpecExampleDialog } from "@/components/common/SpecExampleDialog";
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
  const [implDialogOpen, setImplDialogOpen] = useState(false);
  const [exampleOpen, setExampleOpen] = useState(false);
  const [storyMapOpen, setStoryMapOpen] = useState(false);
  const [expandedAreas, setExpandedAreas] = useState<Set<number>>(new Set());

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
    if (screen) {
      setSpec(screen.spec || DEFAULT_SCREEN_SPEC);
      setLayoutRows(parseLayoutData(screen.layoutData));
      setCategoryL(screen.categoryL ?? "");
      setCategoryM(screen.categoryM ?? "");
      setCategoryS(screen.categoryS ?? "");
      setMenuOrder(screen.menuOrder ?? null);
      if (!name) setName(screen.name);
      if (screen.areas?.length) {
        setExpandedAreas(new Set(screen.areas.map((a: AreaRow) => a.areaId)));
      }
    }
  }, [dataUpdatedAt]);

  const implMutation = useMutation({
    mutationFn: (changeNote: string) =>
      apiFetch(`/api/screens/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "IMPL_REQ", changeNote }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["screen", id] });
      toast.success("구현 요청이 등록되었습니다.");
      setImplDialogOpen(false);
    },
  });

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

  const handleExportPrd = async () => {
    if (!screen) return;
    const res = await fetch(`/api/screens/${id}/prd`);
    if (!res.ok) { toast.error("PRD 생성에 실패했습니다."); return; }
    const md = await res.text();
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PRD_screen-v1_${screen.systemId}_${screen.name}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

  return (
    <div>
      {/* ─── 슬림 Sticky 헤더 ────────────────────────────────── */}
      <div className="sticky top-0 z-20 -mx-6 -mt-6 px-6 bg-background/95 backdrop-blur-sm mb-2">
        <div className="flex items-center gap-2 h-12">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => router.push("/screens")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1.5 flex-1 min-w-0 text-sm overflow-hidden">
            <span className="font-bold shrink-0">{screen.systemId}</span>
            {screen.displayCode && (
              <span className="text-xs text-muted-foreground shrink-0">
                ({screen.displayCode})
              </span>
            )}
            {screenTypeLabel && (
              <span className="text-xs text-muted-foreground shrink-0">· {screenTypeLabel}</span>
            )}
            <span className="text-muted-foreground/40 mx-0.5 shrink-0">·</span>
            <span className="font-medium truncate">{name || screen.name}</span>
            {screen.requirement?.name && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                <span className="text-xs text-muted-foreground shrink-0 max-w-[160px] truncate">
                  {screen.requirement.name}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {saveSuccess && (
              <span className="text-xs text-emerald-600 font-medium animate-pulse">
                저장됨 ✓
              </span>
            )}
            <Button variant="outline" size="sm" onClick={() => setImplDialogOpen(true)}>
              <Bot className="h-3.5 w-3.5 mr-1.5" />
              구현 요청
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPrd} title="화면+영역+기능을 PRD.md로 내보내기">
              <Download className="h-3.5 w-3.5 mr-1.5" />
              PRD 내보내기
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="화면 삭제"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
            </Button>
            <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "저장중..." : "저장"}
            </Button>
          </div>
        </div>
      </div>

      {/* ─── 콘텐츠 ──────────────────────────────────────────── */}
      <div className="space-y-6">
        {/* 메인 카드: 6:4 레이아웃 */}
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
                          setSpec(buildScreenTemplate(layoutRows, areas));
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
            <div className="col-span-4 space-y-5">
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
                areas={areas}
              />
              <AttachmentManager
                refTableName="tb_screen"
                refPkId={screen.screenId}
                attachments={screen.attachments ?? []}
                onChanged={handleFileChange}
              />

              {/* 🧭 나침반 */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">🧭 나침반</p>
                <StoryCompass
                  screenId={screen.screenId}
                  onManage={() => setStoryMapOpen(true)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 하위 영역 + 기능 목록 */}
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
      </div>

      {/* ─── 예시 다이얼로그 ─────────────────────────────────── */}
      <SpecExampleDialog
        open={exampleOpen}
        onClose={() => setExampleOpen(false)}
        content={SCREEN_EXAMPLE}
        onInsert={() => setSpec(SCREEN_EXAMPLE)}
        title="화면 설계 예시 (공지사항 게시판)"
      />

      {/* ─── 스토리 매핑 다이얼로그 ─────────────────────────── */}
      <StoryMapDialog
        open={storyMapOpen}
        onOpenChange={setStoryMapOpen}
        screenId={screen.screenId}
      />

      {/* ─── 구현 요청 다이얼로그 ──────────────────────────────── */}
      <ImplRequestDialog
        open={implDialogOpen}
        onClose={() => setImplDialogOpen(false)}
        entityType="screen"
        entityId={screen.screenId}
        currentSnapshot={{
          screen: { spec: screen.spec || "" },
          areas: (screen.areas ?? []).map((a: AreaRow) => ({
            areaId: a.areaId,
            name: a.name,
            spec: (a as { spec?: string }).spec || "",
            functions: (a.functions ?? []).map((f: FunctionRow) => ({
              functionId: f.functionId,
              name: f.name,
              spec: (f as { spec?: string }).spec || "",
              aiDesignContent: (f as { aiDesignContent?: string }).aiDesignContent || "",
              refContent: (f as { refContent?: string }).refContent || "",
            })),
          })),
        }}
        loading={implMutation.isPending}
        onConfirm={(changeNote) => implMutation.mutate(changeNote)}
      />

      {/* ─── 화면 삭제 다이얼로그 ───────────────────────────── */}
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
