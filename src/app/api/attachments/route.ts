import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import prisma from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "attachments");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const refTableName = formData.get("refTableName") as string | null;
    const refPkId = formData.get("refPkId") as string | null;

    if (!file || !refTableName || !refPkId) {
      return apiError("VALIDATION_ERROR", "file, refTableName, refPkId는 필수입니다.");
    }

    if (file.size > MAX_FILE_SIZE) {
      return apiError("FILE_TOO_LARGE", "파일 크기는 10MB 이하만 가능합니다.");
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || null;
    const uuid = randomUUID();
    const physicalName = ext ? `${uuid}.${ext}` : uuid;

    await mkdir(UPLOAD_DIR, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    const fullPath = path.join(UPLOAD_DIR, physicalName);
    await writeFile(fullPath, buffer);

    const attachment = await prisma.attachment.create({
      data: {
        refTableName,
        refPkId: parseInt(refPkId),
        logicalName: file.name,
        physicalName,
        filePath: `/uploads/attachments/${physicalName}`,
        fileSize: file.size,
        fileExt: ext,
      },
    });

    return apiSuccess(attachment);
  } catch (error) {
    console.error(error);
    return apiError("SERVER_ERROR", "파일 업로드에 실패했습니다.", 500);
  }
}
