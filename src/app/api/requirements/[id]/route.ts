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

    // ── systemId 변경 요청 처리 ──────────────────────────────
    let newSystemId: string | undefined;
    if (parsed.systemId) {
      const match = parsed.systemId.match(/^RQ-(\d+)$/);
      if (!match) return apiError("VALIDATION_ERROR", "ID 형식이 올바르지 않습니다. (예: RQ-00001)");

      const newNum = parseInt(match[1], 10);

      // 최대값(시퀀스) 초과 여부 확인
      const seq = await prisma.sequence.findUnique({ where: { prefix: "RQ" } });
      if (seq && newNum > seq.lastValue) {
        return apiError("VALIDATION_ERROR", `ID 숫자는 현재 최대값(${seq.lastValue})을 초과할 수 없습니다.`);
      }

      // 중복 확인 (자기 자신 제외)
      const conflict = await prisma.requirement.findFirst({
        where: { systemId: parsed.systemId, requirementId: { not: numId } },
      });
      if (conflict) {
        return apiError("VALIDATION_ERROR", `이미 사용 중인 ID입니다: ${parsed.systemId}`);
      }

      newSystemId = parsed.systemId;
    }

    const data = await prisma.requirement.update({
      where: { requirementId: numId },
      data: {
        ...(newSystemId && { systemId: newSystemId }),
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

  // 사용자스토리 → 요구사항 순서로 삭제 (인수기준은 스토리 내 JSON 필드라 별도 삭제 불필요)
  await prisma.$transaction([
    prisma.userStory.deleteMany({ where: { requirementId: numId } }),
    prisma.requirement.delete({ where: { requirementId: numId } }),
  ]);

  return apiSuccess({ deleted: true });
}
