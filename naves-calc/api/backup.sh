#!/bin/bash
# Скрипт автоматического резервного копирования заказов
# Версия: 1.0
# Автор: Wood Canopy Calc Team

# ============================================================================
# КОНФИГУРАЦИЯ
# ============================================================================

# Папка с заказами
ORDERS_DIR="./orders"

# Папка для бекапов
BACKUP_DIR="./backups"

# Количество дней хранения бекапов
RETENTION_DAYS=30

# Формат даты для имени файла
DATE_FORMAT=$(date +"%Y-%m-%d_%H-%M-%S")

# Имя файла бекапа
BACKUP_FILE="orders_backup_${DATE_FORMAT}.tar.gz"

# Email для уведомлений (опционально)
NOTIFICATION_EMAIL=""

# ============================================================================
# ФУНКЦИИ
# ============================================================================

# Создание папки для бекапов
create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        echo "📁 Создание папки для бекапов: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
    fi
}

# Проверка наличия заказов
check_orders_exist() {
    if [ ! -d "$ORDERS_DIR" ]; then
        echo "❌ Ошибка: Папка заказов не найдена: $ORDERS_DIR"
        exit 1
    fi

    ORDER_COUNT=$(find "$ORDERS_DIR" -name "*.json" | wc -l)
    
    if [ "$ORDER_COUNT" -eq 0 ]; then
        echo "⚠️  Предупреждение: Нет файлов заказов для бекапа"
        exit 0
    fi

    echo "📋 Найдено заказов: $ORDER_COUNT"
}

# Создание архива
create_backup() {
    echo "📦 Создание архива: $BACKUP_FILE"
    
    tar -czf "$BACKUP_DIR/$BACKUP_FILE" \
        -C "$ORDERS_DIR" \
        --exclude="*.tmp" \
        --exclude=".htaccess" \
        . \
        2>/dev/null

    if [ $? -eq 0 ]; then
        BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
        echo "✅ Архив создан успешно: $BACKUP_SIZE"
        return 0
    else
        echo "❌ Ошибка создания архива"
        return 1
    fi
}

# Удаление старых бекапов
cleanup_old_backups() {
    echo "🧹 Удаление бекапов старше $RETENTION_DAYS дней..."
    
    find "$BACKUP_DIR" -name "orders_backup_*.tar.gz" -mtime +$RETENTION_DAYS -type f -delete
    
    REMAINING=$(find "$BACKUP_DIR" -name "orders_backup_*.tar.gz" | wc -l)
    echo "📊 Осталось бекапов: $REMAINING"
}

# Отправка уведомления
send_notification() {
    if [ -n "$NOTIFICATION_EMAIL" ]; then
        echo "📧 Отправка уведомления на $NOTIFICATION_EMAIL"
        
        SUBJECT="Резервное копирование заказов выполнено"
        BODY="Дата: $(date)\nФайл: $BACKUP_FILE\nРазмер: $BACKUP_SIZE"
        
        echo -e "$BODY" | mail -s "$SUBJECT" "$NOTIFICATION_EMAIL" 2>/dev/null
    fi
}

# Вывод статистики
print_statistics() {
    echo ""
    echo "═══════════════════════════════════════"
    echo "  📊 СТАТИСТИКА БЕКАПА"
    echo "═══════════════════════════════════════"
    echo "Дата: $(date)"
    echo "Заказов в бекапе: $ORDER_COUNT"
    echo "Файл: $BACKUP_FILE"
    echo "Размер: $BACKUP_SIZE"
    echo "Расположение: $BACKUP_DIR"
    echo "Срок хранения: $RETENTION_DAYS дней"
    echo "═══════════════════════════════════════"
    echo ""
}

# ============================================================================
# ОСНОВНОЙ КОД
# ============================================================================

echo ""
echo "🔄 Запуск резервного копирования заказов"
echo "Время: $(date)"
echo ""

# Создание папки для бекапов
create_backup_dir

# Проверка наличия заказов
check_orders_exist

# Создание архива
if create_backup; then
    # Удаление старых бекапов
    cleanup_old_backups
    
    # Вывод статистики
    print_statistics
    
    # Отправка уведомления
    send_notification
    
    echo "✅ Резервное копирование завершено успешно"
    exit 0
else
    echo "❌ Резервное копирование завершилось с ошибкой"
    exit 1
fi

