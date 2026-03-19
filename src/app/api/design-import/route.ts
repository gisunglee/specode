import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { generateSystemId } from "@/lib/sequence";
import { apiSuccess, apiError } from "@/lib/utils";

// ─── GET: 단위업무 → JSON 내보내기 ───────────────────────────────────────────

interface UnitWorkRow {
  unit_work_id: number;
  system_id: string;
  name: string;
  description: string | null;
  sort_order: number;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const unitWorkId = searchParams.get("unitWorkId");

  if (!unitWorkId) return apiError("VALIDATION_ERROR", "unitWorkId가 필요합니다.");

  const uwRows = await prisma.$queryRawUnsafe<UnitWorkRow[]>(
    `SELECT unit_work_id, system_id, name, description, sort_order
     FROM tb_unit_work WHERE unit_work_id = ${parseInt(unitWorkId)} AND use_yn = 'Y'`
  );
  if (!uwRows.length) return apiError("NOT_FOUND", "단위업무를 찾을 수 없습니다.", 404);
  const uw = uwRows[0];

  const screens = await prisma.screen.findMany({
    where: { unitWorkId: parseInt(unitWorkId) },
    include: {
      areas: {
        orderBy: { sortOrder: "asc" },
        include: { functions: { orderBy: { sortOrder: "asc" } } },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  return apiSuccess({
    unitWork: {
      systemId: uw.system_id,
      name: uw.name,
      description: uw.description ?? "",
      sortOrder: uw.sort_order,
    },
    screens: screens.map((s) => ({
      systemId: s.systemId,
      name: s.name,
      displayCode: s.displayCode ?? "",
      screenType: s.screenType ?? "",
      categoryL: s.categoryL ?? "",
      categoryM: s.categoryM ?? "",
      categoryS: s.categoryS ?? "",
      spec: s.spec ?? "",
      sortOrder: s.sortOrder,
      areas: s.areas.map((a) => ({
        areaCode: a.areaCode,
        name: a.name,
        areaType: a.areaType,
        spec: a.spec ?? "",
        sortOrder: a.sortOrder,
        functions: a.functions.map((f) => ({
          systemId: f.systemId,
          name: f.name,
          displayCode: f.displayCode ?? "",
          priority: f.priority,
          spec: f.spec ?? "",
          sortOrder: f.sortOrder,
        })),
      })),
    })),
  });
}

// ─── POST: JSON 가져오기 (신규 등록 + 수정 upsert) ───────────────────────────

interface FuncInput {
  systemId?: string;
  name: string;
  displayCode?: string;
  priority?: string;
  spec?: string;
  sortOrder?: number;
}

interface AreaInput {
  areaCode?: string;
  name: string;
  areaType?: string;
  spec?: string;
  sortOrder?: number;
  functions?: FuncInput[];
}

interface ScreenInput {
  systemId?: string;
  name: string;
  displayCode?: string;
  screenType?: string;
  categoryL?: string;
  categoryM?: string;
  categoryS?: string;
  spec?: string;
  sortOrder?: number;
  areas?: AreaInput[];
}

interface ImportPayload {
  unitWork: {
    systemId?: string;
    name: string;
    description?: string;
    sortOrder?: number;
  };
  screens?: ScreenInput[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requirementId, data }: { requirementId?: number; data: ImportPayload } = body;

    if (!data?.unitWork?.name?.trim()) {
      return apiError("VALIDATION_ERROR", "단위업무명은 필수입니다.");
    }

    // ── 단위업무: 수정 또는 신규 ──────────────────────────────
    let unitWorkId: number;
    let uwSystemId: string;
    let isUwNew = false;

    if (data.unitWork.systemId) {
      // 기존 수정
      const existing = await prisma.$queryRawUnsafe<{ unit_work_id: number }[]>(
        `SELECT unit_work_id FROM tb_unit_work WHERE system_id = '${data.unitWork.systemId.replace(/'/g, "''")}' AND use_yn = 'Y'`
      );
      if (!existing.length) {
        return apiError("NOT_FOUND", `단위업무 ${data.unitWork.systemId}를 찾을 수 없습니다.`);
      }
      unitWorkId = existing[0].unit_work_id;
      uwSystemId = data.unitWork.systemId;
      const uwName = data.unitWork.name.trim().replace(/'/g, "''");
      const uwDesc = data.unitWork.description
        ? `'${String(data.unitWork.description).replace(/'/g, "''")}'`
        : "NULL";
      const uwOrd = data.unitWork.sortOrder ?? 0;
      await prisma.$queryRawUnsafe(
        `UPDATE tb_unit_work SET name='${uwName}', description=${uwDesc}, sort_order=${uwOrd}, updated_at=NOW() WHERE unit_work_id=${unitWorkId}`
      );
    } else {
      // 신규 생성 — requirementId 필수
      if (!requirementId) {
        return apiError("VALIDATION_ERROR", "신규 단위업무 등록 시 요구사항 ID가 필요합니다.");
      }
      const reqId = parseInt(String(requirementId));
      const req = await prisma.requirement.findUnique({ where: { requirementId: reqId }, select: { requirementId: true } });
      if (!req) return apiError("NOT_FOUND", "요구사항을 찾을 수 없습니다.", 404);

      uwSystemId = await generateSystemId("UW");
      const uwName = data.unitWork.name.trim().replace(/'/g, "''");
      const uwDesc = data.unitWork.description
        ? `'${String(data.unitWork.description).replace(/'/g, "''")}'`
        : "NULL";
      const uwOrd = data.unitWork.sortOrder ?? 0;
      const uwRows = await prisma.$queryRawUnsafe<{ unit_work_id: number }[]>(`
        INSERT INTO tb_unit_work (system_id, requirement_id, name, description, sort_order, use_yn, created_at, updated_at)
        VALUES ('${uwSystemId}', ${reqId}, '${uwName}', ${uwDesc}, ${uwOrd}, 'Y', NOW(), NOW())
        RETURNING unit_work_id
      `);
      unitWorkId = uwRows[0].unit_work_id;
      isUwNew = true;
    }

    // ── 화면 → 영역 → 기능 upsert ────────────────────────────
    const resultScreens: object[] = [];
    let totalAreas = 0, totalFuncs = 0;
    let newScreens = 0, updScreens = 0;
    let newAreas = 0, updAreas = 0;
    let newFuncs = 0, updFuncs = 0;

    for (const [si, screenData] of (data.screens ?? []).entries()) {
      if (!screenData.name?.trim()) continue;

      let screen: { screenId: number; systemId: string; name: string };

      if (screenData.systemId) {
        const existing = await prisma.screen.findUnique({ where: { systemId: screenData.systemId }, select: { screenId: true, systemId: true, name: true } });
        if (!existing) return apiError("NOT_FOUND", `화면 ${screenData.systemId}를 찾을 수 없습니다.`);
        screen = await prisma.screen.update({
          where: { screenId: existing.screenId },
          data: {
            name: screenData.name.trim(),
            displayCode: screenData.displayCode || null,
            screenType: screenData.screenType || null,
            spec: screenData.spec || null,
            categoryL: screenData.categoryL || null,
            categoryM: screenData.categoryM || null,
            categoryS: screenData.categoryS || null,
            sortOrder: screenData.sortOrder ?? si + 1,
          },
          select: { screenId: true, systemId: true, name: true },
        });
        updScreens++;
      } else {
        const screenSystemId = await generateSystemId("PID");
        screen = await prisma.screen.create({
          data: {
            systemId: screenSystemId,
            name: screenData.name.trim(),
            displayCode: screenData.displayCode || null,
            screenType: screenData.screenType || null,
            unitWorkId,
            spec: screenData.spec || null,
            categoryL: screenData.categoryL || null,
            categoryM: screenData.categoryM || null,
            categoryS: screenData.categoryS || null,
            sortOrder: screenData.sortOrder ?? si + 1,
          },
          select: { screenId: true, systemId: true, name: true },
        });
        newScreens++;
      }

      const resultAreas: object[] = [];

      for (const [ai, areaData] of (screenData.areas ?? []).entries()) {
        if (!areaData.name?.trim()) continue;

        let area: { areaId: number; areaCode: string; name: string };

        if (areaData.areaCode) {
          const existing = await prisma.area.findUnique({ where: { areaCode: areaData.areaCode }, select: { areaId: true, areaCode: true, name: true } });
          if (!existing) return apiError("NOT_FOUND", `영역 ${areaData.areaCode}를 찾을 수 없습니다.`);
          area = await prisma.area.update({
            where: { areaId: existing.areaId },
            data: { name: areaData.name.trim(), areaType: areaData.areaType || "FORM", screenId: screen.screenId, spec: areaData.spec || null, sortOrder: areaData.sortOrder ?? ai + 1 },
            select: { areaId: true, areaCode: true, name: true },
          });
          updAreas++;
        } else {
          const areaCode = await generateSystemId("AR");
          area = await prisma.area.create({
            data: { areaCode, name: areaData.name.trim(), areaType: areaData.areaType || "FORM", screenId: screen.screenId, spec: areaData.spec || null, sortOrder: areaData.sortOrder ?? ai + 1 },
            select: { areaId: true, areaCode: true, name: true },
          });
          newAreas++;
        }
        totalAreas++;

        const resultFuncs: object[] = [];

        for (const [fi, funcData] of (areaData.functions ?? []).entries()) {
          if (!funcData.name?.trim()) continue;

          let func: { systemId: string; name: string };

          if (funcData.systemId) {
            const existing = await prisma.function.findUnique({ where: { systemId: funcData.systemId }, select: { functionId: true, systemId: true, name: true } });
            if (!existing) return apiError("NOT_FOUND", `기능 ${funcData.systemId}를 찾을 수 없습니다.`);
            func = await prisma.function.update({
              where: { functionId: existing.functionId },
              data: { name: funcData.name.trim(), displayCode: funcData.displayCode || null, priority: funcData.priority || "MEDIUM", areaId: area.areaId, spec: funcData.spec || null, sortOrder: funcData.sortOrder ?? fi + 1 },
              select: { systemId: true, name: true },
            });
            updFuncs++;
          } else {
            const funcSystemId = await generateSystemId("FID");
            func = await prisma.function.create({
              data: { systemId: funcSystemId, name: funcData.name.trim(), displayCode: funcData.displayCode || null, priority: funcData.priority || "MEDIUM", areaId: area.areaId, spec: funcData.spec || null, sortOrder: funcData.sortOrder ?? fi + 1 },
              select: { systemId: true, name: true },
            });
            newFuncs++;
          }
          totalFuncs++;
          resultFuncs.push({ systemId: func.systemId, name: func.name });
        }

        resultAreas.push({ areaCode: area.areaCode, name: area.name, functions: resultFuncs });
      }

      resultScreens.push({ systemId: screen.systemId, name: screen.name, areas: resultAreas });
    }

    return apiSuccess({
      unitWork: { systemId: uwSystemId, name: data.unitWork.name, unitWorkId, isNew: isUwNew },
      screens: resultScreens,
      summary: {
        screens: resultScreens.length,
        areas: totalAreas,
        functions: totalFuncs,
        new: { unitWork: isUwNew ? 1 : 0, screens: newScreens, areas: newAreas, functions: newFuncs },
        updated: { unitWork: isUwNew ? 0 : 1, screens: updScreens, areas: updAreas, functions: updFuncs },
      },
    });
  } catch (error) {
    console.error(error);
    return apiError("SERVER_ERROR", "가져오기 중 오류가 발생했습니다.", 500);
  }
}
