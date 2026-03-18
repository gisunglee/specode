/**
 * POST /api/unit-works/[id]/prd
 *
 * 단위업무 하위 화면·영역·기능 전체를 통합한 PRD.md를 반환한다.
 * PRD 전송 단위 = 단위업무 (관련 화면 전체 맥락 포함)
 */
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { generateUnitWorkPrd, PRD_VERSIONS } from "@/lib/prd";
import type { ScreenForUwPrd, AreaForUwPrd, FuncForUwPrd } from "@/lib/prd";
import { phaseToStatus } from "@/lib/constants";

type RouteParams = { params: Promise<{ id: string }> };

interface UwRow {
  unit_work_id:   number;
  system_id:      string;
  name:           string;
  description:    string | null;
  req_system_id:  string;
  req_name:       string;
}

interface ScreenRow {
  screen_id:    number;
  system_id:    string;
  display_code: string | null;
  name:         string;
  screen_type:  string | null;
  spec:         string | null;
}

interface AreaRow {
  area_id:    number;
  area_code:  string;
  name:       string;
  area_type:  string;
  spec:       string | null;
  screen_id:  number;
}

interface FuncRow {
  function_id:       number;
  system_id:         string;
  display_code:      string | null;
  name:              string;
  priority:          string;
  spec:              string | null;
  ref_content:       string | null;
  ai_design_content: string | null;
  area_id:           number;
  phase:             string;
  phase_status:      string;
  confirmed:         boolean;
}

interface AiTaskRow {
  ref_pk_id:  number;
  task_type:  string;
  feedback:   string | null;
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const numId = parseInt(id);

  // 단위업무 조회
  const uwRows = await prisma.$queryRaw<UwRow[]>`
    SELECT
      uw.unit_work_id, uw.system_id, uw.name, uw.description,
      r.system_id AS req_system_id, r.name AS req_name
    FROM tb_unit_work uw
    JOIN tb_requirement r ON r.requirement_id = uw.requirement_id
    WHERE uw.unit_work_id = ${numId} AND uw.use_yn = 'Y'
  `;

  if (!uwRows.length) {
    return NextResponse.json({ error: "단위업무를 찾을 수 없습니다." }, { status: 404 });
  }

  const uw = uwRows[0];

  // 화면 목록
  const screenRows = await prisma.$queryRaw<ScreenRow[]>`
    SELECT screen_id, system_id, display_code, name, screen_type, spec
    FROM tb_screen
    WHERE unit_work_id = ${numId}
    ORDER BY sort_order ASC NULLS LAST, created_at ASC
  `;

  if (screenRows.length === 0) {
    return NextResponse.json({ error: "연결된 화면이 없습니다." }, { status: 400 });
  }

  const screenIds = screenRows.map((s) => s.screen_id);
  // 영역 목록 (전체)
  const areaRows = screenIds.length ? await prisma.$queryRaw<AreaRow[]>`
    SELECT area_id, area_code, name, area_type, spec, screen_id
    FROM tb_area
    WHERE screen_id IN (${Prisma.join(screenIds)}) AND use_yn = 'Y'
    ORDER BY sort_order ASC, area_id ASC
  ` : [];

  // BigInt → number 정규화 (PostgreSQL raw query가 일부 컬럼을 BigInt로 반환)
  const areaIds = areaRows.map((a) => Number(a.area_id));

  // 기능 목록 (전체)
  const funcRows = areaIds.length ? await prisma.$queryRaw<FuncRow[]>`
    SELECT function_id, system_id, display_code, name, priority, spec, ref_content,
           ai_design_content, area_id, phase, phase_status, confirmed
    FROM tb_function
    WHERE area_id IN (${Prisma.join(areaIds)})
    ORDER BY sort_order ASC NULLS LAST, function_id ASC
  ` : [];

  const funcIds = funcRows.map((f) => Number(f.function_id));

  // AI 피드백 (성공한 것 중 최신)
  const aiRows = funcIds.length ? await prisma.$queryRaw<AiTaskRow[]>`
    SELECT DISTINCT ON (ref_pk_id, task_type)
      ref_pk_id, task_type, feedback
    FROM tb_ai_task
    WHERE ref_table_name = 'tb_function'
      AND ref_pk_id IN (${Prisma.join(funcIds)})
      AND task_type IN ('INSPECT', 'REVIEW')
      AND feedback IS NOT NULL
    ORDER BY ref_pk_id, task_type, completed_at DESC
  ` : [];

  // Map 구성: funcId → { DESIGN: ..., REVIEW/INSPECT: ... }
  // aiMap: funcId → 최신 INSPECT 피드백 (DESIGN 내용은 tb_function.ai_design_content에서 직접)
  const aiMap = new Map<number, string>();
  for (const row of aiRows) {
    const pkId = Number(row.ref_pk_id);
    if (!aiMap.has(pkId) && row.feedback) {
      aiMap.set(pkId, row.feedback);
    }
  }

  // 계층 조립 — 모든 ID를 Number로 정규화해서 Map 키 불일치 방지
  const areasByScreen = new Map<number, AreaForUwPrd[]>();
  const funcsByArea   = new Map<number, FuncForUwPrd[]>();

  for (const fn of funcRows) {
    const funcId = Number(fn.function_id);
    const areaId = Number(fn.area_id);
    const inspFeedback = aiMap.get(funcId) ?? null;
    const item: FuncForUwPrd = {
      systemId:        fn.system_id,
      displayCode:     fn.display_code,
      name:            fn.name,
      priority:        fn.priority,
      spec:            fn.spec,
      refContent:      fn.ref_content,
      aiDesignContent: fn.ai_design_content,  // tb_function.ai_design_content 직접 사용
      aiInspFeedback:  inspFeedback,           // tb_ai_task INSPECT 피드백
    };
    const list = funcsByArea.get(areaId) ?? [];
    list.push(item);
    funcsByArea.set(areaId, list);
  }

  for (const area of areaRows) {
    const areaId   = Number(area.area_id);
    const screenId = Number(area.screen_id);
    const item: AreaForUwPrd = {
      areaCode:  area.area_code,
      name:      area.name,
      areaType:  area.area_type,
      spec:      area.spec,
      functions: funcsByArea.get(areaId) ?? [],
    };
    const list = areasByScreen.get(screenId) ?? [];
    list.push(item);
    areasByScreen.set(screenId, list);
  }

  const screens: ScreenForUwPrd[] = screenRows.map((s) => ({
    systemId:    s.system_id,
    displayCode: s.display_code,
    name:        s.name,
    screenType:  s.screen_type,
    spec:        s.spec,
    areas:       areasByScreen.get(Number(s.screen_id)) ?? [],
  }));

  let markdown = generateUnitWorkPrd({
    systemId:    uw.system_id,
    name:        uw.name,
    description: uw.description,
    requirement: { systemId: uw.req_system_id, name: uw.req_name },
    screens,
  });

  // <TABLE_SCRIPT: tablename> 플레이스홀더 치환
  const TABLE_SCRIPT_RE = /<TABLE_SCRIPT:\s*([^\s>]+)\s*>/gi;
  const tableNames = [...new Set(
    [...markdown.matchAll(TABLE_SCRIPT_RE)].map((m) => m[1].toLowerCase())
  )];

  if (tableNames.length > 0) {
    const schemaRows = await prisma.$queryRaw<
      { table_name: string; entity_name: string | null; ddl_script: string }[]
    >`
      SELECT table_name, entity_name, ddl_script
      FROM tb_db_schema
      WHERE LOWER(table_name) IN (${Prisma.join(tableNames)})
    `;

    const schemaMap = new Map(schemaRows.map((r) => [r.table_name.toLowerCase(), r]));

    markdown = markdown.replace(TABLE_SCRIPT_RE, (_match, name: string) => {
      const row = schemaMap.get(name.toLowerCase());
      if (!row) return `(테이블 없음: ${name})`;
      const header = row.entity_name
        ? `${row.table_name} (${row.entity_name})`
        : row.table_name;
      return `${header}\n${row.ddl_script.trim()}`;
    });
  }

  const filename = `PRD_unitwork-${PRD_VERSIONS.unitWork}_${uw.system_id}_${uw.name}.md`;
  const encodedFilename = encodeURIComponent(filename);

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "Content-Type":        "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodedFilename}`,
    },
  });
}
