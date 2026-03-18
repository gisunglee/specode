-- tb_function 에 ai_design_content 컬럼 추가
-- Supabase SQL Editor 에서 실행하세요.
ALTER TABLE tb_function
  ADD COLUMN IF NOT EXISTS ai_design_content TEXT;
