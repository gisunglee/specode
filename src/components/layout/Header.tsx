"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

const ROUTE_LABELS: Record<string, string> = {
  "/": "대시보드",
  "/requirements": "요구사항 관리",
  "/screens": "화면 관리",
  "/functions": "기능 관리",
  "/tree": "트리 뷰",
  "/ai-tasks": "AI 작업 현황",
};

export function Header() {
  const pathname = usePathname();

  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: { label: string; href: string }[] = [];

  if (pathname === "/") {
    breadcrumbs.push({ label: "대시보드", href: "/" });
  } else {
    let currentPath = "";
    for (const segment of segments) {
      currentPath += `/${segment}`;
      // 숫자 ID 세그먼트는 브레드크럼에 표시하지 않음 (상세 페이지 자체 헤더에 표시)
      if (/^\d+$/.test(segment)) continue;
      const label = ROUTE_LABELS[currentPath] || segment;
      breadcrumbs.push({ label, href: currentPath });
    }
  }

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-border bg-background/80 backdrop-blur-sm flex items-center px-6">
      <nav className="flex items-center gap-1.5 text-sm">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1.5">
            {i > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            {i === breadcrumbs.length - 1 ? (
              <span className="font-medium text-foreground">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>
    </header>
  );
}
