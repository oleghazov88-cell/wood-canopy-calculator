const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join(__dirname, 'naves-calc', 'upload', 'naves', 'PRICE1.xlsm');

console.log(`Analyzing ${filePath}...`);

if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
}

try {
    const workbook = XLSX.readFile(filePath);
    console.log(`Sheet names: ${workbook.SheetNames.join(', ')}`);

    workbook.SheetNames.forEach(sheetName => {
        console.log(`\n--- Sheet: ${sheetName} ---`);
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON to see data
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }); // array of arrays

        if (data.length === 0) {
            console.log("Empty sheet");
        } else {
            console.log(`Rows: ${data.length}`);
            console.log("First 5 rows:");
            data.slice(0, 5).forEach((row, index) => {
                console.log(`Row ${index}: ${JSON.stringify(row)}`);
            });
        }
    });

} catch (error) {
    console.error(`Error reading Excel file: ${error.message}`);
}
