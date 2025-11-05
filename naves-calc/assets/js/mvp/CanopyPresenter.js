/**
 * CanopyPresenter - Презентер калькулятора навесов (MVP Pattern)
 * 
 * Отвечает за:
 * - Координацию между Model, View и Renderer
 * - Обработку бизнес-логики
 * - Синхронизацию данных
 * - Управление жизненным циклом приложения
 */

class CanopyPresenter {
    constructor(model, view, renderer) {
        this.model = model;
        this.view = view;
        this.renderer = renderer;
        
        // Дебаунсинг для 3D обновлений
        this.update3DTimeout = null;
        this.update3DDelay = 300; // мс
        
        // Интеграция модулей расширений
        this.storageManager = typeof StorageManager !== 'undefined' ? new StorageManager() : null;
        this.orderManager = typeof OrderManager !== 'undefined' ? new OrderManager('/naves-calc/api/orders.php') : null;
        this.pdfExporter = typeof PDFExporter !== 'undefined' ? new PDFExporter() : null;
        
        // Привязка колбэков
        this.bindModelCallbacks();
        this.bindViewCallbacks();
        this.bindRendererCallbacks();
    }

    /**
     * Инициализация приложения
     */
    async init() {
        try {
            console.log('Инициализация калькулятора навесов...');
            
            // 1. Загрузка цен
            this.view.showLoading();
            await this.model.loadPrices();
            
            // 2. Рендеринг формы
            const params = this.model.getParams();
            this.view.renderForm(params);
            
            // 3. Первый расчет
            this.calculateAndUpdate();
            
            // 4. Инициализация 3D
            await this.renderer.init();
            this.renderer.update(params);
            
            this.view.hideLoading();
            console.log('Калькулятор навесов инициализирован');
            
        } catch (error) {
            console.error('Ошибка инициализации:', error);
            this.view.showError('Не удалось инициализировать калькулятор: ' + error.message);
        }
    }

    /**
     * Привязка колбэков модели
     */
    bindModelCallbacks() {
        this.model.onDataChanged = (key, value) => {
            this.onModelDataChanged(key, value);
        };
        
        this.model.onPricesLoaded = (prices) => {
            console.log('Цены загружены:', Object.keys(prices).length, 'позиций');
        };
    }

    /**
     * Привязка колбэков представления
     */
    bindViewCallbacks() {
        this.view.onParamChanged = (key, value) => {
            this.onViewParamChanged(key, value);
        };
        
        this.view.onSaveClicked = (data) => {
            this.onSaveClicked(data);
        };
        
        this.view.onOrderClicked = (data) => {
            this.onOrderClicked(data);
        };
    }

    /**
     * Привязка колбэков рендерера
     */
    bindRendererCallbacks() {
        this.renderer.onRenderComplete = () => {
            console.log('3D рендеринг завершен');
        };
    }

    /**
     * Обработчик изменения параметра во View
     */
    onViewParamChanged(key, value) {
        // Обновляем модель
        this.model.updateParam(key, value);
        
        // Пересчитываем и обновляем
        this.calculateAndUpdate();
        
        // Обновляем 3D с дебаунсингом
        this.update3DModelDebounced();
    }

    /**
     * Обработчик изменения данных в Model
     */
    onModelDataChanged(key, value) {
        console.log(`Параметр "${key}" изменен на:`, value);
        
        // Здесь можно добавить дополнительную логику
        // например, валидацию или логирование
    }

    /**
     * Расчет и обновление всех представлений
     */
    calculateAndUpdate() {
        // 1. Расчет стоимости
        const calculation = this.model.calculateCost();
        
        // 2. Получение спецификации
        const specification = this.model.getSpecification();
        
        // 3. Обновление View
        this.view.renderSummary(calculation);
        this.view.updateSpecification(specification);
    }

    /**
     * Обновление 3D модели с дебаунсингом
     */
    update3DModelDebounced() {
        // Отменяем предыдущий таймер
        if (this.update3DTimeout) {
            clearTimeout(this.update3DTimeout);
        }
        
        // Устанавливаем новый таймер
        this.update3DTimeout = setTimeout(() => {
            const params = this.model.getParams();
            this.renderer.update(params);
        }, this.update3DDelay);
    }

    /**
     * Немедленное обновление 3D модели
     */
    update3DModelImmediately() {
        const params = this.model.getParams();
        this.renderer.update(params);
    }

    /**
     * Обработчик нажатия кнопки "Сохранить"
     */
    onSaveClicked(data) {
        try {
            if (this.storageManager) {
                const calculationData = this.getCurrentCalculationData();
                const name = prompt('Введите название для расчета:', `Навес ${calculationData.length}×${calculationData.width}м`);
                
                if (name !== null) {
                    const calcId = this.storageManager.saveCalculation(calculationData, name || undefined);
                    this.showNotification('✅ Расчет сохранен!', 'success');
                    console.log('Расчет сохранен:', calcId);
                }
            } else {
                // Fallback к старому методу
                const exportData = this.model.exportData();
                const key = 'canopy_calculation_' + Date.now();
                localStorage.setItem(key, JSON.stringify(exportData));
                alert('Расчет сохранен!');
                console.log('Расчет сохранен:', key);
            }
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            this.showNotification('❌ Ошибка при сохранении расчета', 'error');
        }
    }

    /**
     * Обработчик нажатия кнопки "Заказать"
     */
    onOrderClicked(data) {
        try {
            if (this.orderManager) {
                const calculationData = this.getCurrentCalculationData();
                const orderData = {
                    customerData: {},
                    calculationData: calculationData
                };
                const orderForm = this.orderManager.createOrderForm(orderData);
                document.body.appendChild(orderForm);
            } else {
                // Fallback
                console.log('Оформление заказа:', data);
                alert(`Заказ на сумму ${this.view.formatMoney(data.totalCost)}\n\nСкоро с вами свяжется менеджер.`);
            }
        } catch (error) {
            console.error('Ошибка при создании формы заказа:', error);
            this.showNotification('❌ Ошибка при открытии формы заказа', 'error');
        }
    }

    /**
     * Загрузка сохраненного расчета
     */
    loadCalculation(key) {
        try {
            const savedData = localStorage.getItem(key);
            if (savedData) {
                const data = JSON.parse(savedData);
                this.model.importData(data);
                
                // Обновляем все представления
                const params = this.model.getParams();
                this.view.renderForm(params);
                this.calculateAndUpdate();
                this.update3DModelImmediately();
                
                console.log('Расчет загружен:', key);
            }
        } catch (error) {
            console.error('Ошибка загрузки расчета:', error);
            this.view.showError('Не удалось загрузить расчет');
        }
    }

    /**
     * Получение списка сохраненных расчетов
     */
    getSavedCalculations() {
        const saved = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('canopy_calculation_')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    saved.push({
                        key: key,
                        timestamp: data.timestamp,
                        params: data.params
                    });
                } catch (error) {
                    console.error('Ошибка чтения сохраненного расчета:', key, error);
                }
            }
        }
        return saved.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    /**
     * Удаление сохраненного расчета
     */
    deleteCalculation(key) {
        try {
            localStorage.removeItem(key);
            console.log('Расчет удален:', key);
        } catch (error) {
            console.error('Ошибка удаления расчета:', error);
        }
    }

    /**
     * Сброс к дефолтным параметрам
     */
    resetToDefaults() {
        this.model.resetToDefaults();
        
        const params = this.model.getParams();
        this.view.renderForm(params);
        this.calculateAndUpdate();
        this.update3DModelImmediately();
        
        console.log('Параметры сброшены к дефолтным');
    }

    /**
     * Экспорт в PDF
     */
    async exportToPDF() {
        try {
            if (this.pdfExporter) {
                this.showNotification('⏳ Генерация PDF...', 'info');
                const calculationData = this.getCurrentCalculationData();
                const filename = `naves_${calculationData.length}x${calculationData.width}m_${Date.now()}.pdf`;
                
                await this.pdfExporter.exportToPDF(calculationData, filename);
                this.showNotification('✅ PDF успешно создан!', 'success');
            } else {
                // Fallback
                console.log('Экспорт в PDF...');
                alert('Функция экспорта в PDF будет реализована позже');
            }
        } catch (error) {
            console.error('Ошибка при экспорте PDF:', error);
            this.showNotification('❌ Ошибка при создании PDF', 'error');
        }
    }

    /**
     * Получение текущих данных
     */
    getCurrentData() {
        return {
            params: this.model.getParams(),
            calculation: this.model.calculateCost(),
            specification: this.model.getSpecification(),
            prices: this.model.prices
        };
    }
    
    /**
     * Получение данных расчета для сохранения/заказа
     */
    getCurrentCalculationData() {
        const params = this.model.getParams();
        const calculation = this.model.calculateCost();
        
        return {
            // Основные параметры (в метрах)
            length: params.length / 10,
            width: params.width / 10,
            height: params.height / 10,
            roofHeight: params.roofHeight / 10,
            area: (params.length * params.width / 100).toFixed(2),
            
            // Типы и материалы
            roofType: params.roofType,
            postType: params.postType,
            braceType: params.braceType,
            postMaterial: params.postMaterial,
            trussMaterial: params.trussMaterial,
            roofingMaterial: params.roofingMaterial,
            roofColor: params.roofColor,
            frameMaterial: params.frameMaterial,
            frameColoring: params.frameColoring,
            
            // Дополнительные параметры
            postSpacing: params.postSpacing / 10,
            frontBeamExtension: params.frontBeamExtension,
            backBeamExtension: params.backBeamExtension,
            mountingRequired: params.mountingRequired,
            distanceFromMKAD: params.distanceFromMKAD,
            
            // Итоговая стоимость
            totalPrice: this.view.formatMoney(calculation.total),
            timestamp: Date.now(),
            date: new Date().toLocaleString('ru-RU')
        };
    }
    
    /**
     * Загрузка сохраненного расчета по ID
     */
    loadSavedCalculation(calcId) {
        try {
            if (this.storageManager) {
                const calculationData = this.storageManager.loadCalculation(calcId);
                
                if (calculationData && calculationData.length) {
                    // Применяем сохраненные параметры (конвертируем обратно в дециметры)
                    this.model.updateParam('length', calculationData.length * 10);
                    this.model.updateParam('width', calculationData.width * 10);
                    this.model.updateParam('height', calculationData.height * 10);
                    this.model.updateParam('roofHeight', calculationData.roofHeight * 10);
                    this.model.updateParam('roofType', calculationData.roofType);
                    this.model.updateParam('postType', calculationData.postType);
                    this.model.updateParam('braceType', calculationData.braceType);
                    this.model.updateParam('postMaterial', calculationData.postMaterial);
                    this.model.updateParam('trussMaterial', calculationData.trussMaterial);
                    this.model.updateParam('roofingMaterial', calculationData.roofingMaterial);
                    this.model.updateParam('roofColor', calculationData.roofColor);
                    
                    // Обновляем все представления
                    const params = this.model.getParams();
                    this.view.renderForm(params);
                    this.calculateAndUpdate();
                    this.update3DModelImmediately();
                    
                    this.showNotification('✅ Расчет загружен!', 'success');
                } else {
                    this.showNotification('❌ Расчет не найден', 'error');
                }
            }
        } catch (error) {
            console.error('Ошибка при загрузке расчета:', error);
            this.showNotification('❌ Ошибка при загрузке расчета', 'error');
        }
    }
    
    /**
     * Удаление сохраненного расчета по ID
     */
    deleteSavedCalculation(calcId) {
        if (confirm('Вы уверены, что хотите удалить этот расчет?')) {
            try {
                if (this.storageManager) {
                    this.storageManager.deleteCalculation(calcId);
                    this.showNotification('✅ Расчет удален', 'success');
                }
            } catch (error) {
                console.error('Ошибка при удалении расчета:', error);
                this.showNotification('❌ Ошибка при удалении', 'error');
            }
        }
    }
    
    /**
     * Показ уведомлений
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            font-size: 14px;
            animation: slideIn 0.3s ease;
        `;
        
        // Добавляем стили анимации если еще нет
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(400px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(400px); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * Очистка ресурсов
     */
    dispose() {
        if (this.update3DTimeout) {
            clearTimeout(this.update3DTimeout);
        }
        
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        console.log('Presenter disposed');
    }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CanopyPresenter;
}

