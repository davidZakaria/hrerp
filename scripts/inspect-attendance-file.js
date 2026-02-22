/**
 * Inspect attendance XLS file structure
 * Run: node scripts/inspect-attendance-file.js "path/to/file.xls"
 * Use this to diagnose why a biometric file isn't parsing correctly.
 */

const xlsx = require('xlsx');
const path = process.argv[2];

if (!path) {
  console.log('Usage: node scripts/inspect-attendance-file.js "path/to/attendance.xls"');
  process.exit(1);
}

try {
  const workbook = xlsx.readFile(path);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = xlsx.utils.sheet_to_json(worksheet, { raw: false, defval: '' });

  console.log('='.repeat(60));
  console.log('ATTENDANCE FILE INSPECTION');
  console.log('='.repeat(60));
  console.log('File:', path);
  console.log('Sheet:', sheetName);
  console.log('Total rows:', jsonData.length);
  console.log('');

  if (jsonData.length === 0) {
    console.log('No data rows found.');
    process.exit(0);
  }

  // Show actual keys from first row (headers)
  const firstRow = jsonData[0];
  const headers = Object.keys(firstRow);
  console.log('COLUMN HEADERS (exact keys from file):');
  headers.forEach((h, i) => {
    console.log(`  ${i + 1}. "${h}" (length: ${h.length})`);
  });
  console.log('');

  // Show first 3 data rows
  console.log('FIRST 3 ROWS (raw values):');
  jsonData.slice(0, 3).forEach((row, i) => {
    console.log(`\n--- Row ${i + 1} ---`);
    Object.entries(row).forEach(([key, value]) => {
      console.log(`  "${key}": "${value}" (type: ${typeof value})`);
    });
  });

  console.log('\n' + '='.repeat(60));
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
