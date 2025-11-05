# 🚀 Руководство по развертыванию

**Версия:** 1.0  
**Дата:** 05.11.2025

---

## 📋 Содержание

1. [Развертывание на Shared Hosting](#shared-hosting)
2. [Развертывание на VPS/VDS](#vpsvds)
3. [Развертывание на облачных платформах](#облако)
4. [Настройка HTTPS](#https)
5. [Оптимизация производительности](#оптимизация)

---

## 🌐 Shared Hosting (Обычный хостинг)

### Требования:
- PHP 7.4+
- Возможность записи файлов
- .htaccess поддержка

### Шаг 1: Загрузка файлов

Через FTP или файловый менеджер хостинга:

```
public_html/
└── naves-calc/
    ├── index.html
    ├── assets/
    ├── api/
    │   ├── orders.php
    │   ├── config.php
    │   └── orders/
    └── upload/
```

### Шаг 2: Настройка прав доступа

```bash
chmod 755 api/
chmod 755 api/orders.php
chmod 777 api/orders/  # Важно! Для записи файлов
```

### Шаг 3: Настройка путей

В `index.html` (строка 1865):
```javascript
const orderManager = new OrderManager('/naves-calc/api/orders.php');
```

### Шаг 4: Настройка email

Создайте `api/config.php`:
```php
<?php
define('ADMIN_EMAIL', 'your-email@example.com');
```

В `api/orders.php` раскомментируйте:
```php
require_once __DIR__ . '/config.php';
```

### Шаг 5: Проверка

Откройте: `https://your-site.com/naves-calc/`

---

## 🖥️ VPS/VDS (Ubuntu/Debian)

### Требования:
- Ubuntu 20.04+ / Debian 10+
- Root или sudo доступ

### Вариант A: PHP (Nginx + PHP-FPM)

#### Установка

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Nginx
sudo apt install nginx -y

# Установка PHP
sudo apt install php8.1-fpm php8.1-cli php8.1-curl php8.1-json -y

# Создание папки
sudo mkdir -p /var/www/naves-calc
cd /var/www/naves-calc
```

#### Загрузка файлов

```bash
# Через SCP с вашего компьютера:
scp -r naves-calc/* user@your-server:/var/www/naves-calc/

# Или через Git:
git clone https://your-repo.git .
```

#### Настройка Nginx

```bash
sudo nano /etc/nginx/sites-available/naves-calc
```

Вставьте:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/naves-calc;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    location /api/ {
        try_files $uri $uri/ /api/orders.php?$args;
        
        location ~ \.php$ {
            include fastcgi_params;
            fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
            fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        }
    }

    location /api/orders/ {
        deny all;
    }
}
```

Активируйте:
```bash
sudo ln -s /etc/nginx/sites-available/naves-calc /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Настройка прав

```bash
sudo chown -R www-data:www-data /var/www/naves-calc
sudo chmod -R 755 /var/www/naves-calc
sudo chmod 777 /var/www/naves-calc/api/orders/
```

---

### Вариант B: Node.js (с Nginx proxy)

#### Установка Node.js

```bash
# NodeSource репозиторий
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs -y

# Проверка
node --version
npm --version
```

#### Установка зависимостей

```bash
cd /var/www/naves-calc/api/
npm install
```

#### Настройка как systemd сервис

```bash
sudo nano /etc/systemd/system/naves-api.service
```

Вставьте:
```ini
[Unit]
Description=Naves Calculator API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/naves-calc/api
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10

Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

Запустите:
```bash
sudo systemctl daemon-reload
sudo systemctl enable naves-api
sudo systemctl start naves-api
sudo systemctl status naves-api
```

#### Nginx как reverse proxy

```bash
sudo nano /etc/nginx/sites-available/naves-calc
```

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/naves-calc;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/naves-calc /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## ☁️ Облачные платформы

### Vercel (Frontend + Serverless Functions)

#### Подготовка

Создайте `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "naves-calc/index.html",
      "use": "@vercel/static"
    },
    {
      "src": "naves-calc/api/*.php",
      "use": "vercel-php@0.6.0"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/naves-calc/$1"
    }
  ]
}
```

#### Развертывание

```bash
npm install -g vercel
cd your-project
vercel
```

---

### Heroku (Node.js)

#### Подготовка

Создайте `Procfile`:
```
web: node naves-calc/api/server.js
```

Создайте `package.json` в корне:
```json
{
  "name": "naves-calc",
  "version": "1.0.0",
  "scripts": {
    "start": "node naves-calc/api/server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "nodemailer": "^6.9.7",
    "node-telegram-bot-api": "^0.64.0"
  }
}
```

#### Развертывание

```bash
heroku login
heroku create your-app-name
git push heroku main
heroku open
```

---

### AWS (EC2 + S3)

#### S3 для статических файлов

```bash
# Установка AWS CLI
sudo apt install awscli

# Конфигурация
aws configure

# Загрузка файлов
aws s3 sync naves-calc/ s3://your-bucket/naves-calc/ --acl public-read
```

#### EC2 для backend

Следуйте инструкциям для VPS выше.

---

## 🔒 Настройка HTTPS (Let's Encrypt)

### Certbot для Nginx

```bash
# Установка Certbot
sudo apt install certbot python3-certbot-nginx -y

# Получение сертификата
sudo certbot --nginx -d your-domain.com

# Автообновление
sudo certbot renew --dry-run
```

Certbot автоматически обновит конфигурацию Nginx.

### Проверка

```bash
# Проверка статуса сертификата
sudo certbot certificates

# Принудительное обновление
sudo certbot renew --force-renewal
```

---

## ⚡ Оптимизация производительности

### 1. Gzip сжатие (Nginx)

```nginx
http {
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/json application/javascript application/xml+rss;
}
```

### 2. Кэширование статики

```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 3. HTTP/2

```nginx
listen 443 ssl http2;
```

### 4. Минификация (опционально)

```bash
# Установка uglify-js
npm install -g uglify-js

# Минификация JS
uglifyjs naves-calc/assets/js/naves-calc.bundle.js -c -m -o naves-calc/assets/js/naves-calc.bundle.min.js

# Обновите путь в HTML
```

---

## 📊 Мониторинг

### Логи Nginx

```bash
# Просмотр логов
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Поиск ошибок
sudo grep "error" /var/log/nginx/error.log
```

### Логи Node.js

```bash
# Просмотр логов службы
sudo journalctl -u naves-api -f

# Последние 100 строк
sudo journalctl -u naves-api -n 100
```

### PM2 (альтернатива systemd для Node.js)

```bash
# Установка
npm install -g pm2

# Запуск
pm2 start naves-calc/api/server.js --name naves-api

# Мониторинг
pm2 monit

# Логи
pm2 logs naves-api

# Автозапуск
pm2 startup
pm2 save
```

---

## 🔧 Решение проблем

### PHP: "Permission denied"

```bash
sudo chmod 777 /var/www/naves-calc/api/orders/
sudo chown -R www-data:www-data /var/www/naves-calc/
```

### Nginx: "502 Bad Gateway"

```bash
# Проверка статуса PHP-FPM
sudo systemctl status php8.1-fpm

# Перезапуск
sudo systemctl restart php8.1-fpm
```

### Node.js: Port already in use

```bash
# Найти процесс
sudo lsof -i :3000

# Убить процесс
sudo kill -9 PID
```

### CORS ошибки

Добавьте в Nginx:
```nginx
add_header 'Access-Control-Allow-Origin' '*';
add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
add_header 'Access-Control-Allow-Headers' 'Content-Type';
```

---

## ✅ Чеклист развертывания

### Перед запуском:
- [ ] Файлы загружены на сервер
- [ ] Права доступа настроены
- [ ] Backend endpoint обновлен в index.html
- [ ] Email/Telegram настроены
- [ ] Тестовый заказ отправлен успешно

### После запуска:
- [ ] HTTPS настроен
- [ ] Мониторинг настроен
- [ ] Резервное копирование настроено
- [ ] Логи проверяются регулярно
- [ ] Обновления применяются

---

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи сервера
2. Проверьте консоль браузера (F12)
3. Убедитесь что все пути правильные
4. Проверьте права доступа к файлам

---

**Версия:** 1.0  
**Дата:** 05.11.2025

✅ **Успешного развертывания!**

