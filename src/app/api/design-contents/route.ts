import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { generateSystemId } from "@/lib/sequence";
import { DESIGN_TYPES } from "@/lib/constants";

interface DesignRow {
  content_id:     number;
  system_id:      string;
  title:          string;
  design_type:    string;
  tool_type:      string;
  content_data:   string | null;
  status:         string;
  description:    string | null;
  use_yn:         string;
  requirement_id: number | null;
  req_system_id:  string | null;
  req_name:       string | null;
  created_by:     string | null;
  updated_at:     Date;
}

function toApiRow(r: DesignRow) {
  return {
    contentId:    r.content_id,
    systemId:     r.system_id,
    title:        r.title,
    designType:   r.design_type,
    toolType:     r.tool_type,
    contentData:  r.content_data,
    status:       r.status,
    description:  r.description,
    useYn:        r.use_yn,
    createdBy:    r.created_by,
    updatedAt:    r.updated_at,
    requirement:  r.requirement_id
      ? { requirementId: r.requirement_id, systemId: r.req_system_id, name: r.req_name }
      : null,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page       = parseInt(searchParams.get("page")       || "1");
  const pageSize   = parseInt(searchParams.get("pageSize")   || "20");
  const search     = searchParams.get("search")     || "";
  const designType = searchParams.get("designType") || "";
  const status     = searchParams.get("status")     || "";
  const offset     = (page - 1) * pageSize;

  // 동적 WHERE 절 조건
  const conditions: string[] = ["dc.use_yn = 'Y'"];
  if (search)     conditions.push(`dc.title ILIKE '%${search.replace(/'/g, "''")}%'`);
  if (designType) conditions.push(`dc.design_type = '${designType.replace(/'/g, "''")}'`);
  if (status)     conditions.push(`dc.status = '${status.replace(/'/g, "''")}'`);

  const where = conditions.join(" AND ");

  const rows = await prisma.$queryRawUnsafe<DesignRow[]>(`
    SELECT
      dc.content_id, dc.system_id, dc.title, dc.design_type, dc.tool_type,
      dc.content_data, dc.status, dc.description, dc.use_yn,
      dc.requirement_id, dc.created_by, dc.updated_at,
      r.system_id  AS req_system_id,
      r.name       AS req_name
    FROM tb_design_content dc
    LEFT JOIN tb_requirement r ON r.requirement_id = dc.requirement_id
    WHERE ${where}
    ORDER BY dc.updated_at DESC
    LIMIT ${pageSize} OFFSET ${offset}
  `);

  const countResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
    `SELECT COUNT(*) FROM tb_design_content dc WHERE ${where}`
  );
  const total = Number(countResult[0].count);

  return apiSuccess(rows.map(toApiRow), {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, designType, toolType: rawToolType, requirementId, description } = body;

    if (!title?.trim())  return apiError("VALIDATION_ERROR", "설계서명은 필수입니다.");
    if (!designType)     return apiError("VALIDATION_ERROR", "설계 유형은 필수입니다.");
    if (!(designType in DESIGN_TYPES)) {
      return apiError("VALIDATION_ERROR", "유효하지 않은 설계 유형입니다.");
    }

    const systemId = await generateSystemId("DOC");
    // toolType: 클라이언트가 보낸 값 우선, 없으면 designType 기본값 사용
    const toolType: string = rawToolType || DESIGN_TYPES[designType as keyof typeof DESIGN_TYPES].defaultTool;

    // 툴별 초기 contentData
    let contentData: string | null = null;
    if (toolType === "MERMAID" && designType === "ERD") {
      contentData = "erDiagram\n  ENTITY {\n    int id\n    string name\n  }\n";
    } else if (toolType === "MERMAID" && designType === "MINDMAP") {
      contentData = "mindmap\n  root((주제))\n    항목1\n    항목2\n";
    } else if (toolType === "MERMAID") {
      contentData = "graph LR\n  A[시작] --> B[끝]\n";
    }

    const reqId = requirementId ? parseInt(requirementId) : null;

    const inserted = await prisma.$queryRaw<DesignRow[]>`
      INSERT INTO tb_design_content
        (system_id, title, design_type, tool_type, content_data, requirement_id, description, status, use_yn, created_at, updated_at)
      VALUES
        (${systemId}, ${title.trim()}, ${designType}, ${toolType}, ${contentData},
         ${reqId}, ${description?.trim() || null}, 'DRAFT', 'Y', NOW(), NOW())
      RETURNING
        content_id, system_id, title, design_type, tool_type, content_data,
        status, description, use_yn, requirement_id, created_by, updated_at,
        NULL AS req_system_id, NULL AS req_name
    `;

    return apiSuccess(toApiRow(inserted[0]));
  } catch (error) {
    console.error(error);
    return apiError("SERVER_ERROR", "생성에 실패했습니다.", 500);
  }
}
