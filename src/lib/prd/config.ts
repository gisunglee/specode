/**
 * prd/config.ts — PRD 기술 컨텍스트 설정
 *
 * 현재: 정적 기본값 사용
 * 향후: 프로젝트 테이블(tb_project 등)에서 읽어온 데이터로 교체
 *   - API 라우트에서 DB 조회 후 generateScreenPrd(screen, techConfig) 로 주입
 *   - 이 파일의 DEFAULT_TECH_CONFIG 는 DB에 값이 없을 때의 폴백으로 유지
 */

/** PRD에 삽입할 기술 컨텍스트 행 [항목, 내용] */
export interface TechContextRow {
  label: string;
  value: string;
}

/** PRD 생성기에 주입되는 설정 */
export interface PrdConfig {
  techContext: TechContextRow[];
}

/** 기본 설정 (정적 폴백) */
export const DEFAULT_PRD_CONFIG: PrdConfig = {
  techContext: [
    { label: "프레임워크",   value: 'Next.js 16 App Router + `"use client"` 페이지' },
    { label: "API",          value: "`src/app/api/` Route Handlers (NextRequest/NextResponse)" },
    { label: "DB",           value: "Prisma 6 + PostgreSQL (개발: SQLite)" },
    { label: "UI",           value: "shadcn/ui (Radix UI), TanStack Table v8, Tailwind CSS v4" },
    { label: "공통 컴포넌트", value: "`DataGrid`, `MarkdownEditor`, `StatusBadge`, `AttachmentManager`" },
    { label: "상태관리",      value: "TanStack Query v5 (`useQuery`, `useMutation`)" },
    { label: "유틸",          value: "`apiFetch`, `formatDate`, `cn` (`src/lib/utils`)" },
    { label: "아이콘",        value: "lucide-react" },
    { label: "Toast",         value: "sonner (`toast.success`, `toast.error`)" },
    { label: "라우팅 파라미터", value: "`{ params: Promise<{ id: string }> }` — `use(params)` 사용" },
  ],
};
