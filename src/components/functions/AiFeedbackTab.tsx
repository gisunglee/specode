/**
 * AiFeedbackTab.tsx — 기능 상세 페이지의 "AI 피드백" 섹션 컴포넌트
 *
 * 📌 역할:
 *   1. AI가 남긴 피드백(분석 결과)을 표시
 *      - tb_function의 ai_* 캐시 컬럼들에서 데이터를 가져와 표시
 *      - 각 필드가 있을 때만 해당 섹션을 조건부 렌더링
 *
 *   2. 관련 파일 목록 + GitLab PR 링크 표시
 *
 * 📌 주요 기술:
 *   - ReactMarkdown: AI 피드백을 마크다운으로 렌더링
 *   - 조건부 렌더링: 데이터가 있을 때만 해당 섹션 표시
 */
"use client";

/* ─── 라이브러리 임포트 ──────────────────────────────────── */
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/* ─── 아이콘 임포트 ──────────────────────────────────────── */
import {
  AlertTriangle, // 경고 아이콘 (충돌, 이슈)
  Code, // 코드 아이콘 (구현 피드백)
  FileText, // 파일 아이콘 (검토 결과, 파일 목록)
  ExternalLink, // 외부 링크 아이콘 (GitLab PR)
  MessageSquare, // 말풍선 아이콘 (피드백 없음 안내)
} from "lucide-react";

/* ─── 타입 임포트 ────────────────────────────────────────── */
import type { FunctionItem } from "@/types";

/** AiFeedbackTab props 타입 */
interface AiFeedbackTabProps {
  func: FunctionItem;
}

export function AiFeedbackTab({ func }: AiFeedbackTabProps) {
  /* ─── AI 피드백 존재 여부 판단 ─────────────────────────── */
  /**
   * 📌 tb_function의 ai_* 캐시 컬럼 중 하나라도 값이 있으면 true
   *    값이 하나도 없고, 파일도 없고, PR도 없으면 "피드백 없음" 안내 표시
   */
  const hasFeedback =
    func.aiInspFeedback ||
    func.aiImplFeedback;

  /* ─── 렌더링 ───────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {!hasFeedback && !func.gitlabPrUrl ? (
        /* 피드백이 아무것도 없을 때 — 빈 상태 안내 */
        <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">
          <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>아직 AI 피드백이 없습니다.</p>
          <p className="text-sm mt-1">
            검토 요청 후 AI가 분석을 완료하면 여기에 표시됩니다.
          </p>
        </div>
      ) : (
        <>
          {/* ── AI 점검 피드백 ────────────────────────────── */}
          {func.aiInspFeedback && (
            <Section
              icon={<AlertTriangle className="h-4 w-4" />}
              title="AI 피드백"
            >
              <div className="markdown-body text-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {func.aiInspFeedback}
                </ReactMarkdown>
              </div>
            </Section>
          )}

          {/* ── 구현 피드백 ──────────────────────────────── */}
          {func.aiImplFeedback && (
            <Section icon={<Code className="h-4 w-4" />} title="구현 피드백">
              <div className="markdown-body text-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {func.aiImplFeedback}
                </ReactMarkdown>
              </div>
            </Section>
          )}

          {/* ── GitLab PR 링크 ────────────────────────────── */}
          {func.gitlabPrUrl && (
            <Section
              icon={<ExternalLink className="h-4 w-4" />}
              title="GitLab PR"
            >
              <a
                href={func.gitlabPrUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline text-sm"
              >
                {func.gitlabPrUrl}
              </a>
            </Section>
          )}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/* Section — AI 피드백 섹션을 감싸는 레이아웃 컴포넌트              */
/* ═══════════════════════════════════════════════════════════════ */

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 font-semibold text-sm bg-primary/10 border-b border-primary/20 px-5 py-2.5">
        {icon}
        {title}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
