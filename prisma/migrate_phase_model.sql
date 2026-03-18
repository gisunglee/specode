-- ============================================================
-- migrate_phase_model.sql
-- Phase/PhaseStatus 모델 전환 마이그레이션
--
-- 실행 방법 (Supabase SQL Editor 또는 psql):
--   psql $DIRECT_URL -f prisma/migrate_phase_model.sql
--
-- 실행 순서:
--   1. scripts/migration_backup.sql 먼저 실행 (백업)
--   2. 이 파일 실행 (스키마 변경 + 데이터 마이그레이션)
--   3. prisma generate (클라이언트 재생성)
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────
-- 1. tb_function
--    status(10개) → phase + phase_status + confirmed
--    ai_insp_feedback, ai_design_content, ai_impl_feedback 제거
-- ────────────────────────────────────────────────────────────

ALTER TABLE tb_function
  ADD COLUMN IF NOT EXISTS phase        TEXT NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS phase_status TEXT NOT NULL DEFAULT 'IDLE',
  ADD COLUMN IF NOT EXISTS confirmed    BOOLEAN NOT NULL DEFAULT FALSE;

-- 상태값 매핑
UPDATE tb_function SET
  phase = CASE status
    WHEN 'DRAFT'           THEN 'DRAFT'
    WHEN 'REVIEW_REQ'      THEN 'REVIEW'
    WHEN 'AI_REVIEWING'    THEN 'REVIEW'
    WHEN 'REVIEW_DONE'     THEN 'REVIEW'
    WHEN 'DESIGN_REQ'      THEN 'DESIGN'
    WHEN 'DESIGN_DONE'     THEN 'DESIGN'
    WHEN 'CONFIRM_Y'       THEN 'DESIGN'
    WHEN 'IMPL_REQ'        THEN 'IMPL'
    WHEN 'AI_IMPLEMENTING' THEN 'IMPL'
    WHEN 'IMPL_DONE'       THEN 'IMPL'
    ELSE 'DRAFT'
  END,
  phase_status = CASE status
    WHEN 'DRAFT'           THEN 'IDLE'
    WHEN 'REVIEW_REQ'      THEN 'REQUESTED'
    WHEN 'AI_REVIEWING'    THEN 'PROCESSING'
    WHEN 'REVIEW_DONE'     THEN 'DONE'
    WHEN 'DESIGN_REQ'      THEN 'REQUESTED'
    WHEN 'DESIGN_DONE'     THEN 'DONE'
    WHEN 'CONFIRM_Y'       THEN 'DONE'
    WHEN 'IMPL_REQ'        THEN 'REQUESTED'
    WHEN 'AI_IMPLEMENTING' THEN 'PROCESSING'
    WHEN 'IMPL_DONE'       THEN 'DONE'
    ELSE 'IDLE'
  END,
  confirmed = (status = 'CONFIRM_Y');

-- 구 컬럼 제거
ALTER TABLE tb_function
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS ai_insp_feedback,
  DROP COLUMN IF EXISTS ai_design_content,
  DROP COLUMN IF EXISTS ai_impl_feedback;

-- 인덱스 정리
DROP INDEX IF EXISTS tb_function_status_idx;
CREATE INDEX IF NOT EXISTS idx_function_phase ON tb_function(phase, phase_status);

-- ────────────────────────────────────────────────────────────
-- 2. tb_area
--    status(4개) → phase + phase_status + confirmed
--    ai_feedback 제거
-- ────────────────────────────────────────────────────────────

ALTER TABLE tb_area
  ADD COLUMN IF NOT EXISTS phase        TEXT NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS phase_status TEXT NOT NULL DEFAULT 'IDLE',
  ADD COLUMN IF NOT EXISTS confirmed    BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE tb_area SET
  phase = CASE status
    WHEN 'NONE'        THEN 'DRAFT'
    WHEN 'DESIGN_REQ'  THEN 'DESIGN'
    WHEN 'DESIGN_DONE' THEN 'DESIGN'
    WHEN 'CONFIRM_Y'   THEN 'DESIGN'
    ELSE 'DRAFT'
  END,
  phase_status = CASE status
    WHEN 'NONE'        THEN 'IDLE'
    WHEN 'DESIGN_REQ'  THEN 'REQUESTED'
    WHEN 'DESIGN_DONE' THEN 'DONE'
    WHEN 'CONFIRM_Y'   THEN 'DONE'
    ELSE 'IDLE'
  END,
  confirmed = (status = 'CONFIRM_Y');

ALTER TABLE tb_area
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS ai_feedback;

DROP INDEX IF EXISTS tb_area_status_idx;
CREATE INDEX IF NOT EXISTS idx_area_phase ON tb_area(phase, phase_status);

-- ────────────────────────────────────────────────────────────
-- 3. tb_standard_guide
--    status(""|REVIEW_REQ|REVIEW_DONE) → phase + phase_status
--    ai_feedback_content, ai_feedback_at 제거
-- ────────────────────────────────────────────────────────────

ALTER TABLE tb_standard_guide
  ADD COLUMN IF NOT EXISTS phase        TEXT NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS phase_status TEXT NOT NULL DEFAULT 'IDLE';

UPDATE tb_standard_guide SET
  phase = CASE
    WHEN status = 'REVIEW_REQ'  THEN 'REVIEW'
    WHEN status = 'REVIEW_DONE' THEN 'REVIEW'
    ELSE 'DRAFT'
  END,
  phase_status = CASE
    WHEN status = 'REVIEW_REQ'  THEN 'REQUESTED'
    WHEN status = 'REVIEW_DONE' THEN 'DONE'
    ELSE 'IDLE'
  END;

ALTER TABLE tb_standard_guide
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS ai_feedback_content,
  DROP COLUMN IF EXISTS ai_feedback_at;

-- ────────────────────────────────────────────────────────────
-- 4. tb_ai_task — taskType: INSPECT → REVIEW
-- ────────────────────────────────────────────────────────────

UPDATE tb_ai_task
SET task_type = 'REVIEW'
WHERE task_type = 'INSPECT';

-- ────────────────────────────────────────────────────────────
-- 5. 검증
-- ────────────────────────────────────────────────────────────

SELECT 'Function phase 분포' AS check_label, phase, phase_status, COUNT(*) AS cnt
  FROM tb_function GROUP BY phase, phase_status
UNION ALL
SELECT 'Area phase 분포', phase, phase_status, COUNT(*)
  FROM tb_area GROUP BY phase, phase_status
UNION ALL
SELECT 'Guide phase 분포', phase, phase_status, COUNT(*)
  FROM tb_standard_guide GROUP BY phase, phase_status
UNION ALL
SELECT 'AiTask taskType 분포', task_type, '', COUNT(*)
  FROM tb_ai_task GROUP BY task_type
ORDER BY 1, 2, 3;

COMMIT;
