import { apiSuccess } from "@/lib/utils";
import prisma from "@/lib/prisma";

/**
 * GET /api/user-stories/personas
 *
 * 기존 등록된 페르소나 값 목록 조회.
 * 사용자 스토리 등록/수정 시 AutocompleteInput 제안 목록으로 활용.
 */
export async function GET() {
  const rows = await prisma.userStory.findMany({
    where: { persona: { not: null } },
    select: { persona: true },
    distinct: ["persona"],
    orderBy: { persona: "asc" },
  });

  const personas = rows.map((r) => r.persona as string);
  return apiSuccess(personas);
}
