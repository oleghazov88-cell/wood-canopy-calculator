const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join(__dirname, 'naves-calc', 'upload', 'naves', 'PRICE1.xlsm');
const sheetName = 'КП';

console.log(`Inspecting sheet '${sheetName}' in ${filePath}...`);

if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
}

try {
    const workbook = XLSX.readFile(filePath);
    if (!workbook.SheetNames.includes(sheetName)) {
        console.error(`Sheet '${sheetName}' not found. Available: ${workbook.SheetNames.join(', ')}`);
        process.exit(1);
    }

    const worksheet = workbook.Sheets[sheetName];
    // Get range
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    console.log(`Range: ${range.s.c}:${range.s.r} to ${range.e.c}:${range.e.r}`);

    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 0, defval: "" });

    // Print rows 40-80 to understand pricing layout
    data.slice(40, 80).forEach((row, index) => {
        // Filter out completely empty rows for cleaner output, but keep index
        if (row.some(cell => cell !== "")) {
            console.log(`[Row ${40 + index + 1}] ${JSON.stringify(row)}`);
        }
    });

} catch (error) {
    console.error(`Error: ${error.message}`);
}
