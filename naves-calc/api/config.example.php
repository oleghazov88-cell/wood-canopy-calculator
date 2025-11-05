<?php
/**
 * Файл конфигурации для API заказов
 * Скопируйте этот файл в config.php и заполните своими данными
 */

// Email для уведомлений о новых заказах
define('ADMIN_EMAIL', 'manager@example.com');

// Telegram Bot настройки (опционально)
// Как получить: https://core.telegram.org/bots#6-botfather
// define('TELEGRAM_BOT_TOKEN', 'YOUR_BOT_TOKEN_HERE');
// define('TELEGRAM_CHAT_ID', 'YOUR_CHAT_ID_HERE');

// Настройки базы данных (если используете)
// define('DB_HOST', 'localhost');
// define('DB_NAME', 'naves_orders');
// define('DB_USER', 'root');
// define('DB_PASS', '');

// Подключение конфигурации в orders.php:
// Раскомментируйте эту строку в начале orders.php:
// require_once __DIR__ . '/config.php';
?>

