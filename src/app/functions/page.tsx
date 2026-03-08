/**
 * FunctionsPage — 기능 관리 목록 페이지 (/functions)
 *
 * 📌 역할:
 *   - 등록된 기능(Function) 목록을 테이블로 표시
 *   - 상태 탭 필터 (전체, 설계중, 검토요청, AI검토중, ...)
 *   - 화면 선택 콤보박스 필터 (화면 관리에서 클릭 시 자동 선택)
 *   - 키워드 검색 (기능명, ID, 표시코드)
 *   - 행 클릭 → 기능 상세 페이지 이동
 *   - "기능 등록" → 레이어 팝업(Dialog) → 기본 정보 입력 → 상세 페이지로 이동
 *
 * 📌 URL 쿼리스트링:
 *   ?status=REVIEW_REQ  → 특정 상태만 필터
 *   ?screenId=7         → 특정 화면의 기능만 필터 (화면 관리에서 클릭 시 전달됨)
 *
 * 📌 주요 기술:
 *   - Suspense: Next.js 16에서 useSearchParams() 사용 시 필수
 *   - useSearchParams: URL 쿼리스트링 읽기
 *   - useQuery: 기능 목록 + 화면 목록 API 조회
 *   - useMutation: 일괄 상태 변경 + 기능 등록 API 호출
 *   - Dialog: 기능 등록 레이어 팝업 (Radix UI)
 */
"use client";

/* ─── React / 라이브러리 임포트 ──────────────────────────── */
import { Suspense, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";

/* ─── UI 컴포넌트 임포트 ─────────────────────────────────── */
import { DataGrid } from "@/components/common/DataGrid";
import { StatusBadge } from "@/components/common/StatusBadge";
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

/* ─── 상수 & 유틸 임포트 ─────────────────────────────────── */
import {
  FUNC_STATUS_LABEL,
  PRIORITIES,
  AI_TASK_STATUS_LABEL,
} from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { ColumnDef } from "@tanstack/react-table";

/* ─── 타입 정의 ───────────────────────────────────────────── */

/** 기능 목록 API 응답의 행 타입 */
interface FunctionRow {
  functionId: number;
  systemId: string;
  displayCode: string | null;
  name: string;
  status: string;
  priority: string;
  updatedAt: string;
  screen: {
    name: string;
    systemId: string;
    requirement: { name: string };
  };
  latestTask: {
    taskStatus: string;
    taskType: string;
    completedAt: string | null;
  } | null;
}

/** 화면 목록 API 응답의 행 타입 (화면 선택 콤보박스용) */
interface ScreenOption {
  screenId: number;
  systemId: string;
  name: string;
}

/**
 * 상태 탭 목록 — "전체" + FUNC_STATUS_LABEL의 모든 상태
 * 📌 Object.entries: { DRAFT: "설계중", ... } → [["DRAFT", "설계중"], ...]
 */
const STATUS_TABS = [
  { value: "", label: "전체" },
  ...Object.entries(FUNC_STATUS_LABEL).map(([value, label]) => ({
    value,
    label,
  })),
];

/**
 * FunctionsPage — 최상위 래퍼 컴포넌트
 *
 * 📌 <Suspense>로 감싸는 이유:
 *    Next.js 16에서 useSearchParams()를 사용하는 컴포넌트는
 *    반드시 Suspense 경계(boundary) 안에 있어야 합니다.
 *    → 서버에서 렌더링 시 쿼리스트링을 알 수 없으므로 Suspense가 필요
 */
export default function FunctionsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          로딩 중...
        </div>
      }
    >
      <FunctionsContent />
    </Suspense>
  );
}

/**
 * FunctionsContent — 기능 목록 실제 컨텐츠 컴포넌트
 *
 * 📌 모든 상태와 로직이 이 컴포넌트에 집중
 *    useSearchParams()를 사용하므로 Suspense 안에서만 렌더링 가능
 */
function FunctionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  /**
   * 📌 URL 쿼리스트링에서 초기 필터값 추출
   *    화면 관리에서 행 클릭 → /functions?screenId=7 → screenId 필터 자동 적용
   *    대시보드에서 상태 클릭 → /functions?status=REVIEW_REQ → 상태 필터 자동 적용
   */
  const initialStatus = searchParams.get("status") || "";
  const initialScreenId = searchParams.get("screenId") || "";

  /* ─── 상태(State) 관리 ─────────────────────────────────── */
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [screenFilter, setScreenFilter] = useState(initialScreenId);
  const [selected, setSelected] = useState<FunctionRow[]>([]);

  /** createOpen: 기능 등록 팝업 다이얼로그 열림/닫힘 */
  const [createOpen, setCreateOpen] = useState(false);

  /**
   * createForm: 기능 등록 폼 상태
   * 📌 간단한 기본 정보만 입력 → 등록 후 상세 페이지에서 나머지 편집
   */
  const [createForm, setCreateForm] = useState({
    name: "",
    displayCode: "",
    screenId: "",
    priority: "MEDIUM",
  });

  /* ─── API: 기능 목록 조회 ────────────────────────────────── */
  /**
   * 📌 queryKey에 모든 필터 조건 포함
   *    → 필터 변경 시 자동으로 새 데이터 조회
   *    → gcTime: 0 → 다른 페이지에서 돌아올 때 항상 새로 조회
   */
  const { data, isLoading } = useQuery({
    queryKey: ["functions", page, search, statusFilter, screenFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20",
      });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (screenFilter) params.set("screenId", screenFilter);
      const res = await fetch(`/api/functions?${params}`);
      return res.json();
    },
    gcTime: 0,
  });

  /* ─── API: 화면 목록 조회 (콤보박스용) ───────────────────── */
  /**
   * 📌 화면 선택 콤보박스에 표시할 화면 목록
   *    pageSize=200: 대부분의 프로젝트에서 화면이 200개 미만이므로 한번에 조회
   */
  const { data: screensData } = useQuery({
    queryKey: ["screens-all"],
    queryFn: async () => {
      const res = await fetch("/api/screens?pageSize=200");
      return res.json();
    },
  });
  const screens: ScreenOption[] = screensData?.data ?? [];

  /* ─── API: 일괄 상태 변경 ────────────────────────────────── */
  const batchStatusMutation = useMutation({
    mutationFn: async ({
      ids,
      status,
    }: {
      ids: number[];
      status: string;
    }) => {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/functions/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["functions"] });
      setSelected([]);
    },
  });

  /* ─── API: 기능 등록 ─────────────────────────────────────── */
  /**
   * 📌 기능 등록 뮤테이션
   *    POST /api/functions → 기능 생성
   *    성공 시 → 생성된 기능의 상세 페이지로 이동
   */
  const createMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch("/api/functions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return res.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        setCreateOpen(false);
        /**
         * 📌 등록 성공 → 기능 상세 페이지로 즉시 이동
         *    상세 페이지에서 spec, 참조 테이블 등 나머지 정보를 편집
         */
        router.push(`/functions/${result.data.functionId}`);
      }
    },
  });

  /**
   * handleCreate — 기능 등록 폼 제출 핸들러
   * 📌 screenId를 문자열에서 정수로 변환 (API가 정수를 요구)
   */
  const handleCreate = () => {
    if (!createForm.name || !createForm.screenId) return;
    createMutation.mutate({
      ...createForm,
      screenId: parseInt(createForm.screenId),
    });
  };

  /**
   * openCreateDialog — 기능 등록 팝업 열기
   * 📌 화면 필터가 이미 선택되어 있으면 screenId를 자동으로 채움
   *    예: 화면 관리에서 클릭해서 왔으면 해당 화면이 자동 선택
   */
  const openCreateDialog = () => {
    setCreateForm({
      name: "",
      displayCode: "",
      screenId: screenFilter, // 현재 화면 필터 값을 기본으로 사용
      priority: "MEDIUM",
    });
    setCreateOpen(true);
  };

  /* ─── 테이블 컬럼 정의 ───────────────────────────────────── */
  const columns: ColumnDef<FunctionRow, unknown>[] = [
    { accessorKey: "systemId", header: "ID", size: 100 },
    {
      accessorKey: "displayCode",
      header: "표시코드",
      size: 100,
      cell: ({ getValue }) => getValue() || "-",
    },
    { accessorKey: "name", header: "기능명" },
    {
      accessorKey: "status",
      header: "상태",
      cell: ({ getValue }) => <StatusBadge status={getValue() as string} />,
      size: 100,
    },
    {
      accessorKey: "priority",
      header: "우선",
      cell: ({ getValue }) => {
        const v = getValue() as string;
        return (
          <span className="text-muted-foreground">
            {PRIORITIES.find((p) => p.value === v)?.label ?? v}
          </span>
        );
      },
      size: 60,
    },
    {
      id: "screen",
      header: "화면명",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.screen?.name}
        </span>
      ),
    },
    {
      id: "latestAi",
      header: "AI 결과",
      cell: ({ row }) => {
        const latest = row.original.latestTask;
        if (!latest) return <span className="text-muted-foreground">-</span>;
        const cfg = AI_TASK_STATUS_LABEL[latest.taskStatus];
        return (
          <div>
            <span className={`text-xs ${cfg?.class ?? ""}`}>
              {cfg?.label ?? latest.taskStatus}
            </span>
            {latest.completedAt && (
              <p className="text-[11px] text-muted-foreground">
                {formatDate(latest.completedAt)}
              </p>
            )}
          </div>
        );
      },
      size: 130,
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

  /* ─── 렌더링 ───────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* ── 페이지 타이틀 + 액션 버튼들 ───────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">기능 관리</h1>
        <div className="flex items-center gap-2">
          {/* 선택된 행이 있을 때만 일괄 처리 버튼 표시 */}
          {selected.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  batchStatusMutation.mutate({
                    ids: selected.map((s) => s.functionId),
                    status: "REVIEW_REQ",
                  })
                }
                disabled={batchStatusMutation.isPending}
              >
                일괄 검토요청
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  batchStatusMutation.mutate({
                    ids: selected.map((s) => s.functionId),
                    status: "CONFIRM_Y",
                  })
                }
                disabled={batchStatusMutation.isPending}
              >
                일괄 컨펌
              </Button>
            </>
          )}
          {/*
           * 📌 기능 등록 버튼 — 클릭 시 레이어 팝업(Dialog) 열림
           *    기존: router.push("/functions/new") → 별도 페이지
           *    변경: openCreateDialog() → 간단 입력 팝업 → 상세 페이지 이동
           */}
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-1" />
            기능 등록
          </Button>
        </div>
      </div>

      {/* ── 상태 탭 필터 ─────────────────────────────────── */}
      {/*
       * 📌 가로로 나열된 탭 버튼들
       *    클릭 → statusFilter 변경 → queryKey 변경 → 자동 refetch
       *    활성화된 탭은 bg-card + shadow로 강조 표시
       */}
      <div className="flex flex-wrap gap-1 p-1 bg-muted/50 rounded-lg w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setStatusFilter(tab.value);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              statusFilter === tab.value
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── 검색 + 화면 필터 콤보박스 ────────────────────── */}
      <div className="flex items-center gap-4">
        {/* 키워드 검색 */}
        <div className="flex items-center gap-2 max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="기능명, ID, 표시코드 검색..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {/*
         * 📌 화면 선택 콤보박스 — 특정 화면의 기능만 필터링
         *
         * 화면 관리에서 행 클릭 → /functions?screenId=7
         * → initialScreenId = "7" → screenFilter = "7"
         * → 이 콤보박스에 해당 화면이 자동 선택됨
         *
         * "ALL" 선택 시 → screenFilter = "" → 전체 화면 표시
         */}
        <Select
          value={screenFilter || "ALL"}
          onValueChange={(v) => {
            setScreenFilter(v === "ALL" ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="화면: 전체" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">화면: 전체</SelectItem>
            {screens.map((s) => (
              <SelectItem key={s.screenId} value={String(s.screenId)}>
                {s.systemId} {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── 데이터 그리드 (테이블) ───────────────────────── */}
      {/*
       * 📌 onRowClick: 행 클릭 → 기능 상세 페이지로 이동
       *    /functions/[functionId] → 기능 상세
       */}
      <DataGrid
        columns={columns}
        data={data?.data ?? []}
        onRowClick={(row) => router.push(`/functions/${row.functionId}`)}
        pagination={data?.pagination}
        onPageChange={setPage}
        emptyMessage={isLoading ? "로딩 중..." : "등록된 기능이 없습니다."}
      />

      {/* ═══════════════════════════════════════════════════════ */}
      {/* 기능 등록 레이어 팝업 (Dialog)                          */}
      {/*                                                        */}
      {/* 📌 기존 /functions/new 페이지를 대체                     */}
      {/*    간단한 기본 정보만 입력 → 등록 → 상세 페이지로 이동    */}
      {/*    상세 페이지에서 spec, 참조 테이블 등 나머지 편집       */}
      {/*                                                        */}
      {/* 📌 Dialog 컴포넌트 구조 (Radix UI):                     */}
      {/*    <Dialog>         — 열림/닫힘 상태 관리                */}
      {/*      <DialogContent> — 팝업 본문 (오버레이 + 카드)       */}
      {/*        <DialogHeader> — 제목 영역                       */}
      {/*        <form>        — 입력 폼                          */}
      {/*        <DialogFooter> — 하단 버튼 영역                   */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>기능 등록</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* 기능명 — 필수 입력 */}
            <div className="space-y-1.5">
              <Label className="text-xs">기능명 *</Label>
              <Input
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="기능명"
              />
            </div>

            {/* 표시용 코드 — 선택 입력 */}
            <div className="space-y-1.5">
              <Label className="text-xs">표시용 코드</Label>
              <Input
                value={createForm.displayCode}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, displayCode: e.target.value }))
                }
                placeholder="예: BGT-001-01"
              />
            </div>

            {/*
             * 📌 소속 화면 — 필수 선택
             *    어떤 화면(Screen)에 이 기능을 등록할지 선택
             *    화면 관리에서 특정 화면 클릭 후 왔다면 자동 선택되어 있음
             */}
            <div className="space-y-1.5">
              <Label className="text-xs">소속 화면 *</Label>
              <Select
                value={createForm.screenId}
                onValueChange={(v) =>
                  setCreateForm((f) => ({ ...f, screenId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="화면 선택" />
                </SelectTrigger>
                <SelectContent>
                  {screens.map((s) => (
                    <SelectItem key={s.screenId} value={String(s.screenId)}>
                      {s.systemId} {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 우선순위 */}
            <div className="space-y-1.5">
              <Label className="text-xs">우선순위</Label>
                <Select
                  value={createForm.priority}
                  onValueChange={(v) =>
                    setCreateForm((f) => ({ ...f, priority: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>
          </div>

          {/* 하단 버튼 — 취소 + 저장 */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
            >
              취소
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                createMutation.isPending ||
                !createForm.name ||
                !createForm.screenId
              }
            >
              {createMutation.isPending ? "등록중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
