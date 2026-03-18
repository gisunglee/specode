"use client";

import { useState, useEffect, useRef, useCallback, isValidElement, Children } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  X,
  Zap,
  Save,
  Trash2,
  CheckCircle,
  Circle,
  ArrowLeft,
  Loader2,
  Maximize2,
  Copy,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { apiFetch } from "@/lib/utils";
import { MermaidRenderer } from "@/components/common/MermaidRenderer";
import { VersionButtons } from "@/components/common/VersionButtons";
import { MarkdownEditor } from "@/components/common/MarkdownEditor";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
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
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

const PLAN_TYPES = ["IA", "PROCESS", "MOCKUP", "ERD"] as const;
const PLAN_TYPE_COLORS: Record<string, string> = {
  IA:      "bg-blue-100 text-blue-700",
  PROCESS: "bg-amber-100 text-amber-700",
  MOCKUP:  "bg-purple-100 text-purple-700",
  ERD:     "bg-emerald-100 text-emerald-700",
};
const AI_STATUS_COLORS: Record<string, string> = {
  NONE:        "bg-muted text-muted-foreground",
  RUNNING:     "bg-blue-100 text-blue-700",
  SUCCESS:     "bg-green-100 text-green-700",
  AUTO_FIXED:  "bg-green-100 text-green-700",
  FAILED:      "bg-red-100 text-red-700",
  NEEDS_CHECK: "bg-amber-100 text-amber-700",
  WARNING:     "bg-amber-100 text-amber-700",
};

interface ReqMap {
  mapSn:   number;
  requirement: {
    requirementId: number;
    systemId:      string;
    name:          string;
    discussionMd:    string | null;
    priority:        string | null;
    originalContent: string | null;
    currentContent:  string | null;
    detailSpec:      string | null;
  };
}

interface PlanRefMap {
  mapSn:     number;
  refPlanSn: number;
}

interface RefPlanDetail {
  planSn:        number;
  planNm:        string;
  planType:      string | null;
  manualInfo:    string | null;
  resultContent: string | null;
  resultType:    string | null;
}

interface PrevDraft {
  planSn:        number;
  planNm:        string;
  resultContent: string | null;
  resultType:    string | null;
}

interface AiTask {
  aiTaskId:    number;
  taskStatus:  string;
  requestedAt: string;
}

interface DraftDetail {
  planSn:        number;
  planNm:        string;
  planType:      string | null;
  manualInfo:    string | null;
  comment:       string | null;
  resultContent: string | null;
  resultType:    string | null;
  groupUuid:     string;
  sortOrd:       number;
  isPicked:      boolean;
  reqMaps:       ReqMap[];
  planRefMaps:   PlanRefMap[];
  refPlanDetails: RefPlanDetail[];
  prevDraft:     PrevDraft | null;
  latestAiTask:  AiTask | null;
}

interface ReqSearchRow {
  requirementId: number;
  systemId:      string;
  name:          string;
}

interface PlanSearchRow {
  planSn:   number;
  planNm:   string;
  planType: string | null;
}

export default function PlanningCanvasPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const queryClient = useQueryClient();

  // 편집 상태
  const [planNm,     setPlanNm]     = useState("");
  const [planType,   setPlanType]   = useState<string>("IA");
  const [manualInfo, setManualInfo] = useState("");
  const [comment,    setComment]    = useState("");
  const [sortOrd,    setSortOrd]    = useState<number>(1);
  const [groupUuid,  setGroupUuid]  = useState("");

  // 그룹/순서 인라인 편집 팝오버
  const [groupEditOpen, setGroupEditOpen] = useState(false);
  const [editSortOrd,   setEditSortOrd]   = useState("");

  // 요구사항 검색
  const [reqSearch,      setReqSearch]      = useState("");
  const [reqSearchFocus, setReqSearchFocus] = useState(false);

  // 기획 참조 검색
  const [planRefSearch,      setPlanRefSearch]      = useState("");
  const [planRefSearchFocus, setPlanRefSearchFocus] = useState(false);

  // 요구사항 상세 팝업
  const [viewingReq, setViewingReq] = useState<ReqMap["requirement"] | null>(null);

  // 삭제 확인
  const [deleteOpen, setDeleteOpen] = useState(false);

  // 복제 다이얼로그
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [dupPlanNm,    setDupPlanNm]    = useState("");
  const [dupGroupUuid, setDupGroupUuid] = useState("");
  const [dupSortOrd,   setDupSortOrd]   = useState<number>(1);

  // Mermaid 전체화면 팝업
  const [mermaidDialogOpen, setMermaidDialogOpen] = useState(false);

  // AI 결과 로컬 편집 (버전 복원 또는 직접 수정)
  const [localResultContent, setLocalResultContent] = useState<string | null>(null);

  const debounceRef       = useRef<ReturnType<typeof setTimeout>>(undefined);
  const resultDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const { data, isLoading } = useQuery<{ data: DraftDetail }>({
    queryKey: ["planning-detail", id],
    queryFn: async () => {
      const res = await fetch(`/api/planning/${id}`);
      return res.json();
    },
  });

  const draft = data?.data;

  // 초기 로드 시 상태 동기화
  useEffect(() => {
    if (draft) {
      setPlanNm(draft.planNm);
      setPlanType(draft.planType ?? "IA");
      setManualInfo(draft.manualInfo ?? "");
      setComment(draft.comment ?? "");
      setSortOrd(draft.sortOrd);
      setGroupUuid(draft.groupUuid);
    }
  }, [draft?.planSn]);

  // AI 폴링: RUNNING 또는 NONE 상태면 3초마다 refetch
  useEffect(() => {
    const status = draft?.latestAiTask?.taskStatus;
    if (status === "RUNNING" || status === "NONE") {
      const interval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ["planning-detail", id] });
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [draft?.latestAiTask?.taskStatus, id, queryClient]);

  const saveMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch(`/api/planning/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planning-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["planning"] });
    },
    onError: () => toast.error("저장에 실패했습니다."),
  });

  const makeMutation = useMutation({
    mutationFn: () => apiFetch(`/api/planning/${id}/make`, { method: "POST" }),
    onSuccess: () => {
      toast.success("AI 기획 요청이 등록되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["planning-detail", id] });
    },
    onError: () => toast.error("Make 요청에 실패했습니다."),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiFetch(`/api/planning/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("삭제되었습니다.");
      router.push("/planning");
    },
  });

  const duplicateMutation = useMutation<{ data: { planSn: number } }, Error, { planNm: string; groupUuid: string; sortOrd: number }>({
    mutationFn: (body) =>
      apiFetch(`/api/planning/${id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }) as Promise<{ data: { planSn: number } }>,
    onSuccess: (res) => {
      toast.success("복제되었습니다.");
      setDuplicateOpen(false);
      router.push(`/planning/${res.data.planSn}`);
    },
    onError: () => toast.error("복제에 실패했습니다."),
  });

  const handleDuplicateOpen = () => {
    setDupPlanNm(`${planNm} (복사)`);
    setDupGroupUuid(groupUuid);
    setDupSortOrd(sortOrd + 1);
    setDuplicateOpen(true);
  };

  const addReqMutation = useMutation({
    mutationFn: (requirementId: number) =>
      apiFetch(`/api/planning/${id}/req-map`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requirementId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planning-detail", id] });
      setReqSearch("");
    },
    onError: () => toast.error("이미 매핑된 요구사항입니다."),
  });

  const removeReqMutation = useMutation({
    mutationFn: (requirementId: number) =>
      apiFetch(`/api/planning/${id}/req-map?requirementId=${requirementId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["planning-detail", id] }),
  });

  const addPlanRefMutation = useMutation({
    mutationFn: (refPlanSn: number) =>
      apiFetch(`/api/planning/${id}/plan-ref-map`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refPlanSn }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planning-detail", id] });
      setPlanRefSearch("");
    },
    onError: () => toast.error("이미 추가된 기획입니다."),
  });

  const removePlanRefMutation = useMutation({
    mutationFn: (refPlanSn: number) =>
      apiFetch(`/api/planning/${id}/plan-ref-map?refPlanSn=${refPlanSn}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["planning-detail", id] }),
  });

  // 디바운스 자동 저장 (편집 필드)
  const scheduleSave = useCallback(
    (fields: Partial<{ planNm: string; planType: string; manualInfo: string; comment: string; sortOrd: number; groupUuid: string }>) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        saveMutation.mutate({
          planNm:     fields.planNm     ?? planNm,
          planType:   fields.planType   ?? planType,
          manualInfo: fields.manualInfo ?? manualInfo,
          comment:    fields.comment    ?? comment,
          sortOrd:    fields.sortOrd    ?? sortOrd,
          groupUuid:  fields.groupUuid  ?? groupUuid,
        });
      }, 1500);
    },
    [planNm, planType, manualInfo, comment, sortOrd, groupUuid, saveMutation]
  );

  // 디바운스 자동 저장 (AI 결과 직접 수정)
  const scheduleResultSave = useCallback(
    (content: string) => {
      if (resultDebounceRef.current) clearTimeout(resultDebounceRef.current);
      resultDebounceRef.current = setTimeout(() => {
        saveMutation.mutate({
          planNm, planType, manualInfo, comment, sortOrd, groupUuid,
          resultContent: content,
        });
      }, 1500);
    },
    [planNm, planType, manualInfo, comment, sortOrd, groupUuid, saveMutation]
  );

  const handleMake = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    saveMutation.mutate(
      { planNm, planType, manualInfo, comment, sortOrd, groupUuid },
      { onSuccess: () => makeMutation.mutate() }
    );
  };

  const handleSaveNow = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    saveMutation.mutate({ planNm, planType, manualInfo, comment, sortOrd, groupUuid });
    toast.success("저장되었습니다.");
  };

  const togglePicked = () => {
    saveMutation.mutate({ planNm, planType, manualInfo, comment, sortOrd, groupUuid, isPicked: !draft?.isPicked });
  };

  const handleGroupSave = () => {
    const newSort = parseInt(editSortOrd);
    if (isNaN(newSort) || newSort < 1) { toast.error("순서는 1 이상의 숫자입니다."); return; }
    setSortOrd(newSort);
    saveMutation.mutate({ planNm, planType, manualInfo, comment, sortOrd: newSort, groupUuid });
    toast.success("그룹/순서가 저장되었습니다.");
    setGroupEditOpen(false);
  };

  // 요구사항 검색 (포커스만 해도 최근 10건 표시, 입력 시 필터)
  const { data: reqSearchData } = useQuery({
    queryKey: ["req-search", reqSearch],
    queryFn: async () => {
      const params = new URLSearchParams({ pageSize: "10" });
      if (reqSearch.trim()) params.set("search", reqSearch.trim());
      const res = await fetch(`/api/requirements?${params}`);
      return res.json();
    },
    enabled: reqSearchFocus,
    staleTime: 5000,
  });
  const reqSearchResults: ReqSearchRow[] = reqSearchData?.data ?? [];

  // 기획 보드 검색 (포커스 시 최근 10건, 입력 시 필터)
  const { data: planRefSearchData } = useQuery({
    queryKey: ["plan-ref-search", planRefSearch],
    queryFn: async () => {
      const params = new URLSearchParams({ pageSize: "10" });
      if (planRefSearch.trim()) params.set("search", planRefSearch.trim());
      const res = await fetch(`/api/planning?${params}`);
      return res.json();
    },
    enabled: planRefSearchFocus,
    staleTime: 5000,
  });
  const planRefSearchResults: PlanSearchRow[] = (planRefSearchData?.data ?? []).filter(
    (p: PlanSearchRow) => p.planSn !== parseInt(id)
  );

  // 이미 참조된 기획 SN 목록
  const mappedRefPlanSns = new Set(draft?.planRefMaps.map((m) => m.refPlanSn) ?? []);

  // 이미 매핑된 요구사항 ID 목록
  const mappedReqIds = new Set(draft?.reqMaps.map((m) => m.requirement.requirementId) ?? []);

  const aiTaskStatus = draft?.latestAiTask?.taskStatus;
  const isAiRunning  = aiTaskStatus === "RUNNING" || aiTaskStatus === "NONE";

  // 현재 표시할 resultContent (직접 수정 또는 버전 복원 시 오버라이드)
  const displayResultContent = localResultContent ?? draft?.resultContent ?? "";
  const displayResultType    = draft?.resultType ?? "MD";

  if (isLoading) {
    return (
      <div className="-m-6 h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="-m-6 h-screen flex items-center justify-center text-muted-foreground">
        기획을 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="-m-6 h-screen flex flex-col overflow-hidden bg-background">

      {/* ─── 헤더 ──────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 h-12 border-b border-border flex items-center gap-3 px-4">
        <Link href="/planning" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>

        {/* 기획명 인라인 편집 */}
        <input
          value={planNm}
          onChange={(e) => {
            setPlanNm(e.target.value);
            scheduleSave({ planNm: e.target.value });
          }}
          className="flex-1 min-w-0 bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none text-sm font-semibold placeholder:text-muted-foreground transition-colors"
          placeholder="기획명을 입력하세요"
        />

        {/* 타입 */}
        <Select
          value={planType ?? "IA"}
          onValueChange={(v) => { setPlanType(v); scheduleSave({ planType: v }); }}
        >
          <SelectTrigger className="h-7 w-36 text-xs border-dashed">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLAN_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded mr-1 ${PLAN_TYPE_COLORS[t]}`}>{t}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 그룹/순서 — 클릭 시 인라인 편집 */}
        <div className="relative hidden md:block">
          <button
            type="button"
            onClick={() => { setEditSortOrd(String(sortOrd)); setGroupEditOpen((v) => !v); }}
            className="text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted px-1.5 py-0.5 rounded transition-colors"
            title="그룹/순서 수정"
          >
            {groupUuid.slice(0, 8)} #{sortOrd}
          </button>
          {groupEditOpen && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-popover border border-border rounded-md shadow-lg p-3 w-72 space-y-3">
              <p className="text-xs font-semibold">그룹 / 순서 수정</p>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">그룹 UUID</label>
                <input
                  value={groupUuid}
                  onChange={(e) => setGroupUuid(e.target.value)}
                  className="w-full h-7 px-2 text-xs font-mono rounded border border-border bg-background outline-none focus:border-primary"
                  placeholder="UUID"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">순서</label>
                <input
                  type="number"
                  min={1}
                  value={editSortOrd}
                  onChange={(e) => setEditSortOrd(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGroupSave()}
                  className="w-full h-7 px-2 text-xs rounded border border-border bg-background outline-none focus:border-primary"
                  placeholder="1"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setGroupEditOpen(false)}
                  className="text-xs px-2.5 py-1 rounded border border-border hover:bg-muted transition-colors"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleGroupSave}
                  className="text-xs px-2.5 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  저장
                </button>
              </div>
            </div>
          )}
        </div>

        {/* AI 상태 */}
        {aiTaskStatus && (
          <span className={`text-xs px-2 py-0.5 rounded font-medium flex items-center gap-1 ${AI_STATUS_COLORS[aiTaskStatus] ?? ""}`}>
            {isAiRunning && <Loader2 className="h-3 w-3 animate-spin" />}
            {aiTaskStatus}
          </span>
        )}

        <div className="flex items-center gap-1.5 ml-auto">
          {/* 확정 토글 */}
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 gap-1 text-xs ${draft.isPicked ? "text-green-600" : "text-muted-foreground"}`}
            onClick={togglePicked}
            disabled={saveMutation.isPending}
          >
            {draft.isPicked ? <CheckCircle className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
            {draft.isPicked ? "확정" : "미확정"}
          </Button>

          {/* 저장 */}
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={handleSaveNow} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            저장
          </Button>

          {/* Make */}
          <Button size="sm" className="h-7 gap-1 text-xs" onClick={handleMake} disabled={makeMutation.isPending || isAiRunning}>
            {makeMutation.isPending || isAiRunning ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5" />
            )}
            Make
          </Button>

          {/* 복제 */}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDuplicateOpen} title="복제">
            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>

          {/* 삭제 */}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* ─── 2-Pane Body ────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left: 컨텍스트 + 에디터 */}
        <div className="w-[55%] border-r border-border flex flex-col overflow-hidden">

          {/* 요구사항 컨텍스트 (상단 고정) */}
          <div className="flex-shrink-0 border-b border-border px-4 py-3 space-y-2 bg-muted/20">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-muted-foreground shrink-0">요구사항 컨텍스트</span>
              <div className="relative flex-1 max-w-xs">
                <Input
                  value={reqSearch}
                  onChange={(e) => setReqSearch(e.target.value)}
                  onFocus={() => setReqSearchFocus(true)}
                  onBlur={() => setTimeout(() => setReqSearchFocus(false), 200)}
                  placeholder="요구사항 추가 검색..."
                  className="h-6 text-xs"
                />
                {reqSearchFocus && (
                  <div className="absolute top-full left-0 right-0 z-50 bg-popover border border-border rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                    {reqSearchResults
                      .filter((r) => !mappedReqIds.has(r.requirementId))
                      .map((r) => (
                        <button
                          key={r.requirementId}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors"
                          onMouseDown={() => addReqMutation.mutate(r.requirementId)}
                        >
                          <span className="font-mono text-primary mr-1">{r.systemId}</span>
                          <span>{r.name}</span>
                        </button>
                      ))}
                    {reqSearchResults.filter((r) => !mappedReqIds.has(r.requirementId)).length === 0 && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        {reqSearchResults.length > 0 ? "이미 모두 추가됨" : "검색 결과가 없습니다"}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 요구사항 칩 목록 */}
            <div className="flex flex-wrap gap-1.5 min-h-[1.75rem]">
              {draft.reqMaps.length === 0 ? (
                <span className="text-xs text-muted-foreground">위 검색으로 요구사항을 추가하세요</span>
              ) : (
                draft.reqMaps.map((map) => (
                  <span
                    key={map.mapSn}
                    className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs border border-border/50"
                  >
                    <button
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                      onClick={() => setViewingReq(map.requirement)}
                      title="클릭하면 협의 내용 보기"
                    >
                      <span className="font-mono text-primary text-[10px]">{map.requirement.systemId}</span>
                      <span className="max-w-[140px] truncate">{map.requirement.name}</span>
                    </button>
                    <button
                      onClick={() => removeReqMutation.mutate(map.requirement.requirementId)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* 기획 참조 컨텍스트 */}
          <div className="flex-shrink-0 border-b border-border px-4 py-3 space-y-2 bg-muted/10">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-muted-foreground shrink-0">기획 참조</span>
              <div className="relative flex-1 max-w-xs">
                <Input
                  value={planRefSearch}
                  onChange={(e) => setPlanRefSearch(e.target.value)}
                  onFocus={() => setPlanRefSearchFocus(true)}
                  onBlur={() => setTimeout(() => setPlanRefSearchFocus(false), 200)}
                  placeholder="참조할 기획 보드 검색..."
                  className="h-6 text-xs"
                />
                {planRefSearchFocus && (
                  <div className="absolute top-full left-0 right-0 z-50 bg-popover border border-border rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                    {planRefSearchResults
                      .filter((p) => !mappedRefPlanSns.has(p.planSn))
                      .map((p) => (
                        <button
                          key={p.planSn}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors"
                          onMouseDown={() => addPlanRefMutation.mutate(p.planSn)}
                        >
                          {p.planType && (
                            <span className={`text-[10px] font-medium px-1 py-0.5 rounded mr-1.5 ${PLAN_TYPE_COLORS[p.planType] ?? "bg-muted text-muted-foreground"}`}>
                              {p.planType}
                            </span>
                          )}
                          <span>{p.planNm}</span>
                        </button>
                      ))}
                    {planRefSearchResults.filter((p) => !mappedRefPlanSns.has(p.planSn)).length === 0 && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        {planRefSearchResults.length > 0 ? "이미 모두 추가됨" : "검색 결과가 없습니다"}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 참조 기획 칩 목록 */}
            <div className="flex flex-wrap gap-1.5 min-h-[1.75rem]">
              {(draft.planRefMaps.length === 0) ? (
                <span className="text-xs text-muted-foreground">검색으로 기획 결과물을 Make 컨텍스트에 추가하세요</span>
              ) : (
                draft.refPlanDetails
                  .sort((a, b) => {
                    const ai = draft.planRefMaps.findIndex((m) => m.refPlanSn === a.planSn);
                    const bi = draft.planRefMaps.findIndex((m) => m.refPlanSn === b.planSn);
                    return ai - bi;
                  })
                  .map((p) => (
                    <span
                      key={p.planSn}
                      className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs border border-border/50"
                    >
                      {p.planType && (
                        <span className={`text-[10px] font-medium px-1 py-0.5 rounded ${PLAN_TYPE_COLORS[p.planType] ?? ""}`}>
                          {p.planType}
                        </span>
                      )}
                      <span className="max-w-[160px] truncate">{p.planNm}</span>
                      <button
                        onClick={() => removePlanRefMutation.mutate(p.planSn)}
                        className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))
              )}
            </div>
          </div>

          {/* 에디터 (스크롤 가능) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* 이전 기획 링크 */}
            {draft.prevDraft && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" />
                이전:
                <Link href={`/planning/${draft.prevDraft.planSn}`} className="text-primary hover:underline">
                  {draft.prevDraft.planNm}
                </Link>
              </div>
            )}

            {/* 상세 아이디어 — MarkdownEditor */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                상세 아이디어 <span className="text-primary">(AI 1순위 참조)</span>
              </Label>
              <MarkdownEditor
                value={manualInfo}
                onChange={(v) => {
                  setManualInfo(v);
                  scheduleSave({ manualInfo: v });
                }}
                placeholder="이 화면/프로세스에서 다루고자 하는 주요 기능, 흐름, 데이터 항목, 예외 케이스 등을 자유롭게 작성하세요. AI가 가장 먼저 참조합니다."
                rows={17}
              />
            </div>

            {/* AI 지시사항 */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">AI 지시사항 (comment)</Label>
              <Textarea
                value={comment}
                onChange={(e) => {
                  setComment(e.target.value);
                  scheduleSave({ comment: e.target.value });
                }}
                placeholder="예: '이전 화면과 동일한 레이아웃 구조로', '버튼 위치를 오른쪽 하단에', 'Mermaid 시퀀스 다이어그램으로 표현'"
                className="resize-none text-sm h-40"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Right: Preview Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs defaultValue="preview" className="flex flex-col h-full">
            <div className="flex-shrink-0 flex items-center gap-2 px-4 pt-3 pb-0 border-b border-border">
              <TabsList className="h-7">
                <TabsTrigger value="preview" className="text-xs h-6 px-3">미리보기</TabsTrigger>
                <TabsTrigger value="raw" className="text-xs h-6 px-3">원문 편집</TabsTrigger>
              </TabsList>
              {displayResultContent && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  title="전체화면으로 보기"
                  onClick={() => setMermaidDialogOpen(true)}
                >
                  <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              )}
              <div className="ml-auto">
                <VersionButtons
                  refTableName="tb_planning_draft"
                  refPkId={draft.planSn}
                  fieldName="result_content"
                  currentContent={draft.resultContent ?? ""}
                  onVersionSelect={(content) => setLocalResultContent(content)}
                />
              </div>
            </div>

            <TabsContent value="preview" className="flex-1 overflow-auto m-0 p-4">
              {!displayResultContent ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  <div className="text-center space-y-2">
                    <Zap className="h-8 w-8 mx-auto opacity-30" />
                    <p>Make를 클릭하면 AI가 결과를 생성합니다</p>
                    <p className="text-xs opacity-70">
                      {planType === "IA"      && "IA → Markdown 문서"}
                      {planType === "PROCESS" && "PROCESS → Mermaid 다이어그램"}
                      {planType === "MOCKUP"  && "MOCKUP → HTML/Tailwind 목업"}
                      {planType === "ERD"     && "ERD → Mermaid erDiagram"}
                    </p>
                  </div>
                </div>
              ) : displayResultType === "HTML" ? (
                <iframe
                  srcDoc={displayResultContent}
                  sandbox="allow-scripts allow-same-origin"
                  className="w-full h-full border-0 rounded"
                  title="HTML Preview"
                />
              ) : displayResultType === "MERMAID" ? (
                <MermaidRenderer code={displayResultContent} />
              ) : (
                <div className="prose prose-sm max-w-none text-sm">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      pre({ children }) {
                        for (const child of Children.toArray(children)) {
                          if (!isValidElement(child)) continue;
                          const p = child.props as { className?: string; children?: unknown };
                          const lang = /language-(\w+)/.exec(p.className || "")?.[1];
                          if (lang === "mermaid") {
                            return <MermaidRenderer code={String(p.children).trim()} />;
                          }
                        }
                        return <pre>{children}</pre>;
                      },
                    }}
                  >
                    {displayResultContent}
                  </ReactMarkdown>
                </div>
              )}
            </TabsContent>

            <TabsContent value="raw" className="flex-1 overflow-hidden m-0 p-4">
              <Textarea
                value={displayResultContent}
                onChange={(e) => {
                  setLocalResultContent(e.target.value);
                  scheduleResultSave(e.target.value);
                }}
                placeholder="AI 결과가 여기에 표시됩니다. 직접 수정할 수 있습니다."
                className="h-full resize-none font-mono text-xs leading-relaxed"
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ─── 요구사항 상세 팝업 ────────────────────────────────────── */}
      <Dialog open={!!viewingReq} onOpenChange={() => setViewingReq(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-border flex-shrink-0">
            <DialogTitle className="text-sm font-semibold">
              <span className="font-mono text-primary mr-2">{viewingReq?.systemId}</span>
              {viewingReq?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* 요구사항 원문 */}
            {(viewingReq?.originalContent || viewingReq?.currentContent) && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground">
                  {viewingReq.currentContent ? "최종본 (current_content)" : "원문 (original_content)"}
                </p>
                <div className="prose prose-sm max-w-none text-sm border border-border/50 rounded-md px-4 py-3 bg-muted/20 whitespace-pre-wrap">
                  {viewingReq.currentContent ?? viewingReq.originalContent}
                </div>
              </div>
            )}

            {/* 요구사항 명세서 */}
            {viewingReq?.detailSpec ? (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground">명세서 (detail_spec)</p>
                <div className="prose prose-sm max-w-none text-sm border border-border/50 rounded-md px-4 py-3 bg-muted/20 whitespace-pre-wrap">
                  {viewingReq.detailSpec}
                </div>
              </div>
            ) : null}

            {/* 상세 협의 내용 */}
            <MarkdownEditor
              value={viewingReq?.discussionMd || ""}
              readOnly
              label="상세 협의 내용 (AI 참조용)"
              placeholder="등록된 협의 내용이 없습니다."
              rows={10}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Mermaid 전체화면 팝업 ─────────────────────────────────── */}
      <Dialog open={mermaidDialogOpen} onOpenChange={setMermaidDialogOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 py-3 border-b border-border flex-shrink-0">
            <DialogTitle className="text-sm">{draft?.planNm} — 전체보기</DialogTitle>
          </DialogHeader>
          <div className={`flex-1 overflow-auto ${displayResultType === "HTML" ? "p-0" : "p-4"}`}>
            {displayResultType === "HTML" ? (
              <iframe
                srcDoc={displayResultContent}
                sandbox="allow-scripts allow-same-origin"
                className="w-full border-0"
                style={{ height: "calc(95vh - 60px)" }}
                title="HTML Preview"
              />
            ) : displayResultType === "MERMAID" ? (
              <MermaidRenderer code={displayResultContent} />
            ) : (
              <div className="prose prose-sm max-w-none text-sm">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    pre({ children }) {
                      for (const child of Children.toArray(children)) {
                        if (!isValidElement(child)) continue;
                        const p = child.props as { className?: string; children?: unknown };
                        const lang = /language-(\w+)/.exec(p.className || "")?.[1];
                        if (lang === "mermaid") {
                          return <MermaidRenderer code={String(p.children).trim()} />;
                        }
                      }
                      return <pre>{children}</pre>;
                    },
                  }}
                >
                  {displayResultContent}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── 복제 다이얼로그 ────────────────────────────────────────── */}
      <Dialog open={duplicateOpen} onOpenChange={setDuplicateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">복제하시겠습니까? 정보를 입력해 주세요</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs">기획명</Label>
              <Input
                value={dupPlanNm}
                onChange={(e) => setDupPlanNm(e.target.value)}
                className="h-8 text-sm"
                placeholder="기획명"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">그룹</Label>
              <Input
                value={dupGroupUuid}
                onChange={(e) => setDupGroupUuid(e.target.value)}
                className="h-8 text-sm font-mono"
                placeholder="그룹 UUID"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">순서</Label>
              <Input
                type="number"
                min={1}
                value={dupSortOrd}
                onChange={(e) => setDupSortOrd(parseInt(e.target.value) || 1)}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDuplicateOpen(false)}>
              취소
            </Button>
            <Button
              size="sm"
              onClick={() => duplicateMutation.mutate({ planNm: dupPlanNm, groupUuid: dupGroupUuid, sortOrd: dupSortOrd })}
              disabled={!dupPlanNm.trim() || duplicateMutation.isPending}
            >
              {duplicateMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              확인
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── 삭제 확인 ─────────────────────────────────────────────── */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="기획 삭제"
        description={`"${draft.planNm}"을(를) 삭제하시겠습니까? 요구사항 매핑도 함께 삭제됩니다.`}
        variant="destructive"
        confirmLabel="삭제"
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
