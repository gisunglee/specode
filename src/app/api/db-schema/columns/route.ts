/**
 * GET /api/db-schema/columns
 *
 * Query: tableName (필수)
 * 해당 테이블의 DDL을 파싱하여 컬럼명 목록을 반환합니다.
 * 테이블이 없거나 DDL 파싱 실패 시 빈 배열을 반환합니다 (graceful degradation).
 */
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { parseDdlColumns } from "@/lib/ddlParser";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tableName = searchParams.get("tableName");

  if (!tableName) {
    return apiError("VALIDATION_ERROR", "tableName은 필수입니다.");
  }

  const schema = await prisma.dbSchema.findFirst({
    where: { tableName },
    select: { ddlScript: true },
  });

  // 테이블 미등록 or DDL 없으면 빈 배열 반환 (graceful)
  if (!schema?.ddlScript) {
    return apiSuccess({ columns: [] });
  }

  const columns = parseDdlColumns(schema.ddlScript);
  return apiSuccess({ columns });
}
