/**
 * HistoryTab.tsx — 기능 상세 페이지의 "AI 요청 이력" 섹션 컴포넌트
 *
 * 📌 역할:
 *   - tb_ai_task 테이블의 모든 AI 작업 이력을 시간순(최신 먼저)으로 표시
 *   - 각 태스크를 클릭하면 개별적으로 펼침/접기 (여러 개 동시 펼침 가능)
 *
 * 📌 표시 구조 (접힌 상태):
 *   ▶ 2026.02.28 14:00  [설계검토]  완료  ATK-00001
 *
 * 📌 표시 구조 (펼친 상태):
 *   ▼ 2026.02.28 14:00  [설계검토]  완료  ATK-00001
 *     ┌─ 요청 시점 설계 (spec 스냅샷) ─┐
 *     │  spec 내용...                   │
 *     └────────────────────────────────┘
 *     ┌─ [GS 요청] (comment가 있을 때) ─┐
 *     │  GS 코멘트 내용...              │
 *     └────────────────────────────────┘
 *     ┌─ AI 피드백 ────────────────────┐
 *     │  feedback 내용 (마크다운)       │
 *     └────────────────────────────────┘
 *     ┌─ 관련 파일 ────────────────────┐
 *     │  src/main/java/...             │
 *     └────────────────────────────────┘
 *     완료: 2026.02.28 14:30
 *
 * 📌 v6 변경사항:
 *   - 아코디언(한 번에 하나) → 개별 토글(여러 개 동시 펼침 가능)
 *   - expandedTask: number|null → expandedTasks: Set<number>
 */
"use client";

/* ─── React / 라이브러리 임포트 ──────────────────────────── */
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/* ─── 아이콘 임포트 ──────────────────────────────────────── */
import {
  ChevronDown, // 펼침 화살표
  ChevronRight, // 접힘 화살표
  History, // 이력 아이콘
  FileText, // 파일/설계 아이콘
  MessageSquare, // GS 코멘트 아이콘
} from "lucide-react";

/* ─── 유틸 & 타입 임포트 ─────────────────────────────────── */
import { formatDateTime } from "@/lib/utils";
import type { FunctionItem } from "@/types";

/** HistoryTab props 타입 */
interface HistoryTabProps {
  func: FunctionItem;
}

/**
 * 작업 유형(taskType) 코드 → 한글 라벨 매핑
 * API/DB에는 영문 코드로 저장, 화면에는 한글로 표시
 */
const TASK_TYPE_LABEL: Record<string, string> = {
  DESIGN: "설계요청",
  REVIEW: "설계검토",
  IMPLEMENT: "코드구현",
  IMPACT: "영향도분석",
  REPROCESS: "재처리",
};

/**
 * 작업 상태(taskStatus) 코드 → 한글 라벨 매핑
 */
const TASK_STATUS_LABEL: Record<string, string> = {
  PENDING: "대기",
  RUNNING: "진행중",
  DONE: "완료",
  FAILED: "실패",
};

/**
 * HistoryTab — AI 요청 이력 탭 메인 컴포넌트
 *
 * 📌 func.tasks: API에서 requestedAt DESC로 정렬되어 옴
 *    → 최신 태스크가 맨 위에 표시됨
 */
export function HistoryTab({ func }: HistoryTabProps) {
  /**
   * expandedTasks: 현재 펼쳐진 태스크들의 aiTaskId 집합 (Set)
   *
   * 📌 여러 태스크를 동시에 펼칠 수 있음
   *    클릭 → Set에 있으면 제거(접힘), 없으면 추가(펼침)
   */
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());

  /**
   * 개별 토글 핸들러
   * 📌 Set은 immutable하게 교체해야 React가 상태 변경을 감지
   *    → new Set(prev)로 복사 후 add/delete → 새 Set으로 교체
   */
  const toggleTask = (id: number) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  /* ─── 렌더링 ───────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-5 space-y-3">
        {/* 섹션 제목 */}
        <div className="flex items-center gap-2 font-semibold text-sm">
          <History className="h-4 w-4" />
          AI 요청 이력
        </div>

        {/* 태스크 목록 (없으면 빈 상태 안내) */}
        {!func.tasks || func.tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            AI 요청 이력이 없습니다.
          </p>
        ) : (
          <div className="space-y-1">
            {func.tasks.map((task) => {
              /** 📌 이 태스크가 현재 펼쳐져 있는지 여부 */
              const isExpanded = expandedTasks.has(task.aiTaskId);

              return (
                <div key={task.aiTaskId}>
                  {/*
                   * ── 태스크 헤더 (클릭으로 펼침/접기) ──
                   *
                   * 표시 내용:
                   *   [▶/▼] [날짜시간] [작업유형 배지] [상태] [시스템ID]
                   *
                   * 📌 cursor-pointer + hover 효과로 클릭 가능함을 시각적으로 표시
                   */}
                  <button
                    onClick={() => toggleTask(task.aiTaskId)}
                    className="flex items-center gap-2 w-full text-left rounded-md hover:bg-muted/30 px-3 py-2.5 transition-colors cursor-pointer"
                  >
                    {/* 펼침/접힘 화살표 아이콘 */}
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}

                    {/* 요청 일시 */}
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(task.requestedAt)}
                    </span>

                    {/* 작업 유형 배지 (설계검토, 코드구현 등) */}
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                      {TASK_TYPE_LABEL[task.taskType] ?? task.taskType}
                    </span>

                    {/* 작업 상태 (대기, 진행중, 완료, 실패) */}
                    <span className="text-xs text-muted-foreground">
                      {TASK_STATUS_LABEL[task.taskStatus] ?? task.taskStatus}
                    </span>

                    {/* 시스템 ID (ATK-00001 등) */}
                    <span className="text-sm truncate">{task.systemId}</span>

                    {/* GS 코멘트가 있으면 아이콘으로 힌트 표시 */}
                    {task.comment && (
                      <MessageSquare className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                    )}
                  </button>

                  {/*
                   * ── 태스크 상세 내용 (펼쳤을 때만 표시) ──
                   *
                   * 순서: spec → comment → feedback → files → 완료시각
                   */}
                  {isExpanded && (
                    <div className="ml-9 space-y-3 mb-2">
                      {/* ── 요청 시점 설계 (spec 스냅샷) ──── */}
                      {task.spec && (
                        <div className="rounded-md bg-muted/20 p-4">
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            <FileText className="h-3 w-3 inline mr-1" />
                            요청 시점 설계
                          </p>
                          <p className="text-sm whitespace-pre-wrap">
                            {task.spec}
                          </p>
                        </div>
                      )}

                      {/* ── GS 요청 (comment가 있을 때만) ── */}
                      {task.comment && (
                        <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-4">
                          <p className="text-xs font-medium text-amber-600 mb-1">
                            <MessageSquare className="h-3 w-3 inline mr-1" />
                            GS 요청
                          </p>
                          <p className="text-sm">{task.comment}</p>
                        </div>
                      )}

                      {/* ── AI 피드백 (마크다운 렌더링) ──── */}
                      {task.feedback && (
                        <div className="rounded-md bg-primary/5 border border-primary/20 p-4">
                          <p className="text-xs font-medium text-primary mb-1">
                            AI 결과
                          </p>
                          <div className="prose prose-sm max-w-none text-sm">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {task.feedback}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}

                      {/* ── 관련 파일 목록 ──────────────── */}
                      {task.files && task.files.length > 0 && (
                        <div className="rounded-md bg-muted/20 p-3">
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            관련 파일
                          </p>
                          {task.files.map((f) => (
                            <div
                              key={f.funcFileId}
                              className="text-xs font-mono py-0.5"
                            >
                              {f.filePath}
                              {f.description && (
                                <span className="text-muted-foreground ml-2">
                                  — {f.description}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* ── 완료 시각 ───────────────────── */}
                      {task.completedAt && (
                        <p className="text-xs text-muted-foreground">
                          완료: {formatDateTime(task.completedAt)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
