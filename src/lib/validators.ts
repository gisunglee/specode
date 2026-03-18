import { z } from "zod";

/** 기획 드래프트: AI와 협업하는 IA/Process/Mockup 샌드박스 */
export const planningDraftSchema = z.object({
  planNm:        z.string().min(1, "기획명은 필수입니다."),
  planType:      z.string().optional().nullable(),   // IA / PROCESS / MOCKUP
  manualInfo:    z.string().optional().nullable(),   // 사용자 상세 아이디어
  comment:       z.string().optional().nullable(),   // AI 지시사항
  resultContent: z.string().optional().nullable(),   // 생성 결과
  resultType:    z.string().optional().nullable(),   // MD / HTML / MERMAID
  groupUuid:     z.string().optional().nullable(),   // 미입력 시 서버에서 생성
  sortOrd:       z.number().optional(),
  isPicked:      z.boolean().optional(),
});

/** 과업(Task): RFP 원문 대항목 */
export const taskSchema = z.object({
  taskNo:     z.string().optional().nullable(),  // 과업 번호 (사용자 정의)
  name:       z.string().min(1, "과업명은 필수입니다."),
  category:   z.string().optional().nullable(),  // 분류
  definition: z.string().optional().nullable(),  // 요약 정의
  outputInfo: z.string().optional().nullable(),  // 산출정보
  rfpPage:    z.number().optional().nullable(),  // RFP 페이지 번호
  content:    z.string().optional().nullable(),  // 세부내용 원문
});

export const requirementSchema = z.object({
  name:            z.string().min(1, "요구사항명은 필수입니다."),
  originalContent: z.string().optional().nullable(), // 요구사항 원문 보존용
  currentContent:  z.string().optional().nullable(), // 협의/변경 최종본
  detailSpec:      z.string().optional().nullable(), // 요구사항 명세서
  priority:        z.string().optional().nullable(),
  taskId:          z.number().optional().nullable(),  // 소속 과업
  source:          z.string().default("RFP"),          // 출처
  discussionMd:    z.string().optional().nullable(),  // AI 학습용 협의 내용
  saveHistoryFields: z.array(z.string()).optional(),   // 이력 저장할 필드명 배열 (UI 전달용)
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
  sortOrder: z.number().optional().nullable(),
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
  entityName: z.string().max(100).optional().nullable(),
  tableComment: z.string().max(200).optional().nullable(),
  ddlScript: z.string().default(""),
  tableGroup: z.string().max(50).optional().nullable(),
  relationsJson: z.string().optional().nullable(),
});

export const userStorySchema = z.object({
  requirementId: z.number({ error: "소속 요구사항은 필수입니다." }),
  name: z.string().min(1, "스토리명은 필수입니다."),
  persona: z.string().optional().nullable(),
  scenario: z.string().optional().nullable(),
  // 인수 조건: [{text: string}][] 배열 — 저장 시 JSONB로 변환
  acceptanceCriteria: z.array(z.object({ text: z.string() })).optional().nullable(),
});

export const commentSchema = z.object({
  content: z.string().min(1, "코멘트 내용은 필수입니다."),
  aiTaskId: z.number().optional().nullable(),
});
