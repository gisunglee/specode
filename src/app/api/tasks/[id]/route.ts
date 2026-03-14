/**
 * GET    /api/tasks/[id]  — 과업 단건 조회 (연결 요구사항 + 추적성 포함)
 * PUT    /api/tasks/[id]  — 과업 수정
 * DELETE /api/tasks/[id]  — 과업 삭제 (요구사항 task_id SET NULL)
 */
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { taskSchema } from "@/lib/validators";
import { apiSuccess, apiError } from "@/lib/utils";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/tasks/[id]
 *
 * 과업 상세 + 연결된 요구사항 전체 반환.
 * 요구사항마다 사용자 스토리 → 화면 추적성 포함.
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const data = await prisma.task.findUnique({
    where: { taskId: parseInt(id) },
    include: {
      requirements: {
        select: {
          requirementId: true,
          systemId:      true,
          name:          true,
          source:        true,
          priority:      true,
          _count: { select: { screens: true, userStories: true } },
          // 사용자 스토리 → 연결 화면 (추적성)
          userStories: {
            select: {
              userStoryId: true,
              systemId:    true,
              name:        true,
              screenMaps: {
                select: {
                  screen: {
                    select: { screenId: true, systemId: true, name: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { systemId: "asc" },
      },
    },
  });

  if (!data) return apiError("NOT_FOUND", "과업을 찾을 수 없습니다.", 404);
  return apiSuccess(data);
}

/**
 * PUT /api/tasks/[id]
 *
 * 과업 수정. systemId는 변경 불가.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body   = await request.json();
    const parsed = taskSchema.parse(body);

    const updated = await prisma.task.update({
      where: { taskId: parseInt(id) },
      data: {
        taskNo:     parsed.taskNo     ?? null,
        name:       parsed.name,
        category:   parsed.category   ?? null,
        definition: parsed.definition ?? null,
        outputInfo: parsed.outputInfo ?? null,
        rfpPage:    parsed.rfpPage    ?? null,
        content:    parsed.content    ?? null,
      },
    });

    return apiSuccess(updated);
  } catch {
    return apiError("SERVER_ERROR", "과업 수정에 실패했습니다.", 500);
  }
}

/**
 * DELETE /api/tasks/[id]
 *
 * 과업 삭제. 연결된 요구사항의 task_id는 SET NULL (데이터 보존).
 */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const numId  = parseInt(id);

  const task = await prisma.task.findUnique({ where: { taskId: numId } });
  if (!task) return apiError("NOT_FOUND", "과업을 찾을 수 없습니다.", 404);

  // SET NULL은 DB ON DELETE SET NULL로 처리됨
  await prisma.task.delete({ where: { taskId: numId } });

  return apiSuccess({ deleted: true });
}
