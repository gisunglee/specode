"use client";

import { FUNC_STATUS_LABEL, FUNC_STATUS_COLOR } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const color = FUNC_STATUS_COLOR[status] ?? {
    bg: "bg-zinc-100",
    text: "text-zinc-600",
  };
  const label = FUNC_STATUS_LABEL[status] ?? status;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        color.bg,
        color.text,
        color.pulse && "animate-pulse-glow",
        className
      )}
    >
      {label}
    </span>
  );
}
