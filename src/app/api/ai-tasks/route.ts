import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { apiSuccess } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const taskStatus = searchParams.get("taskStatus");
  const taskType = searchParams.get("taskType");

  const where: Record<string, unknown> = {};
  if (taskStatus) where.taskStatus = taskStatus;
  if (taskType) where.taskType = taskType;

  const [data, total] = await Promise.all([
    prisma.aiTask.findMany({
      where,
      include: {
        function: {
          select: { systemId: true, name: true, displayCode: true },
        },
      },
      orderBy: { requestedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.aiTask.count({ where }),
  ]);

  return apiSuccess(data, {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
}
