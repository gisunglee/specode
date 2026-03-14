/**
 * GET    /api/content-versions/[id]  — content 포함 단건 조회
 * DELETE /api/content-versions/[id]  — 특정 버전 이력 삭제
 */
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const numId = parseInt(id);
  if (isNaN(numId)) {
    return apiError("VALIDATION_ERROR", "id는 숫자여야 합니다.");
  }

  const item = await prisma.contentVersion.findUnique({
    where: { versionId: BigInt(numId) },
  });
  if (!item) {
    return apiError("NOT_FOUND", "버전을 찾을 수 없습니다.", 404);
  }

  return apiSuccess({ ...item, versionId: Number(item.versionId) });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const numId = parseInt(id);
  if (isNaN(numId)) {
    return apiError("VALIDATION_ERROR", "id는 숫자여야 합니다.");
  }

  const item = await prisma.contentVersion.findUnique({
    where: { versionId: BigInt(numId) },
  });
  if (!item) {
    return apiError("NOT_FOUND", "버전을 찾을 수 없습니다.", 404);
  }

  await prisma.contentVersion.delete({ where: { versionId: BigInt(numId) } });
  return apiSuccess({ deleted: true });
}
