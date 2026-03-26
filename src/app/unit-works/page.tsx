"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Monitor, LayoutDashboard, Upload, FileText, Copy, Check, Download } from "lucide-react";
import { DataGrid } from "@/components/common/DataGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";

interface UnitWorkRow {
  unitWorkId:    number;
  systemId:      string;
  name:          string;
  description:   string | null;
  sortOrder:     number;
  screenCount:   number;
  updatedAt:     string;
  requirement:   { systemId: string; name: string };
  requirementId: number;
}

interface RequirementOption {
  requirementId: number;
  systemId:      string;
  name:          string;
}

export default function UnitWorksPage() {
  const router       = useRouter();
  const queryClient  = useQueryClient();
  const [search, setSearch]         = useState("");
  const [filterReqId, setFilterReqId] = useState("all");
  const [dialogOpen, setDialogOpen]   = useState(false);
  const [editItem, setEditItem]       = useState<UnitWorkRow | null>(null);
  const [deleteItem, setDeleteItem]   = useState<UnitWorkRow | null>(null);

  // 설계 다운로드 범위 선택
  const [dlMenuOpen,    setDlMenuOpen]    = useState(false);
  const [dlPickOpen,    setDlPickOpen]    = useState(false);
  const [dlSelected,    setDlSelected]    = useState<Set<number>>(new Set());
  const [dlContentMode, setDlContentMode] = useState<"title" | "content">("content");
  const [dlInclude,     setDlInclude]     = useState({ screen: true, area: true, func: true });
  const toggleDlInclude = (key: keyof typeof dlInclude) =>
    setDlInclude(prev => ({ ...prev, [key]: !prev[key] }));

  // 단위업무 목록 다운로드
  const [uwDlMenuOpen, setUwDlMenuOpen] = useState(false);

  const handleStructureCopy = async () => {
    setUwDlMenuOpen(false);
    try {
      const screenRes = await fetch("/api/screens?pageSize=2000").then((r) => r.json());
      const allScreens: Array<{ systemId: string; name: string; unitWorkId: number }> = screenRes.data ?? [];

      const lines = rows.map((uw) => {
        const screens = allScreens.filter((s) => s.unitWorkId === uw.unitWorkId);
        const right = screens.length > 0
          ? screens.map((s) => `[${s.systemId}] ${s.name}`).join(", ")
          : "(화면 없음)";
        return `[${uw.systemId}] ${uw.name} (${uw.requirement.systemId}) -> ${right}`;
      });

      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("구조 텍스트가 클립보드에 복사되었습니다.");
    } catch {
      toast.error("복사에 실패했습니다.");
    }
  };

  const handleUwDownload = (withDesc: boolean) => {
    setUwDlMenuOpen(false);
    const date = new Date().toISOString().slice(0, 10);
    const lines: string[] = [
      `# 단위업무 목록`,
      `> 총 ${rows.length}개 · ${date}`,
      "",
    ];
    for (const uw of rows) {
      if (withDesc) {
        lines.push(`## ${uw.systemId} ${uw.name}`);
        lines.push(`> 요구사항: ${uw.requirement.systemId} ${uw.requirement.name}`);
        if (uw.description) lines.push(`\n${uw.description}`);
        lines.push("");
      } else {
        lines.push(`- ${uw.systemId} ${uw.name}`);
      }
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `단위업무_목록_${date}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`단위업무 목록 다운로드 완료 (${withDesc ? "이름+설명" : "이름만"})`);
  };

  // 설계 컨텍스트 팝업
  const [ctxOpen,    setCtxOpen]    = useState(false);
  const [ctxLoading, setCtxLoading] = useState(false);
  const [ctxMd,      setCtxMd]      = useState("");
  const [ctxTitle,   setCtxTitle]   = useState("");
  const [copied,     setCopied]     = useState(false);

  const openCtx = async (row: UnitWorkRow) => {
    setCtxTitle(`${row.systemId} ${row.name}`);
    setCtxMd("");
    setCtxOpen(true);
    setCtxLoading(true);
    try {
      const [reqRes, storyRes] = await Promise.all([
        fetch(`/api/requirements/${row.requirementId}`).then((r) => r.json()),
        fetch(`/api/user-stories?requirementId=${row.requirementId}&pageSize=100`).then((r) => r.json()),
      ]);
      const req    = reqRes.data;
      const stories: Array<{ systemId: string; name: string; persona?: string; scenario?: string; acceptanceCriteria?: Array<{ text: string }> }> = storyRes.data ?? [];

      const lines: string[] = [];

      // 1. 단위업무
      lines.push(`# 단위업무: ${row.systemId} ${row.name}`);
      if (row.description) lines.push(`\n> ${row.description}`);
      lines.push("");

      // 2. 연결 요구사항
      lines.push(`## 요구사항: ${req.systemId} ${req.name}`);
      lines.push("");

      const finalContent = req.currentContent ?? req.originalContent;
      if (finalContent) {
        lines.push("### 최종본");
        lines.push("");
        lines.push(finalContent);
        lines.push("");
      }

      if (req.detailSpec) {
        lines.push("### 요구사항 명세서");
        lines.push("");
        lines.push(req.detailSpec);
        lines.push("");
      }

      if (req.discussionMd) {
        lines.push("### 상세 협의 내용 (AI 참조용)");
        lines.push("");
        lines.push(req.discussionMd);
        lines.push("");
      }

      // 3. 사용자 스토리
      if (stories.length > 0) {
        lines.push("## 사용자 스토리");
        lines.push("");
        for (const s of stories) {
          lines.push(`### ${s.systemId} ${s.name}`);
          if (s.persona) lines.push(`- **페르소나**: ${s.persona}`);
          if (s.scenario) {
            lines.push("");
            lines.push(s.scenario);
          }
          if (s.acceptanceCriteria && s.acceptanceCriteria.length > 0) {
            lines.push("");
            lines.push("**인수 조건**");
            for (const ac of s.acceptanceCriteria) {
              lines.push(`- ${ac.text}`);
            }
          }
          lines.push("");
        }
      }

      setCtxMd(lines.join("\n"));
    } catch {
      toast.error("컨텍스트를 불러오지 못했습니다.");
      setCtxOpen(false);
    } finally {
      setCtxLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(ctxMd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 단위+화면+영역+기능 다운로드
  const handleFullDownload = async (row: UnitWorkRow) => {
    try {
      const [screenRes, areaRes, funcRes] = await Promise.all([
        fetch(`/api/screens?unitWorkId=${row.unitWorkId}&pageSize=200`).then((r) => r.json()),
        fetch(`/api/areas?unitWorkId=${row.unitWorkId}&pageSize=500`).then((r) => r.json()),
        fetch(`/api/functions?unitWorkId=${row.unitWorkId}&pageSize=500`).then((r) => r.json()),
      ]);

      const screens: Array<{ screenId: number; systemId: string; name: string; description?: string; categoryL?: string; categoryM?: string }> = screenRes.data ?? [];
      const areas:   Array<{ areaId: number; areaCode: string; name: string; areaType?: string; spec?: string; screenId: number }> = areaRes.data ?? [];
      const funcs:   Array<{ functionId: number; systemId: string; name: string; spec?: string; description?: string; area: { areaId: number } }> = funcRes.data ?? [];

      const lines: string[] = [];

      lines.push(`# ${row.systemId} ${row.name}`);
      if (row.description) lines.push(`\n> ${row.description}`);
      lines.push(`\n총 화면 ${screens.length}개 · 영역 ${areas.length}개 · 기능 ${funcs.length}개`);
      lines.push("\n---\n");

      for (const screen of screens) {
        const screenAreas = areas.filter((a) => a.screenId === screen.screenId);
        const cat = [screen.categoryL, screen.categoryM].filter(Boolean).join(" > ");

        lines.push(`## ${screen.systemId} ${screen.name}`);
        if (cat) lines.push(`> 분류: ${cat}`);
        if (screen.description) lines.push(`> ${screen.description}`);
        lines.push("");

        if (screenAreas.length === 0) {
          lines.push("_(등록된 영역 없음)_\n");
          continue;
        }

        for (const area of screenAreas) {
          const areaFuncs = funcs.filter((f) => f.area?.areaId === area.areaId);

          lines.push(`### ${area.areaCode} ${area.name}${area.areaType ? ` (${area.areaType})` : ""}`);
          if (area.spec) {
            lines.push("");
            lines.push(area.spec);
          }
          lines.push("");

          if (areaFuncs.length === 0) {
            lines.push("_(등록된 기능 없음)_\n");
            continue;
          }

          for (const fn of areaFuncs) {
            lines.push(`#### ${fn.systemId} ${fn.name}`);
            if (fn.description) lines.push(`> ${fn.description}`);
            if (fn.spec) {
              lines.push("");
              lines.push(fn.spec);
            }
            lines.push("");
          }
        }

        lines.push("---\n");
      }

      const md = lines.join("\n");
      const blob = new Blob(["\uFEFF" + md], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${row.systemId}_${row.name}.md`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("다운로드 완료");
    } catch {
      toast.error("다운로드 중 오류가 발생했습니다.");
    }
  };

  // 전체 단위업무 일괄 다운로드
  const [fullDownloading, setFullDownloading] = useState(false);

  const handleAllDownload = async (targetRows: UnitWorkRow[], withContent = true) => {
    setFullDownloading(true);
    setDlPickOpen(false);
    setDlMenuOpen(false);
    try {
      const [uwRes, areaRes, funcRes] = await Promise.all([
        fetch(`/api/screens?pageSize=2000`).then((r) => r.json()),
        fetch(`/api/areas?pageSize=5000`).then((r) => r.json()),
        fetch(`/api/functions?pageSize=5000`).then((r) => r.json()),
      ]);

      const allScreens: Array<{ screenId: number; systemId: string; name: string; description?: string; categoryL?: string; categoryM?: string; unitWorkId?: number }> = uwRes.data ?? [];
      const allAreas:   Array<{ areaId: number; areaCode: string; name: string; areaType?: string; spec?: string; screenId: number }> = areaRes.data ?? [];
      const allFuncs:   Array<{ functionId: number; systemId: string; name: string; spec?: string; description?: string; area: { areaId: number } }> = funcRes.data ?? [];

      const lines: string[] = [];
      lines.push(`# 단위업무 전체 설계서${withContent ? "" : " (제목 목록)"}`);
      lines.push(`> 총 ${targetRows.length}개 단위업무 · 생성일: ${new Date().toLocaleDateString("ko-KR")}`);
      lines.push("\n---\n");

      for (const uw of targetRows) {
        const screens = allScreens.filter((s) => s.unitWorkId === uw.unitWorkId);

        lines.push(`# ${uw.systemId} ${uw.name}`);
        if (withContent && uw.description) lines.push(`> ${uw.description}`);
        lines.push(`> 요구사항: ${uw.requirement.systemId} ${uw.requirement.name}`);
        lines.push(`> 화면 ${screens.length}개`);
        lines.push("");

        if (!dlInclude.screen || screens.length === 0) {
          if (dlInclude.screen && screens.length === 0) lines.push("_(등록된 화면 없음)_\n\n---\n");
          else lines.push("---\n");
          continue;
        }

        for (const screen of screens) {
          const screenAreas = allAreas.filter((a) => a.screenId === screen.screenId);
          const cat = [screen.categoryL, screen.categoryM].filter(Boolean).join(" > ");

          lines.push(`## ${screen.systemId} ${screen.name}`);
          if (cat) lines.push(`> 분류: ${cat}`);
          if (withContent && screen.description) lines.push(`> ${screen.description}`);
          lines.push("");

          if (!dlInclude.area || screenAreas.length === 0) {
            if (dlInclude.area && screenAreas.length === 0) lines.push("_(등록된 영역 없음)_\n");
            continue;
          }

          for (const area of screenAreas) {
            const areaFuncs = allFuncs.filter((f) => f.area?.areaId === area.areaId);

            lines.push(`### ${area.areaCode} ${area.name}${area.areaType ? ` (${area.areaType})` : ""}`);
            if (withContent && area.spec) { lines.push(""); lines.push(area.spec); }
            lines.push("");

            if (!dlInclude.func || areaFuncs.length === 0) {
              if (dlInclude.func && areaFuncs.length === 0) lines.push("_(등록된 기능 없음)_\n");
              continue;
            }

            for (const fn of areaFuncs) {
              lines.push(`#### ${fn.systemId} ${fn.name}`);
              if (withContent && fn.description) lines.push(`> ${fn.description}`);
              if (withContent && fn.spec) { lines.push(""); lines.push(fn.spec); }
              lines.push("");
            }
          }
        }

        lines.push("---\n");
      }

      const date = new Date().toISOString().slice(0, 10);
      const md = lines.join("\n");
      const blob = new Blob(["\uFEFF" + md], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `전체_단위업무_설계서_${withContent ? "내용포함" : "제목만"}_${date}.md`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`설계 다운로드 완료 (${withContent ? "내용까지" : "제목만"})`);
    } catch {
      toast.error("다운로드 중 오류가 발생했습니다.");
    } finally {
      setFullDownloading(false);
    }
  };

  // 일괄 업로드
  const [bulkOpen,    setBulkOpen]    = useState(false);
  const [bulkJson,    setBulkJson]    = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult,  setBulkResult]  = useState<{ created: number; updated: number; errors: string[] } | null>(null);

  // 단위업무 목록
  const { data, isLoading } = useQuery({
    queryKey: ["unit-works", search, filterReqId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search)                    params.set("search", search);
      if (filterReqId && filterReqId !== "all") params.set("requirementId", filterReqId);
      params.set("pageSize", "100");
      return apiFetch<{ data: UnitWorkRow[] }>(`/api/unit-works?${params}`);
    },
  });

  // 요구사항 목록 (필터용)
  const { data: reqData } = useQuery({
    queryKey: ["requirements-select"],
    queryFn: () => apiFetch<{ data: RequirementOption[] }>("/api/requirements?pageSize=200"),
  });

  const rows       = data?.data ?? [];
  const reqOptions = reqData?.data ?? [];

  // 생성/수정
  const saveMutation = useMutation({
    mutationFn: (body: object) => {
      if (editItem) {
        return apiFetch(`/api/unit-works/${editItem.unitWorkId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      return apiFetch("/api/unit-works", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      toast.success(editItem ? "수정되었습니다." : "단위업무가 등록되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["unit-works"] });
      setDialogOpen(false);
      setEditItem(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // 삭제
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/unit-works/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("삭제되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["unit-works"] });
      setDeleteItem(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const [formName, setFormName]           = useState("");
  const [formDesc, setFormDesc]           = useState("");
  const [formReqId, setFormReqId]         = useState("");
  const [formSortOrder, setFormSortOrder] = useState("0");

  const openCreate = () => {
    setEditItem(null);
    setFormName(""); setFormDesc(""); setFormReqId(""); setFormSortOrder("0");
    setDialogOpen(true);
  };

  const openEdit = (row: UnitWorkRow) => {
    setEditItem(row);
    setFormName(row.name);
    setFormDesc(row.description ?? "");
    setFormReqId(String(row.requirementId));
    setFormSortOrder(String(row.sortOrder));
    setDialogOpen(true);
  };

  const handleBulkUpload = async () => {
    setBulkResult(null);
    setBulkLoading(true);
    try {
      const items = JSON.parse(bulkJson);
      if (!Array.isArray(items)) throw new Error("JSON 배열이어야 합니다 ([ ... ]).");

      // 전체 단위업무 조회 (upsert 매칭용)
      const allRes = await apiFetch<{ data: UnitWorkRow[] }>("/api/unit-works?pageSize=9999");
      const allRows = allRes.data ?? [];

      let created = 0, updated = 0;
      const errors: string[] = [];

      for (const [i, item] of (items as Record<string, unknown>[]).entries()) {
        // requirementId 해결 (숫자 ID 또는 systemId 문자열)
        let reqId: number | null = null;
        if (item.requirementId) {
          reqId = parseInt(String(item.requirementId));
        } else if (item.requirementSystemId) {
          const found = reqOptions.find((r) => r.systemId === String(item.requirementSystemId));
          if (found) reqId = found.requirementId;
        }

        const name = String(item.name ?? "").trim();

        if (!reqId)  { errors.push(`[${i + 1}] 요구사항을 찾을 수 없습니다. (requirementId 또는 requirementSystemId 필요)`); continue; }
        if (!name)   { errors.push(`[${i + 1}] name이 비어있습니다.`); continue; }

        const body = {
          name,
          description:   item.description ?? null,
          requirementId: reqId,
          sortOrder:     parseInt(String(item.sortOrder ?? 0)) || 0,
        };

        try {
          const existing = allRows.find((r) => r.requirementId === reqId && r.name === name);
          if (existing) {
            await apiFetch(`/api/unit-works/${existing.unitWorkId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });
            updated++;
          } else {
            await apiFetch("/api/unit-works", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });
            created++;
          }
        } catch (e) {
          errors.push(`[${i + 1}] ${name}: ${(e as Error).message}`);
        }
      }

      setBulkResult({ created, updated, errors });
      queryClient.invalidateQueries({ queryKey: ["unit-works"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleSave = () => {
    if (!formName.trim()) { toast.error("단위업무명을 입력해주세요."); return; }
    if (!formReqId)       { toast.error("요구사항을 선택해주세요.");   return; }
    saveMutation.mutate({
      name:          formName.trim(),
      description:   formDesc.trim() || null,
      requirementId: parseInt(formReqId),
      sortOrder:     parseInt(formSortOrder) || 0,
    });
  };

  const columns: ColumnDef<UnitWorkRow>[] = [
    {
      id: "systemId",
      header: "ID",
      size: 90,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.original.systemId}</span>
      ),
    },
    {
      id: "requirement",
      header: "요구사항",
      size: 160,
      cell: ({ row }) => (
        <div className="flex flex-col min-w-0">
          <span className="font-mono text-[10px] text-primary leading-tight">{row.original.requirement.systemId}</span>
          <span className="text-xs text-muted-foreground truncate">{row.original.requirement.name}</span>
        </div>
      ),
    },
    {
      id: "name",
      header: "단위업무명",
      size: 200,
      cell: ({ row }) => (
        <span className="font-medium text-sm truncate block">{row.original.name}</span>
      ),
    },
    {
      id: "description",
      header: "설명",
      size: 300,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground truncate block">
          {row.original.description ?? "-"}
        </span>
      ),
    },
    {
      id: "screenCount",
      header: "화면",
      size: 60,
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">{row.original.screenCount}</span>
      ),
    },
    {
      id: "updatedAt",
      header: "수정일",
      size: 80,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{formatDate(row.original.updatedAt)}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      size: 150,
      cell: ({ row }) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            title="설계 컨텍스트 조회"
            onClick={() => openCtx(row.original)}
          >
            <FileText className="h-3.5 w-3.5 text-sky-500" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            title="단위+화면+영역+기능 다운로드"
            onClick={() => handleFullDownload(row.original)}
          >
            <Download className="h-3.5 w-3.5 text-emerald-500" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            title="화면 목록 보기"
            onClick={() => router.push(`/screens?unitWorkId=${row.original.unitWorkId}`)}
          >
            <Monitor className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            title="시스템 일괄 설계"
            onClick={() => router.push(`/bulk-design?unitWorkId=${row.original.unitWorkId}`)}
          >
            <LayoutDashboard className="h-3.5 w-3.5 text-violet-500" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => openEdit(row.original)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => setDeleteItem(row.original)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">단위업무</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            요구사항 하위 업무 단위 — 화면 묶음 · PRD 전송 기준
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* 단위업무 목록 다운로드 */}
          <div className="relative">
            <Button
              size="sm" variant="outline"
              disabled={rows.length === 0}
              onClick={() => { setUwDlMenuOpen((o) => !o); setDlMenuOpen(false); }}
            >
              <Download className="h-4 w-4 mr-1" />
              단위업무 다운로드 ▾
            </Button>
            {uwDlMenuOpen && (
              <div
                className="absolute right-0 top-full mt-1 z-50 w-44 rounded-md border border-border bg-card shadow-md py-1"
                onMouseLeave={() => setUwDlMenuOpen(false)}
              >
                <button
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                  onClick={() => handleUwDownload(false)}
                >
                  이름만
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                  onClick={() => handleUwDownload(true)}
                >
                  이름 + 설명
                </button>
                <div className="border-t border-border/60 my-1" />
                <button
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                  onClick={handleStructureCopy}
                >
                  구조 텍스트 복사
                </button>
              </div>
            )}
          </div>
          {/* 설계 다운로드 드롭다운 */}
          <div className="relative">
            <Button
              size="sm" variant="outline"
              disabled={fullDownloading || rows.length === 0}
              onClick={() => { setDlMenuOpen((o) => !o); setUwDlMenuOpen(false); }}
            >
              <Download className="h-4 w-4 mr-1" />
              {fullDownloading ? "다운로드 중..." : "설계 다운로드 ▾"}
            </Button>
            {dlMenuOpen && (
              <div
                className="absolute right-0 top-full mt-1 z-50 w-48 rounded-md border border-border bg-card shadow-md py-1"
                onMouseLeave={() => setDlMenuOpen(false)}
              >
                <p className="px-3 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">포함 수준</p>
                <div className="px-3 pb-2 flex flex-col gap-1">
                  {([
                    { key: "screen", label: "화면" },
                    { key: "area",   label: "영역" },
                    { key: "func",   label: "기능" },
                  ] as const).map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5"
                        checked={dlInclude[key]}
                        onChange={() => toggleDlInclude(key)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <div className="border-t border-border/60 my-1" />
                <p className="px-3 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">전체</p>
                <button
                  className="w-full text-left px-4 py-1.5 text-sm hover:bg-muted transition-colors"
                  onClick={() => { setDlMenuOpen(false); handleAllDownload(rows, false); }}
                >
                  제목만
                </button>
                <button
                  className="w-full text-left px-4 py-1.5 text-sm hover:bg-muted transition-colors"
                  onClick={() => { setDlMenuOpen(false); handleAllDownload(rows, true); }}
                >
                  내용까지
                </button>
                <div className="border-t border-border/60 my-1" />
                <p className="px-3 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">범위 선택</p>
                <button
                  className="w-full text-left px-4 py-1.5 text-sm hover:bg-muted transition-colors"
                  onClick={() => { setDlMenuOpen(false); setDlContentMode("title"); setDlSelected(new Set()); setDlPickOpen(true); }}
                >
                  제목만
                </button>
                <button
                  className="w-full text-left px-4 py-1.5 text-sm hover:bg-muted transition-colors"
                  onClick={() => { setDlMenuOpen(false); setDlContentMode("content"); setDlSelected(new Set()); setDlPickOpen(true); }}
                >
                  내용까지
                </button>
              </div>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={() => { setBulkJson(""); setBulkResult(null); setBulkOpen(true); }}>
            <Upload className="h-4 w-4 mr-1" /> 일괄 업로드
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> 단위업무 등록
          </Button>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-2">
        <Select value={filterReqId} onValueChange={(v) => setFilterReqId(v)}>
          <SelectTrigger className="h-8 w-52 text-xs">
            <SelectValue placeholder="전체 요구사항" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {reqOptions.map((r) => (
              <SelectItem key={r.requirementId} value={String(r.requirementId)} className="text-xs">
                [{r.systemId}] {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative">
          <Input
            placeholder="단위업무명 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-56 text-xs pl-3"
          />
        </div>
      </div>

      {/* 그리드 */}
      <DataGrid
        data={rows}
        columns={columns}
        loading={isLoading}
        onRowClick={(row) => router.push(`/unit-works/${row.unitWorkId}`)}
        emptyMessage="등록된 단위업무가 없습니다."
      />

      {/* 등록/수정 다이얼로그 */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) { setDialogOpen(false); setEditItem(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "단위업무 수정" : "단위업무 등록"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <div className="space-y-1.5">
              <Label>요구사항 *</Label>
              <Select value={formReqId} onValueChange={setFormReqId}>
                <SelectTrigger>
                  <SelectValue placeholder="요구사항 선택" />
                </SelectTrigger>
                <SelectContent>
                  {reqOptions.map((r) => (
                    <SelectItem key={r.requirementId} value={String(r.requirementId)} className="text-xs">
                      [{r.systemId}] {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>단위업무명 *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="예: 공지사항 관리"
              />
            </div>
            <div className="space-y-1.5">
              <Label>설명</Label>
              <Textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                rows={3}
                placeholder="업무 단위 설명 (선택)"
              />
            </div>
            <div className="space-y-1.5">
              <Label>정렬 순서</Label>
              <Input
                type="number"
                value={formSortOrder}
                onChange={(e) => setFormSortOrder(e.target.value)}
                className="w-24"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditItem(null); }}>
                취소
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "저장 중..." : "저장"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 일괄 업로드 다이얼로그 */}
      <Dialog open={bulkOpen} onOpenChange={(o) => { if (!o) setBulkOpen(false); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>단위업무 일괄 업로드</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* JSON 양식 안내 */}
            <div className="rounded-md bg-muted/50 border border-border p-3 text-xs font-mono leading-relaxed">
              <p className="text-muted-foreground mb-1 font-sans font-semibold not-italic">JSON 형식 (배열)</p>
              <pre className="text-[11px] leading-5 whitespace-pre-wrap">{`[
  {
    "requirementSystemId": "RQ-00001",  // 또는 "requirementId": 1
    "name": "회원 가입",
    "description": "이메일 회원 가입 프로세스",  // 선택
    "sortOrder": 1                               // 선택
  },
  {
    "requirementSystemId": "RQ-00002",
    "name": "소셜 로그인"
  }
]`}</pre>
            </div>

            {/* 요구사항 목록 힌트 */}
            <details className="text-xs text-muted-foreground cursor-pointer">
              <summary className="hover:text-foreground transition-colors">등록된 요구사항 ID 목록 보기 ({reqOptions.length}건)</summary>
              <div className="mt-2 max-h-32 overflow-y-auto space-y-0.5 pl-2">
                {reqOptions.map((r) => (
                  <div key={r.requirementId} className="font-mono">
                    <span className="text-primary">{r.systemId}</span> — {r.name}
                  </div>
                ))}
              </div>
            </details>

            {/* JSON 입력 */}
            <div className="space-y-1.5">
              <Label className="text-sm">JSON 붙여넣기</Label>
              <Textarea
                value={bulkJson}
                onChange={(e) => { setBulkJson(e.target.value); setBulkResult(null); }}
                placeholder="[ { ... }, ... ]"
                className="font-mono text-xs h-48 resize-none"
              />
            </div>

            {/* 결과 표시 */}
            {bulkResult && (
              <div className={`rounded-md border p-3 text-sm space-y-1 ${bulkResult.errors.length > 0 ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50"}`}>
                <p className="font-semibold">
                  처리 완료 — 생성 {bulkResult.created}건 · 수정 {bulkResult.updated}건
                  {bulkResult.errors.length > 0 && ` · 오류 ${bulkResult.errors.length}건`}
                </p>
                {bulkResult.errors.map((e, i) => (
                  <p key={i} className="text-xs text-amber-700">{e}</p>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>닫기</Button>
            <Button
              onClick={handleBulkUpload}
              disabled={!bulkJson.trim() || bulkLoading}
            >
              {bulkLoading ? "처리 중..." : "업로드"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 설계 컨텍스트 다이얼로그 */}
      <Dialog open={ctxOpen} onOpenChange={(o) => { if (!o) { setCtxOpen(false); setCopied(false); } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          {/* 복사하기 버튼 — X 버튼(right-4 top-4) 바로 왼쪽 */}
          <Button
            size="sm"
            variant={copied ? "default" : "outline"}
            className="absolute right-12 top-[10px] gap-1.5 z-10"
            onClick={handleCopy}
            disabled={ctxLoading || !ctxMd}
          >
            {copied ? (
              <><Check className="h-3.5 w-3.5" /> 복사됨</>
            ) : (
              <><Copy className="h-3.5 w-3.5" /> 복사하기</>
            )}
          </Button>
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-base pr-2">{ctxTitle}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0">
            {ctxLoading ? (
              <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                불러오는 중...
              </div>
            ) : (
              <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap bg-muted/40 rounded-md p-4 border border-border">
                {ctxMd}
              </pre>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 범위 선택 다이얼로그 */}
      <Dialog open={dlPickOpen} onOpenChange={(o) => { if (!o) setDlPickOpen(false); }}>
        <DialogContent className="max-w-md max-h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>다운로드 범위 선택</DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-2 pb-2 border-b border-border shrink-0">
            <button
              className="text-xs text-primary hover:underline"
              onClick={() => setDlSelected(new Set(rows.map((r) => r.unitWorkId)))}
            >
              전체 선택
            </button>
            <span className="text-muted-foreground text-xs">·</span>
            <button
              className="text-xs text-muted-foreground hover:underline"
              onClick={() => setDlSelected(new Set())}
            >
              전체 해제
            </button>
            <span className="ml-auto text-xs text-muted-foreground">{dlSelected.size}개 선택</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-0.5 min-h-0 py-1">
            {rows.map((row) => (
              <label
                key={row.unitWorkId}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0"
                  checked={dlSelected.has(row.unitWorkId)}
                  onChange={(e) => {
                    const next = new Set(dlSelected);
                    if (e.target.checked) next.add(row.unitWorkId);
                    else next.delete(row.unitWorkId);
                    setDlSelected(next);
                  }}
                />
                <div className="flex flex-col min-w-0">
                  <span className="font-mono text-[10px] text-primary leading-tight">{row.systemId}</span>
                  <span className="text-sm truncate">{row.name}</span>
                  <span className="text-[10px] text-muted-foreground truncate">{row.requirement.systemId} {row.requirement.name}</span>
                </div>
              </label>
            ))}
          </div>

          <DialogFooter className="shrink-0 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => setDlPickOpen(false)}>취소</Button>
            <Button
              disabled={dlSelected.size === 0}
              onClick={() => handleAllDownload(rows.filter((r) => dlSelected.has(r.unitWorkId)), dlContentMode === "content")}
            >
              <Download className="h-4 w-4 mr-1" />
              {dlSelected.size}개 다운로드 ({dlContentMode === "content" ? "내용까지" : "제목만"})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 */}
      <ConfirmDialog
        open={!!deleteItem}
        title="단위업무 삭제"
        description={`"${deleteItem?.name}"을 삭제하시겠습니까? 연결된 화면이 있으면 삭제할 수 없습니다.`}
        onConfirm={() => deleteItem && deleteMutation.mutate(deleteItem.unitWorkId)}
        onOpenChange={(o) => { if (!o) setDeleteItem(null); }}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
