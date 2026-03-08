ALTER TABLE tb_sequence DROP CONSTRAINT IF EXISTS ck_sequence_prefix;
ALTER TABLE tb_sequence ADD CONSTRAINT ck_sequence_prefix
  CHECK (prefix = ANY (ARRAY['RQ', 'PID', 'FID', 'ATK', 'GID']));
