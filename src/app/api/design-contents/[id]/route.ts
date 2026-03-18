import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

type RouteParams = { params: Promise<{ id: string }> };

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
    contentId:   r.content_id,
    systemId:    r.system_id,
    title:       r.title,
    designType:  r.design_type,
    toolType:    r.tool_type,
    contentData: r.content_data,
    status:      r.status,
    description: r.description,
    useYn:       r.use_yn,
    createdBy:   r.created_by,
    updatedAt:   r.updated_at,
    requirement: r.requirement_id
      ? { requirementId: r.requirement_id, systemId: r.req_system_id, name: r.req_name }
      : null,
  };
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const rows = await prisma.$queryRaw<DesignRow[]>`
    SELECT
      dc.content_id, dc.system_id, dc.title, dc.design_type, dc.tool_type,
      dc.content_data, dc.status, dc.description, dc.use_yn,
      dc.requirement_id, dc.created_by, dc.updated_at,
      r.system_id AS req_system_id,
      r.name      AS req_name
    FROM tb_design_content dc
    LEFT JOIN tb_requirement r ON r.requirement_id = dc.requirement_id
    WHERE dc.content_id = ${parseInt(id)} AND dc.use_yn = 'Y'
  `;

  if (!rows.length) {
    return apiError("NOT_FOUND", "설계서를 찾을 수 없습니다.", 404);
  }

  return apiSuccess(toApiRow(rows[0]));
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const numId = parseInt(id);
    const body = await request.json();

    const sets: string[] = ["updated_at = NOW()"];
    if (body.title      !== undefined) sets.push(`title = '${body.title.trim().replace(/'/g, "''")}'`);
    if (body.designType !== undefined) sets.push(`design_type = '${body.designType.replace(/'/g, "''")}'`);
    if (body.toolType   !== undefined) sets.push(`tool_type = '${body.toolType.replace(/'/g, "''")}'`);
    if (body.contentData !== undefined) {
      const escaped = body.contentData === null ? "NULL" : `'${String(body.contentData).replace(/'/g, "''")}'`;
      sets.push(`content_data = ${escaped}`);
    }
    if (body.status      !== undefined) sets.push(`status = '${body.status.replace(/'/g, "''")}'`);
    if (body.description !== undefined) {
      const val = body.description ? `'${body.description.trim().replace(/'/g, "''")}'` : "NULL";
      sets.push(`description = ${val}`);
    }
    if (body.requirementId !== undefined) {
      sets.push(`requirement_id = ${body.requirementId ? parseInt(body.requirementId) : "NULL"}`);
    }

    const rows = await prisma.$queryRawUnsafe<DesignRow[]>(`
      UPDATE tb_design_content
      SET ${sets.join(", ")}
      WHERE content_id = ${numId}
      RETURNING
        content_id, system_id, title, design_type, tool_type, content_data,
        status, description, use_yn, requirement_id, created_by, updated_at,
        NULL::text AS req_system_id, NULL::text AS req_name
    `);

    if (!rows.length) {
      return apiError("NOT_FOUND", "설계서를 찾을 수 없습니다.", 404);
    }

    return apiSuccess(toApiRow(rows[0]));
  } catch (error) {
    console.error(error);
    return apiError("SERVER_ERROR", "수정에 실패했습니다.", 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  await prisma.$executeRaw`
    UPDATE tb_design_content SET use_yn = 'N', updated_at = NOW()
    WHERE content_id = ${parseInt(id)}
  `;
  return apiSuccess({ deleted: true });
}
