/**
 * CanopyPresenterAdapter - Презентер для MVP Adapter архитектуры
 * 
 * Координирует:
 * - Model (расчеты и данные)
 * - View (UI и события)  
 * - 3DRendererAdapter (обертка вокруг оригинального калькулятора)
 */

class CanopyPresenterAdapter {
    constructor(model, view, rendererAdapter) {
        this.model = model;
        this.view = view;
        this.renderer = rendererAdapter;
        
        // Дебаунсинг
        this.update3DTimeout = null;
        this.update3DDelay = 300; // мс
        
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
            console.log('=== Инициализация MVP Adapter ===');
            
            // 1. Загрузка цен
            this.view.showLoading();
            await this.model.loadPrices();
            
            // 2. Рендеринг формы
            const params = this.model.getParams();
            this.view.renderForm(params);
            
            // 3. Первый расчет
            this.calculateAndUpdate();
            
            // 4. Проверяем что 3D готов (оригинальный калькулятор уже инициализирован)
            await this.renderer.init();
            
            // 5. Обновляем 3D с текущими параметрами
            await this.renderer.update(params);
            
            this.view.hideLoading();
            console.log('✅ MVP Adapter готов');
            
        } catch (error) {
            console.error('❌ Ошибка инициализации MVP Adapter:', error);
            this.view.showError('Не удалось инициализировать калькулятор: ' + error.message);
        }
    }

    /**
     * Привязка колбэков модели
     */
    bindModelCallbacks() {
        this.model.onDataChanged = (key, value) => {
            console.log(`📊 Параметр "${key}" изменен на:`, value);
        };
        
        this.model.onPricesLoaded = (prices) => {
            console.log('💰 Цены загружены:', Object.keys(prices).length, 'позиций');
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
            console.log('🎨 3D рендеринг завершен');
        };
        
        this.renderer.onLoadingStart = () => {
            console.log('⏳ Начало рендеринга 3D...');
        };
        
        this.renderer.onLoadingEnd = () => {
            console.log('✅ Рендеринг 3D завершен');
        };
    }

    /**
     * Обработчик изменения параметра во View
     */
    onViewParamChanged(key, value) {
        // 1. Обновляем модель
        this.model.updateParam(key, value);
        
        // 2. Пересчитываем и обновляем UI
        this.calculateAndUpdate();
        
        // 3. Обновляем 3D с дебаунсингом
        this.update3DModelDebounced();
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
        if (this.update3DTimeout) {
            clearTimeout(this.update3DTimeout);
        }
        
        this.update3DTimeout = setTimeout(() => {
            const params = this.model.getParams();
            this.renderer.updateDebounced(params);
        }, this.update3DDelay);
    }

    /**
     * Немедленное обновление 3D модели
     */
    async update3DModelImmediately() {
        const params = this.model.getParams();
        await this.renderer.update(params);
    }

    /**
     * Обработчик нажатия кнопки "Сохранить"
     */
    onSaveClicked(data) {
        try {
            const exportData = this.model.exportData();
            const key = 'canopy_calculation_' + Date.now();
            localStorage.setItem(key, JSON.stringify(exportData));
            
            alert('Расчет сохранен!');
            console.log('💾 Расчет сохранен:', key);
            
        } catch (error) {
            console.error('❌ Ошибка сохранения:', error);
            this.view.showError('Не удалось сохранить расчет');
        }
    }

    /**
     * Обработчик нажатия кнопки "Заказать"
     */
    onOrderClicked(data) {
        console.log('📦 Оформление заказа:', data);
        alert(`Заказ на сумму ${this.view.formatMoney(data.totalCost)}\n\nСкоро с вами свяжется менеджер.`);
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
                
                const params = this.model.getParams();
                this.view.renderForm(params);
                this.calculateAndUpdate();
                this.update3DModelImmediately();
                
                console.log('📂 Расчет загружен:', key);
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки расчета:', error);
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
                    console.error('❌ Ошибка чтения сохраненного расчета:', key, error);
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
            console.log('🗑️ Расчет удален:', key);
        } catch (error) {
            console.error('❌ Ошибка удаления расчета:', error);
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
        
        console.log('🔄 Параметры сброшены к дефолтным');
    }

    /**
     * Экспорт в PDF
     */
    exportToPDF() {
        console.log('📄 Экспорт в PDF...');
        alert('Функция экспорта в PDF будет реализована позже');
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
     * Установка уровня качества 3D
     */
    setQualityLevel(level) {
        this.renderer.setQualityLevel(level);
        console.log(`🎨 Уровень качества изменен на: ${level}`);
    }

    /**
     * Получение статистики производительности
     */
    getPerformanceStats() {
        return this.renderer.getPerformanceStats();
    }

    /**
     * Прямой доступ к оригинальному калькулятору
     */
    getOriginalCalculator() {
        return this.renderer.getCalculator();
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
        
        console.log('🧹 Presenter disposed');
    }
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CanopyPresenterAdapter;
}

