import prisma from "@/lib/prisma";
import { apiSuccess } from "@/lib/utils";

export async function GET() {
  const requirements = await prisma.requirement.findMany({
    include: {
      screens: {
        include: {
          areas: {
            include: {
              functions: {
                select: {
                  functionId: true,
                  systemId: true,
                  displayCode: true,
                  name: true,
                  status: true,
                },
                orderBy: { systemId: "asc" },
              },
            },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { systemId: "asc" },
      },
    },
    orderBy: { systemId: "asc" },
  });

  const tree = requirements.map((req) => ({
    id: req.requirementId,
    systemId: req.systemId,
    name: req.name,
    type: "requirement" as const,
    children: req.screens.map((scr) => ({
      id: scr.screenId,
      systemId: scr.systemId,
      displayCode: scr.displayCode,
      name: scr.name,
      type: "screen" as const,
      screenType: scr.screenType,
      children: scr.areas.map((area) => ({
        id: area.areaId,
        systemId: area.areaCode,
        displayCode: null,
        name: area.name,
        type: "area" as const,
        areaType: area.areaType,
        children: area.functions.map((fn) => ({
          id: fn.functionId,
          systemId: fn.systemId,
          displayCode: fn.displayCode,
          name: fn.name,
          type: "function" as const,
          status: fn.status,
        })),
      })),
    })),
  }));

  return apiSuccess(tree);
}
