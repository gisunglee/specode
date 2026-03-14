
const mammoth = require('mammoth');
const fs = require('fs');

async function main() {
    try {
        console.log('Testing mammoth...');
        const result = await mammoth.convertToMarkdown({path: "d:/source/specode/docs/SPECODE_STEP1_v2.docx"});
        console.log('Markdown length:', result.value.length);
        fs.writeFileSync("d:/source/specode/test_out.md", result.value);
        console.log('File written to d:/source/specode/test_out.md');
    } catch (e) {
        console.error('Error:', e);
    }
}
main();
