const fs = require('fs');
const path = require('path');

async function main() {
  const filePath = process.argv[2];
  if (!filePath || !fs.existsSync(filePath)) {
    process.stderr.write('Archivo no encontrado: ' + filePath);
    process.exit(1);
  }

  try {
    const pdfParse = require('pdf-parse/lib/pdf-parse.js');
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    process.stdout.write(JSON.stringify({ success: true, text: data.text || '' }));
    process.exit(0);
  } catch (err) {
    process.stderr.write(err?.message || String(err));
    process.exit(1);
  }
}

main();
