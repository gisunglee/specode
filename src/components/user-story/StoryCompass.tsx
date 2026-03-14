/**
 * StoryCompass — 🧭 나침반 컴포넌트
 *
 * 📌 역할:
 *   - 화면 또는 기능 설계 시, 해당 화면에 매핑된 사용자 스토리를 상시 표시
 *   - 설계자가 "왜 이 화면을 만드는지"를 잊지 않도록 방향 제시
 *   - 대표 스토리(isMainStory)는 상단에 강조 표시
 *
 * 📌 사용처:
 *   - screens/[id]/page.tsx — 매핑 관리 버튼 포함
 *   - functions/[id]/page.tsx — 읽기 전용 (onManage 없음)
 */
"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** GET /api/screens/[id]/story-map 응답 타입 */
interface MappedStory {
  mapSn: number;
  isMainStory: boolean;
  userStory: {
    userStoryId: number;
    systemId: string;
    name: string;
    persona: string | null;
    scenario: string | null;
  };
}

interface StoryCompassProps {
  screenId: number;
  /** "매핑 관리" 버튼 클릭 핸들러. 없으면 버튼 숨김 (읽기 전용) */
  onManage?: () => void;
}

export function StoryCompass({ screenId, onManage }: StoryCompassProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["screen-story-map", screenId],
    queryFn: async () => {
      const res = await fetch(`/api/screens/${screenId}/story-map`);
      return res.json();
    },
    staleTime: 30 * 1000,
  });

  const mapped: MappedStory[] = data?.data?.mapped ?? [];

  // 로딩 중
  if (isLoading) {
    return (
      <div className="rounded-md border border-border/50 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        로딩 중...
      </div>
    );
  }

  // 매핑 없음
  if (mapped.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border/60 px-3 py-2.5 flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground/60">매핑된 스토리가 없습니다.</p>
        {onManage && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs gap-1 text-muted-foreground"
            onClick={onManage}
          >
            <Settings2 className="h-3 w-3" />
            매핑 관리
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border/60 bg-amber-50/30 dark:bg-amber-950/10 overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/40 bg-amber-50/50 dark:bg-amber-950/20">
        <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
          사용자 스토리
        </span>
        {onManage && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-5 px-1.5 text-[10px] gap-1 text-amber-700/70 hover:text-amber-700 dark:text-amber-400/70"
            onClick={onManage}
          >
            <Settings2 className="h-2.5 w-2.5" />
            매핑 관리
          </Button>
        )}
      </div>

      {/* 스토리 목록 */}
      <div className="divide-y divide-border/30">
        {mapped.map((m) => (
          <div
            key={m.mapSn}
            className={cn(
              "px-3 py-2 space-y-1",
              m.isMainStory && "bg-amber-50/50 dark:bg-amber-950/20"
            )}
          >
            {/* 상단: ID + 대표 뱃지 + 페르소나 */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-mono text-muted-foreground">
                {m.userStory.systemId}
              </span>
              {m.isMainStory && (
                <Badge
                  variant="secondary"
                  className="text-[9px] px-1 py-0 h-4 bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 border-0"
                >
                  대표
                </Badge>
              )}
              {m.userStory.persona && (
                <span className="text-[10px] text-muted-foreground/70 truncate max-w-[100px]">
                  · {m.userStory.persona}
                </span>
              )}
            </div>

            {/* 스토리명 */}
            <p className="text-xs font-medium text-foreground/80 leading-snug">
              {m.userStory.name}
            </p>

            {/* 시나리오 — 2줄 제한 */}
            {m.userStory.scenario && (
              <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                {m.userStory.scenario}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
