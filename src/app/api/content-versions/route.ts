/**
 * GET /api/content-versions
 *
 * [일반 목록 모드] page 파라미터 있을 때:
 *   page, pageSize, refTableName(선택), fieldName(선택), changedBy(선택)
 *   → 페이지네이션 목록 (content 제외)
 *
 * [특정 버전 목록 모드] page 없을 때 (VersionButtons에서 사용):
 *   refTableName, refPkId, fieldName  필수
 *   versionId 있으면 단건 상세 (content 포함)
 */
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pageParam    = searchParams.get("page");
  const refTableName = searchParams.get("refTableName");
  const refPkId      = searchParams.get("refPkId");
  const fieldName    = searchParams.get("fieldName");
  const changedBy    = searchParams.get("changedBy");
  const versionId    = searchParams.get("versionId");

  /* ── 일반 목록 모드 (page 파라미터 있을 때) ──────────────── */
  if (pageParam !== null) {
    const page     = Math.max(1, parseInt(pageParam) || 1);
    const pageSize = Math.min(100, parseInt(searchParams.get("pageSize") || "20") || 20);

    const where: Record<string, unknown> = {};
    if (refTableName) where.refTableName = refTableName;
    if (fieldName)    where.fieldName    = fieldName;
    if (changedBy)    where.changedBy    = changedBy;
    if (refPkId) {
      const pk = parseInt(refPkId);
      if (!isNaN(pk)) where.refPkId = pk;
    }

    const [items, total] = await Promise.all([
      prisma.contentVersion.findMany({
        where,
        select: {
          versionId:    true,
          refTableName: true,
          refPkId:      true,
          fieldName:    true,
          changedBy:    true,
          aiTaskId:     true,
          createdAt:    true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.contentVersion.count({ where }),
    ]);

    return apiSuccess(
      items.map((v) => ({ ...v, versionId: Number(v.versionId) })),
      { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
    );
  }

  /* ── 특정 버전 목록 모드 (VersionButtons용) ─────────────── */
  if (!refTableName || !refPkId || !fieldName) {
    return apiError("VALIDATION_ERROR", "refTableName, refPkId, fieldName은 필수입니다.");
  }

  const pkId = parseInt(refPkId);
  if (isNaN(pkId)) {
    return apiError("VALIDATION_ERROR", "refPkId는 숫자여야 합니다.");
  }

  /* 단건 상세 조회 (versionId 있을 때) */
  if (versionId) {
    const numVid = parseInt(versionId);
    if (isNaN(numVid)) {
      return apiError("VALIDATION_ERROR", "versionId는 숫자여야 합니다.");
    }

    const item = await prisma.contentVersion.findFirst({
      where: { versionId: BigInt(numVid), refTableName, refPkId: pkId, fieldName },
      select: { versionId: true, content: true, changedBy: true, aiTaskId: true, createdAt: true },
    });

    if (!item) {
      return apiError("NOT_FOUND", "버전을 찾을 수 없습니다.", 404);
    }

    return apiSuccess({ ...item, versionId: Number(item.versionId) });
  }

  /* 목록 조회 (content 제외) */
  const items = await prisma.contentVersion.findMany({
    where: { refTableName, refPkId: pkId, fieldName },
    select: { versionId: true, changedBy: true, aiTaskId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return apiSuccess(items.map((v) => ({ ...v, versionId: Number(v.versionId) })));
}
