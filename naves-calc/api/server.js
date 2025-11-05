/**
 * Node.js сервер для обработки заказов навесов
 * Версия: 1.0
 * Дата: 05.11.2025
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const nodemailer = require('nodemailer');
const TelegramBot = require('node-telegram-bot-api');

// Загрузка конфигурации
const config = require('./config.json');

const app = express();
const PORT = config.port || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Логирование запросов
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// ============================================================================
// МАРШРУТЫ
// ============================================================================

/**
 * POST /api/orders - Создание нового заказа
 */
app.post('/api/orders', async (req, res) => {
    try {
        const { customerData, calculationData } = req.body;
        
        // Валидация
        if (!customerData || !customerData.name || !customerData.phone) {
            return res.status(400).json({
                success: false,
                error: 'Не заполнены обязательные поля: имя и телефон'
            });
        }
        
        // Генерация ID заказа
        const orderId = generateOrderId();
        
        // Создание объекта заказа
        const orderData = {
            orderId,
            timestamp: Date.now(),
            date: new Date().toISOString(),
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'] || 'unknown',
            customerData,
            calculationData
        };
        
        // Сохранение в файл
        await saveOrder(orderData);
        
        // Добавление в лог
        await logOrder(orderData);
        
        // Отправка уведомлений
        if (config.email && config.email.enabled) {
            await sendEmailNotification(orderData);
        }
        
        if (config.telegram && config.telegram.enabled) {
            await sendTelegramNotification(orderData);
        }
        
        // Успешный ответ
        res.json({
            success: true,
            orderId,
            message: 'Заказ успешно оформлен! Наш менеджер свяжется с вами в ближайшее время.'
        });
        
    } catch (error) {
        console.error('Ошибка обработки заказа:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});

/**
 * GET /api/orders - Получение списка заказов (для админки)
 */
app.get('/api/orders', async (req, res) => {
    try {
        const ordersDir = path.join(__dirname, 'orders');
        const files = await fs.readdir(ordersDir);
        
        const orders = [];
        for (const file of files) {
            if (file.endsWith('.json')) {
                const content = await fs.readFile(path.join(ordersDir, file), 'utf8');
                orders.push(JSON.parse(content));
            }
        }
        
        // Сортировка по дате (новые первыми)
        orders.sort((a, b) => b.timestamp - a.timestamp);
        
        res.json({
            success: true,
            count: orders.length,
            orders
        });
        
    } catch (error) {
        console.error('Ошибка получения заказов:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка получения списка заказов'
        });
    }
});

/**
 * GET /api/orders/:id - Получение конкретного заказа
 */
app.get('/api/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const filePath = path.join(__dirname, 'orders', `${id}.json`);
        
        const content = await fs.readFile(filePath, 'utf8');
        const order = JSON.parse(content);
        
        res.json({
            success: true,
            order
        });
        
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.status(404).json({
                success: false,
                error: 'Заказ не найден'
            });
        } else {
            console.error('Ошибка получения заказа:', error);
            res.status(500).json({
                success: false,
                error: 'Ошибка получения заказа'
            });
        }
    }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================================

/**
 * Генерация ID заказа
 */
function generateOrderId() {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 9000) + 1000;
    
    return `ORD-${dateStr}-${timestamp}-${random}`;
}

/**
 * Сохранение заказа в файл
 */
async function saveOrder(orderData) {
    const ordersDir = path.join(__dirname, 'orders');
    
    // Создание папки если не существует
    try {
        await fs.access(ordersDir);
    } catch {
        await fs.mkdir(ordersDir, { recursive: true });
    }
    
    // Сохранение файла
    const filename = path.join(ordersDir, `${orderData.orderId}.json`);
    await fs.writeFile(filename, JSON.stringify(orderData, null, 2), 'utf8');
}

/**
 * Логирование заказа
 */
async function logOrder(orderData) {
    const logFile = path.join(__dirname, 'orders', 'orders.log');
    const logEntry = `[${new Date().toISOString()}] ${orderData.orderId} | ${orderData.customerData.name} | ${orderData.customerData.phone} | ${orderData.calculationData.totalPrice}\n`;
    
    await fs.appendFile(logFile, logEntry, 'utf8');
}

/**
 * Отправка email уведомления
 */
async function sendEmailNotification(orderData) {
    try {
        const transporter = nodemailer.createTransporter({
            host: config.email.smtp.host,
            port: config.email.smtp.port,
            secure: config.email.smtp.secure,
            auth: {
                user: config.email.smtp.user,
                pass: config.email.smtp.pass
            }
        });
        
        const html = formatEmailMessage(orderData);
        
        await transporter.sendMail({
            from: config.email.from,
            to: config.email.to,
            subject: `Новый заказ навеса #${orderData.orderId}`,
            html
        });
        
        console.log(`Email отправлен для заказа ${orderData.orderId}`);
    } catch (error) {
        console.error('Ошибка отправки email:', error);
    }
}

/**
 * Форматирование email сообщения
 */
function formatEmailMessage(orderData) {
    const { customerData, calculationData } = orderData;
    
    return `
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; }
            .header { background: #20B5B9; color: white; padding: 20px; }
            .content { padding: 20px; }
            .section { margin-bottom: 20px; }
            .label { font-weight: bold; color: #333; }
            .value { color: #666; }
            table { border-collapse: collapse; width: 100%; }
            td { padding: 8px; border-bottom: 1px solid #ddd; }
        </style>
    </head>
    <body>
        <div class="header">
            <h2>Новый заказ навеса #${orderData.orderId}</h2>
            <p>Дата: ${new Date(orderData.timestamp).toLocaleString('ru-RU')}</p>
        </div>
        
        <div class="content">
            <div class="section">
                <h3>Данные клиента:</h3>
                <table>
                    <tr><td class="label">Имя:</td><td class="value">${customerData.name}</td></tr>
                    <tr><td class="label">Телефон:</td><td class="value">${customerData.phone}</td></tr>
                    <tr><td class="label">Email:</td><td class="value">${customerData.email || 'не указан'}</td></tr>
                    <tr><td class="label">Адрес:</td><td class="value">${customerData.address || 'не указан'}</td></tr>
                </table>
            </div>
            
            <div class="section">
                <h3>Параметры навеса:</h3>
                <table>
                    <tr><td class="label">Размеры:</td><td class="value">${calculationData.length}×${calculationData.width} м</td></tr>
                    <tr><td class="label">Площадь:</td><td class="value">${calculationData.area} м²</td></tr>
                    <tr><td class="label">Тип кровли:</td><td class="value">${calculationData.roofType}</td></tr>
                    <tr><td class="label">Материал столбов:</td><td class="value">${calculationData.postMaterial}</td></tr>
                    <tr><td class="label">Материал кровли:</td><td class="value">${calculationData.roofingMaterial}</td></tr>
                    <tr><td class="label"><strong>ИТОГО:</strong></td><td class="value"><strong>${calculationData.totalPrice}</strong></td></tr>
                </table>
            </div>
            
            ${customerData.comment ? `
            <div class="section">
                <h3>Комментарий клиента:</h3>
                <p>${customerData.comment}</p>
            </div>
            ` : ''}
        </div>
    </body>
    </html>
    `;
}

/**
 * Отправка Telegram уведомления
 */
async function sendTelegramNotification(orderData) {
    try {
        const bot = new TelegramBot(config.telegram.botToken, { polling: false });
        const { customerData, calculationData } = orderData;
        
        let message = `🏗️ *Новый заказ навеса*\n\n`;
        message += `📋 Заказ: \`${orderData.orderId}\`\n`;
        message += `👤 Клиент: ${customerData.name}\n`;
        message += `📞 Телефон: ${customerData.phone}\n`;
        if (customerData.email) {
            message += `📧 Email: ${customerData.email}\n`;
        }
        message += `\n📐 *Параметры:*\n`;
        message += `• Размеры: ${calculationData.length}×${calculationData.width} м\n`;
        message += `• Площадь: ${calculationData.area} м²\n`;
        message += `• Тип: ${calculationData.roofType}\n`;
        message += `\n💰 *Стоимость:* ${calculationData.totalPrice}`;
        
        await bot.sendMessage(config.telegram.chatId, message, { parse_mode: 'Markdown' });
        
        console.log(`Telegram уведомление отправлено для заказа ${orderData.orderId}`);
    } catch (error) {
        console.error('Ошибка отправки Telegram уведомления:', error);
    }
}

// ============================================================================
// ЗАПУСК СЕРВЕРА
// ============================================================================

app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📍 API endpoint: http://localhost:${PORT}/api/orders`);
    console.log(`💚 Health check: http://localhost:${PORT}/health`);
    console.log(`📧 Email уведомления: ${config.email?.enabled ? 'Включены' : 'Выключены'}`);
    console.log(`📱 Telegram уведомления: ${config.telegram?.enabled ? 'Включены' : 'Выключены'}`);
    console.log('='.repeat(60));
});

// Обработка ошибок
process.on('uncaughtException', (error) => {
    console.error('Необработанная ошибка:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Необработанное отклонение промиса:', reason);
});

