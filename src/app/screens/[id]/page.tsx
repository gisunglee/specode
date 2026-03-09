/**
 * ScreenDetailPage — 화면 상세 페이지 (/screens/[id])
 *
 * 📌 역할:
 *   - 화면(Screen) 설명(spec)을 마크다운으로 편집/미리보기
 *   - 화면 레이아웃(layoutData)을 블록 기반으로 편집
 *   - 첨부파일 관리 (드래그&드롭, Ctrl+V, 삭제)
 *   - 하위 기능 목록 표시 (DataGrid) + 행 클릭 → 기능 상세
 *
 * 📌 레이아웃:
 *   ┌─────────────────────────────────────────────────────┐
 *   │ [←] PID-00001 — 화면명                    [저장]    │
 *   ├─────────────────────────────────────────────────────┤
 *   │ ┌───── 6/10 ──────┐┌──── 4/10 ────┐               │
 *   │ │ 화면 설명 (MD)    ││ 레이아웃 구성  │               │
 *   │ │                   ││ 첨부파일      │               │
 *   │ └─────────────────┘└──────────────┘               │
 *   │ ── 하위 기능 목록 ─────────────────────────────────  │
 *   └─────────────────────────────────────────────────────┘
 *
 * 📌 핵심 기술:
 *   - use(params): Next.js 16 Promise 기반 route params
 *   - useQuery/useMutation: TanStack Query 데이터 조회/변경
 *   - key={dataUpdatedAt}: 서버 데이터 갱신 시 폼 초기화
 */
"use client";

/* ─── React / Next.js 임포트 ──────────────────────────────── */
import { use, useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/* ─── UI 컴포넌트 임포트 ──────────────────────────────────── */
import { Button } from "@/components/ui/button";
import { DataGrid } from "@/components/common/DataGrid";
import { StatusBadge } from "@/components/common/StatusBadge";
import { MarkdownEditor } from "@/components/common/MarkdownEditor";
import { AttachmentManager } from "@/components/common/AttachmentManager";
import {
  LayoutEditor,
  type LayoutRow,
} from "@/components/screens/LayoutEditor";

/* ─── 상수 & 유틸 임포트 ──────────────────────────────────── */
import { SCREEN_TYPES } from "@/lib/constants";
import { apiFetch, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { DEFAULT_SCREEN_SPEC } from "@/lib/templates/screenSpec";
import type { ColumnDef } from "@tanstack/react-table";

/* ─── 하위 기능 행 타입 (DataGrid 용) ─────────────────────── */
interface FunctionRow {
  functionId: number;
  systemId: string;
  displayCode: string | null;
  name: string;
  status: string;
  updatedAt: string;
}

/**
 * ScreenDetailPage — 화면 상세 페이지 컴포넌트
 *
 * @param params - URL 경로 파라미터 (Promise<{ id: string }>)
 */
export default function ScreenDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  /* ─── 폼 상태 ────────────────────────────────────────── */
  const [spec, setSpec] = useState("");
  const [layoutRows, setLayoutRows] = useState<LayoutRow[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);

  /* ─── sticky 헤더: Full Header 숨김 감지 ────────────── */
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHidden, setHeaderHidden] = useState(false);

  /* ─── API 데이터 조회 ────────────────────────────────── */
  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["screen", id],
    queryFn: async () => {
      const res = await fetch(`/api/screens/${id}`);
      return res.json();
    },
    gcTime: 0,
  });

  const screen = data?.data;

  /* ─── sticky 헤더: 로딩 완료 후 observer 설정 ──────── */
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

  /*
   * ─── 서버 데이터 → 폼 상태 동기화 ──────────────────────
   *
   * dataUpdatedAt이 변경될 때(초기 로드 + refetch 완료 후)
   * 서버 데이터를 폼에 반영합니다.
   * → 저장 후 invalidateQueries → refetch 완료 → dataUpdatedAt 변경
   *   → 이 useEffect 실행 → 최신 서버 데이터로 폼 갱신
   */
  useEffect(() => {
    if (screen) {
      setSpec(screen.spec || DEFAULT_SCREEN_SPEC);
      setLayoutRows(parseLayoutData(screen.layoutData));
    }
  }, [dataUpdatedAt]);

  /* ─── 저장 뮤테이션 ──────────────────────────────────── */
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

  /* ─── 첨부파일 변경 콜백 ─────────────────────────────── */
  const handleFileChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["screen", id] });
  }, [queryClient, id]);

  /* ─── 저장 핸들러 ────────────────────────────────────── */
  const handleSave = () => {
    if (!screen) return;
    updateMutation.mutate({
      name: screen.name,
      displayCode: screen.displayCode,
      screenType: screen.screenType,
      requirementId: screen.requirementId,
      spec,
      layoutData: JSON.stringify(layoutRows),
    });
  };

  /* ─── 하위 기능 목록 컬럼 정의 ───────────────────────── */
  const funcColumns: ColumnDef<FunctionRow, unknown>[] = [
    { accessorKey: "systemId", header: "ID", size: 110 },
    { accessorKey: "displayCode", header: "표시코드", size: 100 },
    { accessorKey: "name", header: "기능명" },
    {
      accessorKey: "status",
      header: "상태",
      cell: ({ getValue }) => (
        <StatusBadge status={getValue() as string} />
      ),
      size: 100,
    },
    {
      accessorKey: "updatedAt",
      header: "수정일",
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">
          {formatDate(getValue() as string)}
        </span>
      ),
      size: 80,
    },
  ];

  /* ─── 로딩 & 에러 ───────────────────────────────────── */
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

  /* ─── 화면 유형 라벨 ─────────────────────────────────── */
  const screenTypeLabel =
    SCREEN_TYPES.find((t) => t.value === screen.screenType)?.label ??
    screen.screenType;

  /* ─── 렌더링 ──────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════ */}
      {/* Full 헤더: 뒤로가기 + 화면 ID + 화면명 + 저장 버튼   */}
      {/* ═══════════════════════════════════════════════════ */}
      <div ref={headerRef} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/screens")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">
                {screen.systemId}
                {screen.displayCode && (
                  <span className="text-muted-foreground ml-1">
                    ({screen.displayCode})
                  </span>
                )}
              </h1>
              {screenTypeLabel && (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">
                  {screenTypeLabel}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              <span className="font-medium text-foreground">{screen.name}</span>
              {screen.requirement?.name && (
                <span className="ml-1">— {screen.requirement.name}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="text-sm text-green-600 animate-in fade-in">
              저장됨 ✓
            </span>
          )}
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "저장중..." : "저장"}
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* Sticky 컴팩트 헤더 — Full Header 스크롤 아웃 시 표시  */}
      {/* ═══════════════════════════════════════════════════ */}
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
              <span className="text-sm font-semibold truncate">
                {screen.systemId}
              </span>
              <span className="text-sm text-muted-foreground truncate hidden sm:inline">
                {screen.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {saveSuccess && (
                <span className="text-xs text-green-600">저장됨 ✓</span>
              )}
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "저장중..." : "저장"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* 메인 카드: 6:4 레이아웃                              */}
      {/* ═══════════════════════════════════════════════════ */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="grid grid-cols-10 gap-6">
          {/* ── 왼쪽 6/10: 화면 설명 마크다운 에디터 ────── */}
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

          {/* ── 오른쪽 4/10: 레이아웃 + 첨부파일 ────────── */}
          <div className="col-span-4 space-y-5 pt-8">
            {/* 레이아웃 에디터 */}
            <LayoutEditor
              key={`layout-${dataUpdatedAt}`}
              value={layoutRows}
              onChange={setLayoutRows}
              functions={screen.functions ?? []}
            />

            {/* 첨부파일 관리 */}
            <AttachmentManager
              refTableName="tb_screen"
              refPkId={screen.screenId}
              attachments={screen.attachments ?? []}
              onChanged={handleFileChange}
            />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* 하위 기능 목록                                      */}
      {/* ═══════════════════════════════════════════════════ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            하위 기능 목록
            {screen.functions?.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({screen.functions.length}건)
              </span>
            )}
          </h2>
        </div>
        <DataGrid
          columns={funcColumns}
          data={screen.functions ?? []}
          onRowClick={(row: FunctionRow) =>
            router.push(`/functions/${row.functionId}`)
          }
          emptyMessage="하위 기능이 없습니다."
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/* 유틸: layoutData JSON 문자열 → LayoutRow[] 파싱             */
/* ═══════════════════════════════════════════════════════════ */
function parseLayoutData(layoutData: string | null): LayoutRow[] {
  if (!layoutData) return [];
  try {
    const parsed = JSON.parse(layoutData);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
