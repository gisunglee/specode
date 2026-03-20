-- tb_prd_baseline: PRD 다운로드 / 구현요청 기준점 전용 테이블
-- tb_ai_task 에서 스냅샷 역할을 분리

CREATE TABLE IF NOT EXISTS tb_prd_baseline (
  baseline_id      BIGSERIAL    NOT NULL,
  ref_table_name   VARCHAR(50)  NOT NULL,
  ref_pk_id        INT          NOT NULL,
  baseline_type    VARCHAR(10)  NOT NULL,   -- 'PRD' | 'IMPL'
  context_snapshot TEXT         NOT NULL,
  created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_prd_baseline PRIMARY KEY (baseline_id),
  CONSTRAINT ck_prd_baseline_type CHECK (baseline_type IN ('PRD', 'IMPL'))
);

CREATE INDEX IF NOT EXISTS idx_prd_baseline_lookup
  ON tb_prd_baseline (ref_table_name, ref_pk_id, baseline_type);

-- tb_ai_task 제약 원복 (PRD_SNAPSHOT / PRD_EXPORT 제거)
ALTER TABLE tb_ai_task DROP CONSTRAINT IF EXISTS ck_ai_task_task_type;
ALTER TABLE tb_ai_task ADD CONSTRAINT ck_ai_task_task_type
  CHECK (task_type IN ('DESIGN', 'REVIEW', 'IMPLEMENT', 'IMPACT', 'REPROCESS', 'INSPECT', 'MOCKUP'));
