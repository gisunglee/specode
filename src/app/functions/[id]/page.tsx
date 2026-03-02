/**
 * FunctionDetailPage — 기능 상세 페이지 (functions/[id])
 *
 * 📌 역할:
 *   - 하나의 기능(Function)에 대한 모든 정보를 한 페이지에 표시
 *   - 기본정보, 설계정보, AI피드백, 이력 4개 섹션을 스크롤로 탐색
 *   - 상단 sticky 탭 네비게이션 + 콤팩트 헤더 (스크롤 시 자동 전환)
 *   - 상태(Status) 변경 드롭다운 (AI 요청 시 확인 대화상자 표시)
 *
 * 📌 URL 구조:
 *   /functions/[id] — id는 기능의 functionId (PK, 정수)
 *   예: /functions/5 → functionId가 5인 기능의 상세 페이지
 *
 * 📌 페이지 레이아웃:
 *   ┌─────────────────────────────────────────────────────┐
 *   │ [←] FID-00005 (코드) — 기능명    [상태 드롭다운]     │  ← Full Header (스크롤하면 사라짐)
 *   ├─────────────────────────────────────────────────────┤
 *   │ [AI 요약 메시지] (있을 때만)                          │
 *   ├─────────────────────────────────────────────────────┤
 *   │ [←] FID-00005 기능명  [상태]  ← Compact Header      │  ← Sticky Nav (상단 고정)
 *   │ [기본정보] [설계정보] [AI피드백] [이력] ← 탭 버튼      │
 *   ├─────────────────────────────────────────────────────┤
 *   │ ■ 기본정보 섹션 (BasicInfoTab)                       │
 *   │ ■ 설계정보 섹션 (DesignInfoTab)                      │
 *   │ ■ AI피드백 섹션 (AiFeedbackTab)                      │
 *   │ ■ 이력 섹션 (HistoryTab)                             │
 *   └─────────────────────────────────────────────────────┘
 *
 * 📌 핵심 기술:
 *   - IntersectionObserver: 스크롤 위치 감지 (활성 탭 추적 + 헤더 숨김 감지)
 *   - scrollIntoView: 탭 클릭 시 해당 섹션으로 부드럽게 스크롤
 *   - sticky positioning: 탭 바가 스크롤해도 화면 상단에 고정
 *   - key={dataUpdatedAt}: 데이터 갱신 시 자식 폼 컴포넌트 재생성
 *   - use(params): Next.js 16에서 Promise 기반 route params를 언래핑
 */
"use client";

/* ─── React / Next.js 임포트 ─────────────────────────────── */
import { use, useRef, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation"; // Next.js 클라이언트 라우터 (페이지 이동용)
import { ArrowLeft, Info, ChevronDown, History, Bot } from "lucide-react"; // 아이콘 라이브러리
import { motion } from "framer-motion"; // 애니메이션 라이브러리 (AI 요약 등장 효과)

/* ─── UI 컴포넌트 임포트 ─────────────────────────────────── */
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"; // AI 요청 이력 팝업 다이얼로그
import { StatusBadge } from "@/components/common/StatusBadge"; // 상태 배지 (색상 코딩)
import { ConfirmDialog } from "@/components/common/ConfirmDialog"; // 확인 대화상자

/* ─── 상수 & 유틸 임포트 ─────────────────────────────────── */
import {
  USER_SELECTABLE_STATUSES, // 사용자가 선택 가능한 상태 목록 (AI 전용 상태 제외)
  AI_REQUEST_STATUSES, // AI 요청이 필요한 상태들 (검토요청, 구현요청, 변경검토요청)
  FUNC_STATUS_LABEL, // 상태 코드 → 한글 라벨 매핑
} from "@/lib/constants";
import { cn } from "@/lib/utils"; // Tailwind 클래스 병합 유틸

/* ─── 탭 컴포넌트 임포트 ─────────────────────────────────── */
import { BasicInfoTab } from "@/components/functions/BasicInfoTab"; // 기본정보 탭
import { DesignInfoTab } from "@/components/functions/DesignInfoTab"; // 설계정보 탭
import { AiFeedbackTab } from "@/components/functions/AiFeedbackTab"; // AI 피드백 탭
import { HistoryTab } from "@/components/functions/HistoryTab"; // 이력 탭

/**
 * SECTIONS — 탭 네비게이션에 표시할 섹션 목록
 * id: 프로그래밍용 식별자 (sectionRefs 키, scrollToSection 인자)
 * label: 사용자에게 보여지는 한글 이름
 *
 * 📌 "as const"로 선언하면 TypeScript가 값을 리터럴 타입으로 추론
 *    → id가 string이 아니라 "basic" | "design" | "ai-feedback" | "history"
 */
/**
 * 📌 SECTIONS — 탭 네비게이션에 표시할 섹션 목록 (3개)
 *    "AI 요청 이력"은 탭이 아니라 팝업 다이얼로그로 변경되었으므로 제거
 */
const SECTIONS = [
  { id: "basic", label: "기본정보" },
  { id: "design", label: "설계정보" },
  { id: "ai-feedback", label: "AI피드백" },
] as const;

/**
 * FunctionDetailPage — 기능 상세 페이지 컴포넌트
 *
 * 📌 Next.js 16에서 route params는 Promise로 전달됩니다.
 *    React의 use() 훅으로 Promise를 언래핑해서 { id } 추출
 *
 * @param params - URL 경로 파라미터 (Promise<{ id: string }>)
 *                 예: /functions/5 → id = "5"
 */
export default function FunctionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  /**
   * use(params): React 19의 use() 훅으로 Promise를 언래핑
   * Next.js 16에서는 params가 Promise이므로 이 방식이 필수
   * (이전 Next.js에서는 params를 직접 구조분해 할 수 있었음)
   */
  const { id } = use(params);

  /** Next.js 라우터 — router.push("/functions")로 목록 페이지 이동 */
  const router = useRouter();

  /** TanStack Query 캐시 관리자 — 상태 변경 후 데이터 갱신에 사용 */
  const queryClient = useQueryClient();

  /* ─── 상태(State) 관리 ─────────────────────────────────── */
  /**
   * statusDialog: AI 요청 확인 대화상자에 표시할 상태값
   *   - null이면 대화상자 닫힘
   *   - "REVIEW_REQ" 등이면 대화상자 열림 + 해당 상태로 변경 확인
   */
  const [statusDialog, setStatusDialog] = useState<string | null>(null);

  /** activeSection: 현재 스크롤 위치에 해당하는 활성 섹션 ID */
  const [activeSection, setActiveSection] = useState("basic");

  /**
   * gsComment: GS 코멘트 (AI에게 전달할 추가 메시지)
   *
   * 📌 AiFeedbackTab의 textarea와 양방향 바인딩
   *    상태를 AI 요청 상태로 변경하면 이 값이 AiTask.comment에 저장됨
   *    상태 변경 성공 후 자동으로 초기화
   */
  const [gsComment, setGsComment] = useState("");

  /** statusOpen: 상태 변경 드롭다운 메뉴 열림/닫힘 */
  const [statusOpen, setStatusOpen] = useState(false);

  /**
   * historyOpen: AI 요청 이력 팝업 다이얼로그 열림/닫힘
   * 📌 설계정보 타이틀 행의 "AI 요청 이력" 버튼 클릭 시 true → Dialog 표시
   */
  const [historyOpen, setHistoryOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  /**
   * statusSaved: 상태 변경 후 "저장됨" 피드백 표시 여부
   * 📌 상태 변경(PATCH) 성공 → true → 2초 후 자동으로 false
   *    → StatusSelector 옆에 "저장됨 ✓" 애니메이션 표시
   */
  const [statusSaved, setStatusSaved] = useState(false);

  /**
   * headerHidden: 전체 헤더가 스크롤로 화면 밖으로 나갔는지 여부
   * true이면 → 콤팩트 헤더를 sticky nav 안에 표시
   */
  const [headerHidden, setHeaderHidden] = useState(false);

  /* ─── Ref 관리 ─────────────────────────────────────────── */
  /**
   * sectionRefs: 각 섹션의 DOM 요소 참조
   * → IntersectionObserver로 스크롤 위치 감지에 사용
   * → scrollToSection()에서 해당 섹션으로 스크롤에 사용
   *
   * 📌 Record<string, HTMLElement | null> 형태로 동적 키 사용
   *    각 <section>의 ref 콜백에서 sectionRefs.current[sectionId] = el 로 저장
   */
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  /** statusRef: 상태 드롭다운 DOM 참조 — 외부 클릭 감지에 사용 */
  const statusRef = useRef<HTMLDivElement>(null);

  /** headerRef: 전체 헤더 DOM 참조 — 스크롤 숨김 감지에 사용 */
  const headerRef = useRef<HTMLDivElement>(null);

  /* ─── API 데이터 조회 ──────────────────────────────────── */
  /**
   * useQuery: TanStack Query의 데이터 조회 훅
   *
   * - queryKey: 캐시 키 → ["function", "5"] 형태
   *   다른 곳에서 invalidateQueries({ queryKey: ["function", "5"] })
   *   호출하면 이 쿼리가 자동으로 다시 실행됨
   *
   * - data: API 응답 데이터 ({ success: true, data: {...} })
   * - isLoading: 최초 로딩 중 여부 (로딩 스피너 표시)
   * - dataUpdatedAt: 데이터가 마지막으로 갱신된 타임스탬프 (밀리초)
   *   → 자식 컴포넌트의 key prop으로 전달하여 폼 상태 초기화에 사용
   */
  /**
   * 📌 gcTime: 0
   *    → 컴포넌트가 언마운트되면 캐시를 즉시 삭제
   *    → 다시 이 페이지에 들어올 때 항상 DB에서 새로 조회
   *    → "목록 갔다가 다시 상세 들어가면 예전 데이터가 보이는" 문제 해결
   *
   * 📌 staleTime: 0 (기본값)
   *    → 데이터를 항상 "오래된 것"으로 취급 → 마운트 시 무조건 refetch
   */
  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["function", id],
    queryFn: async () => {
      // GET /api/functions/[id] — 기능 상세 데이터 + 연관 데이터 조회
      const res = await fetch(`/api/functions/${id}`);
      return res.json();
    },
    gcTime: 0,
  });

  /* ─── 상태 변경 뮤테이션 ───────────────────────────────── */
  /**
   * statusMutation: 기능 상태를 변경하는 API 호출
   * PATCH /api/functions/[id] — { status: "REVIEW_REQ" } 등
   *
   * 📌 API 서버에서 자동으로 처리하는 것들:
   *   - 상태값 유효성 검증 (ALL_STATUSES에 포함 여부)
   *   - AI 요청 상태(REVIEW_REQ, IMPL_REQ, CHANGE_REQ)인 경우
   *     자동으로 tb_ai_task 레코드 생성 → AI가 폴링으로 가져감
   */
  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      /**
       * 📌 PATCH /api/functions/[id] — 상태 변경 요청
       *    comment: GS 코멘트가 있으면 함께 전달
       *    → AI 요청 상태일 때 AiTask.comment에 저장되어 AI에게 전달됨
       */
      const res = await fetch(`/api/functions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          comment: gsComment.trim() || undefined,
        }),
      });
      return res.json();
    },
    onSuccess: () => {
      // 📌 상태 변경 성공 → 캐시 무효화 → 자동 refetch → UI 갱신
      queryClient.invalidateQueries({ queryKey: ["function", id] });
      /**
       * 📌 목록 페이지 캐시도 무효화
       *    → 목록으로 돌아갔을 때 변경된 상태가 바로 반영됨
       */
      queryClient.invalidateQueries({ queryKey: ["functions"] });
      setStatusDialog(null); // AI 요청 확인 대화상자 닫기
      setGsComment(""); // GS 코멘트 초기화 (전달 완료)

      /**
       * 📌 "저장됨 ✓" 피드백 표시
       *    → 2초 후 자동으로 사라짐
       *    → 사용자에게 상태가 즉시 DB에 저장되었음을 시각적으로 알림
       */
      setStatusSaved(true);
      setTimeout(() => setStatusSaved(false), 2000);
    },
  });

  /* ─── 드롭다운 외부 클릭 감지 ──────────────────────────── */
  /**
   * 📌 상태 드롭다운 메뉴가 열려있을 때, 메뉴 밖을 클릭하면 닫히도록
   *    document에 mousedown 이벤트 리스너를 등록
   *
   *    statusRef.current.contains(e.target): 클릭한 곳이 드롭다운 안인지 확인
   *    → 밖이면 setStatusOpen(false)
   *
   *    return () => ...: useEffect 클린업 함수
   *    → 컴포넌트가 사라질 때 이벤트 리스너 정리 (메모리 누수 방지)
   */
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* ─── 헤더 숨김 감지 (IntersectionObserver) ────────────── */
  /**
   * 📌 IntersectionObserver: 특정 DOM 요소가 화면(viewport)에 보이는지 감지하는 브라우저 API
   *
   * 여기서는 headerRef(전체 헤더)가 화면 밖으로 스크롤되었는지 감지합니다.
   *
   * - entry.isIntersecting === true: 헤더가 화면에 보임 → headerHidden = false
   * - entry.isIntersecting === false: 헤더가 화면 밖 → headerHidden = true
   *
   * rootMargin: "-56px 0px 0px 0px"
   *   → 상단 56px(레이아웃 Header 높이 h-14 = 3.5rem = 56px)을 제외
   *   → 레이아웃 Header 뒤에 숨겨진 것도 "화면 밖"으로 판단
   *
   * 의존성: [data] — 데이터가 로드된 후 DOM이 생성되면 observer 시작
   */
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHeaderHidden(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-56px 0px 0px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [data]);

  /* ─── 활성 섹션 추적 (IntersectionObserver) ────────────── */
  /**
   * 📌 각 섹션(<section>)이 화면의 특정 영역에 들어오면 해당 탭을 활성화
   *
   * rootMargin: "-120px 0px -70% 0px"
   *   → 상단 120px 아래부터, 하단 70% 위까지만 "교차 영역"으로 인정
   *   → 이렇게 하면 섹션 상단이 화면 중상단에 올 때 활성화됨
   *   → 자연스러운 스크롤 추적 효과
   *
   * 📌 각 섹션마다 별도의 IntersectionObserver를 생성합니다.
   *    클린업 함수에서 모든 observer를 disconnect()
   */
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    SECTIONS.forEach(({ id: sectionId }) => {
      const el = sectionRefs.current[sectionId];
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSection(sectionId);
          }
        },
        { rootMargin: "-120px 0px -70% 0px" }
      );
      observer.observe(el);
      observers.push(observer);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [data]);

  /**
   * scrollToSection — 탭 클릭 시 해당 섹션으로 부드럽게 스크롤
   *
   * scrollIntoView({ behavior: "smooth", block: "start" }):
   *   - behavior: "smooth" → 부드러운 스크롤 애니메이션
   *   - block: "start" → 섹션 상단이 화면 상단에 오도록
   *
   * 📌 scroll-mt-32 클래스가 각 섹션에 적용되어 있어서,
   *    sticky nav에 가려지지 않도록 상단 여백(128px)이 확보됩니다.
   */
  const scrollToSection = (sectionId: string) => {
    sectionRefs.current[sectionId]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  /**
   * handleStatusChange — 상태 변경 처리
   *
   * 📌 두 가지 분기:
   *   1. AI 요청 상태 (REVIEW_REQ, IMPL_REQ, CHANGE_REQ)
   *      → 확인 대화상자를 먼저 보여줌 ("AI에게 요청하시겠습니까?")
   *      → 사용자가 "요청" 클릭 → statusMutation.mutate() 실행
   *
   *   2. 일반 상태 (DRAFT, REVIEW_DONE, CONFIRM_Y, IMPL_DONE)
   *      → 바로 저장 (확인 없이 즉시 PATCH 요청)
   */
  const handleStatusChange = (status: string) => {
    setStatusOpen(false); // 드롭다운 닫기

    if (AI_REQUEST_STATUSES.includes(status)) {
      // AI 요청 상태 → 확인 대화상자 표시
      setStatusDialog(status);
    } else {
      // 일반 상태 → 즉시 저장
      statusMutation.mutate(status);
    }
  };

  /* ─── 로딩 & 에러 상태 렌더링 ──────────────────────────── */

  /** 최초 로딩 중일 때 표시 */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        로딩 중...
      </div>
    );
  }

  /** 데이터가 없을 때 (잘못된 ID 등) */
  const func = data?.data;
  if (!func) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        기능을 찾을 수 없습니다.
      </div>
    );
  }

  /* ─── 파생 데이터 계산 ─────────────────────────────────── */

  /**
   * availableStatuses: 상태 드롭다운에 표시할 옵션들
   * 현재 상태를 제외한 모든 사용자 선택 가능 상태
   *
   * 📌 USER_SELECTABLE_STATUSES에는 AI_REVIEWING, AI_IMPLEMENTING이 없음
   *    → 이 두 상태는 AI만 설정 가능 (사용자가 수동으로 선택 불가)
   */
  const availableStatuses = USER_SELECTABLE_STATUSES.filter(
    (s) => s !== func.status
  );

  /**
   * isAiWorking: AI가 현재 작업 중인지 여부
   * true이면 상태 드롭다운 대신 "처리중..." 애니메이션 표시
   */
  const isAiWorking =
    func.status === "AI_REVIEWING" || func.status === "AI_IMPLEMENTING";

  /* ─── 메인 렌더링 ──────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════════ */}
      {/* Full Header — 스크롤하면 화면 밖으로 사라지는 전체 헤더    */}
      {/*                                                        */}
      {/* 📌 ref={headerRef}: IntersectionObserver가 이 요소의     */}
      {/*    가시성을 추적하여 headerHidden 상태를 결정합니다.       */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div ref={headerRef} className="flex items-center justify-between">
        {/* 왼쪽: 뒤로가기 버튼 + 기능 ID + 기능명 */}
        <div className="flex items-center gap-3">
          {/* 뒤로가기 버튼 — 기능 목록 페이지로 이동 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/functions")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div>
            {/* 기능 시스템 ID + 표시용 코드 */}
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">
                {func.systemId}
                {func.displayCode && (
                  <span className="text-muted-foreground ml-1">
                    ({func.displayCode})
                  </span>
                )}
              </h1>
            </div>
            {/* 기능명 + 소속 화면명 */}
            <p className="text-sm text-muted-foreground mt-0.5">
              <span className="font-medium text-foreground">{func.name}</span>
              {func.screen?.name && (
                <span className="ml-1">— {func.screen.name}</span>
              )}
            </p>
          </div>
        </div>

        {/* 오른쪽: 상태 선택 드롭다운 + 저장됨 피드백 */}
        <StatusSelector
          currentStatus={func.status}
          availableStatuses={availableStatuses}
          isAiWorking={isAiWorking}
          statusOpen={statusOpen}
          setStatusOpen={setStatusOpen}
          onStatusChange={handleStatusChange}
          statusRef={statusRef}
          statusSaved={statusSaved}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* AI 요약 메시지 — aiSummary가 있을 때만 표시              */}
      {/*                                                        */}
      {/* 📌 motion.div: framer-motion 라이브러리의 애니메이션 div  */}
      {/*    initial → animate 로 등장 애니메이션 (위에서 아래로)    */}
      {/* ═══════════════════════════════════════════════════════ */}
      {func.aiSummary && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-primary/30 bg-primary/5 p-4"
        >
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-sm">{func.aiSummary}</p>
          </div>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* Sticky Navigation Bar — 화면 상단에 고정되는 탭 네비게이션 */}
      {/*                                                        */}
      {/* 📌 sticky top-14: 레이아웃 Header(h-14 = 56px) 바로 아래에 고정 */}
      {/* 📌 z-20: Header(z-30)보다 낮지만 일반 콘텐츠보다 높은 z-index */}
      {/* 📌 -mx-6 px-6: 부모 padding을 상쇄하여 전체 너비로 확장    */}
      {/* 📌 bg-background/95 + backdrop-blur-sm: 반투명 배경 + 블러 효과 */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="sticky top-14 z-20 -mx-6 px-6 bg-background/95 backdrop-blur-sm border-b border-border">
        {/*
         * 콤팩트 헤더 — Full Header가 스크롤로 사라졌을 때만 표시
         *
         * 📌 headerHidden === true일 때만 렌더링
         *    → 기능 ID, 기능명, 상태 드롭다운을 한 줄에 압축 표시
         *    → 사용자가 항상 현재 기능 정보와 상태를 확인할 수 있음
         */}
        {headerHidden && (
          <div className="flex items-center justify-between py-2">
            {/* 왼쪽: 뒤로가기 + 기능 ID + 기능명 (작은 크기) */}
            <div className="flex items-center gap-2 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => router.push("/functions")}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-sm font-semibold truncate">
                {func.systemId}
              </span>
              {/* sm:inline — 모바일에서는 숨기고 데스크톱에서만 표시 */}
              <span className="text-sm text-muted-foreground truncate hidden sm:inline">
                {func.name}
              </span>
            </div>

            {/* 오른쪽: 콤팩트 상태 드롭다운 (compact=true) */}
            <StatusSelector
              currentStatus={func.status}
              availableStatuses={availableStatuses}
              isAiWorking={isAiWorking}
              statusOpen={statusOpen}
              setStatusOpen={setStatusOpen}
              onStatusChange={handleStatusChange}
              statusRef={statusRef}
              statusSaved={statusSaved}
              compact
            />
          </div>
        )}

        {/* ── 탭 네비게이션 ───────────────────────────────── */}
        {/*
         * 📌 각 탭 버튼 클릭 → scrollToSection(섹션ID) 호출
         *    → 해당 섹션으로 부드럽게 스크롤
         *
         * activeSection과 일치하는 탭은 bg-primary로 강조 표시
         */}
        <nav className="flex gap-1 py-2">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer",
                activeSection === section.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {section.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* Section: 기본정보                                       */}
      {/*                                                        */}
      {/* 📌 ref 콜백: DOM 요소를 sectionRefs에 저장               */}
      {/*    (ref={el => { sectionRefs.current["basic"] = el }})  */}
      {/*                                                        */}
      {/* 📌 scroll-mt-32: sticky nav에 가려지지 않도록 상단 128px 여백 */}
      {/*                                                        */}
      {/* 📌 key={`basic-${dataUpdatedAt}`}:                      */}
      {/*    데이터 갱신 → key 변경 → 컴포넌트 완전 재생성           */}
      {/*    → useState 초기값이 최신 서버 데이터로 리셋             */}
      {/* ═══════════════════════════════════════════════════════ */}
      {/*
       * 📌 BasicInfoTab이 자체적으로 "기본정보" 타이틀 + 저장 버튼을 렌더링
       *    → 별도의 h2 불필요 (DesignInfoTab과 동일한 패턴)
       */}
      <section
        ref={(el) => {
          sectionRefs.current["basic"] = el;
        }}
        className="scroll-mt-32"
      >
        <BasicInfoTab key={`basic-${dataUpdatedAt}`} func={func} />
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* Section: 설계정보                                       */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section
        ref={(el) => {
          sectionRefs.current["design"] = el;
        }}
        className="scroll-mt-32"
      >
        <DesignInfoTab
          key={`design-${dataUpdatedAt}`}
          func={func}
          gsComment={gsComment}
          onGsCommentChange={setGsComment}
          headerExtra={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFeedbackOpen(true)}
              >
                <Bot className="h-3.5 w-3.5 mr-1.5" />
                AI 피드백
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHistoryOpen(true)}
              >
                <History className="h-3.5 w-3.5 mr-1.5" />
                AI 요청 이력
              </Button>
            </>
          }
        />
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* Section: AI 피드백                                      */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section
        ref={(el) => {
          sectionRefs.current["ai-feedback"] = el;
        }}
        className="scroll-mt-32"
      >
        <h2 className="text-lg font-semibold mb-3">AI 피드백</h2>
        <AiFeedbackTab func={func} />
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* AI 요청 이력 팝업 다이얼로그                               */}
      {/*                                                        */}
      {/* 📌 설계정보 타이틀 행의 "AI 요청 이력" 버튼 클릭 시 열림    */}
      {/*    HistoryTab 컴포넌트를 팝업 안에서 그대로 렌더링          */}
      {/*    max-w-4xl: 이력 내용이 넓으므로 큰 다이얼로그 사용       */}
      {/*    max-h-[80vh] overflow-y-auto: 이력이 많을 때 스크롤      */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI 요청 이력</DialogTitle>
          </DialogHeader>
          <HistoryTab func={func} />
        </DialogContent>
      </Dialog>

      {/* AI 피드백 팝업 다이얼로그 */}
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="sticky top-0 z-10 bg-primary/10 border-b border-primary/20 px-6 py-3 rounded-t-lg">
            <DialogTitle>AI 피드백</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 px-6 py-4">
            <AiFeedbackTab func={func} />
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* AI 요청 확인 대화상자                                    */}
      {/*                                                        */}
      {/* 📌 statusDialog가 null이 아닐 때 표시                    */}
      {/*    사용자가 "요청" 클릭 → statusMutation.mutate(상태값)   */}
      {/*    → API에서 상태 변경 + AI 태스크 자동 생성              */}
      {/* ═══════════════════════════════════════════════════════ */}
      <ConfirmDialog
        open={!!statusDialog}
        onOpenChange={() => setStatusDialog(null)}
        title="AI 요청"
        description={`"${FUNC_STATUS_LABEL[statusDialog ?? ""]}" — AI 에게 요청 하시겠습니까?`}
        confirmLabel="요청"
        onConfirm={() => statusDialog && statusMutation.mutate(statusDialog)}
        loading={statusMutation.isPending}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/* StatusSelector — 상태 선택 드롭다운 컴포넌트 (재사용)            */
/*                                                                */
/* 📌 Full Header와 Compact Header 양쪽에서 동일한 드롭다운을 사용  */
/*    compact prop으로 크기만 조절                                  */
/*                                                                */
/* 📌 AI가 작업 중(AI_REVIEWING, AI_IMPLEMENTING)이면              */
/*    드롭다운 대신 "처리중..." 애니메이션을 표시                    */
/* ═══════════════════════════════════════════════════════════════ */

function StatusSelector({
  currentStatus,
  availableStatuses,
  isAiWorking,
  statusOpen,
  setStatusOpen,
  onStatusChange,
  statusRef,
  compact = false,
  statusSaved = false,
}: {
  currentStatus: string; // 현재 기능의 상태 코드
  availableStatuses: string[]; // 선택 가능한 상태 목록 (현재 상태 제외)
  isAiWorking: boolean; // AI 작업 중 여부
  statusOpen: boolean; // 드롭다운 열림 상태
  setStatusOpen: (open: boolean) => void; // 드롭다운 열림/닫힘 제어
  onStatusChange: (status: string) => void; // 상태 선택 핸들러
  statusRef: React.RefObject<HTMLDivElement | null>; // 외부 클릭 감지용 ref
  compact?: boolean; // true이면 콤팩트 크기 (Compact Header용)
  statusSaved?: boolean; // 상태 저장 완료 시 true → "저장됨 ✓" 표시
}) {
  /* AI 작업 중이면 드롭다운 대신 상태 배지 + "처리중..." 표시 */
  if (isAiWorking) {
    return (
      <div className="flex items-center gap-2">
        <StatusBadge status={currentStatus} />
        {/* animate-pulse-glow: 커스텀 애니메이션 (globals.css에 정의) */}
        <span className="text-sm text-muted-foreground animate-pulse-glow">
          처리중...
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/*
       * 📌 "저장됨" 피드백 또는 "즉시 저장" 안내
       *
       *    statusSaved === true → "저장됨 ✓" (초록색, 2초 후 사라짐)
       *    statusSaved === false → "즉시 저장" (회색 안내)
       *    compact === true → 안내 숨김 (콤팩트 헤더에서는 공간 절약)
       */}
      {!compact && (
        statusSaved ? (
          <span className="text-xs text-emerald-600 font-medium animate-pulse">
            저장됨 ✓
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">
            즉시 저장
          </span>
        )
      )}

      <div className="relative" ref={statusRef}>
        {/*
         * 드롭다운 트리거 버튼
         * - 현재 상태 배지 + 화살표 아이콘
         * - 클릭하면 드롭다운 메뉴 토글
         * - compact가 true이면 패딩이 작은 버전
         */}
        <button
          onClick={() => availableStatuses.length > 0 && setStatusOpen(!statusOpen)}
          className={cn(
            "flex items-center gap-2 rounded-lg border border-border bg-card transition-colors",
            compact ? "px-2 py-1" : "px-3 py-2",
            availableStatuses.length > 0
              ? "hover:bg-muted/50 cursor-pointer"
              : "cursor-default"
          )}
        >
          <StatusBadge status={currentStatus} />
          {/* ChevronDown: 화살표 아이콘 — 드롭다운이 열리면 180도 회전 */}
          {availableStatuses.length > 0 && (
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                statusOpen && "rotate-180"
              )}
            />
          )}
        </button>

        {/*
         * 드롭다운 메뉴 — statusOpen이 true일 때만 렌더링
         *
         * 📌 absolute right-0 top-full: 트리거 버튼 바로 아래에 오른쪽 정렬
         * 📌 z-50: 모든 콘텐츠 위에 표시 (다른 sticky 요소보다 높게)
         * 📌 min-w-[200px]: 최소 너비 확보 (상태 이름이 잘리지 않도록)
         */}
        {statusOpen && availableStatuses.length > 0 && (
          <div className="absolute right-0 top-full mt-1 z-50 min-w-[200px] rounded-lg border border-border bg-card shadow-lg py-1">
            {/* 드롭다운 제목 + 즉시 저장 안내 */}
            <p className="px-3 py-1.5 text-xs text-muted-foreground font-medium">
              상태 변경 <span className="text-[10px] opacity-60">— 선택 시 바로 저장됩니다</span>
            </p>

            {/* 상태 옵션 목록 */}
            {availableStatuses.map((status) => (
              <button
                key={status}
                onClick={() => onStatusChange(status)}
                className="flex items-center gap-2 w-full px-3 py-2 hover:bg-muted/50 transition-colors text-sm cursor-pointer"
              >
                {/* 상태 배지 (색상 코딩) */}
                <StatusBadge status={status} />

                {/*
                 * AI 요청 상태에는 "AI요청" 라벨 추가 표시
                 * 이 상태를 선택하면 확인 대화상자가 뜨고,
                 * 확인 시 자동으로 AI 태스크가 생성됨
                 */}
                {AI_REQUEST_STATUSES.includes(status) && (
                  <span className="text-[11px] text-amber-600 font-medium">
                    AI요청
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
