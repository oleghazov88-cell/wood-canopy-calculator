/**
 * MVP Adapter - Точка входа приложения
 * 
 * Использует Adapter Pattern для оборачивания существующего
 * NavesCalculator в MVP интерфейс.
 * 
 * Преимущества:
 * - Сохраняет 100% функционала Three.js
 * - Предоставляет чистый MVP интерфейс
 * - Позволяет постепенный рефакторинг
 */

(function() {
    'use strict';
    
    /**
     * Инициализация MVP Adapter приложения
     */
    async function initMVPAdapter() {
        try {
            console.log('=== Инициализация MVP Adapter архитектуры ===');
            
            // Ждем инициализации оригинального калькулятора
            await waitForCalculator();
            
            // 1. Получаем ссылку на оригинальный калькулятор
            const originalCalculator = window.NavesCalc;
            console.log('✓ Оригинальный калькулятор найден');
            
            // 2. Создаем Model (используем из mvp/)
            const model = new CanopyModel();
            console.log('✓ Model создан');
            
            // 3. Создаем View (используем из mvp/)
            const view = new CanopyView('#nc-form', '#nc-summary');
            console.log('✓ View создан');
            
            // 4. Создаем 3D Renderer Adapter (обертка вокруг оригинала)
            const rendererAdapter = new Canopy3DRendererAdapter(originalCalculator);
            console.log('✓ 3D Renderer Adapter создан');
            
            // 5. Создаем Presenter (координирует все компоненты)
            const presenter = new CanopyPresenterAdapter(model, view, rendererAdapter);
            console.log('✓ Presenter создан');
            
            // 6. Инициализируем приложение
            await presenter.init();
            console.log('✓ Приложение инициализировано');
            
            // 7. Экспортируем в глобальное пространство
            window.CanopyApp = {
                presenter: presenter,
                model: model,
                view: view,
                renderer: rendererAdapter,
                originalCalculator: originalCalculator, // Доступ к оригиналу
                
                // Публичные методы API
                getCurrentData: () => presenter.getCurrentData(),
                reset: () => presenter.resetToDefaults(),
                save: () => presenter.onSaveClicked(model.calculateCost()),
                load: (key) => presenter.loadCalculation(key),
                getSaved: () => presenter.getSavedCalculations(),
                exportPDF: () => presenter.exportToPDF(),
                setQuality: (level) => presenter.setQualityLevel(level),
                getStats: () => presenter.getPerformanceStats(),
                
                // Информация
                version: '2.0.0-MVP-Adapter',
                architecture: 'Model-View-Presenter (Adapter Pattern)',
                description: 'MVP обертка вокруг оригинального NavesCalculator'
            };
            
            console.log('=== MVP Adapter готов к работе ===');
            console.log('Доступ через window.CanopyApp');
            console.log('Оригинальный калькулятор доступен через window.CanopyApp.originalCalculator');
            
        } catch (error) {
            console.error('❌ Критическая ошибка при инициализации MVP Adapter:', error);
            alert('Не удалось загрузить калькулятор. Пожалуйста, обновите страницу.');
        }
    }
    
    /**
     * Ждем инициализации оригинального калькулятора
     */
    function waitForCalculator() {
        return new Promise((resolve) => {
            if (window.NavesCalc && window.NavesCalc.scene) {
                resolve();
            } else {
                console.log('⏳ Ждем инициализации оригинального калькулятора...');
                const checkInterval = setInterval(() => {
                    if (window.NavesCalc && window.NavesCalc.scene) {
                        clearInterval(checkInterval);
                        console.log('✓ Оригинальный калькулятор инициализирован');
                        resolve();
                    }
                }, 100);
            }
        });
    }
    
    // Запуск после загрузки DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // Даем время оригинальному калькулятору инициализироваться
            setTimeout(initMVPAdapter, 1500);
        });
    } else {
        setTimeout(initMVPAdapter, 1500);
    }
    
})();

