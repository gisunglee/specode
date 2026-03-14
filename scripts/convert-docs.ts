
import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';

async function convert(name: string) {
  const input = `d:/source/specode/docs/${name}.docx`;
  const output = `d:/source/specode/docs/${name}.md`;
  
  console.log(`Converting ${input}...`);
  const result = await mammoth.convertToMarkdown({path: input});
  fs.writeFileSync(output, result.value);
  console.log(`Done: ${output} (${result.value.length} bytes)`);
}

async function main() {
  await convert('SPECODE_STEP1_v2');
  await convert('SPECODE_STEP2_v2');
  await convert('SPECODE_STEP3_v3');
}

main().catch(console.error);
