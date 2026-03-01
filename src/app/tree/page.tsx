"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Monitor,
  Cog,
  Search,
  ChevronsDownUp,
  ChevronsUpDown,
} from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TreeNode } from "@/types";

export default function TreePage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ["tree"],
    queryFn: async () => {
      const res = await fetch("/api/tree");
      return res.json();
    },
  });

  const tree: TreeNode[] = data?.data ?? [];

  const toggleNode = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const expandAll = () => {
    const keys = new Set<string>();
    const walk = (nodes: TreeNode[], prefix: string) => {
      for (const node of nodes) {
        const key = `${prefix}-${node.id}`;
        keys.add(key);
        if (node.children) walk(node.children, key);
      }
    };
    walk(tree, "root");
    setExpanded(keys);
  };

  const collapseAll = () => setExpanded(new Set());

  const matchesSearch = (node: TreeNode): boolean => {
    if (!search) return true;
    const s = search.toLowerCase();
    if (
      node.name.toLowerCase().includes(s) ||
      node.systemId.toLowerCase().includes(s) ||
      (node.displayCode && node.displayCode.toLowerCase().includes(s))
    ) {
      return true;
    }
    return node.children?.some(matchesSearch) ?? false;
  };

  const handleNodeClick = (node: TreeNode) => {
    if (node.type === "requirement") {
      router.push(`/requirements`);
    } else if (node.type === "screen") {
      router.push(`/screens`);
    } else {
      router.push(`/functions/${node.id}`);
    }
  };

  const renderNode = (node: TreeNode, prefix: string, depth: number) => {
    if (!matchesSearch(node)) return null;

    const key = `${prefix}-${node.id}`;
    const isExpanded = expanded.has(key);
    const hasChildren = node.children && node.children.length > 0;

    const icons = {
      requirement: ClipboardList,
      screen: Monitor,
      function: Cog,
    };
    const Icon = icons[node.type];

    return (
      <div key={key}>
        <div
          className="flex items-center gap-1 rounded-md hover:bg-muted/30 px-2 py-1.5 transition-colors cursor-pointer group"
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleNode(key)}
              className="p-0.5 cursor-pointer"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          ) : (
            <span className="w-5" />
          )}

          <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />

          <span
            onClick={() => handleNodeClick(node)}
            className="text-sm hover:text-primary transition-colors flex items-center gap-2"
          >
            <span className="text-muted-foreground font-mono text-xs">
              {node.systemId}
            </span>
            {node.displayCode && (
              <span className="text-muted-foreground text-xs">
                ({node.displayCode})
              </span>
            )}
            <span>{node.name}</span>
            {node.type === "screen" && node.screenType && (
              <span className="text-xs text-muted-foreground">
                [{node.screenType}]
              </span>
            )}
            {node.type === "function" && node.status && (
              <StatusBadge status={node.status} />
            )}
          </span>
        </div>

        {isExpanded &&
          hasChildren &&
          node.children!.map((child) =>
            renderNode(child, key, depth + 1)
          )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        로딩 중...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">트리 뷰</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            <ChevronsUpDown className="h-4 w-4 mr-1" />
            전체 펼치기
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            <ChevronsDownUp className="h-4 w-4 mr-1" />
            전체 접기
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        {tree.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            등록된 데이터가 없습니다.
          </p>
        ) : (
          tree.map((node) => renderNode(node, "root", 0))
        )}
      </div>
    </div>
  );
}
