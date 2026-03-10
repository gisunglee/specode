/**
 * seed.ts — 샘플 데이터 초기화 스크립트
 *
 * 📌 실행 방법: npm run db:seed
 * 📌 기존 데이터를 전부 삭제하고 새로 생성합니다.
 *
 * 📌 생성되는 데이터:
 *   - 요구사항 3건 (예산서, 인사관리, 공통코드)
 *   - 화면 7건
 *   - 기능 15건 (다양한 상태)
 *   - AI 태스크 5건 (REVIEW, IMPLEMENT, REPROCESS 등)
 *   - 참조 테이블/공통 프로그램 참조 데이터
 *   - 기능 간 관계 데이터
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  /* ─── 기존 데이터 전부 삭제 (순서 중요: FK 의존성) ────────── */
  await prisma.aiTask.deleteMany();
  await prisma.function.deleteMany();
  await prisma.area.deleteMany();
  await prisma.screen.deleteMany();
  await prisma.requirement.deleteMany();

  /* ─── 시퀀스 초기화 ─────────────────────────────────────── */
  const sequences = [
    { prefix: "RQ", lastValue: 0 },
    { prefix: "PID", lastValue: 0 },
    { prefix: "AR", lastValue: 0 },
    { prefix: "FID", lastValue: 0 },
    { prefix: "ATK", lastValue: 0 },
  ];
  for (const seq of sequences) {
    await prisma.sequence.upsert({
      where: { prefix: seq.prefix },
      update: { lastValue: seq.lastValue },
      create: seq,
    });
  }

  /* ═══════════════════════════════════════════════════════════ */
  /* 요구사항 1: 예산서 작성 기능                                 */
  /* ═══════════════════════════════════════════════════════════ */
  const req1 = await prisma.requirement.create({
    data: {
      systemId: "RQ-00001",
      name: "예산서 작성 기능",
      description: "예산서 작성 및 관리에 필요한 기능 일체. 세부사업 관리, 상세 조회, 예산 배정 등 포함.",
      priority: "HIGH",
    },
  });

  // 화면 1-1: 세부사업 관리 (목록)
  const scr1 = await prisma.screen.create({
    data: {
      systemId: "PID-00001",
      displayCode: "BGT-001",
      name: "세부사업 관리",
      screenType: "LIST",
      requirementId: req1.requirementId,
    },
  });

  // 화면 1-2: 세부사업 상세
  const scr2 = await prisma.screen.create({
    data: {
      systemId: "PID-00002",
      displayCode: "BGT-002",
      name: "세부사업 상세",
      screenType: "DETAIL",
      requirementId: req1.requirementId,
    },
  });

  // 화면 1-3: 예산 배정 팝업
  const scr3 = await prisma.screen.create({
    data: {
      systemId: "PID-00003",
      displayCode: "BGT-003",
      name: "예산 배정",
      screenType: "POPUP",
      requirementId: req1.requirementId,
    },
  });

  /* ═══════════════════════════════════════════════════════════ */
  /* 요구사항 2: 인사관리 기능                                    */
  /* ═══════════════════════════════════════════════════════════ */
  const req2 = await prisma.requirement.create({
    data: {
      systemId: "RQ-00002",
      name: "인사관리 기능",
      description: "직원 인사정보 관리, 부서 관리, 발령 처리 등",
      priority: "HIGH",
    },
  });

  // 화면 2-1: 직원 목록
  const scr4 = await prisma.screen.create({
    data: {
      systemId: "PID-00004",
      displayCode: "HR-001",
      name: "직원 목록",
      screenType: "LIST",
      requirementId: req2.requirementId,
    },
  });

  // 화면 2-2: 직원 상세
  const scr5 = await prisma.screen.create({
    data: {
      systemId: "PID-00005",
      displayCode: "HR-002",
      name: "직원 상세",
      screenType: "DETAIL",
      requirementId: req2.requirementId,
    },
  });

  /* ═══════════════════════════════════════════════════════════ */
  /* 요구사항 3: 공통코드 관리                                    */
  /* ═══════════════════════════════════════════════════════════ */
  const req3 = await prisma.requirement.create({
    data: {
      systemId: "RQ-00003",
      name: "공통코드 관리",
      description: "시스템 전반에서 사용하는 공통코드 CRUD 및 캐싱",
      priority: "MEDIUM",
    },
  });

  // 화면 3-1: 공통코드 관리
  const scr6 = await prisma.screen.create({
    data: {
      systemId: "PID-00006",
      displayCode: "CMN-001",
      name: "공통코드 관리",
      screenType: "LIST",
      requirementId: req3.requirementId,
    },
  });

  // 화면 3-2: 공통코드 상세 탭
  const scr7 = await prisma.screen.create({
    data: {
      systemId: "PID-00007",
      displayCode: "CMN-002",
      name: "공통코드 상세",
      screenType: "TAB",
      requirementId: req3.requirementId,
    },
  });

  /* ═══════════════════════════════════════════════════════════ */
  /* 영역 데이터 — 화면별 기본 영역 (AR-00001 ~ 00007)            */
  /* ═══════════════════════════════════════════════════════════ */

  const area1 = await prisma.area.create({
    data: { areaCode: "AR-00001", screenId: scr1.screenId, name: "세부사업 그리드", areaType: "GRID", sortOrder: 1 },
  });
  const area2 = await prisma.area.create({
    data: { areaCode: "AR-00002", screenId: scr2.screenId, name: "세부사업 상세 폼", areaType: "FORM", sortOrder: 1 },
  });
  const area3 = await prisma.area.create({
    data: { areaCode: "AR-00003", screenId: scr3.screenId, name: "예산 배정 폼", areaType: "FORM", sortOrder: 1 },
  });
  const area4 = await prisma.area.create({
    data: { areaCode: "AR-00004", screenId: scr4.screenId, name: "직원 목록 그리드", areaType: "GRID", sortOrder: 1 },
  });
  const area5 = await prisma.area.create({
    data: { areaCode: "AR-00005", screenId: scr5.screenId, name: "직원 상세 폼", areaType: "FORM", sortOrder: 1 },
  });
  const area6 = await prisma.area.create({
    data: { areaCode: "AR-00006", screenId: scr6.screenId, name: "공통코드 그리드", areaType: "GRID", sortOrder: 1 },
  });
  const area7 = await prisma.area.create({
    data: { areaCode: "AR-00007", screenId: scr7.screenId, name: "공통코드 탭", areaType: "TAB", sortOrder: 1 },
  });

  /* ═══════════════════════════════════════════════════════════ */
  /* 기능 데이터 — 예산서 (FID-00001 ~ 00006)                    */
  /* ═══════════════════════════════════════════════════════════ */

  // FID-00001: 세부사업 조회 — 검토완료 상태, AI 검토 결과 있음
  const fn1 = await prisma.function.create({
    data: {
      systemId: "FID-00001",
      displayCode: "BGT-001-01",
      name: "세부사업 조회",
      areaId: area1.areaId,
      spec: "## 목록 조회\n\n**화면유형**: 그리드\n\n### 검색 조건\n| 항목 | 타입 | 비고 |\n|------|------|------|\n| 회계연도 | SELECT | 기본값: 당해연도 |\n| 회계상세구분 | SELECT | 코드: ACC_DTL |\n| 예산구분 | SELECT | 코드: BGT_TYPE |\n| 차수 | INPUT | 숫자만 |\n\n### 그리드 항목\n출처구분, 회계연도, 예산구분, 차수, 예산부처명, 소관부처명, 세부사업명, 예산액\n\n### 정렬\n회계연도 DESC, 차수 DESC",
      dataFlow: "READ: TB_BG_BGT_DSCTN_BIZ, TB_BG_BGTS_CYCL",
      status: "REVIEW_DONE",
      priority: "HIGH",
    },
  });

  // FID-00002: 세부사업 저장 — 설계중
  const fn2 = await prisma.function.create({
    data: {
      systemId: "FID-00002",
      displayCode: "BGT-001-02",
      name: "세부사업 저장",
      areaId: area1.areaId,
      spec: "## 저장 기능\n\n그리드에서 수정된 데이터를 일괄 저장합니다.\n\n### 처리 로직\n1. 변경된 행만 추출 (INSERT/UPDATE/DELETE 구분)\n2. 유효성 검증\n3. 트랜잭션 처리\n4. 결과 메시지 표시\n\n### 유효성 검증\n- 예산부처명: 필수\n- 예산액: 0 이상 숫자\n- 회계연도 + 차수: 중복 불가",
      dataFlow: "WRITE: TB_BG_BGT_DSCTN_BIZ",
      status: "DRAFT",
      priority: "MEDIUM",
    },
  });

  // FID-00003: 세부사업 삭제 — 구현완료
  const fn3 = await prisma.function.create({
    data: {
      systemId: "FID-00003",
      displayCode: "BGT-001-03",
      name: "세부사업 삭제",
      areaId: area1.areaId,
      spec: "## 삭제 기능\n\n선택된 세부사업을 삭제합니다.\n\n### 삭제 조건\n- 예산 배정 데이터가 있는 경우 삭제 불가\n- 확인 메시지 표시 후 처리\n\n### Soft Delete\n`use_yn = 'N'` 으로 업데이트 (물리 삭제 아님)",
      dataFlow: "WRITE: TB_BG_BGT_DSCTN_BIZ",
      status: "IMPL_DONE",
      priority: "MEDIUM",
      aiImplFeedback: "## 구현 완료\n\n### 생성 파일\n- `BgtDsctnBizController.java` — REST API 엔드포인트\n- `BgtDsctnBizService.java` — 비즈니스 로직\n- `BgtDsctnBizMapper.xml` — MyBatis SQL 매퍼\n\n### 구현 사항\n- Soft delete 적용 (use_yn 컬럼)\n- 예산 배정 데이터 존재 시 삭제 차단 로직 추가\n- 트랜잭션 처리 완료",
    },
  });

  // FID-00004: 세부사업 상세 조회 — 컨펌 상태
  const fn4 = await prisma.function.create({
    data: {
      systemId: "FID-00004",
      displayCode: "BGT-002-01",
      name: "세부사업 상세 조회",
      areaId: area2.areaId,
      spec: "## 상세 조회\n\n세부사업의 상세 정보를 조회합니다.\n\n### 표시 항목\n- 기본정보: 사업명, 부처, 소관, 회계연도\n- 예산정보: 예산액, 집행액, 잔액\n- 이력정보: 변경 이력 목록\n\n### 탭 구성\n1. 기본정보 탭\n2. 예산내역 탭\n3. 변경이력 탭",
      dataFlow: "READ: TB_BG_BGT_DSCTN_BIZ, TB_BG_BGT_EXEC, TB_BG_BGT_HIST",
      status: "CONFIRM_Y",
      priority: "HIGH",
    },
  });

  // FID-00005: 세부사업 수정 — AI 검토 요청 중
  await prisma.function.create({
    data: {
      systemId: "FID-00005",
      displayCode: "BGT-002-02",
      name: "세부사업 수정",
      areaId: area2.areaId,
      spec: "## 수정 기능\n\n상세 화면에서 세부사업 정보를 수정합니다.\n\n### 수정 가능 항목\n- 사업명, 예산액, 비고\n- 부처/소관 변경 불가 (읽기전용)\n\n### 변경이력\n수정 시 자동으로 TB_BG_BGT_HIST에 이력 INSERT",
      dataFlow: "WRITE: TB_BG_BGT_DSCTN_BIZ, TB_BG_BGT_HIST",
      status: "REVIEW_REQ",
      priority: "MEDIUM",
    },
  });

  // FID-00006: 예산 배정 — 구현요청 상태
  await prisma.function.create({
    data: {
      systemId: "FID-00006",
      displayCode: "BGT-003-01",
      name: "예산 배정 처리",
      areaId: area3.areaId,
      spec: "## 예산 배정\n\n팝업에서 예산 배정을 처리합니다.\n\n### 입력 항목\n- 배정 대상: 세부사업 선택\n- 배정액: 숫자 입력\n- 배정일자: 날짜 선택\n\n### 검증\n- 배정액 <= 잔여예산액\n- 동일 일자 중복 배정 불가",
      dataFlow: "WRITE: TB_BG_BGT_ALLOC",
      status: "IMPL_REQ",
      priority: "HIGH",
    },
  });

  /* ═══════════════════════════════════════════════════════════ */
  /* 기능 데이터 — 인사관리 (FID-00007 ~ 00011)                   */
  /* ═══════════════════════════════════════════════════════════ */

  // FID-00007: 직원 조회 — 검토완료
  const fn7 = await prisma.function.create({
    data: {
      systemId: "FID-00007",
      displayCode: "HR-001-01",
      name: "직원 목록 조회",
      areaId: area4.areaId,
      spec: "## 직원 목록 조회\n\n### 검색 조건\n- 부서: 트리 선택\n- 직급: 다중 선택\n- 재직상태: 재직/퇴직/휴직\n- 사번/이름: 텍스트 검색\n\n### 그리드\n사번, 이름, 부서, 직급, 입사일, 재직상태",
      dataFlow: "READ: TB_HR_EMP, TB_HR_DEPT",
      status: "REVIEW_DONE",
      priority: "HIGH",
    },
  });

  // FID-00008: 직원 등록 — 설계중
  await prisma.function.create({
    data: {
      systemId: "FID-00008",
      displayCode: "HR-001-02",
      name: "직원 등록",
      areaId: area4.areaId,
      spec: "## 직원 등록\n\n신규 직원 정보를 등록합니다.\n\n### 필수 입력\n- 이름, 부서, 직급, 입사일\n\n### 선택 입력\n- 연락처, 이메일, 주소\n\n### 사번 규칙\n`EMP-{입사연도}-{순번4자리}` 자동 생성",
      status: "DRAFT",
      priority: "MEDIUM",
    },
  });

  // FID-00009: 직원 상세 조회 — 구현완료
  await prisma.function.create({
    data: {
      systemId: "FID-00009",
      displayCode: "HR-002-01",
      name: "직원 상세 조회",
      areaId: area5.areaId,
      spec: "## 직원 상세\n\n### 탭 구성\n1. 인적사항\n2. 발령이력\n3. 급여정보\n4. 교육이력",
      dataFlow: "READ: TB_HR_EMP, TB_HR_APPOINT, TB_HR_SALARY, TB_HR_EDU",
      status: "IMPL_DONE",
      priority: "HIGH",
      aiImplFeedback: "## 구현 완료\n\n4개 탭 모두 구현. 발령이력은 시간순 정렬, 급여정보는 권한 체크 적용.",
    },
  });

  // FID-00010: 발령 처리 — 변경검토요청
  await prisma.function.create({
    data: {
      systemId: "FID-00010",
      displayCode: "HR-002-02",
      name: "발령 처리",
      areaId: area5.areaId,
      spec: "## 발령 처리\n\n### 발령 유형\n- 승진, 전보, 파견, 복직, 퇴직\n\n### 처리 로직\n1. 발령 정보 입력\n2. 결재 요청 (워크플로우)\n3. 승인 후 자동 반영\n\n### 변경사항 (v2)\n- 겸직 발령 추가\n- 발령일 소급 적용 허용 (최대 30일)",
      dataFlow: "WRITE: TB_HR_APPOINT, TB_HR_EMP",
      status: "CHANGE_REQ",
      priority: "HIGH",
      changeReason: "겸직 발령 및 소급 적용 요건 추가",
    },
  });

  // FID-00011: 직원 검색 팝업 — 설계중
  await prisma.function.create({
    data: {
      systemId: "FID-00011",
      displayCode: "HR-001-03",
      name: "직원 검색 팝업",
      areaId: area4.areaId,
      spec: "## 직원 검색 팝업\n\n다른 화면에서 직원을 선택할 때 사용하는 공통 팝업.\n\n### 검색\n사번 또는 이름으로 검색\n\n### 반환값\n선택한 직원의 사번, 이름, 부서명",
      status: "DRAFT",
      priority: "LOW",
    },
  });

  /* ═══════════════════════════════════════════════════════════ */
  /* 기능 데이터 — 공통코드 (FID-00012 ~ 00015)                   */
  /* ═══════════════════════════════════════════════════════════ */

  // FID-00012: 공통코드 조회 — 구현완료
  const fn12 = await prisma.function.create({
    data: {
      systemId: "FID-00012",
      displayCode: "CMN-001-01",
      name: "공통코드 조회",
      areaId: area6.areaId,
      spec: "## 공통코드 조회\n\n### 좌측 트리\n그룹코드 트리 (2레벨)\n\n### 우측 그리드\n선택된 그룹의 상세 코드 목록\n\n### 검색\n코드명, 코드값으로 검색",
      dataFlow: "READ: TB_CM_CODE_GRP, TB_CM_CODE_DTL",
      status: "IMPL_DONE",
      priority: "MEDIUM",
      aiImplFeedback: "## 구현 완료\n\n트리 + 그리드 구조 구현. Redis 캐싱 적용.",
    },
  });

  // FID-00013: 공통코드 저장 — 컨펌 상태
  await prisma.function.create({
    data: {
      systemId: "FID-00013",
      displayCode: "CMN-001-02",
      name: "공통코드 저장",
      areaId: area6.areaId,
      spec: "## 공통코드 저장\n\n그리드에서 수정/추가된 코드를 일괄 저장.\n\n### 검증\n- 코드값 중복 불가 (그룹 내)\n- 코드명 필수\n- 정렬순서 숫자만\n\n### 캐시 갱신\n저장 후 Redis 캐시 자동 갱신",
      dataFlow: "WRITE: TB_CM_CODE_DTL",
      status: "CONFIRM_Y",
      priority: "MEDIUM",
    },
  });

  // FID-00014: 공통코드 상세 — 설계중
  await prisma.function.create({
    data: {
      systemId: "FID-00014",
      displayCode: "CMN-002-01",
      name: "공통코드 상세 조회",
      areaId: area7.areaId,
      spec: "## 공통코드 상세\n\n코드 그룹의 상세 정보와 사용처 조회.\n\n### 탭 구성\n1. 코드 정보\n2. 사용처 조회 (어떤 화면/기능에서 사용하는지)",
      status: "DRAFT",
      priority: "LOW",
    },
  });

  // FID-00015: 코드 캐시 관리 — 버그수정, 검토요청
  await prisma.function.create({
    data: {
      systemId: "FID-00015",
      displayCode: "CMN-002-02",
      name: "코드 캐시 갱신",
      areaId: area7.areaId,
      spec: "## 캐시 갱신\n\n### 현상\n코드 수정 후 캐시가 즉시 갱신되지 않는 버그.\n\n### 원인 분석\nRedis pub/sub 구독 누락으로 다른 서버 인스턴스에 전파 안 됨.\n\n### 수정 방안\n1. Redis pub/sub 채널 구독 추가\n2. 캐시 TTL 단축 (24h → 1h)\n3. 수동 캐시 초기화 버튼 추가",
      status: "REVIEW_REQ",
      priority: "HIGH",
    },
  });



  /* ═══════════════════════════════════════════════════════════ */
  /* AI 태스크 이력 (AiTask)                                      */
  /* ═══════════════════════════════════════════════════════════ */

  // ATK-00001: FID-00001 검토 — 완료
  await prisma.aiTask.create({
    data: {
      systemId: "ATK-00001",
      refTableName: "tb_function",
      refPkId: fn1.functionId,
      taskType: "REVIEW",
      taskStatus: "NEEDS_CHECK",
      spec: fn1.spec,
      feedback: "## 검토 결과\n\n### 이슈 1: 검색 조건 기본값\n회계연도 기본값 정의 필요.\n\n### 이슈 2: cascade 삭제\nSoft delete 적용 권장.\n\n### 종합\n이슈 2건 외 설계 양호.",
      requestedAt: new Date("2026-02-27T10:00:00"),
      startedAt: new Date("2026-02-27T10:00:30"),
      completedAt: new Date("2026-02-27T10:02:15"),
    },
  });

  // ATK-00002: FID-00001 재처리 — GS 코멘트 있음, 완료
  await prisma.aiTask.create({
    data: {
      systemId: "ATK-00002",
      refTableName: "tb_function",
      refPkId: fn1.functionId,
      taskType: "REPROCESS",
      taskStatus: "AUTO_FIXED",
      spec: fn1.spec,
      comment: "cascade 삭제는 soft delete로 해줘. 그리고 페이징은 무한스크롤로.",
      feedback: "## 재검토 결과\n\n### 반영 사항\n1. **Soft Delete**: `use_yn = 'N'` 업데이트 방식으로 변경\n2. **무한스크롤**: 커서 기반 페이징 적용 (lastId 방식)\n\n### 수정된 설계 포인트\n- 삭제 API: `DELETE` → `PATCH` (use_yn 변경)\n- 목록 API: `offset` 기반 → `cursor` 기반 페이징",
      requestedAt: new Date("2026-02-27T14:30:00"),
      startedAt: new Date("2026-02-27T14:30:20"),
      completedAt: new Date("2026-02-27T14:32:00"),
    },
  });

  // ATK-00003: FID-00003 구현 — 완료
  await prisma.aiTask.create({
    data: {
      systemId: "ATK-00003",
      refTableName: "tb_function",
      refPkId: fn3.functionId,
      taskType: "IMPLEMENT",
      taskStatus: "SUCCESS",
      spec: fn3.spec,
      feedback: "## 구현 완료\n\n### 생성 파일\n- `BgtDsctnBizController.java`\n- `BgtDsctnBizService.java`\n- `BgtDsctnBizMapper.xml`\n\n### 주요 구현\n- Soft delete 적용\n- 하위 데이터 존재 시 삭제 차단",
      requestedAt: new Date("2026-02-27T16:00:00"),
      startedAt: new Date("2026-02-27T16:00:45"),
      completedAt: new Date("2026-02-27T16:05:30"),
    },
  });

  // ATK-00004: FID-00004 검토 — 완료
  await prisma.aiTask.create({
    data: {
      systemId: "ATK-00004",
      refTableName: "tb_function",
      refPkId: fn4.functionId,
      taskType: "REVIEW",
      taskStatus: "SUCCESS",
      spec: fn4.spec,
      feedback: "## 검토 결과\n\n설계 내용이 명확하고 충분합니다.\n\n### 참고사항\n- 집행액은 배치 결과 조회\n- 변경이력은 최근 50건 제한",
      requestedAt: new Date("2026-02-28T09:00:00"),
      startedAt: new Date("2026-02-28T09:00:15"),
      completedAt: new Date("2026-02-28T09:01:45"),
    },
  });

  // ATK-00005: FID-00005 검토 — 대기중 (NONE)
  await prisma.aiTask.create({
    data: {
      systemId: "ATK-00005",
      refTableName: "tb_function",
      refPkId: fn1.functionId + 4, // FID-00005
      taskType: "REVIEW",
      taskStatus: "NONE",
      spec: "## 수정 기능\n\n상세 화면에서 세부사업 정보를 수정합니다.",
      requestedAt: new Date("2026-02-28T11:00:00"),
    },
  });

  /* ─── 시퀀스 카운터 최종 업데이트 ───────────────────────── */
  await prisma.sequence.update({ where: { prefix: "RQ" }, data: { lastValue: 3 } });
  await prisma.sequence.update({ where: { prefix: "PID" }, data: { lastValue: 7 } });
  await prisma.sequence.update({ where: { prefix: "AR" }, data: { lastValue: 7 } });
  await prisma.sequence.update({ where: { prefix: "FID" }, data: { lastValue: 15 } });
  await prisma.sequence.update({ where: { prefix: "ATK" }, data: { lastValue: 5 } });

  console.log("Seed completed — 요구사항 3건, 화면 7건, 영역 7건, 기능 15건, AI태스크 5건");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
