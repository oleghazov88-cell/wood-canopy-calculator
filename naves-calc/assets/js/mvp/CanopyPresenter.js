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
            const exportData = this.model.exportData();
            
            // Сохранение в localStorage
            const key = 'canopy_calculation_' + Date.now();
            localStorage.setItem(key, JSON.stringify(exportData));
            
            alert('Расчет сохранен!');
            console.log('Расчет сохранен:', key);
            
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            this.view.showError('Не удалось сохранить расчет');
        }
    }

    /**
     * Обработчик нажатия кнопки "Заказать"
     */
    onOrderClicked(data) {
        console.log('Оформление заказа:', data);
        
        // Здесь можно открыть модальное окно заказа
        // или перенаправить на страницу оформления
        
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
     * Экспорт в PDF (заглушка)
     */
    exportToPDF() {
        console.log('Экспорт в PDF...');
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

