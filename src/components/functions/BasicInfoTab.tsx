"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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

import { PRIORITIES } from "@/lib/constants";
import { apiFetch } from "@/lib/utils";
import { toast } from "sonner";
import type { FunctionItem } from "@/types";

interface BasicInfoTabProps {
  func: FunctionItem;
}

export function BasicInfoTab({ func }: BasicInfoTabProps) {
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: func.name,
    displayCode: func.displayCode || "",
    priority: func.priority,
    changeReason: func.changeReason || "",
    areaId: func.areaId ? String(func.areaId) : "",
    sortOrder: func.sortOrder !== null && func.sortOrder !== undefined ? String(func.sortOrder) : "",
  });

  /* ─── 영역 목록 조회 (소속 영역 Select용) ──────────────── */
  const { data: areasData } = useQuery({
    queryKey: ["areas-all"],
    queryFn: async () => {
      const res = await fetch("/api/areas?pageSize=200");
      return res.json();
    },
  });
  const areas: { areaId: number; areaCode: string; name: string }[] =
    areasData?.data ?? [];

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch(`/api/functions/${func.functionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["function", String(func.functionId)],
      });
      toast.success("저장되었습니다.");
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      ...form,
      areaId: form.areaId ? parseInt(form.areaId) : null,
      sortOrder: form.sortOrder !== "" ? parseInt(form.sortOrder) : null,
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">기본정보</h2>
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "저장중..." : "저장"}
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        {/* Row 1: 시스템 ID, 표시코드, 기능명 */}
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">시스템 ID</Label>
            <Input value={func.systemId} disabled className="bg-muted/30" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">표시용 코드</Label>
            <Input
              value={form.displayCode}
              onChange={(e) => setForm((f) => ({ ...f, displayCode: e.target.value }))}
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs">기능명 *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
        </div>

        {/* Row 2: 소속 영역, 우선순위, 정렬순서 */}
        <div className="grid grid-cols-4 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs">소속 영역</Label>
            <Select
              value={form.areaId || "NONE"}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, areaId: v === "NONE" ? "" : v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="영역 미지정" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">
                  <span className="text-muted-foreground">— 영역 미지정 —</span>
                </SelectItem>
                {areas.map((a) => (
                  <SelectItem key={a.areaId} value={String(a.areaId)}>
                    {a.areaCode} {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">우선순위</Label>
            <Select
              value={form.priority}
              onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}
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
          <div className="space-y-1.5">
            <Label className="text-xs">정렬순서</Label>
            <Input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
              placeholder="0"
            />
          </div>
        </div>

        {/* Row 3: 변경 사유 (조건부) */}
        {func.changeReason && (
          <div className="space-y-1.5">
            <Label className="text-xs">변경 사유</Label>
            <Input
              value={form.changeReason}
              onChange={(e) => setForm((f) => ({ ...f, changeReason: e.target.value }))}
              placeholder="변경 사유를 입력하세요"
            />
          </div>
        )}
      </div>
    </div>
  );
}
