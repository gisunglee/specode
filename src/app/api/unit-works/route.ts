import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { generateSystemId } from "@/lib/sequence";
import { apiSuccess, apiError } from "@/lib/utils";

interface UnitWorkRow {
  unit_work_id:   number;
  system_id:      string;
  requirement_id: number;
  req_system_id:  string;
  req_name:       string;
  name:           string;
  description:    string | null;
  sort_order:     number;
  use_yn:         string;
  created_by:     string | null;
  created_at:     Date;
  updated_at:     Date;
  screen_count:   bigint;
}

function toApi(r: UnitWorkRow) {
  return {
    unitWorkId:    r.unit_work_id,
    systemId:      r.system_id,
    requirementId: r.requirement_id,
    name:          r.name,
    description:   r.description,
    sortOrder:     r.sort_order,
    useYn:         r.use_yn,
    createdBy:     r.created_by,
    createdAt:     r.created_at,
    updatedAt:     r.updated_at,
    screenCount:   Number(r.screen_count),
    requirement: {
      systemId: r.req_system_id,
      name:     r.req_name,
    },
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const requirementId = searchParams.get("requirementId");
  const search        = searchParams.get("search") || "";
  const page          = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize      = Math.min(100, parseInt(searchParams.get("pageSize") || "20"));
  const offset        = (page - 1) * pageSize;

  const conditions: string[] = ["uw.use_yn = 'Y'"];
  if (requirementId) conditions.push(`uw.requirement_id = ${parseInt(requirementId)}`);
  if (search) {
    const s = search.replace(/'/g, "''");
    conditions.push(`(uw.name ILIKE '%${s}%' OR uw.system_id ILIKE '%${s}%')`);
  }
  const where = conditions.join(" AND ");

  const [rows, countRows] = await Promise.all([
    prisma.$queryRawUnsafe<UnitWorkRow[]>(`
      SELECT
        uw.unit_work_id, uw.system_id, uw.requirement_id,
        uw.name, uw.description, uw.sort_order, uw.use_yn,
        uw.created_by, uw.created_at, uw.updated_at,
        r.system_id AS req_system_id,
        r.name      AS req_name,
        COUNT(s.screen_id) AS screen_count
      FROM tb_unit_work uw
      JOIN tb_requirement r ON r.requirement_id = uw.requirement_id
      LEFT JOIN tb_screen s ON s.unit_work_id = uw.unit_work_id
      WHERE ${where}
      GROUP BY uw.unit_work_id, uw.requirement_id, r.requirement_id, r.system_id, r.name
      ORDER BY uw.requirement_id ASC, uw.sort_order ASC, uw.unit_work_id ASC
      LIMIT ${pageSize} OFFSET ${offset}
    `),
    prisma.$queryRawUnsafe<[{ cnt: bigint }]>(`
      SELECT COUNT(*) AS cnt
      FROM tb_unit_work uw
      JOIN tb_requirement r ON r.requirement_id = uw.requirement_id
      WHERE ${where}
    `),
  ]);

  const total = Number(countRows[0]?.cnt ?? 0);
  return apiSuccess(rows.map(toApi), {
    page, pageSize, total, totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requirementId, name, description, sortOrder } = body;

    if (!requirementId || !name?.trim()) {
      return apiError("VALIDATION", "요구사항과 단위업무명은 필수입니다.", 400);
    }

    const systemId = await generateSystemId("UW");
    const nameSafe = name.trim().replace(/'/g, "''");
    const descSafe = description ? `'${String(description).replace(/'/g, "''")}'` : "NULL";
    const ord      = sortOrder !== undefined ? parseInt(sortOrder) : 0;
    const reqId    = parseInt(requirementId);

    const rows = await prisma.$queryRawUnsafe<UnitWorkRow[]>(`
      INSERT INTO tb_unit_work
        (system_id, requirement_id, name, description, sort_order, use_yn, created_at, updated_at)
      VALUES
        ('${systemId}', ${reqId}, '${nameSafe}', ${descSafe}, ${ord}, 'Y', NOW(), NOW())
      RETURNING
        unit_work_id, system_id, requirement_id, name, description,
        sort_order, use_yn, created_by, created_at, updated_at,
        '' AS req_system_id, '' AS req_name, 0::bigint AS screen_count
    `);

    // 요구사항 정보 조회
    const req = await prisma.requirement.findUnique({
      where: { requirementId: reqId },
      select: { systemId: true, name: true },
    });

    const result = { ...rows[0], req_system_id: req?.systemId ?? "", req_name: req?.name ?? "" };
    return apiSuccess(toApi(result));
  } catch (error) {
    console.error(error);
    return apiError("SERVER_ERROR", "단위업무 생성에 실패했습니다.", 500);
  }
}
