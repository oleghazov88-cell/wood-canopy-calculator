<?php
/**
 * API endpoint для обработки заказов навесов
 * Версия: 1.0
 * Дата: 05.11.2025
 */

// Настройки
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Обработка preflight запроса
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Проверка метода
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error' => 'Метод не поддерживается. Используйте POST'
    ]);
    exit;
}

// Получение данных
$rawData = file_get_contents('php://input');
$data = json_decode($rawData, true);

// Проверка JSON
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Неверный формат данных JSON'
    ]);
    exit;
}

// Валидация обязательных полей
$requiredFields = ['name', 'phone'];
$missingFields = [];

foreach ($requiredFields as $field) {
    if (empty($data['customerData'][$field])) {
        $missingFields[] = $field;
    }
}

if (!empty($missingFields)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Не заполнены обязательные поля: ' . implode(', ', $missingFields)
    ]);
    exit;
}

// Генерация ID заказа
$orderId = 'ORD-' . date('Ymd') . '-' . time() . '-' . rand(1000, 9999);

// Добавление метаданных
$orderData = [
    'orderId' => $orderId,
    'timestamp' => time(),
    'date' => date('Y-m-d H:i:s'),
    'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
    'userAgent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
    'customerData' => $data['customerData'] ?? [],
    'calculationData' => $data['calculationData'] ?? []
];

// Создание папки для заказов если её нет
$ordersDir = __DIR__ . '/orders';
if (!is_dir($ordersDir)) {
    mkdir($ordersDir, 0755, true);
}

// Сохранение заказа в файл
$filename = $ordersDir . '/' . $orderId . '.json';
$saved = file_put_contents(
    $filename, 
    json_encode($orderData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
);

if (!$saved) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Ошибка сохранения заказа'
    ]);
    exit;
}

// Логирование в общий файл
$logFile = $ordersDir . '/orders.log';
$logEntry = sprintf(
    "[%s] %s | %s | %s | %s₽\n",
    date('Y-m-d H:i:s'),
    $orderId,
    $orderData['customerData']['name'],
    $orderData['customerData']['phone'],
    $orderData['calculationData']['totalPrice'] ?? '0'
);
file_put_contents($logFile, $logEntry, FILE_APPEND);

// Отправка email уведомления (опционально)
if (function_exists('mail') && defined('ADMIN_EMAIL')) {
    $subject = "Новый заказ навеса #$orderId";
    $message = formatEmailMessage($orderData);
    $headers = "From: no-reply@" . $_SERVER['HTTP_HOST'] . "\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    
    mail(ADMIN_EMAIL, $subject, $message, $headers);
}

// Отправка Telegram уведомления (опционально)
if (defined('TELEGRAM_BOT_TOKEN') && defined('TELEGRAM_CHAT_ID')) {
    sendTelegramNotification($orderData);
}

// Успешный ответ
http_response_code(200);
echo json_encode([
    'success' => true,
    'orderId' => $orderId,
    'message' => 'Заказ успешно оформлен! Наш менеджер свяжется с вами в ближайшее время.'
]);

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================================

/**
 * Форматирование сообщения для email
 */
function formatEmailMessage($orderData) {
    $customer = $orderData['customerData'];
    $calc = $orderData['calculationData'];
    
    $html = "
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
        <div class='header'>
            <h2>Новый заказ навеса #{$orderData['orderId']}</h2>
            <p>Дата: {$orderData['date']}</p>
        </div>
        
        <div class='content'>
            <div class='section'>
                <h3>Данные клиента:</h3>
                <table>
                    <tr><td class='label'>Имя:</td><td class='value'>{$customer['name']}</td></tr>
                    <tr><td class='label'>Телефон:</td><td class='value'>{$customer['phone']}</td></tr>
                    <tr><td class='label'>Email:</td><td class='value'>" . ($customer['email'] ?? 'не указан') . "</td></tr>
                    <tr><td class='label'>Адрес:</td><td class='value'>" . ($customer['address'] ?? 'не указан') . "</td></tr>
                </table>
            </div>
            
            <div class='section'>
                <h3>Параметры навеса:</h3>
                <table>
                    <tr><td class='label'>Размеры:</td><td class='value'>{$calc['length']}×{$calc['width']} м</td></tr>
                    <tr><td class='label'>Площадь:</td><td class='value'>{$calc['area']} м²</td></tr>
                    <tr><td class='label'>Тип кровли:</td><td class='value'>{$calc['roofType']}</td></tr>
                    <tr><td class='label'>Материал столбов:</td><td class='value'>{$calc['postMaterial']}</td></tr>
                    <tr><td class='label'>Материал кровли:</td><td class='value'>{$calc['roofingMaterial']}</td></tr>
                    <tr><td class='label'><strong>ИТОГО:</strong></td><td class='value'><strong>{$calc['totalPrice']}</strong></td></tr>
                </table>
            </div>
            
            " . (!empty($customer['comment']) ? "
            <div class='section'>
                <h3>Комментарий клиента:</h3>
                <p>{$customer['comment']}</p>
            </div>
            " : "") . "
        </div>
    </body>
    </html>
    ";
    
    return $html;
}

/**
 * Отправка уведомления в Telegram
 */
function sendTelegramNotification($orderData) {
    $botToken = TELEGRAM_BOT_TOKEN;
    $chatId = TELEGRAM_CHAT_ID;
    
    $customer = $orderData['customerData'];
    $calc = $orderData['calculationData'];
    
    $message = "🏗️ *Новый заказ навеса*\n\n";
    $message .= "📋 Заказ: `{$orderData['orderId']}`\n";
    $message .= "👤 Клиент: {$customer['name']}\n";
    $message .= "📞 Телефон: {$customer['phone']}\n";
    if (!empty($customer['email'])) {
        $message .= "📧 Email: {$customer['email']}\n";
    }
    $message .= "\n📐 *Параметры:*\n";
    $message .= "• Размеры: {$calc['length']}×{$calc['width']} м\n";
    $message .= "• Площадь: {$calc['area']} м²\n";
    $message .= "• Тип: {$calc['roofType']}\n";
    $message .= "\n💰 *Стоимость:* {$calc['totalPrice']}";
    
    $url = "https://api.telegram.org/bot{$botToken}/sendMessage";
    $data = [
        'chat_id' => $chatId,
        'text' => $message,
        'parse_mode' => 'Markdown'
    ];
    
    $options = [
        'http' => [
            'method' => 'POST',
            'header' => 'Content-Type: application/json',
            'content' => json_encode($data)
        ]
    ];
    
    $context = stream_context_create($options);
    @file_get_contents($url, false, $context);
}
?>

