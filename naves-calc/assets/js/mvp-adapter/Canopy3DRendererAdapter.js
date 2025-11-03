/**
 * Canopy3DRendererAdapter - Адаптер для существующего 3D рендерера
 * 
 * Оборачивает оригинальный NavesCalculator и предоставляет MVP интерфейс
 * Сохраняет 100% функционала Three.js включая:
 * - Все типы столбов (var-1 до var-6)
 * - Все типы раскосов с GLB моделями  
 * - Все типы крыш и материалов
 * - Всю оптимизацию и кэширование
 */

class Canopy3DRendererAdapter {
    constructor(calculator) {
        // Храним ссылку на оригинальный калькулятор
        this.calculator = calculator;
        
        // Флаги
        this.isInitialized = false;
        
        // Колбэки для Presenter
        this.onRenderComplete = null;
        this.onLoadingStart = null;
        this.onLoadingEnd = null;
    }

    /**
     * Инициализация (делегируем оригиналу)
     */
    async init() {
        // Оригинальный калькулятор уже инициализирован через init()
        // Просто проверяем что 3D сцена готова
        if (this.calculator.scene && this.calculator.camera && this.calculator.renderer) {
            this.isInitialized = true;
            console.log('✅ 3D Renderer Adapter инициализирован');
            return Promise.resolve();
        } else {
            // Если еще не инициализирован, ждем
            return new Promise((resolve) => {
                const checkInit = setInterval(() => {
                    if (this.calculator.scene) {
                        this.isInitialized = true;
                        clearInterval(checkInit);
                        console.log('✅ 3D Renderer Adapter инициализирован (отложенно)');
                        resolve();
                    }
                }, 100);
            });
        }
    }

    /**
     * Обновление 3D модели с новыми параметрами
     */
    async update(params) {
        if (!this.isInitialized) {
            console.warn('⚠️ Renderer не инициализирован');
            return;
        }

        if (this.onLoadingStart) {
            this.onLoadingStart();
        }

        // Обновляем параметры в оригинальном калькуляторе
        Object.keys(params).forEach(key => {
            this.calculator.params[key] = params[key];
        });

        // Обновляем currentPostSpacing если изменился postSpacing
        if (params.postSpacing) {
            this.calculator.currentPostSpacing = params.postSpacing / 10;
        }

        // Вызываем обновление 3D модели
        await this.calculator.update3DModel();

        if (this.onLoadingEnd) {
            this.onLoadingEnd();
        }

        if (this.onRenderComplete) {
            this.onRenderComplete();
        }
    }

    /**
     * Обновление с дебаунсингом
     */
    updateDebounced(params) {
        // Используем встроенный дебаунсинг оригинального калькулятора
        Object.keys(params).forEach(key => {
            this.calculator.params[key] = params[key];
        });
        
        if (params.postSpacing) {
            this.calculator.currentPostSpacing = params.postSpacing / 10;
        }
        
        this.calculator.update3DModelDebounced();
    }

    /**
     * Получение текущей сцены Three.js
     */
    getScene() {
        return this.calculator.scene;
    }

    /**
     * Получение камеры
     */
    getCamera() {
        return this.calculator.camera;
    }

    /**
     * Получение рендерера
     */
    getRenderer() {
        return this.calculator.renderer;
    }

    /**
     * Получение контролов
     */
    getControls() {
        return this.calculator.controls;
    }

    /**
     * Получение группы навеса
     */
    getCanopyGroup() {
        return this.calculator.canopyGroup;
    }

    /**
     * Установка уровня качества
     */
    setQualityLevel(level) {
        if (this.calculator.setQualityLevel) {
            this.calculator.setQualityLevel(level);
        }
    }

    /**
     * Получение статистики производительности
     */
    getPerformanceStats() {
        if (this.calculator.getPerformanceStats) {
            return this.calculator.getPerformanceStats();
        }
        return null;
    }

    /**
     * Очистка кэша
     */
    clearCache() {
        if (this.calculator.clearCache) {
            this.calculator.clearCache();
        }
    }

    /**
     * Очистка ресурсов
     */
    dispose() {
        // Оригинальный калькулятор остается, просто отключаем колбэки
        this.onRenderComplete = null;
        this.onLoadingStart = null;
        this.onLoadingEnd = null;
        
        console.log('3D Renderer Adapter disposed');
    }

    /**
     * Прямой доступ к оригинальному калькулятору (для расширенных возможностей)
     */
    getCalculator() {
        return this.calculator;
    }
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Canopy3DRendererAdapter;
}

