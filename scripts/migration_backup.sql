-- ============================================================
-- BACKUP SCRIPT — 마이그레이션 전 실행
-- Phase/PhaseStatus 모델 전환 전 원본 데이터 보존
-- 실행: psql $DATABASE_URL -f scripts/migration_backup.sql
-- ============================================================

-- 1. Function AI 컬럼 + 상태 백업
CREATE TABLE IF NOT EXISTS _backup_function_migration AS
SELECT
  function_id,
  status,
  ai_insp_feedback,
  ai_design_content,
  ai_impl_feedback
FROM tb_function;

-- 2. Area 상태 + AI 피드백 백업
CREATE TABLE IF NOT EXISTS _backup_area_migration AS
SELECT
  area_id,
  status,
  ai_feedback
FROM tb_area;

-- 3. StandardGuide 상태 + AI 피드백 백업
CREATE TABLE IF NOT EXISTS _backup_standard_guide_migration AS
SELECT
  guide_id,
  status,
  ai_feedback_content,
  ai_feedback_at
FROM tb_standard_guide;

-- 4. AiTask taskType 백업 (INSPECT → REVIEW 변환 대비)
CREATE TABLE IF NOT EXISTS _backup_ai_task_migration AS
SELECT
  ai_task_id,
  task_type
FROM tb_ai_task;

-- 확인 쿼리
SELECT 'Function 백업' AS table_name, COUNT(*) AS rows FROM _backup_function_migration
UNION ALL
SELECT 'Area 백업',         COUNT(*) FROM _backup_area_migration
UNION ALL
SELECT 'Guide 백업',        COUNT(*) FROM _backup_standard_guide_migration
UNION ALL
SELECT 'AiTask 백업',       COUNT(*) FROM _backup_ai_task_migration;
