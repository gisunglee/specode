-- ============================================================
-- RESTORE SCRIPT — 마이그레이션 롤백 시 실행
-- 백업 테이블(_backup_*)에서 원본 컬럼 복원
-- 실행: psql $DATABASE_URL -f scripts/migration_restore.sql
-- ⚠ 백업 스크립트를 먼저 실행했을 때만 동작
-- ============================================================

BEGIN;

-- ── 1. Function 복원 ──────────────────────────────────────────

-- 구 컬럼 재추가
ALTER TABLE tb_function
  ADD COLUMN IF NOT EXISTS status           TEXT NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS ai_insp_feedback  TEXT,
  ADD COLUMN IF NOT EXISTS ai_design_content TEXT,
  ADD COLUMN IF NOT EXISTS ai_impl_feedback  TEXT;

-- 백업 데이터 복원
UPDATE tb_function f
SET
  status            = b.status,
  ai_insp_feedback  = b.ai_insp_feedback,
  ai_design_content = b.ai_design_content,
  ai_impl_feedback  = b.ai_impl_feedback
FROM _backup_function_migration b
WHERE f.function_id = b.function_id;

-- 신규 컬럼 제거
ALTER TABLE tb_function
  DROP COLUMN IF EXISTS phase,
  DROP COLUMN IF EXISTS phase_status,
  DROP COLUMN IF EXISTS confirmed;

-- 인덱스 재생성
CREATE INDEX IF NOT EXISTS tb_function_status_idx ON tb_function(status);

-- ── 2. Area 복원 ──────────────────────────────────────────────

ALTER TABLE tb_area
  ADD COLUMN IF NOT EXISTS status     TEXT NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS ai_feedback TEXT;

UPDATE tb_area a
SET
  status      = b.status,
  ai_feedback = b.ai_feedback
FROM _backup_area_migration b
WHERE a.area_id = b.area_id;

ALTER TABLE tb_area
  DROP COLUMN IF EXISTS phase,
  DROP COLUMN IF EXISTS phase_status,
  DROP COLUMN IF EXISTS confirmed;

CREATE INDEX IF NOT EXISTS tb_area_status_idx ON tb_area(status);

-- ── 3. StandardGuide 복원 ─────────────────────────────────────

ALTER TABLE tb_standard_guide
  ADD COLUMN IF NOT EXISTS status              TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ai_feedback_content TEXT,
  ADD COLUMN IF NOT EXISTS ai_feedback_at      TIMESTAMPTZ;

UPDATE tb_standard_guide g
SET
  status               = b.status,
  ai_feedback_content  = b.ai_feedback_content,
  ai_feedback_at       = b.ai_feedback_at
FROM _backup_standard_guide_migration b
WHERE g.guide_id = b.guide_id;

ALTER TABLE tb_standard_guide
  DROP COLUMN IF EXISTS phase,
  DROP COLUMN IF EXISTS phase_status;

-- ── 4. AiTask taskType 복원 (REVIEW → INSPECT) ────────────────

UPDATE tb_ai_task t
SET task_type = b.task_type
FROM _backup_ai_task_migration b
WHERE t.ai_task_id = b.ai_task_id;

-- ── 5. 백업 테이블 삭제 ───────────────────────────────────────

DROP TABLE IF EXISTS _backup_function_migration;
DROP TABLE IF EXISTS _backup_area_migration;
DROP TABLE IF EXISTS _backup_standard_guide_migration;
DROP TABLE IF EXISTS _backup_ai_task_migration;

COMMIT;

-- 확인 쿼리
SELECT 'Function status 분포' AS check_name, status, COUNT(*) FROM tb_function GROUP BY status
UNION ALL
SELECT 'Area status 분포', status, COUNT(*) FROM tb_area GROUP BY status;
