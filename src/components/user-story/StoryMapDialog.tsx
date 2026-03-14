/**
 * StoryMapDialog — 화면-스토리 매핑 관리 다이얼로그
 *
 * 📌 역할:
 *   - 현재 요구사항에 속한 사용자 스토리 목록을 표시
 *   - 체크박스로 이 화면에 연결할 스토리 선택
 *   - is_main_story(대표 스토리) 토글 지원
 *   - [저장] 시 PUT /api/screens/[id]/story-map 호출 (replace 방식)
 */
"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiFetch, cn } from "@/lib/utils";
import { toast } from "sonner";

/** GET /api/screens/[id]/story-map 응답 내 available/mapped 타입 */
interface AvailableStory {
  userStoryId: number;
  systemId: string;
  name: string;
  persona: string | null;
  scenario: string | null;
}

interface MappedStory {
  mapSn: number;
  userStoryId: number;
  isMainStory: boolean;
}

interface StoryMapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  screenId: number;
}

export function StoryMapDialog({ open, onOpenChange, screenId }: StoryMapDialogProps) {
  const queryClient = useQueryClient();

  // 현재 매핑 상태: { [userStoryId]: { checked: boolean, isMain: boolean } }
  const [selections, setSelections] = useState<
    Record<number, { checked: boolean; isMain: boolean }>
  >({});

  // 매핑 데이터 조회
  const { data, isLoading } = useQuery({
    queryKey: ["screen-story-map-dialog", screenId],
    queryFn: async () => {
      const res = await fetch(`/api/screens/${screenId}/story-map`);
      return res.json();
    },
    enabled: open,
    staleTime: 0,
  });

  const available: AvailableStory[] = data?.data?.available ?? [];
  const mapped: MappedStory[] = data?.data?.mapped ?? [];

  // 매핑 데이터 로드 시 selections 초기화
  useEffect(() => {
    if (!data?.data) return;
    const init: Record<number, { checked: boolean; isMain: boolean }> = {};
    available.forEach((s) => {
      const m = mapped.find((m) => m.userStoryId === s.userStoryId);
      init[s.userStoryId] = {
        checked: !!m,
        isMain: m?.isMainStory ?? false,
      };
    });
    setSelections(init);
  }, [data]);

  // 체크박스 토글
  const toggleCheck = (id: number) => {
    setSelections((prev) => ({
      ...prev,
      [id]: {
        checked: !prev[id]?.checked,
        isMain: !prev[id]?.checked ? prev[id]?.isMain ?? false : false,
      },
    }));
  };

  // 대표 토글 (체크된 항목만)
  const toggleMain = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelections((prev) => ({
      ...prev,
      [id]: { ...prev[id], isMain: !prev[id]?.isMain },
    }));
  };

  // 저장 mutation
  const saveMutation = useMutation({
    mutationFn: () => {
      const maps = Object.entries(selections)
        .filter(([, v]) => v.checked)
        .map(([id, v]) => ({
          userStoryId: parseInt(id),
          isMainStory: v.isMain,
        }));
      return apiFetch(`/api/screens/${screenId}/story-map`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maps }),
      });
    },
    onSuccess: () => {
      // 나침반 데이터 갱신
      queryClient.invalidateQueries({ queryKey: ["screen-story-map", screenId] });
      queryClient.invalidateQueries({ queryKey: ["screen-story-map-dialog", screenId] });
      toast.success("스토리 매핑이 저장되었습니다.");
      onOpenChange(false);
    },
    onError: () => toast.error("저장에 실패했습니다."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>스토리 매핑 관리</DialogTitle>
          <DialogDescription>
            이 화면과 연결할 사용자 스토리를 선택하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1 max-h-[55vh] overflow-y-auto -mx-1 px-1">
          {isLoading && (
            <p className="text-sm text-muted-foreground py-4 text-center">로딩 중...</p>
          )}

          {!isLoading && available.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              이 요구사항에 등록된 사용자 스토리가 없습니다.
            </p>
          )}

          {available.map((story) => {
            const sel = selections[story.userStoryId];
            const isChecked = sel?.checked ?? false;
            const isMain = sel?.isMain ?? false;

            return (
              <div
                key={story.userStoryId}
                className={cn(
                  "flex items-start gap-3 rounded-md px-3 py-2.5 cursor-pointer transition-colors",
                  isChecked
                    ? "bg-primary/5 border border-primary/20"
                    : "hover:bg-muted/50 border border-transparent"
                )}
                onClick={() => toggleCheck(story.userStoryId)}
              >
                {/* 체크박스 */}
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleCheck(story.userStoryId)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-4 w-4 mt-0.5 shrink-0 cursor-pointer"
                />

                {/* 스토리 정보 */}
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {story.systemId}
                    </span>
                    {story.persona && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                        {story.persona}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium leading-snug truncate">{story.name}</p>
                  {story.scenario && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {story.scenario}
                    </p>
                  )}
                </div>

                {/* 대표 스토리 토글 — 체크된 경우만 활성 */}
                {isChecked && (
                  <button
                    type="button"
                    onClick={(e) => toggleMain(story.userStoryId, e)}
                    title={isMain ? "대표 스토리 해제" : "대표 스토리로 지정"}
                    className={cn(
                      "shrink-0 mt-0.5 transition-colors cursor-pointer",
                      isMain
                        ? "text-amber-500"
                        : "text-muted-foreground/30 hover:text-amber-400"
                    )}
                  >
                    <Star className="h-4 w-4" fill={isMain ? "currentColor" : "none"} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? "저장중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
