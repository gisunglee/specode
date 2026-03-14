
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const prisma = new PrismaClient();
async function main() {
  try {
    const count = await prisma.dbSchema.count();
    const latest = await prisma.dbSchema.findMany({
      take: 5,
      orderBy: { updatedAt: 'desc' },
      select: { tableName: true, tableComment: true }
    });
    const result = {
      count,
      latest,
      timestamp: new Date().toISOString()
    };
    fs.writeFileSync('C:/Users/USER/.gemini/antigravity/brain/041c2fc7-288f-4da1-b839-6875129f24d7/db_status.json', JSON.stringify(result, null, 2));
  } catch (e) {
    fs.writeFileSync('C:/Users/USER/.gemini/antigravity/brain/041c2fc7-288f-4da1-b839-6875129f24d7/db_error.txt', e.toString());
  } finally {
    await prisma.$disconnect();
  }
}
main();
