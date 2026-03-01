import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { generateSystemId } from "@/lib/sequence";
import { functionSchema } from "@/lib/validators";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const status = searchParams.get("status");
  const screenId = searchParams.get("screenId");
  const requirementId = searchParams.get("requirementId");
  const priority = searchParams.get("priority");
  const search = searchParams.get("search") || "";

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (screenId) where.screenId = parseInt(screenId);
  if (priority) where.priority = priority;
  if (requirementId) {
    where.screen = { requirementId: parseInt(requirementId) };
  }
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { systemId: { contains: search } },
      { displayCode: { contains: search } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.function.findMany({
      where,
      include: {
        screen: {
          select: { name: true, systemId: true, requirement: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.function.count({ where }),
  ]);

  return apiSuccess(data, {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = functionSchema.parse(body);

    const systemId = await generateSystemId("FID");

    const data = await prisma.function.create({
      data: {
        systemId,
        name: parsed.name,
        displayCode: parsed.displayCode ?? null,
        screenId: parsed.screenId,
        spec: parsed.spec ?? null,
        dataFlow: parsed.dataFlow ?? null,
        requestType: parsed.requestType,
        priority: parsed.priority,
        references: parsed.references
          ? {
              create: parsed.references.map((r) => ({
                refType: r.refType,
                refValue: r.refValue,
                description: r.description ?? null,
              })),
            }
          : undefined,
        relations: parsed.relations
          ? {
              create: parsed.relations.map((r) => ({
                targetFunctionId: r.targetFunctionId,
                relationType: r.relationType,
                params: r.params ?? null,
                description: r.description ?? null,
              })),
            }
          : undefined,
      },
      include: {
        screen: { select: { name: true, systemId: true } },
        references: true,
        relations: true,
      },
    });

    return apiSuccess(data);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return apiError("VALIDATION_ERROR", "입력값이 올바르지 않습니다.");
    }
    console.error(error);
    return apiError("SERVER_ERROR", "서버 오류가 발생했습니다.", 500);
  }
}
