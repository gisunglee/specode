-- PRD_SNAPSHOT / PRD_EXPORT taskType 허용 추가
-- ck_ai_task_task_type 체크 제약 재설정

ALTER TABLE tb_ai_task DROP CONSTRAINT IF EXISTS ck_ai_task_task_type;

ALTER TABLE tb_ai_task ADD CONSTRAINT ck_ai_task_task_type
  CHECK (task_type IN (
    'DESIGN', 'REVIEW', 'IMPLEMENT', 'IMPACT', 'REPROCESS', 'INSPECT',
    'MOCKUP', 'PRD_SNAPSHOT', 'PRD_EXPORT'
  ));
