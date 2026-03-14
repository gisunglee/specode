
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const count = await prisma.dbSchema.count();
  console.log(`Total DB Schemas: ${count}`);
  const latest = await prisma.dbSchema.findMany({
    take: 5,
    orderBy: { updatedAt: 'desc' },
    select: { tableName: true, tableComment: true }
  });
  console.log('Latest 5 tables:', latest);
}
main().finally(() => prisma.$disconnect());
