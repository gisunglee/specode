/**
 * spec.ts — OpenAPI 3.0 명세 정의 (v2, 2026-03 현행화)
 *
 * /api/openapi  → JSON 반환 (Swagger UI가 이 URL을 fetch)
 * /api-docs     → Swagger UI HTML 페이지
 */

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "SPECODE API",
    version: "2.0.0",
    description:
      "SPECODE (AI Dev Hub) REST API 명세서.\n\n" +
      "**AI 연동 API** (`/api/ai/*`)는 OpenClaw 전용이며 `X-API-Key` 인증이 필요합니다.\n\n" +
      "나머지 API는 내부 웹 클라이언트용입니다.\n\n" +
      "모든 응답은 `{ success: true, data }` 또는 `{ success: false, error: { code, message } }` 형식입니다.",
  },

  tags: [
    { name: "AI 연동 (OpenClaw)", description: "OpenClaw AI 워커 전용 — 폴링 · 시작 · 결과 제출. X-API-Key 인증 필수" },
    { name: "AI 태스크",          description: "AI 태스크 내부 조회·취소 (웹 클라이언트용)" },
    { name: "기능",               description: "tb_function CRUD — 화면 내 기능 단위 관리, AI 설계·검토·구현 요청" },
    { name: "화면",               description: "tb_screen CRUD — 요구사항에 속한 화면 관리" },
    { name: "영역",               description: "tb_area CRUD — 화면 내 UI 영역 관리, AI 설계 요청" },
    { name: "요구사항",           description: "tb_requirement CRUD — 프로젝트 요구사항 원문 및 변경 이력 관리" },
    { name: "사용자스토리",       description: "tb_user_story CRUD — 요구사항 기반 사용자 스토리 관리" },
    { name: "기획보드",           description: "tb_planning_draft CRUD — IA/PROCESS/MOCKUP/ERD 기획 산출물 관리, AI 생성 요청" },
    { name: "설계마당",           description: "tb_design_content CRUD — Mermaid/Excalidraw 설계 문서 관리" },
    { name: "표준가이드",         description: "tb_standard_guide CRUD — 개발 표준 가이드 관리, AI 점검 요청" },
    { name: "첨부파일",           description: "tb_attachment — 파일 업로드·다운로드·삭제" },
    { name: "콘텐츠 버전",        description: "tb_content_version — 필드별 변경 이력 조회" },
    { name: "DB 스키마",          description: "tb_table_info / tb_column_info — DB 테이블·컬럼 메타 정보 조회" },
    { name: "기타",               description: "대시보드 요약, 개발 현황판, 트리 뷰" },
  ],

  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "X-API-Key",
        description: "환경변수 `AI_API_KEY` 값. AI 연동 API 전용.",
      },
    },
    schemas: {
      AiTask: {
        type: "object",
        properties: {
          aiTaskId:     { type: "integer", example: 42 },
          systemId:     { type: "string",  example: "ATK-00042" },
          refTableName: { type: "string",  example: "tb_function", enum: ["tb_function","tb_area","tb_standard_guide","tb_planning_draft"] },
          refPkId:      { type: "integer", example: 7 },
          taskType:     { type: "string",  example: "DESIGN", enum: ["DESIGN","REVIEW","IMPLEMENT","IMPACT","INSPECT","PLANNING"] },
          taskStatus:   { type: "string",  example: "NONE", enum: ["NONE","RUNNING","SUCCESS","AUTO_FIXED","NEEDS_CHECK","WARNING","FAILED","CANCELLED"] },
          spec:         { type: "string",  nullable: true, description: "처리 시점 기능 설명 스냅샷" },
          comment:      { type: "string",  nullable: true, description: "추가 요청사항 (GS → AI)" },
          feedback:     { type: "string",  nullable: true, description: "AI 결과 (마크다운)" },
          resultFiles:  { type: "string",  nullable: true, description: "수정 파일 경로 목록 (줄바꿈 구분)" },
          requestedAt:  { type: "string",  format: "date-time" },
          startedAt:    { type: "string",  format: "date-time", nullable: true },
          completedAt:  { type: "string",  format: "date-time", nullable: true },
        },
      },
      FunctionItem: {
        type: "object",
        properties: {
          functionId:      { type: "integer" },
          systemId:        { type: "string",  example: "FID-00001" },
          displayCode:     { type: "string",  nullable: true },
          name:            { type: "string" },
          areaId:          { type: "integer", nullable: true, description: "소속 영역 ID" },
          spec:            { type: "string",  nullable: true, description: "기능 설명 (마크다운)" },
          aiDesignContent: { type: "string",  nullable: true, description: "AI 상세설계 내용" },
          aiInspFeedback:  { type: "string",  nullable: true, description: "AI 검토 피드백" },
          aiImplFeedback:  { type: "string",  nullable: true, description: "AI 구현 가이드" },
          phase:           { type: "string",  example: "DRAFT", enum: ["DRAFT","REVIEW","DESIGN","IMPL"] },
          phaseStatus:     { type: "string",  example: "IDLE", enum: ["IDLE","REQUESTED","PROCESSING","DONE"] },
          confirmed:       { type: "boolean" },
          status:          { type: "string",  example: "DRAFT", description: "computed: phaseToStatus(phase, phaseStatus, confirmed)" },
          priority:        { type: "string",  example: "MEDIUM", enum: ["LOW","MEDIUM","HIGH"] },
          createdAt:       { type: "string",  format: "date-time" },
          updatedAt:       { type: "string",  format: "date-time" },
        },
      },
      Screen: {
        type: "object",
        properties: {
          screenId:      { type: "integer" },
          systemId:      { type: "string",  example: "PID-00001" },
          displayCode:   { type: "string",  nullable: true },
          name:          { type: "string" },
          screenType:    { type: "string",  nullable: true, enum: ["LIST","DETAIL","POPUP","TAB"] },
          requirementId: { type: "integer" },
          spec:          { type: "string",  nullable: true },
          layoutData:    { type: "string",  nullable: true, description: "화면 레이아웃 JSON" },
        },
      },
      Area: {
        type: "object",
        properties: {
          areaId:     { type: "integer" },
          areaCode:   { type: "string",  example: "AR-00001" },
          screenId:   { type: "integer" },
          name:       { type: "string" },
          sortOrder:  { type: "integer" },
          areaType:   { type: "string",  enum: ["SEARCH","GRID","FORM","INFO_CARD","TAB","FULL_SCREEN"] },
          spec:       { type: "string",  nullable: true, description: "영역 설명 (마크다운)" },
          reqComment: { type: "string",  nullable: true },
          status:     { type: "string",  example: "DRAFT", enum: ["DRAFT","DESIGN_REQ","DESIGN_DONE","CONFIRM_Y"] },
          aiFeedback: { type: "string",  nullable: true, description: "AI 설계 피드백" },
          createdAt:  { type: "string",  format: "date-time" },
          updatedAt:  { type: "string",  format: "date-time" },
        },
      },
      Requirement: {
        type: "object",
        properties: {
          requirementId:   { type: "integer" },
          systemId:        { type: "string",  example: "RQ-00001" },
          name:            { type: "string" },
          originalContent: { type: "string",  nullable: true, description: "최초 등록 원문" },
          currentContent:  { type: "string",  nullable: true, description: "현재 버전 내용" },
          detailSpec:      { type: "string",  nullable: true, description: "상세 명세 (마크다운)" },
          priority:        { type: "string",  nullable: true, enum: ["HIGH","MEDIUM","LOW"] },
          createdAt:       { type: "string",  format: "date-time" },
          updatedAt:       { type: "string",  format: "date-time" },
        },
      },
      UserStory: {
        type: "object",
        properties: {
          storyId:       { type: "integer" },
          systemId:      { type: "string",  example: "US-00001" },
          requirementId: { type: "integer", nullable: true },
          persona:       { type: "string",  nullable: true, description: "사용자 페르소나" },
          goal:          { type: "string",  description: "사용자 목표" },
          benefit:       { type: "string",  nullable: true, description: "기대 효과" },
          priority:      { type: "string",  enum: ["HIGH","MEDIUM","LOW"] },
          status:        { type: "string",  enum: ["TODO","IN_PROGRESS","DONE"] },
          createdAt:     { type: "string",  format: "date-time" },
        },
      },
      PlanningDraft: {
        type: "object",
        properties: {
          planSn:        { type: "integer" },
          systemId:      { type: "string",  example: "PLN-00001" },
          planType:      { type: "string",  enum: ["IA","PROCESS","ERD","MOCKUP"], description: "기획 산출물 유형" },
          title:         { type: "string" },
          manualInfo:    { type: "string",  nullable: true, description: "입력 명세 (마크다운)" },
          resultContent: { type: "string",  nullable: true, description: "AI 생성 결과 (MD/MERMAID/HTML)" },
          resultType:    { type: "string",  enum: ["MD","MERMAID","HTML"], description: "결과 형식" },
          status:        { type: "string",  enum: ["DRAFT","RUNNING","DONE","FAILED"] },
          createdAt:     { type: "string",  format: "date-time" },
          updatedAt:     { type: "string",  format: "date-time" },
        },
      },
      DesignContent: {
        type: "object",
        properties: {
          contentId:   { type: "integer" },
          systemId:    { type: "string",  example: "DOC-00001" },
          title:       { type: "string" },
          designType:  { type: "string",  example: "ERD", description: "설계 분류 (ERD, MOCKUP, MINDMAP 등)" },
          toolType:    { type: "string",  enum: ["MERMAID","EXCALIDRAW"], description: "편집 도구" },
          contentData: { type: "string",  nullable: true, description: "Mermaid 코드 또는 Excalidraw JSON" },
          status:      { type: "string",  enum: ["DRAFT","IN_REVIEW","APPROVED"] },
          description: { type: "string",  nullable: true },
          requirement: {
            type: "object", nullable: true,
            properties: {
              requirementId: { type: "integer" },
              systemId:      { type: "string" },
              name:          { type: "string" },
            },
          },
          updatedAt:   { type: "string",  format: "date-time" },
        },
      },
      StandardGuide: {
        type: "object",
        properties: {
          guideId:           { type: "integer" },
          systemId:          { type: "string",  example: "SG-00001" },
          category:          { type: "string",  enum: ["UI","DATA","AUTH","API","COMMON","SECURITY","FILE","ERROR","BATCH","REPORT"] },
          title:             { type: "string" },
          content:           { type: "string",  nullable: true },
          isActive:          { type: "string",  enum: ["Y","N"] },
          status:            { type: "string",  example: "DRAFT" },
          aiFeedbackContent: { type: "string",  nullable: true, description: "AI 점검 결과 (마크다운)" },
        },
      },
      Attachment: {
        type: "object",
        properties: {
          attachmentId: { type: "integer" },
          refTableName: { type: "string",  example: "tb_area" },
          refPkId:      { type: "integer" },
          logicalName:  { type: "string",  description: "사용자 표시 파일명" },
          physicalName: { type: "string",  description: "저장된 실제 파일명" },
          fileSize:     { type: "integer" },
          fileExt:      { type: "string",  nullable: true },
          downloadUrl:  { type: "string",  description: "다운로드 URL" },
          createdAt:    { type: "string",  format: "date-time" },
        },
      },
      ContentVersion: {
        type: "object",
        properties: {
          versionId:    { type: "integer" },
          refTableName: { type: "string",  example: "tb_area" },
          refPkId:      { type: "integer" },
          fieldName:    { type: "string",  description: "변경된 필드명" },
          content:      { type: "string",  nullable: true, description: "해당 시점의 필드 값" },
          changedBy:    { type: "string" },
          aiTaskId:     { type: "integer", nullable: true },
          createdAt:    { type: "string",  format: "date-time" },
        },
      },
      ApiSuccess: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data:    {},
        },
      },
      ApiError: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          error: {
            type: "object",
            properties: {
              code:    { type: "string", example: "NOT_FOUND" },
              message: { type: "string", example: "리소스를 찾을 수 없습니다." },
            },
          },
        },
      },
    },
  },

  paths: {
    /* ═══════════════════════════════════════════════
     * AI 연동 (OpenClaw)
     * ═══════════════════════════════════════════════ */
    "/api/ai/tasks": {
      get: {
        tags: ["AI 연동 (OpenClaw)"],
        summary: "대기 태스크 조회 (폴링)",
        description: "AI 워커가 주기적으로 호출하여 처리할 태스크를 가져옵니다. `taskStatus = NONE` 인 태스크를 오래된 순(FIFO)으로 반환합니다.",
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: "limit",    in: "query", schema: { type: "integer", default: 10, maximum: 50 }, description: "반환 건수 (최대 50)" },
          { name: "taskType", in: "query", schema: { type: "string", enum: ["DESIGN","REVIEW","IMPLEMENT","IMPACT","INSPECT","PLANNING"] }, description: "작업 유형 필터" },
        ],
        responses: {
          200: { description: "대기 중인 AI 태스크 목록 (attachments 포함)", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, data: { type: "array", items: { $ref: "#/components/schemas/AiTask" } } } } } } },
          401: { description: "X-API-Key 인증 실패" },
        },
      },
    },

    "/api/ai/tasks/{id}/start": {
      patch: {
        tags: ["AI 연동 (OpenClaw)"],
        summary: "태스크 처리 시작",
        description: "AI가 태스크 처리를 시작할 때 호출합니다. `NONE → RUNNING` 상태로 변경됩니다. 이미 RUNNING이면 400 반환.",
        security: [{ ApiKeyAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" }, description: "aiTaskId" }],
        responses: {
          200: { description: "RUNNING 상태로 변경된 AiTask" },
          400: { description: "NONE 상태가 아님 (INVALID_STATE)" },
          401: { description: "인증 실패" },
          404: { description: "태스크 없음" },
        },
      },
    },

    "/api/ai/tasks/{id}/complete": {
      post: {
        tags: ["AI 연동 (OpenClaw)"],
        summary: "태스크 결과 제출",
        description:
          "AI 처리 완료 후 결과를 제출합니다. `SUCCESS | AUTO_FIXED` 시 대상 엔티티를 자동 업데이트합니다.\n\n" +
          "| taskType | 반영 대상 | 변경 상태 |\n" +
          "|----------|-----------|----------|\n" +
          "| INSPECT (function) | ai_insp_feedback | REVIEW_DONE |\n" +
          "| INSPECT (guide) | ai_feedback_content | REVIEW_DONE |\n" +
          "| DESIGN (function) | ai_design_content | DESIGN_DONE |\n" +
          "| DESIGN (area) | ai_feedback | DESIGN_DONE |\n" +
          "| IMPLEMENT | ai_impl_feedback | IMPL_DONE |\n" +
          "| PLANNING | result_content | DONE |",
        security: [{ ApiKeyAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" }, description: "aiTaskId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["taskStatus"],
                properties: {
                  taskStatus:  { type: "string", enum: ["SUCCESS","AUTO_FIXED","NEEDS_CHECK","WARNING","FAILED"] },
                  feedback:    { type: "string", description: "AI 결과 내용 (마크다운)" },
                  resultFiles: { type: "string", description: "수정한 파일 경로 목록 (줄바꿈 구분)" },
                },
              },
              example: { taskStatus: "SUCCESS", feedback: "## 상세 설계\n\n`POST /api/login`..." },
            },
          },
        },
        responses: {
          200: { description: "처리 완료된 AiTask" },
          400: { description: "RUNNING 상태가 아니거나 taskStatus 값 오류" },
          401: { description: "인증 실패" },
          404: { description: "태스크 없음" },
        },
      },
    },

    /* ═══════════════════════════════════════════════
     * AI 태스크 (내부)
     * ═══════════════════════════════════════════════ */
    "/api/ai-tasks": {
      get: {
        tags: ["AI 태스크"],
        summary: "AI 태스크 목록 조회",
        description: "웹 화면의 AI 현황 페이지에서 사용합니다. 대상 엔티티 이름·코드 등 target 정보가 포함됩니다.",
        parameters: [
          { name: "page",       in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize",   in: "query", schema: { type: "integer", default: 20 } },
          { name: "taskStatus", in: "query", schema: { type: "string" }, description: "상태 필터 (NONE, RUNNING, SUCCESS 등)" },
          { name: "taskType",   in: "query", schema: { type: "string" }, description: "유형 필터 (DESIGN, INSPECT 등)" },
        ],
        responses: { 200: { description: "AI 태스크 목록 (target 정보 포함, 페이지네이션)" } },
      },
    },
    "/api/ai-tasks/{id}": {
      patch: {
        tags: ["AI 태스크"],
        summary: "태스크 취소",
        description: "`NONE` 상태의 태스크만 `CANCELLED` 로 변경할 수 있습니다.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: { "application/json": { schema: { type: "object", properties: { taskStatus: { type: "string", enum: ["CANCELLED"] } } } } },
        },
        responses: {
          200: { description: "취소된 태스크" },
          400: { description: "NONE 상태가 아닌 태스크는 취소 불가" },
        },
      },
    },

    /* ═══════════════════════════════════════════════
     * 기능
     * ═══════════════════════════════════════════════ */
    "/api/functions": {
      get: {
        tags: ["기능"],
        summary: "기능 목록 조회",
        description: "화면/영역/상태 기준으로 필터링합니다. 각 기능의 최신 AI 태스크(latestTask)가 포함됩니다.",
        parameters: [
          { name: "page",     in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 20 } },
          { name: "screenId", in: "query", schema: { type: "integer" }, description: "화면 ID로 필터" },
          { name: "areaId",   in: "query", schema: { type: "integer" }, description: "영역 ID로 필터" },
          { name: "status",   in: "query", schema: { type: "string"  }, description: "상태 필터" },
          { name: "q",        in: "query", schema: { type: "string"  }, description: "기능명 검색" },
        ],
        responses: { 200: { description: "기능 목록 (latestTask 포함, 페이지네이션)" } },
      },
      post: {
        tags: ["기능"],
        summary: "기능 생성",
        description: "시스템 ID(FID-NNNNN)를 자동 부여합니다. areaId 또는 screenId 중 하나는 필수입니다.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name:     { type: "string", description: "기능명" },
                  areaId:   { type: "integer", description: "소속 영역 ID" },
                  screenId: { type: "integer", description: "소속 화면 ID (areaId 없을 때)" },
                  spec:     { type: "string",  description: "기능 설명 (마크다운)" },
                  priority: { type: "string",  enum: ["LOW","MEDIUM","HIGH"], default: "MEDIUM" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "생성된 기능 객체" } },
      },
    },
    "/api/functions/{id}": {
      get: {
        tags: ["기능"],
        summary: "기능 단건 상세 조회",
        description: "attachments(첨부파일), tasks(AI 태스크 이력) 포함 반환합니다.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "기능 상세" }, 404: { description: "존재하지 않음" } },
      },
      put: {
        tags: ["기능"],
        summary: "기능 내용 수정",
        description: "spec, aiDesignContent 등 내용을 수정합니다. changeReason이 있으면 콘텐츠 버전 이력이 저장됩니다.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name:            { type: "string" },
                  spec:            { type: "string" },
                  aiDesignContent: { type: "string", nullable: true },
                  refContent:      { type: "string", nullable: true },
                  changeReason:    { type: "string", description: "변경 사유 (REQ_CHANGE, DESIGN_ERROR 등)" },
                  priority:        { type: "string" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "수정된 기능 객체" } },
      },
      patch: {
        tags: ["기능"],
        summary: "기능 상태 변경 (AI 요청 포함)",
        description:
          "`REVIEW_REQ / DESIGN_REQ / IMPL_REQ` 로 변경 시 AiTask가 자동 생성됩니다.\n\n" +
          "상태 흐름: `DRAFT → REVIEW_REQ → REVIEW_DONE → DESIGN_REQ → DESIGN_DONE → CONFIRM_Y → IMPL_REQ → IMPL_DONE`",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status:  { type: "string", description: "변경할 상태값" },
                  comment: { type: "string", description: "AI에게 전달할 추가 요청사항" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "상태 변경된 기능 객체" } },
      },
      delete: {
        tags: ["기능"],
        summary: "기능 삭제",
        description: "`IMPL_DONE` 상태의 기능은 삭제할 수 없습니다.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "삭제 완료" }, 400: { description: "IMPL_DONE 상태는 삭제 불가" } },
      },
    },
    "/api/functions/{id}/prd": {
      post: {
        tags: ["기능"],
        summary: "기능 PRD 문서 생성",
        description: "기능의 spec·AI 결과를 종합하여 PRD(Product Requirement Document) 마크다운을 생성합니다.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "생성된 PRD 마크다운 텍스트" } },
      },
    },
    "/api/functions/{id}/baseline": {
      get: {
        tags: ["기능"],
        summary: "기능 베이스라인 조회",
        description: "CONFIRM_Y 시점에 저장된 기능의 기준선(spec 스냅샷) 목록을 반환합니다.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "베이스라인 목록" } },
      },
    },

    /* ═══════════════════════════════════════════════
     * 화면
     * ═══════════════════════════════════════════════ */
    "/api/screens": {
      get: {
        tags: ["화면"],
        summary: "화면 목록 조회",
        description: "요구사항 ID로 필터링합니다. 각 화면의 기능 수(functionCount)가 포함됩니다.",
        parameters: [
          { name: "requirementId", in: "query", schema: { type: "integer" }, description: "요구사항 ID 필터" },
          { name: "page",          in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize",      in: "query", schema: { type: "integer", default: 20 } },
          { name: "q",             in: "query", schema: { type: "string"  }, description: "화면명 검색" },
        ],
        responses: { 200: { description: "화면 목록 (functionCount 포함, 페이지네이션)" } },
      },
      post: {
        tags: ["화면"],
        summary: "화면 생성",
        description: "시스템 ID(PID-NNNNN)를 자동 부여합니다.",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "requirementId"],
                properties: {
                  name:          { type: "string" },
                  requirementId: { type: "integer" },
                  screenType:    { type: "string", enum: ["LIST","DETAIL","POPUP","TAB"] },
                  displayCode:   { type: "string" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "생성된 화면 객체" } },
      },
    },
    "/api/screens/{id}": {
      get:    { tags: ["화면"], summary: "화면 단건 조회 (areas·functions 포함)", description: "하위 영역(areas)과 기능(functions) 목록이 포함됩니다.", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { 200: { description: "화면 상세" } } },
      put:    { tags: ["화면"], summary: "화면 수정", description: "화면명, 유형, 레이아웃 데이터 등을 수정합니다.", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], requestBody: { content: { "application/json": { schema: { type: "object" } } } }, responses: { 200: { description: "수정된 화면 객체" } } },
      delete: { tags: ["화면"], summary: "화면 삭제 (논리 삭제)", description: "하위 영역이 있으면 삭제가 제한될 수 있습니다.", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { 200: { description: "삭제 완료" } } },
    },
    "/api/screens/{id}/prd": {
      post: {
        tags: ["화면"],
        summary: "화면 PRD 생성",
        description: "화면 및 하위 기능을 종합하여 PRD 마크다운을 생성합니다.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "생성된 PRD 마크다운" } },
      },
    },
    "/api/screens/categories": {
      get: {
        tags: ["화면"],
        summary: "화면 카테고리 목록",
        description: "요구사항 기준으로 그룹핑된 화면 분류 목록을 반환합니다.",
        responses: { 200: { description: "카테고리 목록" } },
      },
    },

    /* ═══════════════════════════════════════════════
     * 영역
     * ═══════════════════════════════════════════════ */
    "/api/areas": {
      get: {
        tags: ["영역"],
        summary: "영역 목록 조회",
        description: "화면 ID·상태·검색어로 필터링합니다. AI 최신 태스크(latestTask)가 포함됩니다.",
        parameters: [
          { name: "page",     in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 20 } },
          { name: "screenId", in: "query", schema: { type: "integer" }, description: "화면 ID 필터" },
          { name: "status",   in: "query", schema: { type: "string"  }, description: "상태 필터" },
          { name: "search",   in: "query", schema: { type: "string"  }, description: "영역명 검색" },
        ],
        responses: { 200: { description: "영역 목록 (latestTask 포함, 페이지네이션)" } },
      },
      post: {
        tags: ["영역"],
        summary: "영역 생성",
        description: "시스템 ID(AR-NNNNN)를 자동 부여합니다. 화면(screenId)이 필수입니다.",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "screenId", "areaType"],
                properties: {
                  name:       { type: "string" },
                  screenId:   { type: "integer" },
                  areaType:   { type: "string", enum: ["SEARCH","GRID","FORM","INFO_CARD","TAB","FULL_SCREEN"] },
                  sortOrder:  { type: "integer", default: 1 },
                  spec:       { type: "string" },
                  reqComment: { type: "string" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "생성된 영역 객체" } },
      },
    },
    "/api/areas/{id}": {
      get: {
        tags: ["영역"],
        summary: "영역 단건 상세 조회",
        description: "하위 기능(functions), AI 태스크 이력(tasks), 첨부파일(attachments) 포함 반환합니다.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "영역 상세 정보" } },
      },
      put: {
        tags: ["영역"],
        summary: "영역 내용 수정",
        description: "spec 변경 시 saveVersionLog=true를 전달하면 콘텐츠 버전 이력이 저장됩니다.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name:           { type: "string" },
                  areaType:       { type: "string" },
                  sortOrder:      { type: "integer" },
                  spec:           { type: "string" },
                  reqComment:     { type: "string" },
                  saveVersionLog: { type: "boolean", description: "버전 이력 저장 여부" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "수정된 영역 객체" } },
      },
      patch: {
        tags: ["영역"],
        summary: "영역 상태 변경 (AI 요청 포함)",
        description: "`DESIGN_REQ` 로 변경 시 DESIGN AiTask가 자동 생성됩니다.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status:  { type: "string", enum: ["DRAFT","DESIGN_REQ","DESIGN_DONE","CONFIRM_Y"] },
                  comment: { type: "string", description: "AI 추가 요청사항" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "상태 변경된 영역 객체" } },
      },
      delete: {
        tags: ["영역"],
        summary: "영역 삭제",
        description: "하위 기능이 있으면 기본적으로 삭제가 제한됩니다. `mode` 파라미터로 강제 처리 가능합니다.",
        parameters: [
          { name: "id",   in: "path",  required: true,  schema: { type: "integer" } },
          { name: "mode", in: "query", required: false, schema: { type: "string", enum: ["cascade","detach"] }, description: "cascade: 하위기능 함께 삭제, detach: 하위기능 연결만 해제" },
        ],
        responses: { 200: { description: "삭제 성공" }, 409: { description: "하위 기능 존재 (mode 미지정 시)" } },
      },
    },
    "/api/areas/{id}/prd": {
      patch: {
        tags: ["영역"],
        summary: "영역 PRD 수정",
        description: "영역의 PRD(상세 명세) 내용을 직접 수정합니다.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: { "application/json": { schema: { type: "object", properties: { prdContent: { type: "string" } } } } },
        },
        responses: { 200: { description: "수정 완료" } },
      },
    },
    "/api/areas/{id}/baseline": {
      get: {
        tags: ["영역"],
        summary: "영역 베이스라인 조회",
        description: "확정(CONFIRM_Y) 시점에 저장된 영역 spec 스냅샷 목록입니다.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "베이스라인 목록" } },
      },
    },

    /* ═══════════════════════════════════════════════
     * 요구사항
     * ═══════════════════════════════════════════════ */
    "/api/requirements": {
      get: {
        tags: ["요구사항"],
        summary: "요구사항 목록 조회",
        description: "우선순위·키워드 필터를 지원합니다. 연결된 화면 수(screenCount)가 포함됩니다.",
        parameters: [
          { name: "page",     in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 20 } },
          { name: "q",        in: "query", schema: { type: "string"  }, description: "요구사항명 검색" },
          { name: "priority", in: "query", schema: { type: "string"  }, description: "우선순위 필터" },
        ],
        responses: { 200: { description: "요구사항 목록 (페이지네이션)" } },
      },
      post: {
        tags: ["요구사항"],
        summary: "요구사항 생성",
        description: "시스템 ID(RQ-NNNNN)를 자동 부여합니다.",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name:     { type: "string" },
                  content:  { type: "string", description: "원문 내용" },
                  priority: { type: "string", enum: ["HIGH","MEDIUM","LOW"] },
                },
              },
            },
          },
        },
        responses: { 200: { description: "생성된 요구사항 객체" } },
      },
    },
    "/api/requirements/{id}": {
      get:    { tags: ["요구사항"], summary: "요구사항 단건 조회", description: "연결된 화면·사용자스토리 목록이 포함됩니다.", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { 200: { description: "요구사항 상세" } } },
      put:    { tags: ["요구사항"], summary: "요구사항 수정", description: "원문(originalContent), 현재내용(currentContent), 상세명세(detailSpec) 등을 수정합니다.", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], requestBody: { content: { "application/json": { schema: { type: "object" } } } }, responses: { 200: { description: "수정된 요구사항 객체" } } },
      delete: { tags: ["요구사항"], summary: "요구사항 삭제", description: "연결된 화면이 있으면 삭제가 제한될 수 있습니다.", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { 200: { description: "삭제 완료" } } },
    },

    /* ═══════════════════════════════════════════════
     * 사용자스토리
     * ═══════════════════════════════════════════════ */
    "/api/user-stories": {
      get: {
        tags: ["사용자스토리"],
        summary: "사용자스토리 목록 조회",
        description: "요구사항·페르소나·상태 기준으로 필터링합니다.",
        parameters: [
          { name: "page",          in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize",      in: "query", schema: { type: "integer", default: 20 } },
          { name: "requirementId", in: "query", schema: { type: "integer" }, description: "요구사항 ID 필터" },
          { name: "persona",       in: "query", schema: { type: "string"  }, description: "페르소나 필터" },
          { name: "status",        in: "query", schema: { type: "string"  }, description: "진행상태 필터" },
        ],
        responses: { 200: { description: "사용자스토리 목록 (페이지네이션)" } },
      },
      post: {
        tags: ["사용자스토리"],
        summary: "사용자스토리 생성",
        description: "시스템 ID(US-NNNNN)를 자동 부여합니다.",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["goal"],
                properties: {
                  requirementId: { type: "integer" },
                  persona:       { type: "string" },
                  goal:          { type: "string",  description: "사용자 목표 (핵심 스토리)" },
                  benefit:       { type: "string",  description: "기대 효과" },
                  priority:      { type: "string",  enum: ["HIGH","MEDIUM","LOW"] },
                },
              },
            },
          },
        },
        responses: { 200: { description: "생성된 사용자스토리 객체" } },
      },
    },
    "/api/user-stories/{id}": {
      get:    { tags: ["사용자스토리"], summary: "사용자스토리 단건 조회", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { 200: { description: "사용자스토리 상세" } } },
      put:    { tags: ["사용자스토리"], summary: "사용자스토리 수정", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], requestBody: { content: { "application/json": { schema: { type: "object" } } } }, responses: { 200: { description: "수정된 사용자스토리" } } },
      delete: { tags: ["사용자스토리"], summary: "사용자스토리 삭제", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { 200: { description: "삭제 완료" } } },
    },
    "/api/user-stories/personas": {
      get: {
        tags: ["사용자스토리"],
        summary: "페르소나 목록 조회",
        description: "등록된 사용자스토리에서 사용 중인 고유 페르소나 목록을 반환합니다.",
        responses: { 200: { description: "페르소나 문자열 배열" } },
      },
    },

    /* ═══════════════════════════════════════════════
     * 기획보드
     * ═══════════════════════════════════════════════ */
    "/api/planning": {
      get: {
        tags: ["기획보드"],
        summary: "기획 초안 목록 조회",
        description: "planType(IA/PROCESS/ERD/MOCKUP)·상태로 필터링합니다. 연결된 요구사항 목록이 포함됩니다.",
        parameters: [
          { name: "page",     in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 20 } },
          { name: "planType", in: "query", schema: { type: "string", enum: ["IA","PROCESS","ERD","MOCKUP"] }, description: "기획 유형 필터" },
          { name: "status",   in: "query", schema: { type: "string" }, description: "상태 필터" },
        ],
        responses: { 200: { description: "기획 초안 목록 (페이지네이션)" } },
      },
      post: {
        tags: ["기획보드"],
        summary: "기획 초안 생성",
        description: "새 기획 초안을 DRAFT 상태로 생성합니다.",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["planType", "title"],
                properties: {
                  planType:   { type: "string", enum: ["IA","PROCESS","ERD","MOCKUP"] },
                  title:      { type: "string" },
                  manualInfo: { type: "string", description: "기획 입력 명세 (마크다운)" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "생성된 기획 초안 객체" } },
      },
    },
    "/api/planning/{id}": {
      get:    { tags: ["기획보드"], summary: "기획 초안 단건 조회", description: "연결된 요구사항 목록, AI 태스크 이력 포함", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { 200: { description: "기획 초안 상세" } } },
      put:    { tags: ["기획보드"], summary: "기획 초안 수정", description: "제목, 입력 명세, 결과 내용 등을 수정합니다.", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], requestBody: { content: { "application/json": { schema: { type: "object" } } } }, responses: { 200: { description: "수정된 기획 초안" } } },
      delete: { tags: ["기획보드"], summary: "기획 초안 삭제", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { 200: { description: "삭제 완료" } } },
    },
    "/api/planning/{id}/make": {
      post: {
        tags: ["기획보드"],
        summary: "AI 기획 생성 요청",
        description: "PLANNING 타입 AiTask를 생성합니다. AI가 manualInfo와 연결 요구사항을 기반으로 결과물을 생성합니다.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: { "application/json": { schema: { type: "object", properties: { comment: { type: "string", description: "AI 추가 요청사항" } } } } },
        },
        responses: { 200: { description: "생성된 AiTask" } },
      },
    },
    "/api/planning/{id}/req-map": {
      post: {
        tags: ["기획보드"],
        summary: "기획-요구사항 연결 설정",
        description: "기획 초안과 요구사항의 N:N 연결을 일괄 설정합니다. 기존 연결은 모두 교체됩니다.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: { type: "object", properties: { requirementIds: { type: "array", items: { type: "integer" } } } },
            },
          },
        },
        responses: { 200: { description: "업데이트된 연결 목록" } },
      },
    },
    "/api/planning/{id}/duplicate": {
      post: {
        tags: ["기획보드"],
        summary: "기획 초안 복제",
        description: "현재 기획 초안을 DRAFT 상태로 복제합니다. 연결된 요구사항도 함께 복제됩니다.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "복제된 기획 초안 객체" } },
      },
    },
    "/api/planning/{id}/plan-ref-map": {
      post: {
        tags: ["기획보드"],
        summary: "기획 간 참조 연결 설정",
        description: "기획 초안 간 참조 관계를 설정합니다. 다른 기획의 결과물을 참조할 때 사용합니다.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: { "application/json": { schema: { type: "object", properties: { refPlanIds: { type: "array", items: { type: "integer" } } } } } },
        },
        responses: { 200: { description: "업데이트된 참조 연결" } },
      },
    },

    /* ═══════════════════════════════════════════════
     * 설계마당
     * ═══════════════════════════════════════════════ */
    "/api/design-contents": {
      get: {
        tags: ["설계마당"],
        summary: "설계 문서 목록 조회",
        description: "설계 유형(ERD/MOCKUP/MINDMAP)·상태·키워드로 필터링합니다. 연결된 요구사항 정보가 포함됩니다.",
        parameters: [
          { name: "page",       in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize",   in: "query", schema: { type: "integer", default: 20 } },
          { name: "designType", in: "query", schema: { type: "string"  }, description: "설계 유형 필터 (ERD, MOCKUP, MINDMAP 등)" },
          { name: "status",     in: "query", schema: { type: "string"  }, description: "상태 필터" },
          { name: "search",     in: "query", schema: { type: "string"  }, description: "설계서명 검색 (ILIKE)" },
        ],
        responses: { 200: { description: "설계 문서 목록 (페이지네이션)", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, data: { type: "array", items: { $ref: "#/components/schemas/DesignContent" } } } } } } } },
      },
      post: {
        tags: ["설계마당"],
        summary: "설계 문서 생성",
        description: "시스템 ID(DOC-NNNNN)를 자동 부여합니다. toolType 미지정 시 designType 기본값이 적용됩니다.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "designType"],
                properties: {
                  title:         { type: "string",  description: "설계서 제목" },
                  designType:    { type: "string",  description: "설계 분류 (ERD, MOCKUP, MINDMAP 등)" },
                  toolType:      { type: "string",  enum: ["MERMAID","EXCALIDRAW"], description: "편집 도구 (생략 시 designType 기본값)" },
                  requirementId: { type: "integer", nullable: true, description: "연결할 요구사항 ID" },
                  description:   { type: "string",  nullable: true, description: "메모" },
                },
              },
              example: { title: "회원 ERD", designType: "ERD", toolType: "MERMAID" },
            },
          },
        },
        responses: { 200: { description: "생성된 설계 문서 객체", content: { "application/json": { schema: { $ref: "#/components/schemas/DesignContent" } } } } },
      },
    },
    "/api/design-contents/{id}": {
      get: {
        tags: ["설계마당"],
        summary: "설계 문서 단건 조회",
        description: "contentData(Mermaid 코드 또는 Excalidraw JSON)와 연결 요구사항 정보가 포함됩니다.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" }, description: "contentId" }],
        responses: { 200: { description: "설계 문서 상세", content: { "application/json": { schema: { $ref: "#/components/schemas/DesignContent" } } } }, 404: { description: "존재하지 않음" } },
      },
      put: {
        tags: ["설계마당"],
        summary: "설계 문서 수정",
        description: "제목·설계유형·편집도구·상태·내용(contentData)을 수정합니다. 지정한 필드만 업데이트됩니다.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title:       { type: "string" },
                  designType:  { type: "string" },
                  toolType:    { type: "string", enum: ["MERMAID","EXCALIDRAW"] },
                  status:      { type: "string", enum: ["DRAFT","IN_REVIEW","APPROVED"] },
                  contentData: { type: "string", nullable: true, description: "Mermaid 코드 또는 Excalidraw JSON" },
                  description: { type: "string", nullable: true },
                },
              },
            },
          },
        },
        responses: { 200: { description: "수정된 설계 문서 객체" } },
      },
      delete: {
        tags: ["설계마당"],
        summary: "설계 문서 삭제 (논리 삭제)",
        description: "`use_yn = 'N'` 처리합니다. 실제 데이터는 보존됩니다.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "삭제 완료" } },
      },
    },

    /* ═══════════════════════════════════════════════
     * 표준가이드
     * ═══════════════════════════════════════════════ */
    "/api/standard-guides": {
      get: {
        tags: ["표준가이드"],
        summary: "표준가이드 목록 조회",
        description: "카테고리·활성화 여부로 필터링합니다. 최신 AI 태스크(latestTask)가 포함됩니다.",
        parameters: [
          { name: "category", in: "query", schema: { type: "string", enum: ["UI","DATA","AUTH","API","COMMON","SECURITY","FILE","ERROR","BATCH","REPORT"] } },
          { name: "isActive", in: "query", schema: { type: "string", enum: ["Y","N"] } },
        ],
        responses: { 200: { description: "표준가이드 목록" } },
      },
      post: {
        tags: ["표준가이드"],
        summary: "표준가이드 생성",
        description: "시스템 ID(SG-NNNNN)를 자동 부여합니다.",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["category", "title"],
                properties: {
                  category: { type: "string" },
                  title:    { type: "string" },
                  content:  { type: "string" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "생성된 표준가이드" } },
      },
    },
    "/api/standard-guides/{id}": {
      get:    { tags: ["표준가이드"], summary: "표준가이드 단건 조회", description: "최근 AI 태스크 5건이 포함됩니다.", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { 200: { description: "가이드 상세" } } },
      put:    { tags: ["표준가이드"], summary: "표준가이드 수정", description: "`status: REVIEW_REQ` 로 변경 시 INSPECT AiTask 자동 생성됩니다.", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], requestBody: { content: { "application/json": { schema: { type: "object" } } } }, responses: { 200: { description: "수정된 가이드" } } },
      patch:  { tags: ["표준가이드"], summary: "가이드 활성화/비활성화", description: "isActive Y/N 값으로 가이드의 사용 여부를 토글합니다.", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], requestBody: { content: { "application/json": { schema: { type: "object", properties: { isActive: { type: "string", enum: ["Y","N"] } } } } } }, responses: { 200: { description: "수정된 가이드" } } },
      delete: { tags: ["표준가이드"], summary: "표준가이드 삭제", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { 200: { description: "삭제 완료" } } },
    },
    "/api/standard-guides/{id}/inspect": {
      post: {
        tags: ["표준가이드"],
        summary: "AI 가이드 점검 요청",
        description: "INSPECT 타입 AiTask를 생성합니다. AI가 가이드 내용의 완성도·일관성·실용성을 점검합니다.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: { "application/json": { schema: { type: "object", properties: { comment: { type: "string", description: "AI 추가 요청사항" } } } } },
        },
        responses: { 200: { description: "생성된 AiTask" } },
      },
    },

    /* ═══════════════════════════════════════════════
     * 첨부파일
     * ═══════════════════════════════════════════════ */
    "/api/attachments": {
      post: {
        tags: ["첨부파일"],
        summary: "파일 업로드",
        description: "multipart/form-data로 파일을 업로드합니다. AI 워커가 이미지 첨부파일을 가져갈 때 X-API-Key가 필요합니다.",
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file", "refTableName", "refPkId"],
                properties: {
                  file:         { type: "string", format: "binary", description: "업로드할 파일" },
                  refTableName: { type: "string", description: "연결 테이블명 (예: tb_area)" },
                  refPkId:      { type: "string", description: "연결 레코드 PK" },
                  description:  { type: "string", description: "파일 설명 (선택)" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "업로드된 파일 정보 (downloadUrl 포함)" } },
      },
    },
    "/api/attachments/{id}": {
      get:    { tags: ["첨부파일"], summary: "파일 다운로드", description: "파일을 바이너리 스트림으로 반환합니다. X-API-Key 인증 시 AI 워커도 접근 가능합니다.", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { 200: { description: "파일 스트림", content: { "application/octet-stream": { schema: { type: "string", format: "binary" } } } } } },
      patch:  { tags: ["첨부파일"], summary: "파일 설명 수정", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], requestBody: { content: { "application/json": { schema: { type: "object", properties: { description: { type: "string" } } } } } }, responses: { 200: { description: "수정된 첨부파일 정보" } } },
      delete: { tags: ["첨부파일"], summary: "파일 삭제 (논리 삭제)", description: "`del_yn = 'Y'` 처리합니다.", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { 200: { description: "삭제 완료" } } },
    },

    /* ═══════════════════════════════════════════════
     * 콘텐츠 버전
     * ═══════════════════════════════════════════════ */
    "/api/content-versions": {
      get: {
        tags: ["콘텐츠 버전"],
        summary: "콘텐츠 버전 조회",
        description: "`versionId` 지정 시 단건 상세(content 포함), 미지정 시 목록(content 제외)을 반환합니다.",
        parameters: [
          { name: "refTableName", in: "query", required: true,  schema: { type: "string" }, description: "테이블명 (예: tb_area)" },
          { name: "refPkId",      in: "query", required: true,  schema: { type: "string" }, description: "레코드 PK" },
          { name: "fieldName",    in: "query", required: true,  schema: { type: "string" }, description: "필드명 (예: spec)" },
          { name: "versionId",    in: "query", required: false, schema: { type: "string" }, description: "단건 조회 시 버전 ID 지정" },
        ],
        responses: { 200: { description: "버전 목록 또는 단건 상세 (content 포함)" } },
      },
    },

    /* ═══════════════════════════════════════════════
     * DB 스키마
     * ═══════════════════════════════════════════════ */
    "/api/db-schema": {
      get: {
        tags: ["DB 스키마"],
        summary: "DB 테이블 목록 조회",
        description: "프로젝트 DB의 테이블 메타 정보(테이블명, 설명, 컬럼 수)를 반환합니다.",
        parameters: [
          { name: "q", in: "query", schema: { type: "string" }, description: "테이블명 검색" },
        ],
        responses: { 200: { description: "테이블 목록" } },
      },
    },
    "/api/db-schema/{id}": {
      get: {
        tags: ["DB 스키마"],
        summary: "테이블 상세 조회",
        description: "테이블의 컬럼 목록(타입, PK 여부, 설명 등)을 반환합니다.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" }, description: "tableId" }],
        responses: { 200: { description: "테이블 상세 (컬럼 목록 포함)" } },
      },
    },
    "/api/db-schema/columns": {
      get: {
        tags: ["DB 스키마"],
        summary: "전체 컬럼 검색",
        description: "컬럼명·타입으로 전체 테이블에서 컬럼을 검색합니다.",
        parameters: [
          { name: "q",       in: "query", schema: { type: "string" }, description: "컬럼명 검색" },
          { name: "tableId", in: "query", schema: { type: "integer" }, description: "특정 테이블로 한정" },
        ],
        responses: { 200: { description: "컬럼 목록 (소속 테이블명 포함)" } },
      },
    },

    /* ═══════════════════════════════════════════════
     * 기타
     * ═══════════════════════════════════════════════ */
    "/api/dashboard": {
      get: {
        tags: ["기타"],
        summary: "메인 대시보드 요약",
        description: "전체 기능 수, 상태별 분포, AI 진행 중 태스크 수, 최근 활동 등을 반환합니다.",
        responses: { 200: { description: "대시보드 집계 데이터 (totalFunctions, byStatus, aiRunning 등)" } },
      },
    },
    "/api/dashboard2": {
      get: {
        tags: ["기타"],
        summary: "개발 현황판 (상세 통계)",
        description: "화면별·영역별·기능별 진행률, AI 처리 현황, 단계별 완료율 등 상세 개발 현황 데이터를 반환합니다.",
        responses: { 200: { description: "개발 현황 집계 데이터" } },
      },
    },
    "/api/tree": {
      get: {
        tags: ["기타"],
        summary: "요구사항-화면-영역-기능 트리 뷰",
        description: "요구사항을 루트로 화면 → 영역 → 기능 계층 구조 전체를 반환합니다. 트리 뷰 화면에서 사용합니다.",
        responses: { 200: { description: "계층 트리 데이터" } },
      },
    },
  },
};
