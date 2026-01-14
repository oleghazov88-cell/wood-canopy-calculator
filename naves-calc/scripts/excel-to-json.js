/**
 * Excel to JSON Converter for Canopy Calculator
 * 
 * Usage: node scripts/excel-to-json.js [input_file] [output_file]
 * Default: upload/naves/prices.xlsx -> upload/naves/prices.json
 */

const fs = require('fs');
const path = require('path');
let XLSX;

try {
    XLSX = require('xlsx');
} catch (e) {
    console.error('\x1b[31m%s\x1b[0m', 'Error: "xlsx" library is missing.');
    console.log('Please install it using: npm install xlsx --save-dev');
    process.exit(1);
}

// Configuration
const DEFAULT_INPUT = path.join(__dirname, '../upload/naves/prices.xlsx');
const DEFAULT_OUTPUT = path.join(__dirname, '../upload/naves/prices.json');

const INPUT_FILE = process.argv[2] || DEFAULT_INPUT;
const OUTPUT_FILE = process.argv[3] || DEFAULT_OUTPUT;

function convert() {
    console.log(`Reading file: ${INPUT_FILE}`);

    if (!fs.existsSync(INPUT_FILE)) {
        console.error(`Error: File not found: ${INPUT_FILE}`);
        // Create a detailed error message helping the user
        console.log('\nPlease place your price list Excel file at this location.');
        console.log('Required columns: key, name, unit, price');
        process.exit(1);
    }

    try {
        const workbook = XLSX.readFile(INPUT_FILE);
        const sheetName = workbook.SheetNames[0]; // Assume first sheet
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const rawData = XLSX.utils.sheet_to_json(worksheet);

        console.log(`Found ${rawData.length} rows in sheet "${sheetName}".Processing...`);

        const pricingData = {
            meta: {
                version: "1.0.0", // You might want to auto-increment this or read from somewhere
                updatedAt: new Date().toISOString(),
                currency: "RUB",
                source: path.basename(INPUT_FILE)
            },
            items: {}
        };

        let successCount = 0;
        let warningCount = 0;

        rawData.forEach((row, index) => {
            // Trim keys if strings
            const key = row['key'] ? String(row['key']).trim() : null;
            let price = row['price'];

            if (!key) {
                console.warn(`[Row ${index + 2}] Skipping row without 'key'.`);
                warningCount++;
                return;
            }

            // Normalize price
            if (typeof price === 'string') {
                price = parseFloat(price.replace(/[^0-9.-]+/g, ""));
            }

            if (isNaN(price) || price < 0) {
                console.warn(`[Row ${index + 2}] Invalid price for key '${key}': ${row['price']}`);
                warningCount++;
                return;
            }

            // Add to items
            // We use the Rich format to support Admin Panel
            pricingData.items[key] = {
                price: price,
                unit: row['unit'] || '',
                name: row['name'] || key,
                category: row['category'] || ''
            };

            successCount++;
        });

        // Write output
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(pricingData, null, 2));

        console.log('---------------------------------------------------');
        console.log(`Conversion Complete!`);
        console.log(`Success: ${successCount} items`);
        console.log(`Warnings: ${warningCount}`);
        console.log(`Output saved to: ${OUTPUT_FILE}`);
        console.log('---------------------------------------------------');

    } catch (error) {
        console.error('An error occurred during conversion:', error.message);
        process.exit(1);
    }
}

convert();
