/**
 * Менеджер для работы с локальным хранилищем расчетов
 * Позволяет сохранять, загружать и управлять историей расчетов
 */

class StorageManager {
    constructor() {
        this.storageKey = 'naves_calculations';
        this.maxSavedCalculations = 50; // Максимальное количество сохраненных расчетов
    }

    /**
     * Сохранить текущий расчет
     * @param {Object} calculation - Данные расчета
     * @param {String} name - Название расчета (опционально)
     * @returns {String} ID сохраненного расчета
     */
    saveCalculation(calculation, name = null) {
        const calculations = this.getAllCalculations();
        
        const savedCalc = {
            id: this.generateId(),
            name: name || `Расчет от ${new Date().toLocaleString('ru-RU')}`,
            timestamp: Date.now(),
            data: calculation,
            version: '1.0'
        };

        calculations.unshift(savedCalc);

        // Ограничиваем количество сохраненных расчетов
        if (calculations.length > this.maxSavedCalculations) {
            calculations.length = this.maxSavedCalculations;
        }

        this.saveToStorage(calculations);
        
        return savedCalc.id;
    }

    /**
     * Загрузить расчет по ID
     * @param {String} id - ID расчета
     * @returns {Object|null} Данные расчета
     */
    loadCalculation(id) {
        const calculations = this.getAllCalculations();
        const calc = calculations.find(c => c.id === id);
        return calc ? calc.data : null;
    }

    /**
     * Получить все сохраненные расчеты
     * @returns {Array} Массив расчетов
     */
    getAllCalculations() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Ошибка загрузки расчетов:', e);
            return [];
        }
    }

    /**
     * Удалить расчет по ID
     * @param {String} id - ID расчета
     * @returns {Boolean} Успешность удаления
     */
    deleteCalculation(id) {
        const calculations = this.getAllCalculations();
        const index = calculations.findIndex(c => c.id === id);
        
        if (index !== -1) {
            calculations.splice(index, 1);
            this.saveToStorage(calculations);
            return true;
        }
        
        return false;
    }

    /**
     * Переименовать расчет
     * @param {String} id - ID расчета
     * @param {String} newName - Новое название
     * @returns {Boolean} Успешность переименования
     */
    renameCalculation(id, newName) {
        const calculations = this.getAllCalculations();
        const calc = calculations.find(c => c.id === id);
        
        if (calc) {
            calc.name = newName;
            this.saveToStorage(calculations);
            return true;
        }
        
        return false;
    }

    /**
     * Экспортировать расчет в JSON
     * @param {String} id - ID расчета
     * @returns {String} JSON строка
     */
    exportCalculation(id) {
        const calc = this.getAllCalculations().find(c => c.id === id);
        return calc ? JSON.stringify(calc, null, 2) : null;
    }

    /**
     * Импортировать расчет из JSON
     * @param {String} jsonString - JSON строка
     * @returns {String|null} ID импортированного расчета
     */
    importCalculation(jsonString) {
        try {
            const calc = JSON.parse(jsonString);
            
            // Проверка структуры
            if (!calc.data || !calc.timestamp) {
                throw new Error('Неверная структура данных');
            }

            // Генерируем новый ID
            calc.id = this.generateId();
            calc.name = `${calc.name} (импорт)`;

            const calculations = this.getAllCalculations();
            calculations.unshift(calc);

            if (calculations.length > this.maxSavedCalculations) {
                calculations.length = this.maxSavedCalculations;
            }

            this.saveToStorage(calculations);
            
            return calc.id;
        } catch (e) {
            console.error('Ошибка импорта расчета:', e);
            return null;
        }
    }

    /**
     * Очистить все сохраненные расчеты
     */
    clearAll() {
        localStorage.removeItem(this.storageKey);
    }

    /**
     * Получить статистику
     * @returns {Object} Статистика
     */
    getStats() {
        const calculations = this.getAllCalculations();
        const totalSize = new Blob([JSON.stringify(calculations)]).size;
        
        return {
            count: calculations.length,
            totalSize: totalSize,
            totalSizeFormatted: this.formatBytes(totalSize),
            maxCount: this.maxSavedCalculations,
            percentUsed: (calculations.length / this.maxSavedCalculations * 100).toFixed(1)
        };
    }

    // Приватные методы

    generateId() {
        return `calc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    saveToStorage(data) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                // Удаляем самые старые расчеты
                data.length = Math.floor(data.length * 0.8);
                this.saveToStorage(data);
            } else {
                console.error('Ошибка сохранения в localStorage:', e);
            }
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
}

// Экспорт для использования
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
} else {
    window.StorageManager = StorageManager;
}

