const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'upload/naves/PRICE1.xlsm');

try {
    const workbook = XLSX.readFile(filePath);
    console.log('Sheets:', workbook.SheetNames);

    // Analyze first sheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Get headers (first row)
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    if (jsonData.length > 0) {
        console.log('Headers (Row 1):', jsonData[0]);
        console.log('Row 2 Example:', jsonData[1]);
        console.log('Row 3 Example:', jsonData[2]);
        console.log('Total Rows:', jsonData.length);
    } else {
        console.log('Sheet is empty');
    }

} catch (err) {
    console.error('Error reading file:', err.message);
}
