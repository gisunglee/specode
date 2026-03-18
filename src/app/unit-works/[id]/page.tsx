"use client";

import { use, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Monitor, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarkdownEditor } from "@/components/common/MarkdownEditor";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { SCREEN_TYPES } from "@/lib/constants";
import { apiFetch, formatDate } from "@/lib/utils";

const SCREEN_TYPE_MAP = Object.fromEntries(SCREEN_TYPES.map((t) => [t.value, t.label]));

interface ScreenSummary {
  screenId:    number;
  systemId:    string;
  displayCode: string | null;
  name:        string;
  screenType:  string | null;
  updatedAt:   string;
  areaCount:   number;
  funcCount:   number;
}

interface UnitWorkDetail {
  unitWorkId:    number;
  systemId:      string;
  name:          string;
  description:   string | null;
  sortOrder:     number;
  requirementId: number;
  updatedAt:     string;
  requirement:   { systemId: string; name: string };
  screens:       ScreenSummary[];
}

export default function UnitWorkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id }      = use(params);
  const router      = useRouter();
  const queryClient = useQueryClient();

  const [description, setDescription]   = useState("");
  const [descDirty,   setDescDirty]     = useState(false);
  const [editOpen,    setEditOpen]      = useState(false);
  const [deleteOpen,  setDeleteOpen]    = useState(false);
  const [formName,    setFormName]      = useState("");
  const [formOrder,   setFormOrder]     = useState(0);

  const { data: raw, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["unit-work", id],
    queryFn: () => apiFetch<{ data: UnitWorkDetail }>(`/api/unit-works/${id}`),
  });

  const uw = raw?.data ?? null;

  // 데이터 로드/갱신 시 description 동기화 (dirty 아닐 때만)
  useEffect(() => {
    if (uw && !descDirty) {
      setDescription(uw.description ?? "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataUpdatedAt]);

  // description 저장 mutation
  const descMutation = useMutation({
    mutationFn: (value: string) =>
      apiFetch(`/api/unit-works/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: value.trim() || null }),
      }),
    onSuccess: () => {
      toast.success("저장되었습니다.");
      setDescDirty(false);
      queryClient.invalidateQueries({ queryKey: ["unit-work", id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // 기본 정보(name, sortOrder) 수정 mutation
  const infoMutation = useMutation({
    mutationFn: (body: object) =>
      apiFetch(`/api/unit-works/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast.success("저장되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["unit-work", id] });
      queryClient.invalidateQueries({ queryKey: ["unit-works"] });
      setEditOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiFetch(`/api/unit-works/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("삭제되었습니다.");
      router.push("/unit-works");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handlePrd = async () => {
    try {
      const res = await fetch(`/api/unit-works/${id}/prd`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "PRD 생성 실패");
        return;
      }
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename\*=UTF-8''(.+)/);
      const filename = match ? decodeURIComponent(match[1]) : `PRD_${uw?.systemId}.md`;
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      toast.success("PRD가 다운로드되었습니다.");
    } catch {
      toast.error("PRD 다운로드 중 오류가 발생했습니다.");
    }
  };

  const openEdit = () => {
    if (!uw) return;
    setFormName(uw.name);
    setFormOrder(uw.sortOrder);
    setEditOpen(true);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">로딩 중...</div>;
  }

  if (!uw) {
    return <div className="p-6 text-muted-foreground">단위업무를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="space-y-6">
      {/* ─── 상단 헤더 ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-muted-foreground hover:text-foreground transition-colors mt-0.5"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">{uw.systemId}</span>
              <span className="text-xs text-muted-foreground/50">|</span>
              <span className="text-xs text-muted-foreground">
                [{uw.requirement.systemId}] {uw.requirement.name}
              </span>
            </div>
            <h1 className="text-xl font-semibold mt-0.5">{uw.name}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              정렬 순서: {uw.sortOrder} · 최종 수정: {formatDate(uw.updatedAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handlePrd} disabled={uw.screens.length === 0}>
            <Download className="h-3.5 w-3.5 mr-1" />
            PRD 다운로드
          </Button>
          <Button variant="outline" size="sm" onClick={openEdit}>
            <Pencil className="h-3.5 w-3.5 mr-1" />
            정보 수정
          </Button>
          <Button
            variant="outline" size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            삭제
          </Button>
        </div>
      </div>

      {/* ─── 설명 (마크다운 + 버전 이력) ───────────────────────── */}
      <div className="rounded-lg border border-border bg-card p-5">
        <MarkdownEditor
          key={`md-${dataUpdatedAt}`}
          value={description}
          onChange={(v) => { setDescription(v); setDescDirty(true); }}
          label="단위업무 설명 (마크다운)"
          rows={30}
          placeholder="단위업무에 대한 설명을 마크다운으로 작성하세요..."
          refTableName="tb_unit_work"
          refPkId={uw.unitWorkId}
          fieldName="description"
        />
        <div className="flex justify-end mt-3">
          <Button
            size="sm"
            onClick={() => descMutation.mutate(description)}
            disabled={descMutation.isPending || !descDirty}
          >
            {descMutation.isPending
              ? "저장 중..."
              : <><Save className="h-3.5 w-3.5 mr-1.5" />설명 저장</>
            }
          </Button>
        </div>
      </div>

      {/* ─── 화면 목록 ──────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            화면 목록 <span className="text-muted-foreground font-normal ml-1">({uw.screens.length})</span>
          </h2>
          <Button
            size="sm" variant="outline"
            onClick={() => router.push(`/screens?unitWorkId=${uw.unitWorkId}`)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            화면 연결
          </Button>
        </div>

        {uw.screens.length === 0 ? (
          <div className="border rounded-lg p-8 text-center text-sm text-muted-foreground">
            연결된 화면이 없습니다.<br />
            화면 관리에서 단위업무를 지정하거나 [화면 연결] 버튼을 사용하세요.
          </div>
        ) : (
          <div className="border rounded-lg divide-y">
            {uw.screens.map((screen) => {
              const typeLabel = SCREEN_TYPE_MAP[screen.screenType ?? ""] ?? screen.screenType ?? "";
              return (
                <div
                  key={screen.screenId}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 cursor-pointer transition-colors"
                  onClick={() => router.push(`/screens/${screen.screenId}`)}
                >
                  <Monitor className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{screen.systemId}</span>
                      {screen.displayCode && (
                        <span className="text-xs text-muted-foreground/70">{screen.displayCode}</span>
                      )}
                      {typeLabel && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {typeLabel}
                        </span>
                      )}
                    </div>
                    <div className="font-medium text-sm mt-0.5">{screen.name}</div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                    <span>영역 {screen.areaCount}</span>
                    <span>기능 {screen.funcCount}</span>
                    <span>{formatDate(screen.updatedAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── 기본 정보 수정 다이얼로그 ──────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={(o) => { if (!o) setEditOpen(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>기본 정보 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>단위업무명 *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>정렬 순서</Label>
              <Input
                type="number"
                value={formOrder}
                onChange={(e) => setFormOrder(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>취소</Button>
            <Button
              onClick={() => infoMutation.mutate({ name: formName.trim(), sortOrder: formOrder })}
              disabled={infoMutation.isPending || !formName.trim()}
            >
              {infoMutation.isPending ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── 삭제 확인 ──────────────────────────────────────────── */}
      <ConfirmDialog
        open={deleteOpen}
        title="단위업무 삭제"
        description={`"${uw.name}"을 삭제하시겠습니까? 연결된 화면이 있으면 삭제할 수 없습니다.`}
        onConfirm={() => deleteMutation.mutate()}
        onOpenChange={(o) => { if (!o) setDeleteOpen(false); }}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
