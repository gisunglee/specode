"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  FileText,
  AlertCircle,
  CheckCircle2,
  Bot,
  Clock,
  Activity,
} from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { FUNC_STATUS_LABEL } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

const TASK_TYPE_LABEL: Record<string, string> = {
  REVIEW: "설계검토",
  IMPLEMENT: "코드구현",
  IMPACT: "영향도분석",
  REPROCESS: "재처리",
};

export default function DashboardPage() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      return json.data;
    },
    refetchInterval: 30000,
  });

  const summary = data?.summary;
  const recentActivity = data?.recentActivity ?? [];

  const statusCards = [
    {
      key: "DRAFT",
      icon: FileText,
      color: "from-slate-50 to-slate-100 border-slate-200",
      iconColor: "text-slate-500",
    },
    {
      key: "REVIEW_REQ",
      icon: AlertCircle,
      color: "from-blue-50 to-blue-100 border-blue-200",
      iconColor: "text-blue-500",
    },
    {
      key: "REVIEW_DONE",
      icon: Clock,
      color: "from-amber-50 to-amber-100 border-amber-200",
      iconColor: "text-amber-500",
    },
    {
      key: "AI_IMPLEMENTING",
      icon: Bot,
      color: "from-purple-50 to-purple-100 border-purple-200",
      iconColor: "text-purple-500",
    },
    {
      key: "IMPL_DONE",
      icon: CheckCircle2,
      color: "from-emerald-50 to-emerald-100 border-emerald-200",
      iconColor: "text-emerald-500",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        로딩 중...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">대시보드</h1>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statusCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => router.push(`/functions?status=${card.key}`)}
              className={`relative overflow-hidden rounded-xl border bg-gradient-to-br ${card.color} p-4 cursor-pointer hover:scale-[1.02] transition-transform`}
            >
              <div className="flex items-center justify-between">
                <Icon className={`h-5 w-5 ${card.iconColor}`} />
                <span className="text-2xl font-bold">
                  {summary?.byStatus?.[card.key] ?? 0}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {FUNC_STATUS_LABEL[card.key]}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Highlight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={() => router.push("/functions?status=REVIEW_DONE")}
          className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-100 p-5 cursor-pointer hover:scale-[1.02] transition-transform"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-yellow-600" />
            <div>
              <p className="text-sm text-muted-foreground">컨펌 대기</p>
              <p className="text-3xl font-bold text-yellow-700">
                {summary?.pendingConfirm ?? 0}
                <span className="text-sm font-normal text-muted-foreground ml-1">건</span>
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          onClick={() => router.push("/functions?status=AI_REVIEWING")}
          className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-violet-100 p-5 cursor-pointer hover:scale-[1.02] transition-transform"
        >
          <div className="flex items-center gap-3">
            <Bot className="h-6 w-6 text-purple-600 animate-pulse-glow" />
            <div>
              <p className="text-sm text-muted-foreground">AI 작업 중</p>
              <p className="text-3xl font-bold text-purple-700">
                {summary?.aiRunning ?? 0}
                <span className="text-sm font-normal text-muted-foreground ml-1">건</span>
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-xl border border-border bg-card p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold">최근 AI 활동</h2>
        </div>

        {recentActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            아직 AI 활동이 없습니다.
          </p>
        ) : (
          <div className="space-y-3">
            {recentActivity.map(
              (activity: {
                aiTaskId: number;
                requestedAt: string;
                taskType: string;
                taskStatus: string;
                function: { systemId: string; name: string };
              }) => (
                <div
                  key={activity.aiTaskId}
                  className="flex items-center gap-4 rounded-lg bg-muted/30 px-4 py-3 text-sm"
                >
                  <span className="text-muted-foreground whitespace-nowrap">
                    {formatDateTime(activity.requestedAt)}
                  </span>
                  <StatusBadge status={activity.taskStatus} />
                  <span className="font-medium">
                    {activity.function.systemId} {activity.function.name}
                  </span>
                  <span className="text-muted-foreground truncate">
                    {TASK_TYPE_LABEL[activity.taskType] ?? activity.taskType}
                  </span>
                </div>
              )
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
