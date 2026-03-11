import { z } from "zod";

export const requirementSchema = z.object({
  name: z.string().min(1, "요구사항명은 필수입니다."),
  content: z.string().optional().nullable(),     // 요구사항 내용 (원문)
  description: z.string().optional().nullable(), // 요구사항 분석 내용
  priority: z.string().optional().nullable(),
});

export const screenSchema = z.object({
  name: z.string().min(1, "화면명은 필수입니다."),
  displayCode: z.string().optional().nullable(),
  screenType: z.string().optional().nullable(),
  requirementId: z.number({ error: "소속 요구사항은 필수입니다." }),
  spec: z.string().optional().nullable(),
  layoutData: z.string().optional().nullable(),
  categoryL: z.string().optional().nullable(),
  categoryM: z.string().optional().nullable(),
  categoryS: z.string().optional().nullable(),
  menuOrder: z.number().optional().nullable(),
});

export const functionSchema = z.object({
  name: z.string().min(1, "기능명은 필수입니다."),
  displayCode: z.string().optional().nullable(),
  areaId: z.number().optional().nullable(),
  spec: z.string().optional().nullable(),
  changeReason: z.string().optional().nullable(),
  priority: z.string().default("MEDIUM"),
});

export const statusChangeSchema = z.object({
  status: z.string().min(1),
});

export const dbSchemaSchema = z.object({
  tableName: z.string().min(1, "테이블명은 필수입니다.").max(100),
  tableComment: z.string().max(200).optional().nullable(),
  ddlScript: z.string().default(""),
  tableGroup: z.string().max(50).optional().nullable(),
});

export const commentSchema = z.object({
  content: z.string().min(1, "코멘트 내용은 필수입니다."),
  aiTaskId: z.number().optional().nullable(),
});
