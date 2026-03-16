
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const sqlPath = 'd:/source/specode/docs/SPECODE_DDL_v3.sql';
  const content = fs.readFileSync(sqlPath, 'utf8');

  // Split by CREATE TABLE
  const tables = content.split(/CREATE TABLE/i).slice(1);

  console.log(`Found ${tables.length} potential tables.`);

  for (const tablePart of tables) {
    // Extract table name
    const nameMatch = tablePart.match(/^\s+([a-z0-9_]+)\s*\(/i);
    if (!nameMatch) continue;

    const tableName = nameMatch[1];
    
    // Find the end of CREATE TABLE statement
    const endOfCreate = tablePart.indexOf(');');
    if (endOfCreate === -1) continue;

    let ddlScript = 'CREATE TABLE ' + tablePart.substring(0, endOfCreate + 2);

    // Look for COMMENT ON TABLE and COLUMN
    const commentRegex = new RegExp(`COMMENT ON (TABLE|COLUMN) ${tableName}(\\.[a-z0-9_]+)? IS '([^']+)';`, 'gi');
    let tableComment = '';
    let match;
    while ((match = commentRegex.exec(content)) !== null) {
      if (match[1].toUpperCase() === 'TABLE' && !match[2]) {
        tableComment = match[3];
      }
      ddlScript += '\n' + match[0];
    }

    console.log(`Registering ${tableName}: ${tableComment}`);

    await prisma.dbSchema.upsert({
      where: { tableName },
      update: {
        tableComment,
        ddlScript,
      },
      create: {
        tableName,
        tableComment,
        ddlScript,
      },
    });
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
