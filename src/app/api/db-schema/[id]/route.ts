import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { dbSchemaSchema } from "@/lib/validators";
import { apiSuccess, apiError } from "@/lib/utils";
import { saveContentVersion } from "@/lib/contentVersion";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const data = await prisma.dbSchema.findUnique({
    where: { schemaId: parseInt(id) },
  });
  if (!data) return apiError("NOT_FOUND", "스키마를 찾을 수 없습니다.", 404);
  return apiSuccess(data);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const numId = parseInt(id);
    const body = await request.json();
    const parsed = dbSchemaSchema.parse(body);

    // 동일 테이블명 중복 체크 (자기 자신 제외)
    if (parsed.tableName) {
      const duplicate = await prisma.dbSchema.findFirst({
        where: {
          tableName: parsed.tableName,
          NOT: { schemaId: numId },
        },
      });
      if (duplicate) {
        return apiError("DUPLICATE", "동일한 테이블명이 있습니다. 수정 불가 합니다.", 409);
      }
    }

    // 기존 레코드 조회 (이력 저장용)
    const existing = await prisma.dbSchema.findUnique({
      where: { schemaId: numId },
      select: { ddlScript: true },
    });

    // ddl_script 변경 시 이전 값 이력 저장
    if (existing && parsed.ddlScript !== existing.ddlScript) {
      await saveContentVersion({
        refTableName: "tb_db_schema",
        refPkId: numId,
        fieldName: "ddl_script",
        currentContent: existing.ddlScript,
        changedBy: "user",
      });
    }

    const updated = await prisma.dbSchema.update({
      where: { schemaId: numId },
      data: {
        tableName: parsed.tableName,
        entityName: parsed.entityName ?? null,
        tableComment: parsed.tableComment ?? null,
        tableGroup: parsed.tableGroup ?? null,
        ddlScript: parsed.ddlScript,
        relationsJson: parsed.relationsJson ?? null,
      },
    });

    return apiSuccess(updated);
  } catch {
    return apiError("SERVER_ERROR", "수정에 실패했습니다.", 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const numId = parseInt(id);

  const schema = await prisma.dbSchema.findUnique({ where: { schemaId: numId } });
  if (!schema) return apiError("NOT_FOUND", "스키마를 찾을 수 없습니다.", 404);

  await prisma.dbSchema.delete({ where: { schemaId: numId } });
  return apiSuccess({ deleted: true });
}
