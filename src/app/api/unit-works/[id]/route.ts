import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { saveContentVersion } from "@/lib/contentVersion";

type RouteParams = { params: Promise<{ id: string }> };

interface UnitWorkDetailRow {
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
}

interface ScreenRow {
  screen_id:    number;
  system_id:    string;
  display_code: string | null;
  name:         string;
  screen_type:  string | null;
  updated_at:   Date;
  area_count:   bigint;
  func_count:   bigint;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const numId = parseInt(id);

  const rows = await prisma.$queryRaw<UnitWorkDetailRow[]>`
    SELECT
      uw.unit_work_id, uw.system_id, uw.requirement_id,
      uw.name, uw.description, uw.sort_order, uw.use_yn,
      uw.created_by, uw.created_at, uw.updated_at,
      r.system_id AS req_system_id,
      r.name      AS req_name
    FROM tb_unit_work uw
    JOIN tb_requirement r ON r.requirement_id = uw.requirement_id
    WHERE uw.unit_work_id = ${numId} AND uw.use_yn = 'Y'
  `;

  if (!rows.length) return apiError("NOT_FOUND", "단위업무를 찾을 수 없습니다.", 404);

  const uw = rows[0];

  const screens = await prisma.$queryRaw<ScreenRow[]>`
    SELECT
      s.screen_id, s.system_id, s.display_code, s.name, s.screen_type, s.updated_at,
      COUNT(DISTINCT a.area_id) AS area_count,
      COUNT(DISTINCT f.function_id) AS func_count
    FROM tb_screen s
    LEFT JOIN tb_area a ON a.screen_id = s.screen_id
    LEFT JOIN tb_function f ON f.area_id = a.area_id
    WHERE s.unit_work_id = ${numId}
    GROUP BY s.screen_id
    ORDER BY s.sort_order ASC NULLS LAST, s.created_at ASC
  `;

  return apiSuccess({
    unitWorkId:    uw.unit_work_id,
    systemId:      uw.system_id,
    requirementId: uw.requirement_id,
    name:          uw.name,
    description:   uw.description,
    sortOrder:     uw.sort_order,
    useYn:         uw.use_yn,
    createdBy:     uw.created_by,
    createdAt:     uw.created_at,
    updatedAt:     uw.updated_at,
    requirement: { systemId: uw.req_system_id, name: uw.req_name },
    screens: screens.map((s) => ({
      screenId:    s.screen_id,
      systemId:    s.system_id,
      displayCode: s.display_code,
      name:        s.name,
      screenType:  s.screen_type,
      updatedAt:   s.updated_at,
      areaCount:   Number(s.area_count),
      funcCount:   Number(s.func_count),
    })),
  });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const numId = parseInt(id);
    const body  = await request.json();

    // description 변경이 있으면 이력 저장 (변경 전 값 보존)
    if (body.description !== undefined) {
      const current = await prisma.$queryRaw<[{ description: string | null }]>`
        SELECT description FROM tb_unit_work WHERE unit_work_id = ${numId}
      `;
      await saveContentVersion({
        refTableName: "tb_unit_work",
        refPkId: numId,
        fieldName: "description",
        currentContent: current[0]?.description ?? null,
        changedBy: "user",
      });
    }

    const sets: string[] = ["updated_at = NOW()"];
    if (body.name        !== undefined) sets.push(`name = '${body.name.trim().replace(/'/g, "''")}'`);
    if (body.description !== undefined) {
      sets.push(body.description
        ? `description = '${body.description.trim().replace(/'/g, "''")}'`
        : "description = NULL");
    }
    if (body.sortOrder !== undefined) sets.push(`sort_order = ${parseInt(body.sortOrder)}`);
    if (body.requirementId !== undefined) sets.push(`requirement_id = ${parseInt(body.requirementId)}`);

    await prisma.$executeRawUnsafe(`
      UPDATE tb_unit_work SET ${sets.join(", ")}
      WHERE unit_work_id = ${numId}
    `);

    // 업데이트된 데이터 다시 조회
    const rows = await prisma.$queryRaw<UnitWorkDetailRow[]>`
      SELECT uw.*, r.system_id AS req_system_id, r.name AS req_name
      FROM tb_unit_work uw
      JOIN tb_requirement r ON r.requirement_id = uw.requirement_id
      WHERE uw.unit_work_id = ${numId}
    `;

    if (!rows.length) return apiError("NOT_FOUND", "단위업무를 찾을 수 없습니다.", 404);
    const uw = rows[0];

    return apiSuccess({
      unitWorkId:    uw.unit_work_id,
      systemId:      uw.system_id,
      requirementId: uw.requirement_id,
      name:          uw.name,
      description:   uw.description,
      sortOrder:     uw.sort_order,
      useYn:         uw.use_yn,
      updatedAt:     uw.updated_at,
      requirement: { systemId: uw.req_system_id, name: uw.req_name },
    });
  } catch (error) {
    console.error(error);
    return apiError("SERVER_ERROR", "수정에 실패했습니다.", 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const numId = parseInt(id);

  const screenCount = await prisma.$queryRaw<[{ cnt: bigint }]>`
    SELECT COUNT(*) AS cnt FROM tb_screen WHERE unit_work_id = ${numId}
  `;

  if (Number(screenCount[0].cnt) > 0) {
    return apiError("HAS_CHILDREN", `연결된 화면 ${Number(screenCount[0].cnt)}건이 있습니다. 먼저 화면을 분리해주세요.`, 409);
  }

  await prisma.$executeRaw`
    UPDATE tb_unit_work SET use_yn = 'N', updated_at = NOW()
    WHERE unit_work_id = ${numId}
  `;

  return apiSuccess({ deleted: true });
}
