-- ck_ai_task_task_type 제약 조건 업데이트
-- PLANNING, MOCKUP 타입 추가
ALTER TABLE tb_ai_task DROP CONSTRAINT IF EXISTS ck_ai_task_task_type;

ALTER TABLE tb_ai_task ADD CONSTRAINT ck_ai_task_task_type
  CHECK (task_type IN ('DESIGN','REVIEW','IMPLEMENT','IMPACT','REPROCESS','INSPECT','PRD_EXPORT','PLANNING','MOCKUP'));
