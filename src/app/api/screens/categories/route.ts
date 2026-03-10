import prisma from "@/lib/prisma";
import { apiSuccess } from "@/lib/utils";

export async function GET() {
  const [lRows, mRows] = await Promise.all([
    prisma.screen.findMany({
      distinct: ["categoryL"],
      where: { categoryL: { not: null } },
      select: { categoryL: true },
      orderBy: { categoryL: "asc" },
    }),
    prisma.screen.findMany({
      distinct: ["categoryM"],
      where: { categoryM: { not: null } },
      select: { categoryM: true },
      orderBy: { categoryM: "asc" },
    }),
  ]);

  return apiSuccess({
    categoryL: lRows.map((r) => r.categoryL!),
    categoryM: mRows.map((r) => r.categoryM!),
  });
}
