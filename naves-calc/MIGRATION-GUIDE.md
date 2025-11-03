# 📋 Руководство по миграции на версию 2.0

## Пошаговая инструкция перехода

### Шаг 1: Резервное копирование

```bash
# Создайте резервную копию текущего проекта
cp -r naves-calc naves-calc-backup
```

### Шаг 2: Проверка новых файлов

Убедитесь, что у вас есть следующие файлы:

```
✅ index-improved.html      # Новая улучшенная версия
✅ admin.html              # Админ-панель
✅ assets/js/storage-manager.js
✅ assets/js/pdf-export.js
✅ assets/js/order-manager.js
✅ assets/libs/three/three.module.min.js
✅ assets/libs/three/OrbitControls.js
```

### Шаг 3: Настройка локальных библиотек

Если файлы Three.js не скачались автоматически:

**Windows PowerShell:**
```powershell
cd naves-calc/assets/libs/three

Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js" -OutFile "three.module.min.js"

Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js" -OutFile "OrbitControls.js"
```

**Linux/Mac:**
```bash
cd naves-calc/assets/libs/three

curl -o three.module.min.js https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js

curl -o OrbitControls.js https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js
```

### Шаг 4: Настройка API для заказов

#### Вариант A: PHP Backend

Создайте файл `api/orders.php`:

```php
<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Валидация
    if (empty($data['customer']['name']) || empty($data['customer']['phone'])) {
        http_response_code(400);
        die(json_encode(['success' => false, 'message' => 'Не указаны обязательные поля']));
    }
    
    // Сохранение в файл (для простоты)
    $orderId = 'ORD-' . time() . '-' . rand(1000, 9999);
    file_put_contents(
        "orders/{$orderId}.json",
        json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
    );
    
    // Отправка email (опционально)
    if (!empty($data['customer']['email'])) {
        $subject = "Заказ навеса #{$orderId}";
        $message = "Спасибо за заказ! Мы свяжемся с вами в ближайшее время.";
        mail($data['customer']['email'], $subject, $message);
    }
    
    echo json_encode([
        'success' => true,
        'orderId' => $orderId,
        'message' => 'Заказ успешно создан'
    ]);
}
?>
```

Обновите в `index-improved.html`:
```javascript
const orderManager = new OrderManager('/api/orders.php');
```

#### Вариант B: Node.js Backend

Создайте `server.js`:

```javascript
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('naves-calc'));

app.post('/api/orders', async (req, res) => {
    try {
        const { customer, calculation } = req.body;
        
        // Валидация
        if (!customer.name || !customer.phone) {
            return res.status(400).json({
                success: false,
                message: 'Не указаны обязательные поля'
            });
        }
        
        // Генерация ID заказа
        const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Сохранение заказа
        await fs.writeFile(
            `orders/${orderId}.json`,
            JSON.stringify({ customer, calculation, timestamp: new Date() }, null, 2)
        );
        
        // TODO: Отправка email через nodemailer
        
        res.json({
            success: true,
            orderId: orderId,
            message: 'Заказ успешно создан'
        });
    } catch (error) {
        console.error('Ошибка создания заказа:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера'
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});
```

Установка и запуск:
```bash
npm init -y
npm install express cors
node server.js
```

Обновите в `index-improved.html`:
```javascript
const orderManager = new OrderManager('http://localhost:3000/api/orders');
```

### Шаг 5: Настройка email уведомлений

#### PHP (с использованием PHPMailer)

```bash
composer require phpmailer/phpmailer
```

```php
<?php
use PHPMailer\PHPMailer\PHPMailer;
require 'vendor/autoload.php';

function sendOrderEmail($to, $orderId, $data) {
    $mail = new PHPMailer(true);
    
    $mail->isSMTP();
    $mail->Host = 'smtp.gmail.com';
    $mail->SMTPAuth = true;
    $mail->Username = 'your@gmail.com';
    $mail->Password = 'your_password';
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = 587;
    
    $mail->setFrom('noreply@example.com', 'Навесы');
    $mail->addAddress($to);
    
    $mail->Subject = "Заказ #{$orderId}";
    $mail->Body = "Спасибо за заказ!\n\nДетали:\n" . json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
    $mail->send();
}
?>
```

#### Node.js (с использованием nodemailer)

```bash
npm install nodemailer
```

```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: 'your@gmail.com',
        pass: 'your_password'
    }
});

async function sendOrderEmail(to, orderId, data) {
    await transporter.sendMail({
        from: '"Навесы" <noreply@example.com>',
        to: to,
        subject: `Заказ #${orderId}`,
        text: `Спасибо за заказ!\n\nДетали:\n${JSON.stringify(data, null, 2)}`,
        html: `
            <h2>Спасибо за заказ!</h2>
            <p>Номер заказа: <strong>${orderId}</strong></p>
            <p>Мы свяжемся с вами в ближайшее время.</p>
        `
    });
}
```

### Шаг 6: Тестирование

1. **Откройте** `index-improved.html` в браузере
2. **Проверьте** основной функционал:
   - ✅ 3D визуализация загружается
   - ✅ Расчеты работают корректно
   - ✅ Сохранение расчетов
   - ✅ История расчетов
   - ✅ Экспорт в PDF
   - ✅ Форма заказа
   - ✅ Переключение темы

3. **Откройте** консоль браузера (F12) и проверьте отсутствие ошибок

4. **Проверьте** мобильную версию (DevTools → Toggle Device Toolbar)

### Шаг 7: Настройка админ-панели

1. Откройте `admin.html`
2. Загрузите существующий `prices.json`
3. Отредактируйте цены
4. Нажмите "💾 Сохранить изменения"
5. Загрузите новый `prices.json` на сервер

### Шаг 8: Продакшен

#### Оптимизация для продакшена

1. **Минификация CSS/JS** (опционально):
```bash
npm install -g minify
minify assets/js/storage-manager.js > assets/js/storage-manager.min.js
```

2. **Настройка HTTPS** (обязательно для продакшена)

3. **Настройка CORS** на сервере

4. **Настройка кеширования** в `.htaccess` или nginx конфиге:

**.htaccess (Apache):**
```apache
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/json "access plus 1 day"
</IfModule>
```

**nginx.conf:**
```nginx
location ~* \.(js|css)$ {
    expires 1M;
    add_header Cache-Control "public, immutable";
}

location ~* \.json$ {
    expires 1d;
    add_header Cache-Control "public";
}
```

5. **Настройка мониторинга ошибок** (например, Sentry)

### Шаг 9: Обратная совместимость

Старые версии остаются доступны:
- `index.html` - оригинальная версия
- `index-styled.html` - стилизованная версия
- `index-improved.html` - новая улучшенная версия

Вы можете использовать их параллельно или полностью переключиться на новую версию.

## Частые проблемы и решения

### Проблема: Three.js не загружается

**Решение:**
```javascript
// Проверьте пути в console.log
console.log('Three.js loaded:', typeof THREE !== 'undefined');

// Убедитесь, что файлы существуют
// assets/libs/three/three.module.min.js
// assets/libs/three/OrbitControls.js
```

### Проблема: PDF не генерируется

**Решение:**
```javascript
// Проверьте интернет-соединение (jsPDF загружается с CDN)
// Или скачайте локальную копию jsPDF
```

### Проблема: Заказы не отправляются

**Решение:**
```javascript
// Проверьте endpoint в OrderManager
// Откройте Network tab в DevTools
// Проверьте ответ сервера
```

### Проблема: localStorage переполнен

**Решение:**
```javascript
// Очистите старые расчеты через историю
// Или измените лимит в storage-manager.js:
this.maxSavedCalculations = 30; // вместо 50
```

## Откат к предыдущей версии

Если что-то пошло не так:

```bash
# Восстановите из резервной копии
rm -rf naves-calc
cp -r naves-calc-backup naves-calc

# Или используйте старую версию
# Просто откройте index.html вместо index-improved.html
```

## Поддержка

Если у вас возникли проблемы:

1. Проверьте консоль браузера (F12)
2. Посмотрите Network tab для API запросов
3. Проверьте README-UPDATED.md
4. Создайте issue на GitHub (если доступно)

---

**Успешной миграции! 🚀**

