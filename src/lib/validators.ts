import { z } from "zod";

export const requirementSchema = z.object({
  name: z.string().min(1, "요구사항명은 필수입니다."),
  description: z.string().optional().nullable(),
  priority: z.string().optional().nullable(),
});

export const screenSchema = z.object({
  name: z.string().min(1, "화면명은 필수입니다."),
  displayCode: z.string().optional().nullable(),
  screenType: z.string().optional().nullable(),
  requirementId: z.number({ error: "상위 요구사항은 필수입니다." }),
});

export const functionSchema = z.object({
  name: z.string().min(1, "기능명은 필수입니다."),
  displayCode: z.string().optional().nullable(),
  screenId: z.number({ error: "상위 화면은 필수입니다." }),
  spec: z.string().optional().nullable(),
  dataFlow: z.string().optional().nullable(),
  changeReason: z.string().optional().nullable(),
  requestType: z.string().default("NEW"),
  priority: z.string().default("MEDIUM"),
  references: z
    .array(
      z.object({
        refType: z.string(),
        refValue: z.string(),
        description: z.string().optional().nullable(),
      })
    )
    .optional(),
  relations: z
    .array(
      z.object({
        targetFunctionId: z.number(),
        relationType: z.string(),
        params: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
      })
    )
    .optional(),
});

export const statusChangeSchema = z.object({
  status: z.string().min(1),
});

export const commentSchema = z.object({
  content: z.string().min(1, "코멘트 내용은 필수입니다."),
  aiTaskId: z.number().optional().nullable(),
});
