"use client";

const STORY_EXAMPLES = [
  {
    name: "예산 담당자가 신규 회계연도 예산안을 항목별로 편성하고 기안 상신할 수 있다",
    persona: "예산 담당자 (기획재정팀)",
    scenario:
      "예산 담당자는 매년 4분기에 다음 회계연도 예산안을 부서별·항목별로 작성하여 기안 상신한다. 전년도 실적 데이터를 참고하면서 항목별 증감 사유를 기록하고, 완성된 예산안을 담당 팀장에게 결재 상신할 수 있어야 한다.",
    ac: [
      "항목별 예산 금액 입력 시 소계·합계가 실시간으로 자동 계산된다",
      "전년도 동일 항목의 실적·예산 금액을 참고용으로 나란히 조회할 수 있다",
      "항목별 증감 사유를 50자 이내로 기록할 수 있다",
      "임시저장 후 이어서 작성할 수 있으며, 저장된 내용이 손실되지 않는다",
      "기안 상신 시 담당 팀장에게 결재 요청 알림이 자동 발송된다",
    ],
  },
  {
    name: "결재권자가 모바일에서도 예산 기안을 검토하고 승인 또는 반려할 수 있다",
    persona: "부서장 (결재권자)",
    scenario:
      "결재권자는 사무실 이외 장소에서도 대기 중인 결재 건을 신속히 처리해야 한다. 모바일 화면에서 기안 내용을 충분히 파악하고, 반려 시에는 명확한 사유를 기록하여 기안자가 재작성할 수 있도록 안내해야 한다.",
    ac: [
      "모바일 화면에서 기안 항목·금액·증감 사유를 가독성 있게 확인할 수 있다",
      "승인·반려 버튼이 시각적으로 명확히 구분되어 실수로 잘못 누르는 상황을 방지한다",
      "반려 시 사유(필수, 10자 이상)를 입력해야만 처리가 완료된다",
      "처리 완료 후 기안자에게 결과(승인/반려) 및 사유 알림이 실시간으로 전송된다",
    ],
  },
  {
    name: "경영진이 전사 예산 집행 현황을 한 화면에서 파악하고 이상 부서를 즉시 식별할 수 있다",
    persona: "경영진 (CXO·본부장)",
    scenario:
      "경영진은 매월 초 전월 예산 집행 실적을 별도 보고 자료 없이 시스템에서 직접 확인하고자 한다. 집행률 이상 징후가 있는 부서를 즉시 파악하고, 필요 시 상세 내역으로 드릴다운하여 원인을 추적할 수 있어야 한다.",
    ac: [
      "전사·본부·부서 단위 집행률을 시각적 차트와 수치로 동시에 표시한다",
      "집행률 80% 초과 또는 20% 미만 항목은 경고 색상으로 자동 구분 표시된다",
      "특정 부서 클릭 시 해당 부서의 항목별 상세 내역으로 드릴다운된다",
      "현재 조회 화면 데이터를 Excel 파일로 내보낼 수 있다",
    ],
  },
  {
    name: "시스템 관리자가 인사 이동한 직원의 접근 권한을 즉시 변경하고 감사 로그를 남길 수 있다",
    persona: "시스템 관리자",
    scenario:
      "조직 개편이나 인사 이동 시 직원의 부서가 변경되면, 이전 부서 데이터에 대한 접근 권한을 즉시 조정해야 한다. 처리가 지연될 경우 보안 위반 및 감사 지적 사항이 될 수 있으며, 모든 변경 이력은 추적 가능해야 한다.",
    ac: [
      "직원 검색 후 현재 보유 권한 목록을 즉시 확인할 수 있다",
      "개별 권한을 체크박스로 선택·해제하고 저장 한 번으로 일괄 반영할 수 있다",
      "권한 변경 내역은 변경자·변경 시각·변경 전후 내용과 함께 감사 로그에 기록된다",
      "변경 즉시 해당 직원의 세션에 반영되어 재로그인 없이도 새 권한이 적용된다",
    ],
  },
];

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/utils";
import { Plus, Search, Trash2, Lightbulb } from "lucide-react";
import { DataGrid } from "@/components/common/DataGrid";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { AutocompleteInput } from "@/components/common/AutocompleteInput";
import { AcceptanceCriteriaEditor } from "@/components/user-story/AcceptanceCriteriaEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { formatDate } from "@/lib/utils";
import type { ColumnDef } from "@tanstack/react-table";

interface UserStoryRow {
  userStoryId: number;
  systemId: string;
  name: string;
  persona: string | null;
  scenario: string | null;
  acceptanceCriteria: { text: string }[] | null;
  requirementId: number;
  requirement: { systemId: string; name: string };
  screenMapCount: number;
  acCount: number;
  updatedAt: string;
}

interface RequirementOption {
  requirementId: number;
  systemId: string;
  name: string;
}

export default function UserStoriesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterReqId, setFilterReqId] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<UserStoryRow | null>(null);
  const [deleteItem, setDeleteItem] = useState<UserStoryRow | null>(null);
  const [exampleOpen, setExampleOpen] = useState(false);

  // 폼 상태
  const [formReqId, setFormReqId] = useState<string>("");
  const [formName, setFormName] = useState("");
  const [formPersona, setFormPersona] = useState("");
  const [formScenario, setFormScenario] = useState("");
  const [formAc, setFormAc] = useState<string>("[]");

  // 요구사항 목록 (필터 + 등록 폼용)
  const { data: reqData } = useQuery({
    queryKey: ["requirements-simple"],
    queryFn: async () => {
      const res = await fetch("/api/requirements?pageSize=200");
      return res.json();
    },
  });
  const requirements: RequirementOption[] = reqData?.data ?? [];

  // 페르소나 제안 목록
  const { data: personasData } = useQuery({
    queryKey: ["user-story-personas"],
    queryFn: async () => {
      const res = await fetch("/api/user-stories/personas");
      return res.json();
    },
  });
  const personaSuggestions: string[] = personasData?.data ?? [];

  // 사용자 스토리 목록
  const { data, isLoading } = useQuery({
    queryKey: ["user-stories", page, search, filterReqId],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (search) params.set("search", search);
      if (filterReqId !== "all") params.set("requirementId", filterReqId);
      const res = await fetch(`/api/user-stories?${params}`);
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/user-stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-stories"] });
      queryClient.invalidateQueries({ queryKey: ["user-story-personas"] });
      toast.success("사용자 스토리가 등록되었습니다.");
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Record<string, unknown>) =>
      apiFetch(`/api/user-stories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-stories"] });
      queryClient.invalidateQueries({ queryKey: ["user-story-personas"] });
      toast.success("사용자 스토리가 수정되었습니다.");
      setDialogOpen(false);
      setEditItem(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/user-stories/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-stories"] });
      toast.success("삭제되었습니다.");
      setDeleteItem(null);
    },
  });

  const openCreate = () => {
    setEditItem(null);
    setFormReqId(filterReqId !== "all" ? filterReqId : "");
    setFormName("");
    setFormPersona("");
    setFormScenario("");
    setFormAc("[]");
    setDialogOpen(true);
  };

  const openEdit = (row: UserStoryRow) => {
    setEditItem(row);
    setFormReqId(String(row.requirementId));
    setFormName(row.name);
    setFormPersona(row.persona ?? "");
    setFormScenario(row.scenario ?? "");
    setFormAc(
      row.acceptanceCriteria ? JSON.stringify(row.acceptanceCriteria) : "[]"
    );
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formReqId || !formName.trim()) {
      toast.error("소속 요구사항과 사용자 스토리는 필수입니다.");
      return;
    }
    let acParsed: { text: string }[] | null = null;
    try {
      const parsed = JSON.parse(formAc);
      acParsed = Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
    } catch {
      acParsed = null;
    }

    const body = {
      requirementId: parseInt(formReqId),
      name: formName.trim(),
      persona: formPersona.trim() || null,
      scenario: formScenario.trim() || null,
      acceptanceCriteria: acParsed,
    };

    if (editItem) {
      updateMutation.mutate({ id: editItem.userStoryId, ...body });
    } else {
      createMutation.mutate(body);
    }
  };

  const columns: ColumnDef<UserStoryRow, unknown>[] = [
    { accessorKey: "systemId", header: "ID", size: 100 },
    { accessorKey: "name", header: "사용자 스토리", size: 350 },
    {
      accessorKey: "persona",
      header: "페르소나",
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">{(getValue() as string) ?? "-"}</span>
      ),
      size: 130,
    },
    {
      id: "requirementName",
      header: "요구사항",
      accessorFn: (row) => row.requirement ?? null,
      cell: ({ getValue }) => {
        const req = getValue() as { systemId: string; name: string } | null;
        if (!req) return <span className="text-muted-foreground">-</span>;
        return (
          <span className="text-muted-foreground truncate">
            <span className="text-foreground font-medium">{req.systemId}</span>{" "}
            {req.name}
          </span>
        );
      },
      size: 190,
    },
    {
      accessorKey: "screenMapCount",
      header: "매핑 화면",
      cell: ({ getValue }) => (
        <span className="text-center">{getValue() as number}</span>
      ),
      size: 80,
    },
    {
      accessorKey: "acCount",
      header: "AC",
      cell: ({ getValue }) => (
        <span className="text-center">{getValue() as number}</span>
      ),
      size: 60,
    },
    {
      accessorKey: "updatedAt",
      header: "수정일",
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">{formatDate(getValue() as string)}</span>
      ),
      size: 80,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            setDeleteItem(row.original);
          }}
        >
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      ),
      size: 50,
      enableSorting: false,
    },
  ];

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">사용자 스토리</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          스토리 등록
        </Button>
      </div>

      {/* 필터 영역 */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select
          value={filterReqId}
          onValueChange={(v) => {
            setFilterReqId(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="요구사항 전체" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">요구사항 전체</SelectItem>
            {requirements.map((r) => (
              <SelectItem key={r.requirementId} value={String(r.requirementId)}>
                {r.systemId} {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            placeholder="검색..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <DataGrid
        columns={columns}
        data={data?.data ?? []}
        onRowClick={openEdit}
        pagination={data?.pagination}
        onPageChange={setPage}
        emptyMessage={isLoading ? "로딩 중..." : "등록된 사용자 스토리가 없습니다."}
        dense={true}
      />

      {/* 등록/수정 다이얼로그 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[85vw] max-w-4xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-border">
            <div className="flex items-center justify-between pr-8">
              <DialogTitle>
                {editItem ? "사용자 스토리 수정" : "사용자 스토리 등록"}
              </DialogTitle>
              <button
                type="button"
                onClick={() => setExampleOpen(true)}
                className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 transition-colors cursor-pointer"
              >
                <Lightbulb className="h-3.5 w-3.5" />
                작성 예시 보기
              </button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* 1행: 소속 요구사항 + 페르소나 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">소속 요구사항 *</Label>
                <Select
                  value={formReqId}
                  onValueChange={setFormReqId}
                  disabled={false}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="요구사항 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {requirements.map((r) => (
                      <SelectItem key={r.requirementId} value={String(r.requirementId)}>
                        {r.systemId} {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">페르소나</Label>
                <AutocompleteInput
                  value={formPersona}
                  onChange={setFormPersona}
                  suggestions={personaSuggestions}
                  placeholder="예: 예산 담당자"
                />
              </div>
            </div>

            {/* 2행: 사용자 스토리 (전체 너비) */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label className="text-sm">사용자 스토리 *</Label>
                <span className="text-xs text-muted-foreground">— "[페르소나]가 [목적]을 [할 수 있다]" 형식의 한 문장</span>
              </div>
              <Textarea
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="예: 예산 담당자가 신규 회계연도 예산안을 항목별로 편성하고 기안 상신할 수 있다"
                rows={2}
                className="resize-none"
              />
            </div>

            {/* 3행: 시나리오 */}
            <div className="space-y-1.5">
              <Label className="text-sm">시나리오</Label>
              <Textarea
                value={formScenario}
                onChange={(e) => setFormScenario(e.target.value)}
                placeholder="예: 예산 담당자는 새 회계연도를 위한 예산안을 작성하고 저장할 수 있다."
                rows={5}
              />
            </div>

            {/* 4행: 인수 조건 */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label className="text-sm">인수 조건 (Acceptance Criteria)</Label>
                <span className="text-xs text-muted-foreground">— 검사기준서에 활용됩니다.</span>
              </div>
              <AcceptanceCriteriaEditor value={formAc} onChange={setFormAc} />
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border flex-shrink-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "저장중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 작성 예시 다이얼로그 */}
      <Dialog open={exampleOpen} onOpenChange={setExampleOpen}>
        <DialogContent className="w-[90vw] max-w-5xl max-h-[88vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <DialogTitle>사용자 스토리 작성 예시</DialogTitle>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              사용자 스토리는 <span className="font-medium text-foreground">"[페르소나]가 [목적]을 위해 [기능]을 할 수 있다"</span> 형식으로 작성합니다.
              기능 명세서 항목이 아닌, <span className="font-medium text-foreground">실제 사용자의 업무 목적</span>에 초점을 맞춰주세요.
            </p>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {STORY_EXAMPLES.map((ex, i) => (
              <div key={i} className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="bg-muted/40 px-4 py-3 border-b border-border flex items-start gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                  <div>
                    <p className="font-semibold text-sm">{ex.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground">페르소나: <span className="text-foreground font-medium">{ex.persona}</span></span>
                    </div>
                  </div>
                </div>
                <div className="px-4 py-3 space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">시나리오</p>
                    <p className="text-sm leading-relaxed">{ex.scenario}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">인수 조건 (Acceptance Criteria)</p>
                    <ul className="space-y-1">
                      {ex.ac.map((item, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm">
                          <span className="shrink-0 w-4 h-4 rounded bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">{j + 1}</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-300 space-y-1">
              <p className="font-semibold">💡 정보공학방법론에서 애자일로 전환 시 흔한 실수</p>
              <ul className="space-y-0.5 text-xs mt-1 list-disc list-inside">
                <li>❌ "예산 항목 CRUD 기능" → ✅ "예산 담당자가 항목별 예산을 편성하고 수정할 수 있다"</li>
                <li>❌ "데이터 조회 API 구현" → ✅ "경영진이 월별 집행 현황을 한 화면에서 파악할 수 있다"</li>
                <li>❌ "권한 관리 모듈 설계" → ✅ "관리자가 인사 이동 시 권한을 즉시 변경할 수 있다"</li>
              </ul>
            </div>
          </div>
          <div className="flex-shrink-0 px-6 py-4 border-t border-border flex justify-end">
            <Button onClick={() => setExampleOpen(false)}>확인</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 */}
      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={() => setDeleteItem(null)}
        title="사용자 스토리 삭제"
        description={
          <div className="space-y-2">
            <p>"{deleteItem?.name}"을(를) 삭제하시겠습니까?</p>
            <p className="text-muted-foreground">이 스토리와 화면 매핑 정보만 삭제되며, 화면·기능 등 다른 데이터는 영향받지 않습니다.</p>
          </div>
        }
        variant="destructive"
        confirmLabel="삭제"
        onConfirm={() => deleteItem && deleteMutation.mutate(deleteItem.userStoryId)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
