"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Search, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DataGrid } from "@/components/common/DataGrid";
import { formatDate } from "@/lib/utils";
import type { ColumnDef } from "@tanstack/react-table";

interface CompositionRow {
  screenId: number;
  systemId: string;
  name: string;
  screenType: string | null;
  categoryL: string | null;
  categoryM: string | null;
  funcCount: number;
  confirmedCount: number;
  requirement: { name: string; systemId: string } | null;
  _count: { areas: number };
  createdAt: string;
}

export default function CompositionPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["composition", page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: "30" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/screens?${params}`);
      return res.json();
    },
  });

  const columns: ColumnDef<CompositionRow, unknown>[] = [
    {
      accessorKey: "systemId",
      header: "화면 ID",
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-muted-foreground">{getValue() as string}</span>
      ),
      size: 100,
    },
    {
      accessorKey: "categoryL",
      header: "대분류",
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">{(getValue() as string) || "-"}</span>
      ),
      size: 100,
    },
    {
      accessorKey: "categoryM",
      header: "중분류",
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">{(getValue() as string) || "-"}</span>
      ),
      size: 100,
    },
    {
      accessorKey: "name",
      header: "화면명",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          {row.original.requirement && (
            <div className="text-xs text-muted-foreground mt-0.5">
              {row.original.requirement.systemId} · {row.original.requirement.name}
            </div>
          )}
        </div>
      ),
    },
    {
      id: "areaCount",
      header: "영역",
      cell: ({ row }) => (
        <span className="text-center block">{row.original._count?.areas ?? 0}</span>
      ),
      size: 55,
    },
    {
      id: "funcCount",
      header: "기능",
      cell: ({ row }) => (
        <span className="text-center block">{row.original.funcCount ?? 0}</span>
      ),
      size: 55,
    },
    {
      id: "progress",
      header: "진행률",
      cell: ({ row }) => {
        const total = row.original.funcCount ?? 0;
        const confirmed = row.original.confirmedCount ?? 0;
        const pct = total > 0 ? Math.round((confirmed / total) * 100) : 0;
        return (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-secondary rounded-full h-1.5 overflow-hidden min-w-[50px]">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground w-10 text-right shrink-0">
              {confirmed}/{total}
            </span>
          </div>
        );
      },
      size: 140,
    },
    {
      accessorKey: "createdAt",
      header: "등록일",
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">{formatDate(getValue() as string)}</span>
      ),
      size: 80,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Layers className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-2xl font-bold">화면 구성</h1>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          placeholder="화면명 검색..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <DataGrid
        columns={columns}
        data={data?.data ?? []}
        onRowClick={(row) => router.push(`/composition/${row.screenId}`)}
        pagination={data?.pagination}
        onPageChange={setPage}
        emptyMessage={isLoading ? "로딩 중..." : "등록된 화면이 없습니다."}
        dense={true}
      />
    </div>
  );
}
