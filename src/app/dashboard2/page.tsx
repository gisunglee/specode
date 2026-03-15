"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Bot,
  Database,
  FileEdit,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  RefreshCw,
  ChevronRight,
} from "lucide-react";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface Dashboard2Data {
  funnel: {
    taskCount: number;
    reqCount: number;
    storyCount: number;
    planCount: number;
    screenCount: number;
    areaCount: number;
    funcCount: number;
  };
  requirements: { byPriority: Record<string, number> };
  functions: { byStatus: Record<string, number> };
  ai: {
    total: number;
    byStatus: Record<string, number>;
    byTable: Record<string, number>;
    byType: Record<string, number>;
    weeklyCount: number;
    dailyMap: Record<string, number>;
  };
  db: {
    total: number;
    lastModified: string | null;
    recentCount: number;
    staleCount: number;
    recentItems: Array<{ tableName: string; entityName: string | null; tableComment: string | null; updatedAt: string }>;
  };
  editActivity: {
    weeklyCount: number;
    byTable: Record<string, number>;
    byChangedBy: Record<string, number>;
    dailyMap: Record<string, number>;
  };
  weeklyNew: {
    reqs: number;
    screens: number;
    areas: number;
    funcs: number;
    stories: number;
  };
  recentEdits: Array<{
    versionId: string;
    refTableName: string;
    fieldName: string;
    changedBy: string;
    createdAt: string;
  }>;
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const TABLE_LABEL: Record<string, string> = {
  tb_function: "기능",
  tb_area: "영역",
  tb_screen: "화면",
  tb_requirement: "요구사항",
  tb_planning_draft: "기획보드",
  tb_standard_guide: "표준가이드",
};

const AI_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  NONE:        { label: "대기", color: "bg-zinc-400" },
  RUNNING:     { label: "진행중", color: "bg-blue-500" },
  SUCCESS:     { label: "성공", color: "bg-emerald-500" },
  AUTO_FIXED:  { label: "자동수정", color: "bg-sky-500" },
  NEEDS_CHECK: { label: "확인필요", color: "bg-amber-500" },
  WARNING:     { label: "주의", color: "bg-orange-500" },
  FAILED:      { label: "실패", color: "bg-red-500" },
};

const FUNC_STATUS_LABEL: Record<string, string> = {
  DRAFT: "설계중", REVIEW_REQ: "검토요청", AI_REVIEWING: "AI검토",
  REVIEW_DONE: "검토완료", DESIGN_REQ: "설계요청", DESIGN_DONE: "설계완료",
  CONFIRM_Y: "컨펌", IMPL_REQ: "구현요청", AI_IMPLEMENTING: "AI구현",
  IMPL_DONE: "구현완료",
};
const FUNC_STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-zinc-400", REVIEW_REQ: "bg-blue-400", AI_REVIEWING: "bg-indigo-500",
  REVIEW_DONE: "bg-yellow-400", DESIGN_REQ: "bg-teal-400", DESIGN_DONE: "bg-cyan-400",
  CONFIRM_Y: "bg-green-500", IMPL_REQ: "bg-orange-400", AI_IMPLEMENTING: "bg-purple-500",
  IMPL_DONE: "bg-emerald-500",
};

const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: "bg-red-500", HIGH: "bg-orange-500", MEDIUM: "bg-blue-500", LOW: "bg-zinc-400", NONE: "bg-zinc-300",
};
const PRIORITY_LABEL: Record<string, string> = {
  CRITICAL: "긴급", HIGH: "높음", MEDIUM: "중간", LOW: "낮음", NONE: "미지정",
};

// ─────────────────────────────────────────────
// Helper: Sparkline SVG
// ─────────────────────────────────────────────
function Sparkline({ values, color = "#6366f1", height = 32 }: { values: number[]; color?: string; height?: number }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const w = 120;
  const h = height;
  const pad = 2;
  const step = (w - pad * 2) / (values.length - 1);
  const pts = values.map((v, i) => {
    const x = pad + i * step;
    const y = h - pad - ((v / max) * (h - pad * 2));
    return `${x},${y}`;
  });
  const pathD = `M ${pts.join(" L ")}`;
  const areaD = `M ${pts[0]} L ${pts.join(" L ")} L ${pad + (values.length - 1) * step},${h - pad} L ${pad},${h - pad} Z`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <path d={areaD} fill={color} fillOpacity={0.12} />
      <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {values.map((v, i) => (
        <circle key={i} cx={pad + i * step} cy={h - pad - ((v / max) * (h - pad * 2))} r={v > 0 ? 2 : 0} fill={color} />
      ))}
    </svg>
  );
}

// ─────────────────────────────────────────────
// Helper: HBar
// ─────────────────────────────────────────────
function HBar({ label, value, max, color, extra }: { label: string; value: number; max: number; color: string; extra?: string }) {
  const pct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 3 : 0) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-14 shrink-0 text-right text-muted-foreground truncate">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right font-medium tabular-nums">{value}</span>
      {extra && <span className="text-muted-foreground">{extra}</span>}
    </div>
  );
}

// ─────────────────────────────────────────────
// Helper: Card
// ─────────────────────────────────────────────
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-4 ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="font-semibold text-sm">{title}</span>
      {sub && <span className="text-xs text-muted-foreground ml-auto">{sub}</span>}
    </div>
  );
}

// ─────────────────────────────────────────────
// Funnel Step
// ─────────────────────────────────────────────
function FunnelStep({
  label, count, sub, color, isLast = false,
}: {
  label: string; count: number; sub?: string; color: string; isLast?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`flex flex-col items-center rounded-xl px-4 py-3 min-w-[88px] border border-border bg-card shadow-sm`}>
        <span className={`text-2xl font-bold tabular-nums ${color}`}>{count.toLocaleString()}</span>
        <span className="text-xs font-medium text-foreground mt-0.5">{label}</span>
        {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
      </div>
      {!isLast && <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />}
    </div>
  );
}

// ─────────────────────────────────────────────
// Format date
// ─────────────────────────────────────────────
function fmtDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diff === 0) return "오늘";
  if (diff === 1) return "어제";
  if (diff < 7) return `${diff}일 전`;
  return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function fmtDayLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────
export default function Dashboard2Page() {
  const { data: raw, isLoading } = useQuery<{ data: Dashboard2Data }>({
    queryKey: ["dashboard2"],
    queryFn: () => fetch("/api/dashboard2").then((r) => r.json()),
    refetchInterval: 60_000,
  });
  const d = raw?.data;

  if (isLoading || !d) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        <RefreshCw className="h-4 w-4 animate-spin mr-2" /> 데이터 로딩 중...
      </div>
    );
  }

  const { funnel, requirements, functions, ai, db, editActivity, weeklyNew, recentEdits } = d;

  // Derived
  const reqMax = Math.max(...Object.values(requirements.byPriority));
  const funcTotal = Object.values(functions.byStatus).reduce((a, b) => a + b, 0);
  const funcStatusOrder = ["IMPL_DONE", "AI_IMPLEMENTING", "IMPL_REQ", "CONFIRM_Y", "DESIGN_DONE", "DESIGN_REQ", "REVIEW_DONE", "AI_REVIEWING", "REVIEW_REQ", "DRAFT"];
  const aiDays = Object.keys(ai.dailyMap).sort();
  const aiSparkValues = aiDays.map((d) => ai.dailyMap[d]);
  const cvDays = Object.keys(editActivity.dailyMap).sort();
  const cvSparkValues = cvDays.map((d) => editActivity.dailyMap[d]);
  const aiTableMax = Math.max(...Object.values(ai.byTable), 1);
  const cvTableMax = Math.max(...Object.values(editActivity.byTable), 1);
  const dbFreshPct = db.total > 0 ? Math.round((db.recentCount / db.total) * 100) : 0;

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      {/* ── 헤더 ─────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">개발 현황 대시보드</h1>
          <p className="text-xs text-muted-foreground mt-0.5">과업 → 요구사항 → 시나리오 → 기획보드 → 화면 → 영역 → 기능</p>
        </div>
        <span className="text-xs text-muted-foreground">1분마다 자동 갱신</span>
      </div>

      {/* ── 프로세스 퍼널 ────────────────────────── */}
      <Card>
        <div className="flex items-center gap-1 flex-wrap">
          <FunnelStep label="과업" count={funnel.taskCount} color="text-violet-500" />
          <FunnelStep label="요구사항" count={funnel.reqCount} color="text-blue-500" />
          <FunnelStep label="시나리오" count={funnel.storyCount} sub="사용자 스토리" color="text-indigo-500" />
          <FunnelStep label="기획보드" count={funnel.planCount} color="text-pink-500" />
          <FunnelStep label="화면" count={funnel.screenCount} color="text-cyan-500" />
          <FunnelStep label="영역" count={funnel.areaCount} color="text-teal-500" />
          <FunnelStep label="기능" count={funnel.funcCount} color="text-emerald-500" isLast />
          <div className="ml-auto flex flex-col items-end gap-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">이번주 신규</span>
            <div className="flex gap-3">
              {weeklyNew.reqs > 0 && <span className="text-blue-500">요구사항 +{weeklyNew.reqs}</span>}
              {weeklyNew.stories > 0 && <span className="text-indigo-500">스토리 +{weeklyNew.stories}</span>}
              {weeklyNew.screens > 0 && <span className="text-cyan-500">화면 +{weeklyNew.screens}</span>}
              {weeklyNew.areas > 0 && <span className="text-teal-500">영역 +{weeklyNew.areas}</span>}
              {weeklyNew.funcs > 0 && <span className="text-emerald-500">기능 +{weeklyNew.funcs}</span>}
              {!weeklyNew.reqs && !weeklyNew.screens && !weeklyNew.areas && !weeklyNew.funcs && !weeklyNew.stories && (
                <span>신규 없음</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Row 2: 요구사항 우선순위 + 기능 상태 ── */}
      <div className="grid grid-cols-2 gap-5">
        {/* 요구사항 우선순위 */}
        <Card>
          <CardHeader icon={CheckCircle2} title="요구사항 우선순위" sub={`총 ${funnel.reqCount}건`} />
          <div className="space-y-2">
            {["CRITICAL", "HIGH", "MEDIUM", "LOW", "NONE"].map((p) => (
              <HBar
                key={p}
                label={PRIORITY_LABEL[p]}
                value={requirements.byPriority[p] ?? 0}
                max={reqMax}
                color={PRIORITY_COLOR[p]}
              />
            ))}
          </div>
          {/* mini stacked bar */}
          <div className="mt-3 h-2 rounded-full overflow-hidden flex gap-px bg-muted">
            {["CRITICAL", "HIGH", "MEDIUM", "LOW", "NONE"].map((p) => {
              const v = requirements.byPriority[p] ?? 0;
              const pct = funnel.reqCount > 0 ? (v / funnel.reqCount) * 100 : 0;
              return pct > 0 ? (
                <div key={p} className={`h-full ${PRIORITY_COLOR[p]}`} style={{ width: `${pct}%` }} title={`${PRIORITY_LABEL[p]}: ${v}`} />
              ) : null;
            })}
          </div>
        </Card>

        {/* 기능 상태 */}
        <Card>
          <CardHeader icon={TrendingUp} title="기능 진행 상태" sub={`총 ${funcTotal}건`} />
          <div className="space-y-2">
            {funcStatusOrder.filter((s) => (functions.byStatus[s] ?? 0) > 0).map((s) => (
              <HBar
                key={s}
                label={FUNC_STATUS_LABEL[s] ?? s}
                value={functions.byStatus[s] ?? 0}
                max={funcTotal}
                color={FUNC_STATUS_COLOR[s] ?? "bg-zinc-400"}
              />
            ))}
          </div>
          {/* stacked bar */}
          <div className="mt-3 h-2 rounded-full overflow-hidden flex gap-px bg-muted">
            {funcStatusOrder.map((s) => {
              const v = functions.byStatus[s] ?? 0;
              const pct = funcTotal > 0 ? (v / funcTotal) * 100 : 0;
              return pct > 0 ? (
                <div key={s} className={`h-full ${FUNC_STATUS_COLOR[s] ?? "bg-zinc-400"}`} style={{ width: `${pct}%` }} title={`${FUNC_STATUS_LABEL[s]}: ${v}`} />
              ) : null;
            })}
          </div>
        </Card>
      </div>

      {/* ── Row 3: AI 현황 + DB 스키마 + 편집 활동 ─ */}
      <div className="grid grid-cols-3 gap-5">
        {/* AI 현황 */}
        <Card>
          <CardHeader icon={Bot} title="AI 현황" sub={`이번주 ${ai.weeklyCount}건`} />
          <div className="flex items-end gap-3 mb-3">
            <div>
              <span className="text-3xl font-bold tabular-nums text-foreground">{ai.total}</span>
              <span className="text-xs text-muted-foreground ml-1">전체</span>
            </div>
            <div className="flex-1 flex justify-end">
              <Sparkline values={aiSparkValues} color="#6366f1" />
            </div>
          </div>
          {/* day labels */}
          <div className="flex justify-between text-[9px] text-muted-foreground mb-3 px-0.5">
            {aiDays.map((d) => <span key={d}>{fmtDayLabel(d)}</span>)}
          </div>
          {/* by status */}
          <div className="space-y-1.5 mb-3">
            {Object.entries(AI_STATUS_LABEL).filter(([k]) => (ai.byStatus[k] ?? 0) > 0).map(([k, { label, color }]) => (
              <HBar key={k} label={label} value={ai.byStatus[k] ?? 0} max={ai.total} color={color} />
            ))}
          </div>
          {/* by table */}
          <div className="border-t border-border pt-2 space-y-1.5">
            <p className="text-[10px] text-muted-foreground mb-1">대상별</p>
            {Object.entries(ai.byTable).sort(([, a], [, b]) => b - a).slice(0, 5).map(([tbl, cnt]) => (
              <HBar key={tbl} label={TABLE_LABEL[tbl] ?? tbl} value={cnt} max={aiTableMax} color="bg-indigo-400" />
            ))}
          </div>
          {/* by type */}
          {Object.keys(ai.byType).length > 0 && (
            <div className="border-t border-border pt-2 mt-2 flex flex-wrap gap-2">
              {Object.entries(ai.byType).sort(([, a], [, b]) => b - a).map(([type, cnt]) => (
                <div key={type} className="flex items-center gap-1 text-xs">
                  <span className="text-muted-foreground">{type}</span>
                  <span className="font-semibold">{cnt}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* DB 스키마 신선도 */}
        <Card>
          <CardHeader icon={Database} title="DB 스키마" sub={`총 ${db.total}개`} />
          <div className="mb-4">
            {/* Freshness ring */}
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 shrink-0">
                <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke={dbFreshPct >= 80 ? "#10b981" : dbFreshPct >= 50 ? "#f59e0b" : "#ef4444"}
                    strokeWidth="3"
                    strokeDasharray={`${dbFreshPct} ${100 - dbFreshPct}`}
                    strokeLinecap="round"
                    strokeDashoffset="0"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-sm font-bold">{dbFreshPct}%</span>
                  <span className="text-[9px] text-muted-foreground">신선</span>
                </div>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-muted-foreground">최근 30일 수정</span>
                  <span className="font-medium ml-auto">{db.recentCount}개</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-zinc-400" />
                  <span className="text-muted-foreground">30일+ 미수정</span>
                  <span className="font-medium ml-auto">{db.staleCount}개</span>
                </div>
                <div className="flex items-center gap-1.5 pt-1 border-t border-border">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">최종 수정</span>
                  <span className="font-medium ml-auto">{fmtDate(db.lastModified)}</span>
                </div>
              </div>
            </div>
          </div>
          {db.staleCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-2.5 py-1.5 mb-3">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{db.staleCount}개 테이블이 30일 이상 미수정입니다</span>
            </div>
          )}
          {db.recentItems.length > 0 && (
            <div className="border-t border-border pt-2 space-y-1.5">
              <p className="text-[10px] text-muted-foreground mb-1">최근 수정</p>
              {db.recentItems.map((item) => (
                <div key={item.tableName} className="flex items-center gap-1.5 text-xs">
                  <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="font-mono text-[10px] text-muted-foreground">{item.tableName}</span>
                  {item.entityName && <span className="text-foreground">{item.entityName}</span>}
                  <span className="ml-auto text-muted-foreground shrink-0">{fmtDate(item.updatedAt)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 편집 활동 */}
        <Card>
          <CardHeader icon={FileEdit} title="편집 활동" sub="최근 7일" />
          <div className="flex items-end gap-3 mb-3">
            <div>
              <span className="text-3xl font-bold tabular-nums text-foreground">{editActivity.weeklyCount}</span>
              <span className="text-xs text-muted-foreground ml-1">수정</span>
            </div>
            <div className="flex-1 flex justify-end">
              <Sparkline values={cvSparkValues} color="#10b981" />
            </div>
          </div>
          <div className="flex justify-between text-[9px] text-muted-foreground mb-3 px-0.5">
            {cvDays.map((d) => <span key={d}>{fmtDayLabel(d)}</span>)}
          </div>
          {/* by table */}
          <div className="space-y-1.5 mb-3">
            <p className="text-[10px] text-muted-foreground mb-1">항목별</p>
            {Object.entries(editActivity.byTable).sort(([, a], [, b]) => b - a).slice(0, 6).map(([tbl, cnt]) => (
              <HBar key={tbl} label={TABLE_LABEL[tbl] ?? tbl} value={cnt} max={cvTableMax} color="bg-emerald-400" />
            ))}
            {Object.keys(editActivity.byTable).length === 0 && (
              <p className="text-xs text-muted-foreground">편집 이력 없음</p>
            )}
          </div>
          {/* by changedBy */}
          {Object.keys(editActivity.byChangedBy).length > 0 && (
            <div className="border-t border-border pt-2">
              <p className="text-[10px] text-muted-foreground mb-1.5">담당자별</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(editActivity.byChangedBy).sort(([, a], [, b]) => b - a).map(([who, cnt]) => (
                  <div key={who} className="flex items-center gap-1 bg-muted rounded-full px-2 py-0.5 text-xs">
                    <span>{who}</span>
                    <span className="font-semibold text-foreground">{cnt}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* recent edits */}
          {recentEdits.length > 0 && (
            <div className="border-t border-border pt-2 mt-2 space-y-1">
              <p className="text-[10px] text-muted-foreground mb-1">최근 수정</p>
              {recentEdits.slice(0, 5).map((e) => (
                <div key={String(e.versionId)} className="flex items-center gap-1.5 text-xs">
                  <Zap className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">{TABLE_LABEL[e.refTableName] ?? e.refTableName}</span>
                  <span className="text-[10px] text-muted-foreground">·{e.fieldName}</span>
                  <span className="ml-auto text-muted-foreground shrink-0">{fmtDate(e.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Row 4: 기능 상태 상세 파이 ──────────── */}
      <Card>
        <CardHeader icon={TrendingUp} title="기능 단계별 현황" sub="전체 기능 진행 추적" />
        <div className="flex items-stretch gap-6">
          {/* 단계별 가로 흐름 */}
          <div className="flex-1 grid grid-cols-5 gap-2">
            {[
              { label: "초안/검토", statuses: ["DRAFT", "REVIEW_REQ", "AI_REVIEWING", "REVIEW_DONE"], color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
              { label: "설계", statuses: ["DESIGN_REQ", "AI_REVIEWING", "DESIGN_DONE"], color: "text-teal-500", bg: "bg-teal-50 dark:bg-teal-950/30" },
              { label: "확정", statuses: ["CONFIRM_Y"], color: "text-green-500", bg: "bg-green-50 dark:bg-green-950/30" },
              { label: "구현", statuses: ["IMPL_REQ", "AI_IMPLEMENTING", "IMPL_DONE"], color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/30" },
              { label: "완료", statuses: ["IMPL_DONE"], color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
            ].map((phase) => {
              const count = phase.statuses.reduce((s, k) => s + (functions.byStatus[k] ?? 0), 0);
              const pct = funcTotal > 0 ? Math.round((count / funcTotal) * 100) : 0;
              return (
                <div key={phase.label} className={`rounded-lg p-3 ${phase.bg} border border-border/50`}>
                  <p className={`text-xs font-medium ${phase.color}`}>{phase.label}</p>
                  <p className={`text-2xl font-bold tabular-nums mt-1 ${phase.color}`}>{count}</p>
                  <p className="text-[10px] text-muted-foreground">{pct}%</p>
                  <div className="mt-2 h-1 bg-background/50 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${phase.color.replace("text-", "bg-")}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          {/* 전체 진척도 */}
          <div className="w-36 flex flex-col items-center justify-center border-l border-border pl-4">
            {(() => {
              const done = (functions.byStatus["IMPL_DONE"] ?? 0) + (functions.byStatus["CONFIRM_Y"] ?? 0);
              const doneP = funcTotal > 0 ? Math.round((done / funcTotal) * 100) : 0;
              return (
                <>
                  <div className="relative w-24 h-24">
                    <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted" />
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#10b981" strokeWidth="3"
                        strokeDasharray={`${doneP} ${100 - doneP}`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-bold">{doneP}%</span>
                      <span className="text-[9px] text-muted-foreground">완료율</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{done}/{funcTotal} 기능</p>
                </>
              );
            })()}
          </div>
        </div>
      </Card>
    </div>
  );
}
