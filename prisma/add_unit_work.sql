-- 단위업무 테이블 추가
CREATE TABLE tb_unit_work (
  unit_work_id  SERIAL PRIMARY KEY,
  system_id     VARCHAR(20)  NOT NULL UNIQUE,
  requirement_id INT         NOT NULL REFERENCES tb_requirement(requirement_id),
  name          VARCHAR(200) NOT NULL,
  description   TEXT,
  sort_order    INT          NOT NULL DEFAULT 0,
  use_yn        CHAR(1)      NOT NULL DEFAULT 'Y',
  created_by    VARCHAR(50),
  created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_unit_work_requirement ON tb_unit_work(requirement_id);

-- tb_screen에 unit_work_id 컬럼 추가 (nullable — 하위 호환)
ALTER TABLE tb_screen ADD COLUMN IF NOT EXISTS unit_work_id INT REFERENCES tb_unit_work(unit_work_id);

CREATE INDEX IF NOT EXISTS idx_screen_unit_work ON tb_screen(unit_work_id);

-- 시퀀스 UW 추가
INSERT INTO tb_sequence (prefix, last_value)
VALUES ('UW', 0)
ON CONFLICT (prefix) DO NOTHING;
