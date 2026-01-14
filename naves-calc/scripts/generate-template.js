/**
 * Generate Price Template Script
 * 
 * Usage: node scripts/generate-template.js [output_file]
 * Default: upload/naves/prices_template.xlsx
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

const DEFAULT_OUTPUT = path.join(__dirname, '../upload/naves/prices.xlsx');
const OUTPUT_FILE = process.argv[2] || DEFAULT_OUTPUT;

function generate() {
    console.log(`Generating template: ${OUTPUT_FILE}`);

    // Define data structure based on Design Doc
    const headers = ['key', 'name', 'unit', 'price', 'category'];
    const data = [
        headers, // Header row
        ['post_glued_150x150', 'Столб клееный 150х150', 'м.п.', 1500, 'wood'],
        ['post_glued_100x100', 'Столб клееный 100х100', 'м.п.', 1200, 'wood'],
        ['post_glued_200x200', 'Столб клееный 200х200', 'м.п.', 2200, 'wood'],
        ['roof_metal_grandline', 'Металлочерепица GrandLine', 'м²', 650, 'roof'],
        ['roof_shinglas_sonata', 'Гибкая черепица Shinglas', 'м²', 450, 'roof'],
        ['mounting_base', 'Монтаж (база)', 'м²', 2500, 'service'],
        ['delivery_mkad', 'Доставка от МКАД', 'км', 35, 'service']
    ];

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set column widths (optional, for better UX)
    const wscols = [
        { wch: 30 }, // key
        { wch: 40 }, // name
        { wch: 10 }, // unit
        { wch: 10 }, // price
        { wch: 15 }  // category
    ];
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, "Prices");

    // Ensure directory exists
    const dir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // Write file
    try {
        XLSX.writeFile(wb, OUTPUT_FILE);
        console.log('---------------------------------------------------');
        console.log(`Template generated successfully!`);
        console.log(`Location: ${OUTPUT_FILE}`);
        console.log('---------------------------------------------------');
    } catch (err) {
        console.error('Error writing file:', err.message);
    }
}

generate();
