-- ============================================================
-- fix-task-status.sql
-- tb_ai_task.task_status 체크 제약 업데이트 + 데이터 마이그레이션
-- ============================================================

-- 1. 기존 체크 제약 먼저 제거 (UPDATE가 막히므로 선행 필요)
ALTER TABLE tb_ai_task DROP CONSTRAINT IF EXISTS ck_ai_task_status;

-- 2. 기존 데이터 마이그레이션 (구형 값 → 신규 값)
UPDATE tb_ai_task SET task_status = 'NONE'    WHERE task_status = 'PENDING';
UPDATE tb_ai_task SET task_status = 'SUCCESS'  WHERE task_status = 'DONE';

-- 3. 신규 체크 제약 추가
ALTER TABLE tb_ai_task ADD CONSTRAINT ck_ai_task_status
  CHECK (task_status IN ('NONE', 'RUNNING', 'SUCCESS', 'AUTO_FIXED', 'NEEDS_CHECK', 'WARNING', 'FAILED', 'CANCELLED'));
