/**
 * GET /api-docs
 *
 * Swagger UI 페이지를 반환합니다.
 * OpenAPI 스펙은 /api/openapi 에서 fetch 합니다.
 *
 * 패키지 설치 없이 CDN(unpkg)으로 Swagger UI를 로드합니다.
 */
export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SPECODE API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui.css" />
  <style>
    /* ── 기본 레이아웃 ──────────────────────────── */
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: #0f1117;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    /* ── 상단 헤더 ──────────────────────────────── */
    .custom-header {
      background: #1a1d27;
      border-bottom: 1px solid #2d3148;
      padding: 14px 24px;
      display: flex;
      align-items: center;
      gap: 12px;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .custom-header .logo {
      width: 32px;
      height: 32px;
      background: rgba(99, 102, 241, 0.2);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    }
    .custom-header h1 {
      font-size: 16px;
      font-weight: 700;
      color: #f1f5f9;
      letter-spacing: -0.3px;
    }
    .custom-header .badge {
      background: rgba(99, 102, 241, 0.15);
      color: #818cf8;
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 10px;
    }
    .custom-header .back-link {
      margin-left: auto;
      color: #64748b;
      font-size: 13px;
      text-decoration: none;
    }
    .custom-header .back-link:hover { color: #94a3b8; }

    /* ── Swagger UI 다크 테마 오버라이드 ─────────── */
    .swagger-ui { background: transparent; }

    /* 전체 배경 */
    .swagger-ui .wrapper,
    #swagger-ui .swagger-ui {
      background: transparent;
      padding: 0;
    }

    /* 정보 섹션 숨김 (헤더로 대체) */
    .swagger-ui .information-container { display: none; }

    /* 탑바 숨김 */
    .swagger-ui .topbar { display: none; }

    /* 카드 배경 */
    .swagger-ui .opblock {
      background: #1a1d27;
      border: 1px solid #2d3148;
      border-radius: 8px;
      margin-bottom: 8px;
      box-shadow: none;
    }
    .swagger-ui .opblock .opblock-summary {
      border-radius: 8px;
    }
    .swagger-ui .opblock.is-open {
      border-radius: 8px;
    }
    .swagger-ui .opblock .opblock-summary-description {
      color: #94a3b8;
    }

    /* HTTP 메서드 뱃지 */
    .swagger-ui .opblock-summary-method {
      border-radius: 4px;
      font-weight: 700;
      min-width: 72px;
      text-align: center;
    }

    /* 태그 섹션 */
    .swagger-ui .opblock-tag {
      border-bottom: 1px solid #2d3148;
      color: #e2e8f0;
    }
    .swagger-ui .opblock-tag:hover { background: #1e2131; }

    /* 파라미터 테이블 */
    .swagger-ui table thead tr td,
    .swagger-ui table thead tr th {
      color: #94a3b8;
      border-bottom: 1px solid #2d3148;
    }
    .swagger-ui .parameter__name { color: #e2e8f0; }
    .swagger-ui .parameter__type { color: #818cf8; }

    /* 입력 필드 */
    .swagger-ui input[type=text],
    .swagger-ui input[type=password],
    .swagger-ui textarea,
    .swagger-ui select {
      background: #0f1117;
      border: 1px solid #2d3148;
      color: #e2e8f0;
      border-radius: 6px;
    }
    .swagger-ui input[type=text]:focus,
    .swagger-ui textarea:focus {
      border-color: #6366f1;
      outline: none;
    }

    /* 버튼 */
    .swagger-ui .btn {
      border-radius: 6px;
    }
    .swagger-ui .btn.authorize {
      background: rgba(99, 102, 241, 0.15);
      border-color: #6366f1;
      color: #818cf8;
    }
    .swagger-ui .btn.execute {
      background: #6366f1;
      border-color: #6366f1;
      color: #fff;
    }
    .swagger-ui .btn.execute:hover { background: #4f46e5; }

    /* 응답 코드 */
    .swagger-ui .responses-table .response-col_status { color: #34d399; }

    /* 스키마 */
    .swagger-ui .model-box {
      background: #0f1117;
      border: 1px solid #2d3148;
      border-radius: 6px;
    }
    .swagger-ui section.models {
      background: #1a1d27;
      border: 1px solid #2d3148;
      border-radius: 8px;
    }
    .swagger-ui section.models h4 {
      color: #e2e8f0;
    }

    /* 코드 블록 */
    .swagger-ui .highlight-code > pre {
      background: #0f1117 !important;
      border-radius: 6px;
    }
    .swagger-ui .microlight { background: #0f1117; color: #a5b4fc; }

    /* 설명 텍스트 */
    .swagger-ui p, .swagger-ui li {
      color: #94a3b8;
    }

    /* 로딩 */
    #loading {
      position: fixed;
      inset: 0;
      background: #0f1117;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      font-size: 15px;
      color: #64748b;
      z-index: 200;
    }
    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid #2d3148;
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* 래퍼 패딩 */
    #swagger-ui {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px 24px 80px;
    }
  </style>
</head>
<body>

<!-- 로딩 오버레이 -->
<div id="loading">
  <div class="spinner"></div>
  API 문서를 불러오는 중...
</div>

<!-- 커스텀 헤더 -->
<div class="custom-header">
  <div class="logo">🤖</div>
  <h1>SPECODE API</h1>
  <span class="badge">v1.0.0</span>
  <a href="/" class="back-link">← 대시보드로</a>
</div>

<!-- Swagger UI 마운트 포인트 -->
<div id="swagger-ui"></div>

<script src="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui-bundle.js"></script>
<script>
  window.onload = function () {
    SwaggerUIBundle({
      url: "/api/openapi",
      dom_id: "#swagger-ui",
      presets: [
        SwaggerUIBundle.presets.apis,
      ],
      plugins: [SwaggerUIBundle.plugins.DownloadUrl],
      layout: "BaseLayout",
      deepLinking: true,
      displayOperationId: false,
      defaultModelsExpandDepth: 1,
      defaultModelExpandDepth: 2,
      docExpansion: "list",
      filter: true,
      showExtensions: false,
      showCommonExtensions: false,
      tryItOutEnabled: true,
      persistAuthorization: true,
      onComplete: function () {
        document.getElementById("loading").style.display = "none";
      },
    });
  };
</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
