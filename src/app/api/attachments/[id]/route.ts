import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import prisma from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

type RouteParams = { params: Promise<{ id: string }> };

const MIME_MAP: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  txt: "text/plain",
  csv: "text/csv",
  zip: "application/zip",
};

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const attachment = await prisma.attachment.findUnique({
    where: { attachmentId: parseInt(id) },
  });

  if (!attachment || attachment.delYn === "Y") {
    return apiError("NOT_FOUND", "파일을 찾을 수 없습니다.", 404);
  }

  try {
    const fullPath = path.join(process.cwd(), "public", attachment.filePath);
    const buffer = await readFile(fullPath);
    const contentType = MIME_MAP[attachment.fileExt?.toLowerCase() ?? ""] || "application/octet-stream";

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(attachment.logicalName)}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return apiError("FILE_NOT_FOUND", "물리 파일을 찾을 수 없습니다.", 404);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = await request.json();

  const attachment = await prisma.attachment.findUnique({
    where: { attachmentId: parseInt(id) },
  });

  if (!attachment || attachment.delYn === "Y") {
    return apiError("NOT_FOUND", "파일을 찾을 수 없습니다.", 404);
  }

  const updated = await prisma.attachment.update({
    where: { attachmentId: parseInt(id) },
    data: { description: body.description ?? null },
  });

  return apiSuccess(updated);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const attachment = await prisma.attachment.findUnique({
    where: { attachmentId: parseInt(id) },
  });

  if (!attachment || attachment.delYn === "Y") {
    return apiError("NOT_FOUND", "파일을 찾을 수 없습니다.", 404);
  }

  await prisma.attachment.update({
    where: { attachmentId: parseInt(id) },
    data: { delYn: "Y" },
  });

  return apiSuccess({ deleted: true });
}
