/**
 * spec.ts — OpenAPI 3.0 명세 정의
 *
 * /api/openapi  → JSON 반환 (Swagger UI가 이 URL을 fetch)
 * /api-docs     → Swagger UI HTML 페이지
 */

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "SPECODE API",
    version: "1.0.0",
    description:
      "SPECODE (AI Dev Hub) REST API 명세서.\n\n" +
      "**AI 연동 API** (`/api/ai/*`)는 OpenClaw 전용이며 `X-API-Key` 인증이 필요합니다.\n\n" +
      "나머지 API는 내부 웹 클라이언트용입니다.",
  },

  tags: [
    { name: "AI 연동 (OpenClaw)", description: "OpenClaw AI 폴링 · 시작 · 결과 제출 API" },
    { name: "AI 태스크", description: "AI 태스크 조회 및 관리 (내부)" },
    { name: "기능", description: "tb_function CRUD" },
    { name: "화면", description: "tb_screen CRUD" },
    { name: "요구사항", description: "tb_requirement CRUD" },
    { name: "표준가이드", description: "tb_standard_guide CRUD + AI 점검" },
    { name: "기타", description: "대시보드, 트리 뷰" },
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
          refTableName: { type: "string",  example: "tb_function", enum: ["tb_function", "tb_standard_guide"] },
          refPkId:      { type: "integer", example: 7 },
          taskType:     { type: "string",  example: "DESIGN", enum: ["DESIGN", "REVIEW", "IMPLEMENT", "IMPACT", "INSPECT"] },
          taskStatus:   { type: "string",  example: "NONE", enum: ["NONE", "RUNNING", "SUCCESS", "AUTO_FIXED", "NEEDS_CHECK", "WARNING", "FAILED"] },
          spec:         { type: "string",  nullable: true, description: "처리 시점 기능 설명 스냅샷" },
          comment:      { type: "string",  nullable: true, description: "GS 추가 요청사항" },
          feedback:     { type: "string",  nullable: true, description: "AI 결과 (마크다운)" },
          resultFiles:  { type: "string",  nullable: true, description: "수정 파일 목록 (줄바꿈 구분)" },
          requestedAt:  { type: "string",  format: "date-time" },
          startedAt:    { type: "string",  format: "date-time", nullable: true },
          completedAt:  { type: "string",  format: "date-time", nullable: true },
        },
      },
      FunctionItem: {
        type: "object",
        properties: {
          functionId:        { type: "integer" },
          systemId:          { type: "string",  example: "FID-00001" },
          displayCode:       { type: "string",  nullable: true },
          name:              { type: "string" },
          screenId:          { type: "integer" },
          spec:              { type: "string",  nullable: true, description: "기능 설명 (마크다운)" },
          aiDesignContent:   { type: "string",  nullable: true },
          aiInspFeedback:    { type: "string",  nullable: true },
          refContent:        { type: "string",  nullable: true },
          status:            { type: "string",  example: "DRAFT" },
          priority:          { type: "string",  example: "MEDIUM" },
          createdAt:         { type: "string",  format: "date-time" },
          updatedAt:         { type: "string",  format: "date-time" },
        },
      },
      Screen: {
        type: "object",
        properties: {
          screenId:      { type: "integer" },
          systemId:      { type: "string", example: "PID-00001" },
          displayCode:   { type: "string", nullable: true },
          name:          { type: "string" },
          screenType:    { type: "string", nullable: true },
          requirementId: { type: "integer" },
          spec:          { type: "string", nullable: true },
          layoutData:    { type: "string", nullable: true },
        },
      },
      Requirement: {
        type: "object",
        properties: {
          requirementId: { type: "integer" },
          systemId:      { type: "string", example: "RQ-00001" },
          name:          { type: "string" },
          content:       { type: "string", nullable: true },
          description:   { type: "string", nullable: true },
          priority:      { type: "string", nullable: true },
        },
      },
      StandardGuide: {
        type: "object",
        properties: {
          guideId:           { type: "integer" },
          systemId:          { type: "string", example: "STG-00001" },
          category:          { type: "string", example: "UI", enum: ["UI","DATA","AUTH","API","COMMON","SECURITY","FILE","ERROR","BATCH","REPORT"] },
          title:             { type: "string" },
          content:           { type: "string", nullable: true },
          relatedFiles:      { type: "string", nullable: true },
          isActive:          { type: "string", enum: ["Y","N"] },
          status:            { type: "string", example: "REVIEW_REQ" },
          aiFeedbackContent: { type: "string", nullable: true },
          aiFeedbackAt:      { type: "string", format: "date-time", nullable: true },
        },
      },
      ApiSuccess: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data:    { },
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
        description:
          "OpenClaw가 주기적으로 호출하여 처리할 태스크를 가져옵니다.\n\n" +
          "`taskStatus = NONE` 인 태스크를 오래된 순서(FIFO)로 반환합니다.",
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: "limit",    in: "query", schema: { type: "integer", default: 10, maximum: 50 }, description: "반환 건수" },
          { name: "taskType", in: "query", schema: { type: "string",  enum: ["DESIGN","REVIEW","IMPLEMENT","IMPACT","INSPECT"] }, description: "작업 유형 필터" },
        ],
        responses: {
          200: {
            description: "대기 태스크 목록",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { type: "array", items: { $ref: "#/components/schemas/AiTask" } },
                  },
                },
              },
            },
          },
          401: { description: "인증 실패", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
        },
      },
    },

    "/api/ai/tasks/{id}/start": {
      patch: {
        tags: ["AI 연동 (OpenClaw)"],
        summary: "작업 시작 알림",
        description: "AI가 태스크 처리를 시작할 때 호출합니다. `NONE → RUNNING` 으로 변경됩니다.",
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" }, description: "aiTaskId" },
        ],
        responses: {
          200: {
            description: "업데이트된 AiTask",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccess" } } },
          },
          400: { description: "NONE 상태가 아님 (INVALID_STATE)" },
          401: { description: "인증 실패" },
          404: { description: "태스크 없음" },
        },
      },
    },

    "/api/ai/tasks/{id}/complete": {
      post: {
        tags: ["AI 연동 (OpenClaw)"],
        summary: "작업 결과 제출",
        description:
          "AI가 처리 완료 후 결과를 제출합니다.\n\n" +
          "`SUCCESS | AUTO_FIXED` 시 대상 엔티티(tb_function 등)를 자동으로 업데이트합니다.\n\n" +
          "| taskType | 반영 필드 | 상태 변경 |\n" +
          "|----------|-----------|----------|\n" +
          "| INSPECT | ai_insp_feedback (function) | REVIEW_DONE |\n" +
          "| INSPECT | ai_feedback_content (guide) | REVIEW_DONE |\n" +
          "| DESIGN | ai_design_content | DESIGN_DONE |\n" +
          "| IMPLEMENT | ai_impl_feedback | IMPL_DONE |",
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" }, description: "aiTaskId" },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["taskStatus"],
                properties: {
                  taskStatus:  { type: "string", enum: ["SUCCESS","AUTO_FIXED","NEEDS_CHECK","WARNING","FAILED"], description: "처리 결과 상태" },
                  feedback:    { type: "string", description: "AI 결과 내용 (마크다운)" },
                  resultFiles: { type: "string", description: "수정한 파일 경로 목록 (줄바꿈 구분)" },
                },
              },
              example: {
                taskStatus: "SUCCESS",
                feedback: "## 상세 설계\n\n### API 엔드포인트\n`POST /api/login`...",
                resultFiles: "src/main/java/LoginService.java\nsrc/main/resources/LoginMapper.xml",
              },
            },
          },
        },
        responses: {
          200: {
            description: "업데이트된 AiTask",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccess" } } },
          },
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
        summary: "AI 태스크 목록",
        parameters: [
          { name: "page",       in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize",   in: "query", schema: { type: "integer", default: 20 } },
          { name: "taskStatus", in: "query", schema: { type: "string" } },
          { name: "taskType",   in: "query", schema: { type: "string" } },
        ],
        responses: { 200: { description: "태스크 목록 (target 정보 포함, 페이지네이션)" } },
      },
    },
    "/api/ai-tasks/{id}": {
      patch: {
        tags: ["AI 태스크"],
        summary: "태스크 취소",
        description: "`NONE` 상태 태스크를 `CANCELLED` 로 변경합니다.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: { type: "object", properties: { taskStatus: { type: "string", enum: ["CANCELLED"] } } },
            },
          },
        },
        responses: { 200: { description: "취소된 태스크" }, 400: { description: "NONE 상태가 아님" } },
      },
    },

    /* ═══════════════════════════════════════════════
     * 기능
     * ═══════════════════════════════════════════════ */
    "/api/functions": {
      get: {
        tags: ["기능"],
        summary: "기능 목록",
        parameters: [
          { name: "page",     in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 20 } },
          { name: "screenId", in: "query", schema: { type: "integer" }, description: "화면 ID 필터" },
          { name: "status",   in: "query", schema: { type: "string"  }, description: "상태 필터" },
          { name: "q",        in: "query", schema: { type: "string"  }, description: "이름 검색" },
        ],
        responses: { 200: { description: "기능 목록 (latestTask 포함)" } },
      },
      post: {
        tags: ["기능"],
        summary: "기능 생성",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "screenId"],
                properties: {
                  name:     { type: "string" },
                  screenId: { type: "integer" },
                  spec:     { type: "string" },
                  priority: { type: "string", enum: ["LOW","MEDIUM","HIGH"] },
                },
              },
            },
          },
        },
        responses: { 200: { description: "생성된 기능" } },
      },
    },
    "/api/functions/{id}": {
      get: {
        tags: ["기능"],
        summary: "기능 단건 조회",
        description: "attachments, tasks 포함",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "기능 상세" }, 404: { description: "없음" } },
      },
      put: {
        tags: ["기능"],
        summary: "기능 수정",
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
                  changeReason:    { type: "string" },
                  priority:        { type: "string" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "수정된 기능" } },
      },
      patch: {
        tags: ["기능"],
        summary: "기능 상태 변경",
        description:
          "`REVIEW_REQ | DESIGN_REQ | IMPL_REQ` 로 변경 시 AiTask가 자동 생성됩니다.\n\n" +
          "가능한 상태: `DRAFT → REVIEW_REQ → REVIEW_DONE → DESIGN_REQ → DESIGN_DONE → CONFIRM_Y → IMPL_REQ → IMPL_DONE`",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status:  { type: "string" },
                  comment: { type: "string", description: "AI에게 전달할 추가 요청사항" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "수정된 기능" } },
      },
      delete: {
        tags: ["기능"],
        summary: "기능 삭제",
        description: "`IMPL_DONE` 상태는 삭제 불가",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "삭제 완료" }, 400: { description: "삭제 불가 상태" } },
      },
    },

    /* ═══════════════════════════════════════════════
     * 화면
     * ═══════════════════════════════════════════════ */
    "/api/screens": {
      get: {
        tags: ["화면"],
        summary: "화면 목록",
        parameters: [
          { name: "requirementId", in: "query", schema: { type: "integer" } },
          { name: "page",          in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize",      in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: { 200: { description: "화면 목록" } },
      },
      post: {
        tags: ["화면"],
        summary: "화면 생성",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "requirementId"],
                properties: {
                  name:          { type: "string" },
                  requirementId: { type: "integer" },
                  screenType:    { type: "string" },
                  displayCode:   { type: "string" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "생성된 화면" } },
      },
    },
    "/api/screens/{id}": {
      get:    { tags: ["화면"], summary: "화면 단건 조회 (functions 포함)", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { 200: { description: "화면 상세" } } },
      put:    { tags: ["화면"], summary: "화면 수정", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], requestBody: { content: { "application/json": { schema: { type: "object" } } } }, responses: { 200: { description: "수정된 화면" } } },
      delete: { tags: ["화면"], summary: "화면 삭제", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { 200: { description: "삭제 완료" } } },
    },

    /* ═══════════════════════════════════════════════
     * 요구사항
     * ═══════════════════════════════════════════════ */
    "/api/requirements": {
      get:  { tags: ["요구사항"], summary: "요구사항 목록", parameters: [{ name: "page", in: "query", schema: { type: "integer" } }, { name: "pageSize", in: "query", schema: { type: "integer" } }], responses: { 200: { description: "요구사항 목록" } } },
      post: { tags: ["요구사항"], summary: "요구사항 생성", requestBody: { content: { "application/json": { schema: { type: "object", required: ["name"], properties: { name: { type: "string" }, content: { type: "string" } } } } } }, responses: { 200: { description: "생성된 요구사항" } } },
    },
    "/api/requirements/{id}": {
      get:    { tags: ["요구사항"], summary: "요구사항 단건 조회", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { 200: { description: "요구사항 상세" } } },
      put:    { tags: ["요구사항"], summary: "요구사항 수정",  parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], requestBody: { content: { "application/json": { schema: { type: "object" } } } }, responses: { 200: { description: "수정된 요구사항" } } },
      delete: { tags: ["요구사항"], summary: "요구사항 삭제", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { 200: { description: "삭제 완료" } } },
    },

    /* ═══════════════════════════════════════════════
     * 표준가이드
     * ═══════════════════════════════════════════════ */
    "/api/standard-guides": {
      get:  { tags: ["표준가이드"], summary: "표준가이드 목록 (latestTask 포함)", parameters: [{ name: "category", in: "query", schema: { type: "string" } }, { name: "isActive", in: "query", schema: { type: "string", enum: ["Y","N"] } }], responses: { 200: { description: "가이드 목록" } } },
      post: { tags: ["표준가이드"], summary: "표준가이드 생성", requestBody: { content: { "application/json": { schema: { type: "object", required: ["category","title"], properties: { category: { type: "string" }, title: { type: "string" }, content: { type: "string" } } } } } }, responses: { 200: { description: "생성된 가이드" } } },
    },
    "/api/standard-guides/{id}": {
      get:    { tags: ["표준가이드"], summary: "표준가이드 단건 조회 (tasks 5건 포함)", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { 200: { description: "가이드 상세" } } },
      put:    { tags: ["표준가이드"], summary: "표준가이드 수정", description: "`status: REVIEW_REQ` 로 변경 시 INSPECT AiTask 자동 생성", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], requestBody: { content: { "application/json": { schema: { type: "object" } } } }, responses: { 200: { description: "수정된 가이드" } } },
      patch:  { tags: ["표준가이드"], summary: "활성화/비활성화 토글", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], requestBody: { content: { "application/json": { schema: { type: "object", properties: { isActive: { type: "string", enum: ["Y","N"] } } } } } }, responses: { 200: { description: "수정된 가이드" } } },
      delete: { tags: ["표준가이드"], summary: "표준가이드 삭제", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { 200: { description: "삭제 완료" } } },
    },
    "/api/standard-guides/{id}/inspect": {
      post: {
        tags: ["표준가이드"],
        summary: "AI 점검 요청",
        description: "INSPECT 타입 AiTask를 생성합니다. AI가 폴링으로 가져가서 가이드 내용을 점검합니다.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: { type: "object", properties: { comment: { type: "string", description: "AI에게 전달할 추가 요청사항" } } },
            },
          },
        },
        responses: { 200: { description: "생성된 AiTask" } },
      },
    },

    /* ═══════════════════════════════════════════════
     * 기타
     * ═══════════════════════════════════════════════ */
    "/api/dashboard": {
      get: { tags: ["기타"], summary: "대시보드 요약", responses: { 200: { description: "totalFunctions, byStatus, aiRunning 등" } } },
    },
    "/api/tree": {
      get: { tags: ["기타"], summary: "요구사항-화면-기능 트리", responses: { 200: { description: "계층 트리 데이터" } } },
    },
  },
};
