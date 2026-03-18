"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bot, ChevronRight, Download, FileText, Layers, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

interface FlatRow {
  areaId: number;
  areaCode: string;
  areaName: string;
  areaType: string;
  functionId: number | null;
  functionSystemId: string | null;
  functionDisplayCode: string | null;
  functionName: string | null;
  functionStatus: string | null;
  functionUpdatedAt: string | null;
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
  const [sortOrder, setMenuOrder] = useState<number | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [implDialogOpen, setImplDialogOpen] = useState(false);
  const [exampleOpen, setExampleOpen] = useState(false);
  const [mockupDialogOpen, setMockupDialogOpen] = useState(false);
  const [mockupViewOpen, setMockupViewOpen] = useState(false);
  const [mockupComment, setMockupComment] = useState("");
  const [storyMapOpen, setStoryMapOpen] = useState(false);

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
  const latestMockupTask = screen?.latestMockupTask ?? null;
  const isMockupRunning = latestMockupTask?.taskStatus === "RUNNING" || latestMockupTask?.taskStatus === "NONE";
  const hasMockupResult = latestMockupTask?.taskStatus === "SUCCESS" || latestMockupTask?.taskStatus === "AUTO_FIXED";

  // 목업 AI 폴링: RUNNING/NONE 상태면 3초마다 refetch
  useEffect(() => {
    if (!isMockupRunning) return;
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["screen", id] });
    }, 3000);
    return () => clearInterval(interval);
  }, [isMockupRunning, id, queryClient]);

  useEffect(() => {
    if (screen) {
      setSpec(screen.spec || DEFAULT_SCREEN_SPEC);
      setLayoutRows(parseLayoutData(screen.layoutData));
      setCategoryL(screen.categoryL ?? "");
      setCategoryM(screen.categoryM ?? "");
      setCategoryS(screen.categoryS ?? "");
      setMenuOrder(screen.sortOrder ?? null);
      if (!name) setName(screen.name);
    }
  }, [dataUpdatedAt]);

  const mockupMutation = useMutation({
    mutationFn: (comment: string) =>
      apiFetch(`/api/screens/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "MOCKUP_REQ", comment }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["screen", id] });
      toast.success("목업 요청이 등록되었습니다.");
      setMockupDialogOpen(false);
      setMockupComment("");
    },
    onError: () => toast.error("목업 요청에 실패했습니다."),
  });

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
      sortOrder: sortOrder,
    });
  };

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
            {hasMockupResult && (
              <Button variant="outline" size="sm" onClick={() => setMockupViewOpen(true)}>
                <Layers className="h-3.5 w-3.5 mr-1.5" />
                목업 보기
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => { setMockupComment(""); setMockupDialogOpen(true); }} disabled={isMockupRunning}>
              {isMockupRunning
                ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />생성중...</>
                : <><Layers className="h-3.5 w-3.5 mr-1.5" />목업 요청</>
              }
            </Button>
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
                    <label htmlFor="sortOrder" className="text-xs text-muted-foreground">메뉴순서</label>
                    <Input
                      id="sortOrder"
                      type="number"
                      value={sortOrder ?? ""}
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
          ) : (() => {
            const flatRows: FlatRow[] = areas.flatMap((area): FlatRow[] => {
              const areaTypeLabel = AREA_TYPES.find((t) => t.value === area.areaType)?.label ?? area.areaType;
              if (!area.functions?.length) {
                return [{ areaId: area.areaId, areaCode: area.areaCode, areaName: area.name, areaType: areaTypeLabel, functionId: null, functionSystemId: null, functionDisplayCode: null, functionName: null, functionStatus: null, functionUpdatedAt: null }];
              }
              return area.functions.map((fn) => ({
                areaId: area.areaId, areaCode: area.areaCode, areaName: area.name, areaType: areaTypeLabel,
                functionId: fn.functionId, functionSystemId: fn.systemId, functionDisplayCode: fn.displayCode,
                functionName: fn.name, functionStatus: fn.status, functionUpdatedAt: fn.updatedAt,
              }));
            });
            return (
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground w-24">영역코드</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground w-64">영역명</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground w-28">유형</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground w-28">기능ID</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">기능명</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground w-24">상태</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground w-28">수정일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flatRows.map((row, idx) => {
                      const isNewArea = idx === 0 || flatRows[idx - 1].areaId !== row.areaId;
                      return (
                        <tr key={`${row.areaId}-${row.functionId ?? "none"}-${idx}`}
                          className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${isNewArea && idx > 0 ? "border-t border-border" : ""}`}
                        >
                          <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                            {isNewArea ? row.areaCode : ""}
                          </td>
                          <td className="px-4 py-2">
                            {isNewArea ? (
                              <button
                                className="font-medium text-foreground hover:text-primary hover:underline cursor-pointer text-left"
                                onClick={() => router.push(`/areas/${row.areaId}`)}
                              >
                                {row.areaName}
                              </button>
                            ) : null}
                          </td>
                          <td className="px-4 py-2">
                            {isNewArea ? (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{row.areaType}</span>
                            ) : null}
                          </td>
                          <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                            {row.functionSystemId ?? ""}
                          </td>
                          <td className="px-4 py-2">
                            {row.functionId ? (
                              <button
                                className="text-foreground hover:text-primary hover:underline cursor-pointer text-left"
                                onClick={() => router.push(`/functions/${row.functionId}`)}
                              >
                                {row.functionName}
                              </button>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            {row.functionStatus ? <StatusBadge status={row.functionStatus} /> : null}
                          </td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">
                            {row.functionUpdatedAt ? formatDate(row.functionUpdatedAt) : ""}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
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
              aiDesignContent: (f as { aiDesignContent?: string | null }).aiDesignContent || "",
              refContent: (f as { refContent?: string }).refContent || "",
            })),
          })),
        }}
        loading={implMutation.isPending}
        onConfirm={(changeNote) => implMutation.mutate(changeNote)}
      />

      {/* ─── 목업 요청 다이얼로그 ───────────────────────────── */}
      <Dialog open={mockupDialogOpen} onOpenChange={setMockupDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>목업 요청</DialogTitle>
            <DialogDescription>
              화면의 영역·기능 정보를 AI에 전달해 HTML 목업을 생성합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <label className="text-xs text-muted-foreground">AI 지시사항 (선택)</label>
            <Textarea
              value={mockupComment}
              onChange={(e) => setMockupComment(e.target.value)}
              placeholder="예: 모바일 레이아웃으로, 다크 테마로, 한국어 UI 등"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMockupDialogOpen(false)}>취소</Button>
            <Button onClick={() => mockupMutation.mutate(mockupComment)} disabled={mockupMutation.isPending}>
              {mockupMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              요청
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── 목업 보기 다이얼로그 ───────────────────────────── */}
      <Dialog open={mockupViewOpen} onOpenChange={setMockupViewOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 py-3 border-b border-border flex-shrink-0">
            <DialogTitle className="text-sm">{screen?.name} — 목업 미리보기</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {latestMockupTask?.feedback && (
              <iframe
                srcDoc={latestMockupTask.feedback}
                sandbox="allow-scripts allow-same-origin"
                className="w-full border-0"
                style={{ height: "calc(95vh - 60px)" }}
                title="목업 미리보기"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

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
