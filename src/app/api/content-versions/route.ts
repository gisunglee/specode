/**
 * GET /api/content-versions
 *
 * Query Parameters:
 *   refTableName  (필수) 테이블명
 *   refPkId       (필수) 레코드 PK
 *   fieldName     (필수) 필드명
 *   versionId     (선택) 특정 version_id — 없으면 목록, 있으면 단건 상세
 *
 * 목록 응답: content 제외, created_at DESC
 * 상세 응답: content 포함
 */
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const refTableName = searchParams.get("refTableName");
  const refPkId = searchParams.get("refPkId");
  const fieldName = searchParams.get("fieldName");
  const versionId = searchParams.get("versionId");

  if (!refTableName || !refPkId || !fieldName) {
    return apiError("VALIDATION_ERROR", "refTableName, refPkId, fieldName은 필수입니다.");
  }

  const pkId = parseInt(refPkId);
  if (isNaN(pkId)) {
    return apiError("VALIDATION_ERROR", "refPkId는 숫자여야 합니다.");
  }

  /* ── 단건 상세 조회 (versionId 있을 때) ──────────────────── */
  if (versionId) {
    const numVid = parseInt(versionId);
    if (isNaN(numVid)) {
      return apiError("VALIDATION_ERROR", "versionId는 숫자여야 합니다.");
    }

    const item = await prisma.contentVersion.findFirst({
      where: {
        versionId: BigInt(numVid),
        refTableName,
        refPkId: pkId,
        fieldName,
      },
      select: {
        versionId: true,
        content: true,
        changedBy: true,
        aiTaskId: true,
        createdAt: true,
      },
    });

    if (!item) {
      return apiError("NOT_FOUND", "버전을 찾을 수 없습니다.", 404);
    }

    return apiSuccess({ ...item, versionId: Number(item.versionId) });
  }

  /* ── 목록 조회 (content 제외) ──────────────────────────── */
  const items = await prisma.contentVersion.findMany({
    where: { refTableName, refPkId: pkId, fieldName },
    select: {
      versionId: true,
      changedBy: true,
      aiTaskId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // BigInt → number 직렬화
  return apiSuccess(items.map((v) => ({ ...v, versionId: Number(v.versionId) })));
}
