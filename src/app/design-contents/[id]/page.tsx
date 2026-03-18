"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, ArrowLeft } from "lucide-react";
import dynamic from "next/dynamic";
import { apiFetch } from "@/lib/utils";
import { DESIGN_TYPES, DESIGN_STATUS_LABEL } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MermaidRenderer } from "@/components/common/MermaidRenderer";

// SSR 비활성화 — 브라우저 전용 라이브러리
const ExcalidrawEditor = dynamic(
  () => import("@/components/design/ExcalidrawEditor"),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full text-muted-foreground text-sm">로딩 중...</div> }
);

interface DesignContent {
  contentId:   number;
  systemId:    string;
  title:       string;
  designType:  string;
  toolType:    string;
  contentData: string | null;
  status:      string;
  description: string | null;
  requirement: { requirementId: number; systemId: string; name: string } | null;
  updatedAt:   string;
}

export default function DesignContentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: raw, isLoading } = useQuery({
    queryKey: ["design-content", id],
    queryFn:  () => apiFetch<{ data: DesignContent }>(`/api/design-contents/${id}`),
  });

  const item: DesignContent | null = raw?.data ?? null;

  const [title, setTitle]             = useState(item?.title ?? "");
  const [status, setStatus]           = useState(item?.status ?? "DRAFT");
  const [mermaidText, setMermaidText] = useState(item?.contentData ?? "");
  const contentDataRef                = useRef<string | null>(item?.contentData ?? null);
  const initializedRef                = useRef(false);

  // 데이터 로드 후 1회 상태 동기화
  useEffect(() => {
    if (item && !initializedRef.current) {
      initializedRef.current = true;
      setTitle(item.title);
      setStatus(item.status);
      const d = item.contentData ?? "";
      contentDataRef.current = d;
      setMermaidText(d);
    }
  }, [item]);

  const saveMutation = useMutation({
    mutationFn: (body: object) =>
      apiFetch(`/api/design-contents/${id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      }),
    onSuccess: () => {
      toast.success("저장되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["design-content", id] });
      queryClient.invalidateQueries({ queryKey: ["design-contents"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSave = () => {
    const data = item?.toolType === "MERMAID" ? mermaidText : contentDataRef.current;
    saveMutation.mutate({ title, contentData: data, status });
  };

  const handleExcalidrawChange = useCallback((json: string) => {
    contentDataRef.current = json;
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground">
        로딩 중...
      </div>
    );
  }

  if (!item) {
    return <div className="p-6 text-muted-foreground">설계서를 찾을 수 없습니다.</div>;
  }

  const typeMeta = DESIGN_TYPES[item.designType as keyof typeof DESIGN_TYPES];

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] overflow-hidden">
      {/* 상단 툴바 */}
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-background shrink-0">
        <button
          onClick={() => router.back()}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${typeMeta?.color ?? "bg-zinc-100 text-zinc-600"}`}>
          {item.designType}
        </span>

        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-7 text-sm font-medium max-w-xs border-transparent shadow-none px-1 focus-visible:ring-0 focus-visible:border-border"
        />

        <span className="text-xs text-muted-foreground shrink-0 hidden md:flex items-center gap-1">
          <span className="text-muted-foreground/50">문서</span>
          {item.systemId}
        </span>

        {item.requirement && (
          <span className="text-xs text-muted-foreground shrink-0 hidden md:flex items-center gap-1">
            <span className="text-muted-foreground/50">요구사항</span>
            {item.requirement.systemId}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-7 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DESIGN_STATUS_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending}>
            <Save className="h-3.5 w-3.5 mr-1" />
            {saveMutation.isPending ? "저장 중..." : "저장"}
          </Button>
        </div>
      </div>

      {/* 편집 영역 */}
      <div className="flex-1 overflow-hidden">
        {item.toolType === "MERMAID" && (
          <div className="flex h-full">
            <div className="w-1/2 border-r flex flex-col">
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b bg-muted/40 shrink-0">
                Mermaid 편집 ({item.designType})
              </div>
              <textarea
                value={mermaidText}
                onChange={(e) => setMermaidText(e.target.value)}
                className="flex-1 p-3 font-mono text-sm resize-none focus:outline-none bg-background"
                spellCheck={false}
              />
            </div>
            <div className="w-1/2 flex flex-col overflow-auto">
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b bg-muted/40 shrink-0">
                미리보기
              </div>
              <MermaidRenderer code={mermaidText} />
            </div>
          </div>
        )}

        {item.toolType === "EXCALIDRAW" && (
          <ExcalidrawEditor
            initialData={item.contentData}
            onChange={handleExcalidrawChange}
          />
        )}
      </div>
    </div>
  );
}
