import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requirementSchema } from "@/lib/validators";
import { apiSuccess, apiError } from "@/lib/utils";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const data = await prisma.requirement.findUnique({
    where: { requirementId: parseInt(id) },
    include: {
      screens: {
        include: { _count: { select: { areas: true } } },
      },
    },
  });

  if (!data) {
    return apiError("NOT_FOUND", "요구사항을 찾을 수 없습니다.", 404);
  }

  return apiSuccess(data);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const numId  = parseInt(id);
    const body   = await request.json();
    const parsed = requirementSchema.parse(body);

    // saveHistoryFields → 변경 전 값을 tb_content_version에 저장
    if (parsed.saveHistoryFields && parsed.saveHistoryFields.length > 0) {
      const current = await prisma.requirement.findUnique({
        where:  { requirementId: numId },
        select: { currentContent: true, detailSpec: true, discussionMd: true },
      });
      if (current) {
        const fieldMap: Record<string, string | null | undefined> = {
          current_content: current.currentContent,
          detail_spec:     current.detailSpec,
          discussion_md:   current.discussionMd,
        };
        for (const fieldName of parsed.saveHistoryFields) {
          const oldContent = fieldMap[fieldName];
          if (oldContent) {
            await prisma.contentVersion.create({
              data: {
                refTableName: "tb_requirement",
                refPkId:      numId,
                fieldName,
                content:      oldContent,
                changedBy:    "user",
              },
            });
          }
        }
      }
    }

    const data = await prisma.requirement.update({
      where: { requirementId: numId },
      data: {
        name:            parsed.name,
        originalContent: parsed.originalContent ?? null,
        currentContent:  parsed.currentContent  ?? null,
        detailSpec:      parsed.detailSpec       ?? null,
        priority:        parsed.priority         ?? null,
        taskId:          parsed.taskId           ?? null,
        source:          parsed.source,
        discussionMd:    parsed.discussionMd     ?? null,
      },
    });

    return apiSuccess(data);
  } catch {
    return apiError("SERVER_ERROR", "수정에 실패했습니다.", 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const numId  = parseInt(id);

  const screenCount = await prisma.screen.count({
    where: { requirementId: numId },
  });

  if (screenCount > 0) {
    return apiError(
      "HAS_CHILDREN",
      `하위 화면 ${screenCount}건이 존재합니다. 먼저 삭제해주세요.`
    );
  }

  await prisma.requirement.delete({ where: { requirementId: numId } });

  return apiSuccess({ deleted: true });
}
