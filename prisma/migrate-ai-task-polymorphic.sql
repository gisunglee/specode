-- ============================================================
-- tb_ai_task: function_id → polymorphic (ref_table_name + ref_pk_id)
-- tb_standard_guide: AI 점검 상태 컬럼 추가
-- ============================================================

-- 1. ref 컬럼 추가 (일단 nullable로)
ALTER TABLE tb_ai_task ADD COLUMN IF NOT EXISTS ref_table_name VARCHAR(50);
ALTER TABLE tb_ai_task ADD COLUMN IF NOT EXISTS ref_pk_id      INT;

-- 2. 기존 function 태스크 데이터 마이그레이션
UPDATE tb_ai_task
SET ref_table_name = 'tb_function',
    ref_pk_id      = function_id
WHERE function_id IS NOT NULL;

-- 3. NOT NULL 제약 설정
ALTER TABLE tb_ai_task ALTER COLUMN ref_table_name SET NOT NULL;
ALTER TABLE tb_ai_task ALTER COLUMN ref_pk_id      SET NOT NULL;

-- 4. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_ai_task_ref ON tb_ai_task(ref_table_name, ref_pk_id);

-- 5. function_id FK 제약 및 컬럼 제거
ALTER TABLE tb_ai_task DROP CONSTRAINT IF EXISTS tb_ai_task_function_id_fkey;
ALTER TABLE tb_ai_task DROP COLUMN IF EXISTS function_id;

-- 6. task_type CHECK 제약 갱신 (INSPECT 추가)
ALTER TABLE tb_ai_task DROP CONSTRAINT IF EXISTS ck_ai_task_task_type;
ALTER TABLE tb_ai_task ADD CONSTRAINT ck_ai_task_task_type
  CHECK (task_type IN ('DESIGN', 'REVIEW', 'IMPLEMENT', 'IMPACT', 'REPROCESS', 'INSPECT'));

-- 7. tb_standard_guide: AI 점검 상태 컬럼 추가
ALTER TABLE tb_standard_guide ADD COLUMN IF NOT EXISTS ai_feedback_status VARCHAR(20) DEFAULT 'NONE';
ALTER TABLE tb_standard_guide ADD COLUMN IF NOT EXISTS ai_feedback_at     TIMESTAMP;
