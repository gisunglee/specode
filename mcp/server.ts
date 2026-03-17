/**
 * SPECODE MCP Server
 *
 * Claude Code / Claude Desktop 에서 SPECODE 데이터를 조회·등록·AI 요청하는 MCP 서버.
 * Prisma에 직접 연결 — Next.js 서버 없이 독립 실행 가능.
 *
 * [stdio 모드] 기본 — Claude Code 로컬 연결
 *   실행: npx tsx mcp/server.ts
 *
 * [HTTP 모드] 외부(claude.ai 등) 연결용
 *   실행: MCP_HTTP_PORT=3001 MCP_API_KEY=your-secret npx tsx mcp/server.ts
 *   또는: npx tsx mcp/server.ts --http --port 3001 --key your-secret
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import express from "express";

const prisma = new PrismaClient();

/* ─── 시스템 ID 생성 (sequence.ts 로직 동일) ──────────────────── */
async function generateSystemId(prefix: string): Promise<string> {
  const result = await prisma.$transaction(async (tx) => {
    const seq = await tx.sequence.upsert({
      where: { prefix },
      create: { prefix, lastValue: 1 },
      update: { lastValue: { increment: 1 } },
    });
    return `${prefix}-${String(seq.lastValue).padStart(5, "0")}`;
  });
  return result;
}

/* ─── 응답 헬퍼 ────────────────────────────────────────────────── */
function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

/* ─── MCP 서버 인스턴스 ────────────────────────────────────────── */
const server = new McpServer({ name: "specode", version: "1.0.0" });

/* ═══════════════════════════════════════════════════════════════
   조회 Tools
═══════════════════════════════════════════════════════════════ */

server.tool(
  "list_screens",
  "화면 목록 조회 (최대 50건)",
  {
    search:        z.string().optional().describe("화면명 검색"),
    requirementId: z.number().optional().describe("요구사항 ID 필터"),
  },
  async ({ search, requirementId }) => {
    const where: Record<string, unknown> = {};
    if (requirementId) where.requirementId = requirementId;
    if (search) where.name = { contains: search };

    const screens = await prisma.screen.findMany({
      where,
      include: {
        requirement: { select: { systemId: true, name: true } },
        _count: { select: { areas: true } },
      },
      orderBy: [{ menuOrder: "asc" }, { screenId: "asc" }],
      take: 50,
    });
    return ok(screens);
  }
);

server.tool(
  "get_screen",
  "화면 상세 조회 — 영역 + 기능 전체 포함",
  { screenId: z.number().describe("화면 ID") },
  async ({ screenId }) => {
    const screen = await prisma.screen.findUnique({
      where: { screenId },
      include: {
        requirement: { select: { systemId: true, name: true } },
        areas: {
          orderBy: { sortOrder: "asc" },
          include: { functions: { orderBy: { createdAt: "asc" } } },
        },
      },
    });
    if (!screen) return ok({ error: "화면을 찾을 수 없습니다." });
    return ok(screen);
  }
);

server.tool(
  "list_areas",
  "영역 목록 조회 (최대 50건)",
  {
    screenId: z.number().optional().describe("화면 ID 필터"),
    status:   z.string().optional().describe("상태 필터 (DRAFT, DESIGN_REQ, DESIGN_DONE 등)"),
    search:   z.string().optional().describe("영역명 또는 영역코드 검색"),
  },
  async ({ screenId, status, search }) => {
    const where: Record<string, unknown> = {};
    if (screenId) where.screenId = screenId;
    if (status)   where.status = status;
    if (search)   where.OR = [{ name: { contains: search } }, { areaCode: { contains: search } }];

    const areas = await prisma.area.findMany({
      where,
      include: {
        screen: { select: { name: true, systemId: true } },
        _count: { select: { functions: true } },
      },
      orderBy: [{ screenId: "asc" }, { sortOrder: "asc" }],
      take: 50,
    });
    return ok(areas);
  }
);

server.tool(
  "get_area",
  "영역 상세 조회 — 기능 목록 포함",
  { areaId: z.number().describe("영역 ID") },
  async ({ areaId }) => {
    const area = await prisma.area.findUnique({
      where: { areaId },
      include: {
        screen:    { select: { name: true, systemId: true } },
        functions: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!area) return ok({ error: "영역을 찾을 수 없습니다." });
    return ok(area);
  }
);

server.tool(
  "list_functions",
  "기능 목록 조회 (최대 50건)",
  {
    areaId: z.number().optional().describe("영역 ID 필터"),
    status: z.string().optional().describe("상태 필터 (DRAFT, DESIGN_REQ, IMPL_REQ 등)"),
    search: z.string().optional().describe("기능명 또는 systemId 검색"),
  },
  async ({ areaId, status, search }) => {
    const where: Record<string, unknown> = {};
    if (areaId)  where.areaId = areaId;
    if (status)  where.status = status;
    if (search)  where.OR = [{ name: { contains: search } }, { systemId: { contains: search } }];

    const functions = await prisma.function.findMany({
      where,
      include: { area: { select: { name: true, areaCode: true } } },
      orderBy: { createdAt: "asc" },
      take: 50,
    });
    return ok(functions);
  }
);

server.tool(
  "get_function",
  "기능 상세 조회 — 최근 AI 작업 이력 포함",
  { functionId: z.number().describe("기능 ID") },
  async ({ functionId }) => {
    const func = await prisma.function.findUnique({ where: { functionId } });
    if (!func) return ok({ error: "기능을 찾을 수 없습니다." });

    const recentTasks = await prisma.aiTask.findMany({
      where: { refTableName: "tb_function", refPkId: functionId },
      orderBy: { requestedAt: "desc" },
      take: 5,
      select: { aiTaskId: true, systemId: true, taskType: true, taskStatus: true, requestedAt: true },
    });
    return ok({ ...func, recentTasks });
  }
);

server.tool(
  "list_requirements",
  "요구사항 목록 조회 (최대 50건)",
  {
    search: z.string().optional().describe("요구사항명 또는 systemId 검색"),
    taskId: z.number().optional().describe("과업 ID 필터"),
  },
  async ({ search, taskId }) => {
    const where: Record<string, unknown> = {};
    if (taskId) where.taskId = taskId;
    if (search) where.OR = [{ name: { contains: search } }, { systemId: { contains: search } }];

    const reqs = await prisma.requirement.findMany({
      where,
      select: {
        requirementId: true, systemId: true, name: true,
        priority: true, source: true, updatedAt: true,
        _count: { select: { screens: true } },
      },
      orderBy: { requirementId: "asc" },
      take: 50,
    });
    return ok(reqs);
  }
);

server.tool(
  "list_ai_tasks",
  "AI 작업 현황 조회",
  {
    taskStatus: z.string().optional().describe("상태 필터 (NONE, RUNNING, SUCCESS, FAILED 등)"),
    taskType:   z.string().optional().describe("유형 필터 (DESIGN, IMPLEMENT, INSPECT 등)"),
    limit:      z.number().optional().describe("최대 조회 수 (기본 20)"),
  },
  async ({ taskStatus, taskType, limit }) => {
    const where: Record<string, unknown> = {};
    if (taskStatus) where.taskStatus = taskStatus;
    if (taskType)   where.taskType = taskType;

    const tasks = await prisma.aiTask.findMany({
      where,
      orderBy: { requestedAt: "desc" },
      take: limit ?? 20,
    });
    return ok(tasks);
  }
);

server.tool(
  "list_tasks",
  "과업(Task) 목록 조회 (최대 50건)",
  {
    search: z.string().optional().describe("과업명 또는 systemId 검색"),
  },
  async ({ search }) => {
    const where: Record<string, unknown> = {};
    if (search) where.OR = [{ name: { contains: search } }, { systemId: { contains: search } }];

    const tasks = await prisma.task.findMany({
      where,
      select: {
        taskId: true, systemId: true, taskNo: true, name: true,
        category: true, definition: true, rfpPage: true,
        createdAt: true,
        _count: { select: { requirements: true } },
      },
      orderBy: { taskId: "asc" },
      take: 50,
    });
    return ok(tasks);
  }
);

/* ═══════════════════════════════════════════════════════════════
   등록/수정 Tools
═══════════════════════════════════════════════════════════════ */

server.tool(
  "create_area",
  "영역 등록",
  {
    screenId:  z.number().describe("소속 화면 ID"),
    name:      z.string().describe("영역명"),
    areaType:  z.enum(["GRID", "FORM", "POPUP", "TAB", "SEARCH", "ETC"]).describe("영역 유형"),
    sortOrder: z.number().optional().describe("정렬 순서 (기본 1)"),
  },
  async ({ screenId, name, areaType, sortOrder }) => {
    const areaCode = await generateSystemId("AR");
    const area = await prisma.area.create({
      data: { areaCode, screenId, name, areaType, sortOrder: sortOrder ?? 1 },
    });
    return ok({ created: true, area });
  }
);

server.tool(
  "create_function",
  "기능 등록",
  {
    areaId:      z.number().describe("소속 영역 ID"),
    name:        z.string().describe("기능명"),
    spec:        z.string().optional().describe("기본 설계 내용 (마크다운)"),
    displayCode: z.string().optional().describe("표시코드"),
  },
  async ({ areaId, name, spec, displayCode }) => {
    const systemId = await generateSystemId("FID");
    const func = await prisma.function.create({
      data: { systemId, areaId, name, spec: spec ?? null, displayCode: displayCode ?? null },
    });
    return ok({ created: true, function: func });
  }
);

server.tool(
  "update_function",
  "기능 설계 내용 수정 (지정한 필드만 변경)",
  {
    functionId:      z.number().describe("기능 ID"),
    name:            z.string().optional().describe("기능명"),
    spec:            z.string().optional().describe("기본 설계 내용 (마크다운)"),
    aiDesignContent: z.string().optional().describe("상세설계 내용 (마크다운)"),
  },
  async ({ functionId, name, spec, aiDesignContent }) => {
    const data: Record<string, unknown> = {};
    if (name !== undefined)            data.name = name;
    if (spec !== undefined)            data.spec = spec;
    if (aiDesignContent !== undefined) data.aiDesignContent = aiDesignContent;

    if (Object.keys(data).length === 0) return ok({ error: "변경할 필드가 없습니다." });
    const func = await prisma.function.update({ where: { functionId }, data });
    return ok({ updated: true, function: func });
  }
);

/* ═══════════════════════════════════════════════════════════════
   AI 요청 Tools
═══════════════════════════════════════════════════════════════ */

server.tool(
  "request_design",
  "영역 AI 설계 요청 — 상태를 DESIGN_REQ로 변경하고 AiTask 생성",
  {
    areaId:  z.number().describe("영역 ID"),
    comment: z.string().optional().describe("AI에게 전달할 추가 요청사항"),
  },
  async ({ areaId, comment }) => {
    const area = await prisma.area.findUnique({ where: { areaId }, select: { spec: true } });
    if (!area) return ok({ error: "영역을 찾을 수 없습니다." });

    const taskSystemId = await generateSystemId("ATK");
    await prisma.$transaction([
      prisma.area.update({ where: { areaId }, data: { status: "DESIGN_REQ" } }),
      prisma.aiTask.create({
        data: {
          systemId: taskSystemId,
          refTableName: "tb_area",
          refPkId: areaId,
          taskType: "DESIGN",
          taskStatus: "NONE",
          spec: area.spec ?? null,
          comment: comment?.trim() || null,
        },
      }),
    ]);
    return ok({ requested: true, taskSystemId });
  }
);

server.tool(
  "request_implement_function",
  "기능 단위 구현 요청 — AiTask(IMPLEMENT) 생성",
  {
    functionId:  z.number().describe("기능 ID"),
    changeNote: z.string().optional().describe("이전 구현 이후 변경사항 메모"),
  },
  async ({ functionId, changeNote }) => {
    const func = await prisma.function.findUnique({ where: { functionId } });
    if (!func) return ok({ error: "기능을 찾을 수 없습니다." });

    const specParts: string[] = [];
    if (func.spec)            specParts.push(`## 기본 설계 내용\n\n${func.spec}`);
    if (func.aiDesignContent) specParts.push(`## 상세설계\n\n${func.aiDesignContent}`);

    const taskSystemId = await generateSystemId("ATK");
    await prisma.aiTask.create({
      data: {
        systemId: taskSystemId,
        refTableName: "tb_function",
        refPkId: functionId,
        taskType: "IMPLEMENT",
        taskStatus: "NONE",
        spec: specParts.join("\n\n---\n\n") || null,
        contextSnapshot: JSON.stringify({
          spec: func.spec || "",
          aiDesignContent: func.aiDesignContent || "",
          refContent: func.refContent || "",
        }),
        changeNote: changeNote?.trim() || null,
      },
    });
    return ok({ requested: true, taskSystemId });
  }
);

server.tool(
  "request_implement_area",
  "영역 단위 구현 요청 — 영역+기능 전체 spec 포함 AiTask 생성",
  {
    areaId:     z.number().describe("영역 ID"),
    changeNote: z.string().optional().describe("이전 구현 이후 변경사항 메모"),
  },
  async ({ areaId, changeNote }) => {
    const area = await prisma.area.findUnique({
      where: { areaId },
      select: {
        areaCode: true, name: true, spec: true,
        functions: {
          select: { functionId: true, name: true, spec: true, aiDesignContent: true, refContent: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!area) return ok({ error: "영역을 찾을 수 없습니다." });

    const specParts: string[] = [];
    if (area.spec) specParts.push(`# 영역: ${area.name} (${area.areaCode})\n\n## 영역 설명\n\n${area.spec}`);
    for (const f of area.functions) {
      const fParts = [`## 기능: ${f.name}`];
      if (f.spec)            fParts.push(`\n### 기본 설계 내용\n\n${f.spec}`);
      if (f.aiDesignContent) fParts.push(`\n### 상세설계\n\n${f.aiDesignContent}`);
      if (fParts.length > 1) specParts.push(fParts.join("\n"));
    }

    const taskSystemId = await generateSystemId("ATK");
    await prisma.aiTask.create({
      data: {
        systemId: taskSystemId,
        refTableName: "tb_area",
        refPkId: areaId,
        taskType: "IMPLEMENT",
        taskStatus: "NONE",
        spec: specParts.join("\n\n---\n\n") || null,
        contextSnapshot: JSON.stringify({
          area: { spec: area.spec || "" },
          functions: area.functions.map((f) => ({
            functionId: f.functionId, name: f.name,
            spec: f.spec || "", aiDesignContent: f.aiDesignContent || "", refContent: f.refContent || "",
          })),
        }),
        changeNote: changeNote?.trim() || null,
      },
    });
    return ok({ requested: true, taskSystemId });
  }
);

server.tool(
  "request_implement_screen",
  "화면 단위 구현 요청 — 화면+영역+기능 전체 spec 포함 AiTask 생성",
  {
    screenId:   z.number().describe("화면 ID"),
    changeNote: z.string().optional().describe("이전 구현 이후 변경사항 메모"),
  },
  async ({ screenId, changeNote }) => {
    const screen = await prisma.screen.findUnique({
      where: { screenId },
      select: {
        systemId: true, name: true, spec: true,
        areas: {
          orderBy: { sortOrder: "asc" },
          select: {
            areaId: true, name: true, spec: true,
            functions: {
              select: { functionId: true, name: true, spec: true, aiDesignContent: true, refContent: true },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    });
    if (!screen) return ok({ error: "화면을 찾을 수 없습니다." });

    const specParts: string[] = [];
    if (screen.spec) specParts.push(`# 화면: ${screen.name} (${screen.systemId})\n\n## 화면 설명\n\n${screen.spec}`);
    for (const area of screen.areas) {
      const areaParts = [`# 영역: ${area.name}`];
      if (area.spec) areaParts.push(`\n## 영역 설명\n\n${area.spec}`);
      for (const f of area.functions) {
        const fParts = [`\n## 기능: ${f.name}`];
        if (f.spec)            fParts.push(`\n### 기본 설계 내용\n\n${f.spec}`);
        if (f.aiDesignContent) fParts.push(`\n### 상세설계\n\n${f.aiDesignContent}`);
        if (fParts.length > 1) areaParts.push(fParts.join("\n"));
      }
      specParts.push(areaParts.join("\n"));
    }

    const taskSystemId = await generateSystemId("ATK");
    await prisma.aiTask.create({
      data: {
        systemId: taskSystemId,
        refTableName: "tb_screen",
        refPkId: screenId,
        taskType: "IMPLEMENT",
        taskStatus: "NONE",
        spec: specParts.join("\n\n---\n\n") || null,
        contextSnapshot: JSON.stringify({
          screen: { spec: screen.spec || "" },
          areas: screen.areas.map((a) => ({
            areaId: a.areaId, name: a.name, spec: a.spec || "",
            functions: a.functions.map((f) => ({
              functionId: f.functionId, name: f.name,
              spec: f.spec || "", aiDesignContent: f.aiDesignContent || "", refContent: f.refContent || "",
            })),
          })),
        }),
        changeNote: changeNote?.trim() || null,
      },
    });
    return ok({ requested: true, taskSystemId });
  }
);

/* ─── 서버 기동 ─────────────────────────────────────────────── */
async function main() {
  // HTTP 모드 여부 판단 (환경변수 또는 --http 플래그)
  const args = process.argv.slice(2);
  const isHttp = args.includes("--http") || !!process.env.MCP_HTTP_PORT;

  if (!isHttp) {
    // ── stdio 모드 (기본, Claude Code 로컬 연결) ──
    const transport = new StdioServerTransport();
    await server.connect(transport);
    process.stderr.write("[SPECODE MCP] Server started (stdio)\n");
    return;
  }

  // ── HTTP 모드 (외부 연결용) ──
  const portArg = args[args.indexOf("--port") + 1];
  const port = portArg ? parseInt(portArg) : (parseInt(process.env.MCP_HTTP_PORT ?? "3001") || 3001);
  const keyArg = args[args.indexOf("--key") + 1];
  const apiKey = keyArg ?? process.env.MCP_API_KEY ?? "";

  const app = express();
  app.use(express.json());

  // API Key 인증 미들웨어
  if (apiKey) {
    app.use((req, res, next) => {
      const authHeader = req.headers["authorization"];
      const keyHeader = req.headers["x-api-key"];
      const provided = authHeader?.replace("Bearer ", "") ?? keyHeader;
      if (provided !== apiKey) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      next();
    });
  }

  // MCP Streamable HTTP 엔드포인트
  app.all("/mcp", async (req, res) => {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  // 헬스체크
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", server: "specode-mcp", mode: "http" });
  });

  app.listen(port, () => {
    process.stderr.write(`[SPECODE MCP] HTTP server started on port ${port}\n`);
    if (apiKey) {
      process.stderr.write(`[SPECODE MCP] API Key auth enabled\n`);
    } else {
      process.stderr.write(`[SPECODE MCP] WARNING: No API Key set — anyone can access!\n`);
    }
    process.stderr.write(`[SPECODE MCP] MCP endpoint: http://localhost:${port}/mcp\n`);
  });
}

main().catch((err) => {
  process.stderr.write(`[SPECODE MCP] Fatal: ${err}\n`);
  process.exit(1);
});
