-- ============================================================
-- fix-function-status.sql
-- tb_function.status 체크 제약에 DESIGN_REQ, DESIGN_DONE 추가
-- ============================================================

ALTER TABLE tb_function DROP CONSTRAINT IF EXISTS ck_function_status;

ALTER TABLE tb_function ADD CONSTRAINT ck_function_status
  CHECK (status IN (
    'DRAFT',
    'REVIEW_REQ', 'AI_REVIEWING', 'REVIEW_DONE',
    'DESIGN_REQ', 'DESIGN_DONE',
    'CONFIRM_Y',
    'IMPL_REQ', 'AI_IMPLEMENTING', 'IMPL_DONE',
    'CHANGE_REQ'
  ));
