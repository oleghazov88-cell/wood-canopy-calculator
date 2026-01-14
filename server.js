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

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- CORS (для разработки) ----------
app.use(cors());

// ---------- Basic Auth для админ‑эндпоинтов ----------
// Установите переменные окружения ADMIN_USER и ADMIN_PASS, иначе будет "admin"/"admin"
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin';
app.use(
    '/api/prices/upload',
    basicAuth({
        users: { [ADMIN_USER]: ADMIN_PASS },
        challenge: true,
        realm: 'PriceAdmin'
    })
);

// ---------- Хранилище ----------
const DATA_DIR = path.join(__dirname, 'data');
const PRICES_FILE = path.join(DATA_DIR, 'prices.json');
const VERSIONS_DIR = path.join(DATA_DIR, 'versions');

// Убедимся, что каталоги существуют
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(VERSIONS_DIR)) fs.mkdirSync(VERSIONS_DIR);

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

// ---------- Запуск ----------
app.listen(PORT, () => {
    console.log(`Price API server listening on http://localhost:${PORT}`);
});
