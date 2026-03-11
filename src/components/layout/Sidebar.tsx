"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Monitor,
  LayoutGrid,
  Cog,
  GitBranch,
  FileSpreadsheet,
  Bot,
  BookOpen,
  FileCode2,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const icons = {
  LayoutDashboard,
  ClipboardList,
  Monitor,
  LayoutGrid,
  Cog,
  GitBranch,
  FileSpreadsheet,
  Bot,
  BookOpen,
  FileCode2,
} as const;

const NAV_ITEMS = [
  { href: "/", label: "대시보드", icon: "LayoutDashboard" as const },
  { href: "/requirements", label: "요구사항", icon: "ClipboardList" as const },
  { href: "/standard-guides", label: "표준가이드", icon: "BookOpen" as const },
  { href: "/screens", label: "화면", icon: "Monitor" as const },
  { href: "/areas", label: "영역", icon: "LayoutGrid" as const },
  { href: "/functions", label: "기능", icon: "Cog" as const },
  { href: "/tree", label: "트리 뷰", icon: "GitBranch" as const },
  { href: "/ai-tasks", label: "AI 현황", icon: "Bot" as const },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-14 px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-yellow-400 fill-yellow-400" />
          </div>
          {!collapsed && (
            <span className="font-extrabold text-lg text-sidebar-foreground whitespace-nowrap tracking-tight">
              Specode
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = icons[item.icon];
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
              )}
            >
              <Icon className="h-4.5 w-4.5 flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}

        {/* 구분선 */}
        <div className="my-1 border-t border-sidebar-border" />

        {/* API Docs — 새 탭으로 열림 */}
        <a
          href="/api-docs"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
        >
          <FileCode2 className="h-4.5 w-4.5 flex-shrink-0" />
          {!collapsed && <span className="truncate">API Docs</span>}
        </a>
      </nav>

      {/* Toggle */}
      <div className="p-2 border-t border-sidebar-border">
        <button
          onClick={onToggle}
          className="flex items-center justify-center w-full rounded-lg px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors cursor-pointer"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4.5 w-4.5" />
          ) : (
            <PanelLeftClose className="h-4.5 w-4.5" />
          )}
        </button>
      </div>
    </aside>
  );
}
