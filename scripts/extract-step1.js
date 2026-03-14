
const mammoth = require('mammoth');
async function main() {
    try {
        const result = await mammoth.convertToMarkdown({path: "d:/source/specode/docs/SPECODE_STEP1_v2.docx"});
        console.log("---BEGIN---");
        console.log(result.value);
        console.log("---END---");
    } catch (e) {
        console.error('Error:', e);
    }
}
main();
