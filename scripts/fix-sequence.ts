import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } },
});
async function main() {
  // 체크 제약 조회
  const result = await prisma.$queryRawUnsafe<{conname: string; def: string}[]>(`
    SELECT conname, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE conrelid = 'tb_sequence'::regclass AND contype = 'c'
  `);
  console.log("현재 제약:", JSON.stringify(result, null, 2));

  // 기존 제약 삭제 후 AR 포함한 새 제약 추가
  if (result.length > 0) {
    const constraintName = result[0].conname;
    await prisma.$executeRawUnsafe(`ALTER TABLE tb_sequence DROP CONSTRAINT IF EXISTS "${constraintName}"`);
    console.log(`제약 ${constraintName} 삭제 완료`);
  }

  // AR 시퀀스 삽입
  await prisma.$executeRawUnsafe(`
    INSERT INTO tb_sequence (prefix, last_value)
    VALUES ('AR', 0)
    ON CONFLICT (prefix) DO NOTHING
  `);
  console.log("AR 시퀀스 추가 완료");

  // 현재 시퀀스 목록
  const seqs = await prisma.$queryRawUnsafe("SELECT prefix, last_value FROM tb_sequence ORDER BY prefix");
  console.log("시퀀스 목록:", seqs);
}
main().catch(console.error).finally(() => prisma.$disconnect());
