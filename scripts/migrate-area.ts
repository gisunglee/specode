/**
 * migrate-area.ts
 * 영역(Area) 기능 도입을 위한 DB 마이그레이션 스크립트
 *
 * 실행: npx ts-node --project tsconfig.json scripts/migrate-area.ts
 * 또는: npx tsx scripts/migrate-area.ts
 *
 * DIRECT_URL을 사용해 Supabase 풀러 우회 (SERIAL 타입 문제 해결)
 */
import { PrismaClient } from "@prisma/client";

// DIRECT_URL 로 직접 연결 (DDL 작업용)
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } },
});

async function main() {
  console.log("🚀 영역(Area) 마이그레이션 시작...");

  // 1. tb_area 테이블 생성
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS tb_area (
      area_id      BIGSERIAL    PRIMARY KEY,
      area_code    VARCHAR(20)  NOT NULL UNIQUE,
      screen_id    BIGINT       NOT NULL REFERENCES tb_screen(screen_id),
      name         VARCHAR(200) NOT NULL,
      sort_order   INT          NOT NULL DEFAULT 1,
      area_type    VARCHAR(20)  NOT NULL,
      spec         TEXT,
      image_url    VARCHAR(500),
      display_fields TEXT,
      status       VARCHAR(20)  NOT NULL DEFAULT 'NONE',
      req_comment  TEXT,
      ai_feedback  TEXT,
      ai_detail_design TEXT,
      use_yn       CHAR(1)      NOT NULL DEFAULT 'Y',
      created_by   VARCHAR(50),
      created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
      updated_by   VARCHAR(50),
      updated_at   TIMESTAMP    NOT NULL DEFAULT NOW()
    )
  `);
  console.log("✅ tb_area 테이블 생성 완료");

  // 2. tb_area 인덱스
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_tb_area_screen_id ON tb_area(screen_id)
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_tb_area_status ON tb_area(status)
  `);
  console.log("✅ tb_area 인덱스 생성 완료");

  // 3. tb_function에 area_id 컬럼 추가
  await prisma.$executeRawUnsafe(`
    ALTER TABLE tb_function ADD COLUMN IF NOT EXISTS area_id BIGINT REFERENCES tb_area(area_id)
  `);
  console.log("✅ tb_function.area_id 컬럼 추가 완료");

  // 4. tb_function.screen_id 컬럼 제거
  await prisma.$executeRawUnsafe(`
    ALTER TABLE tb_function DROP COLUMN IF EXISTS screen_id
  `);
  console.log("✅ tb_function.screen_id 컬럼 제거 완료");

  // 5. tb_function 인덱스 재생성 (area_id용)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_tb_function_area_id ON tb_function(area_id)
  `);
  console.log("✅ tb_function.area_id 인덱스 생성 완료");

  // 6. AR 시퀀스 추가
  await prisma.$executeRawUnsafe(`
    INSERT INTO tb_sequence (prefix, last_value)
    VALUES ('AR', 0)
    ON CONFLICT (prefix) DO NOTHING
  `);
  console.log("✅ AR 시퀀스 추가 완료");

  console.log("\n🎉 마이그레이션 완료!");
}

main()
  .catch((e) => {
    console.error("❌ 마이그레이션 실패:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
