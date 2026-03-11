import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { dbSchemaSchema } from "@/lib/validators";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const tableGroup = searchParams.get("tableGroup") || "";

  const where: Record<string, unknown> = {};
  if (tableGroup) where.tableGroup = tableGroup;
  if (search) {
    where.OR = [
      { tableName: { contains: search, mode: "insensitive" } },
      { tableComment: { contains: search, mode: "insensitive" } },
      { tableGroup: { contains: search, mode: "insensitive" } },
    ];
  }

  const data = await prisma.dbSchema.findMany({
    where,
    select: {
      schemaId: true,
      tableName: true,
      tableComment: true,
      tableGroup: true,
      updatedAt: true,
    },
    orderBy: [{ tableGroup: "asc" }, { tableName: "asc" }],
  });

  return apiSuccess(data);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = dbSchemaSchema.parse(body);

    const created = await prisma.dbSchema.create({
      data: {
        tableName: parsed.tableName,
        tableComment: parsed.tableComment ?? null,
        ddlScript: parsed.ddlScript,
        tableGroup: parsed.tableGroup ?? null,
      },
    });

    return apiSuccess(created);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return apiError("VALIDATION_ERROR", "입력값이 올바르지 않습니다.");
    }
    return apiError("SERVER_ERROR", "서버 오류가 발생했습니다.", 500);
  }
}
