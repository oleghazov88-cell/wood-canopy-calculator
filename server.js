// server.js – простейший API для цен
// Требуемые зависимости: express, multer, xlsx, express-basic-auth, cors, fs, path
// Установите их: npm install express multer xlsx express-basic-auth cors

const express = require('express');
const multer = require('multer');
const basicAuth = require('express-basic-auth');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- CORS (для разработки) ----------
app.use(cors());
app.use(express.json()); // Enable JSON body parsing for orders

// ---------- Basic Auth для админ‑эндпоинтов ----------
// Установите переменные окружения ADMIN_USER и ADMIN_PASS, иначе будет "admin"/"admin"
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin';
const adminAuth = basicAuth({
    users: { [ADMIN_USER]: ADMIN_PASS },
    challenge: true,
    realm: 'PriceAdmin'
});

app.use('/api/prices/upload', adminAuth);
// Optional: Protect CP generation or orders viewing? For now, let's keep orders public or protected?
// Admin panel sends auth header? No, browser popup.
// Let's protect /api/orders (GET) but maybe not POST (from client)?
// For simplicity in this dev phase, I'll valid auth only for explicit admin actions like upload.
// For CP generation, it's an admin feature, so protect it.


// ---------- Хранилище ----------
const DATA_DIR = path.join(__dirname, 'data');
const PRICES_FILE = path.join(DATA_DIR, 'prices.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json'); // New
const VERSIONS_DIR = path.join(DATA_DIR, 'versions');

// Убедимся, что каталоги существуют
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(VERSIONS_DIR)) fs.mkdirSync(VERSIONS_DIR);

// ---------- ORDERS STORE (Simple/Mock) ----------
let orders = [];
if (fs.existsSync(ORDERS_FILE)) {
    try {
        orders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf-8'));
    } catch (e) { console.error("Error loading orders:", e); }
} else {
    // Add a dummy order for testing if empty
    orders = [
        {
            orderId: "ORD-12345-TEST",
            timestamp: new Date().toISOString(),
            customerData: {
                name: "Тестовый Клиент",
                email: "test@example.com",
                phone: "+7 999 123 45 67",
                address: "г. Москва, ул. Примерная, д. 1"
            },
            calculationData: {
                totalPrice: 150000,
                dimensions: "6000x4000 мм",
                postMaterial: "Брус 150x150",
                trussMaterial: "Доска 50x150",
                roofCovering: "Поликарбонат 8мм",
            }
        }
    ];
}

function saveOrders() {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
}


// ---------- Вспомогательные функции ----------
function loadCurrentPrices() {
    if (fs.existsSync(PRICES_FILE)) {
        const raw = fs.readFileSync(PRICES_FILE, 'utf-8');
        return JSON.parse(raw);
    }
    // fallback – пустой объект
    return { meta: {}, items: {} };
}

function saveNewVersion(pricingData) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // 2026-01-12T22-54-17-000Z
    const versionFile = path.join(VERSIONS_DIR, `prices_${timestamp}.json`);
    fs.writeFileSync(versionFile, JSON.stringify(pricingData, null, 2), 'utf-8');
    // Перезаписываем текущий файл
    fs.writeFileSync(PRICES_FILE, JSON.stringify(pricingData, null, 2), 'utf-8');
}

function validateRows(rows) {
    const errors = [];
    const keys = new Set();
    const allowedUnits = ['м²', 'м.п.', 'шт.', 'набор'];
    rows.forEach((row, idx) => {
        const line = idx + 2; // +2 учитывая заголовок и 0‑индекс
        const key = row['key'] ? String(row['key']).trim() : null;
        if (!key) {
            errors.push({ row: line, field: 'key', message: 'missing key' });
            return;
        }
        if (keys.has(key)) {
            errors.push({ row: line, field: 'key', message: 'duplicate key' });
        }
        keys.add(key);
        let price = row['price'];
        if (typeof price === 'string') price = parseFloat(price.replace(/[^0-9.-]+/g, ''));
        if (isNaN(price) || price < 0) {
            errors.push({ row: line, field: 'price', message: 'price must be a non‑negative number' });
        }
        const unit = row['unit'];
        if (unit && !allowedUnits.includes(unit)) {
            errors.push({ row: line, field: 'unit', message: `unit must be one of ${allowedUnits.join(', ')}` });
        }
    });
    return errors;
}

function convertExcelToPricingData(buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet);
    const errors = validateRows(rawData);
    if (errors.length) {
        return { errors };
    }
    const pricingData = {
        meta: {
            version: new Date().toISOString().replace(/[:.]/g, '-'),
            updatedAt: new Date().toISOString(),
            currency: 'RUB',
            source: 'prices.xlsx'
        },
        items: {}
    };
    rawData.forEach(row => {
        const key = String(row['key']).trim();
        let price = row['price'];
        if (typeof price === 'string') price = parseFloat(price.replace(/[^0-9.-]+/g, ''));
        pricingData.items[key] = {
            price,
            unit: row['unit'] || '',
            name: row['name'] || key,
            category: row['category'] || '',
            enabled: row['enabled'] == null ? true : Boolean(row['enabled'])
        };
    });
    return { pricingData };
}

// ---------- Маршруты ----------
// GET текущих цен (публичный)
app.get('/api/prices', (req, res) => {
    const data = loadCurrentPrices();
    res.json(data);
});

// POST загрузка Excel (только admin)
const upload = multer({ storage: multer.memoryStorage() });
app.post('/api/prices/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
    const result = convertExcelToPricingData(req.file.buffer);
    if (result.errors) {
        return res.status(400).json({ errors: result.errors });
    }
    // Сохраняем новую версию
    saveNewVersion(result.pricingData);
    res.status(201).json({ message: 'Prices uploaded', version: result.pricingData.meta.version });
});

// ORDERS API
app.get('/api/orders', (req, res) => {
    res.json({ orders, count: orders.length });
});

app.post('/api/orders', (req, res) => {
    const newOrder = req.body;
    if (!newOrder.orderId) {
        newOrder.orderId = `ORD-${Date.now()}`;
        newOrder.timestamp = new Date().toISOString();
    }
    orders.unshift(newOrder); // Add to beginning
    saveOrders();
    res.status(201).json({ success: true, orderId: newOrder.orderId });
});

// GENERATE commercial proposal (CP)
app.get('/api/orders/:id/cp', async (req, res) => {
    const orderId = req.params.id;
    const order = orders.find(o => o.orderId === orderId); // or checks partially? Admin panel uses full ID?
    // Actually admin panel shows "split('-')[1]". But link will have full ID.

    // Look for order by partial or exact match?
    // Let's assume exact match.
    // If mocking, orderId is "ORD-12345-TEST". I should look for that.

    if (!order) {
        return res.status(404).send('Order not found');
    }

    const templatePath = path.join(__dirname, 'naves-calc', 'upload', 'naves', 'PRICE1.xlsm');
    if (!fs.existsSync(templatePath)) {
        return res.status(500).send('Template file not found on server');
    }

    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templatePath);

        const sheet = workbook.getWorksheet('КП');
        if (!sheet) {
            return res.status(500).send('Sheet "КП" not found in template');
        }

        // --- FILL DATA ---
        // Address: C25
        sheet.getCell('C25').value = order.customerData?.address || '';

        // Dimensions: C26
        sheet.getCell('C26').value = order.calculationData?.dimensions || '';

        // Materials
        // Post: C28
        sheet.getCell('C28').value = order.calculationData?.postMaterial || '';
        // Truss: C29
        sheet.getCell('C29').value = order.calculationData?.trussMaterial || '';
        // Roof: C40
        sheet.getCell('C40').value = order.calculationData?.roofCovering || '';

        // Total Price: C49
        sheet.getCell('C49').value = Number(order.calculationData?.totalPrice) || 0;

        // Set response headers
        const filename = `CP-${orderId}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error generating CP:', error);
        res.status(500).send('Error generating CP');
    }
});

// ---------- Запуск ----------
app.listen(PORT, () => {
    console.log(`Price API server listening on http://localhost:${PORT}`);
});
