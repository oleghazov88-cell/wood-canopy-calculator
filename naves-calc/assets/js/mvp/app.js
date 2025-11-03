/**
 * Главный файл приложения - Точка входа для MVP архитектуры
 * 
 * Инициализирует и связывает компоненты:
 * - CanopyModel (Модель данных)
 * - CanopyView (Представление)
 * - Canopy3DRenderer (3D рендеринг)
 * - CanopyPresenter (Координатор)
 */

(function() {
    'use strict';
    
    /**
     * Инициализация приложения после загрузки DOM
     */
    async function initApp() {
        try {
            console.log('=== Инициализация MVP архитектуры ===');
            
            // 1. Создаем Model
            const model = new CanopyModel();
            console.log('✓ Model создан');
            
            // 2. Создаем View
            const view = new CanopyView('#nc-form', '#nc-summary');
            console.log('✓ View создан');
            
            // 3. Создаем 3D Renderer
            const renderer = new Canopy3DRenderer('#nc-canvas');
            console.log('✓ 3D Renderer создан');
            
            // 4. Создаем Presenter (связывает все компоненты)
            const presenter = new CanopyPresenter(model, view, renderer);
            console.log('✓ Presenter создан');
            
            // 5. Инициализируем приложение
            await presenter.init();
            console.log('✓ Приложение инициализировано');
            
            // 6. Экспортируем presenter в глобальное пространство для доступа извне
            window.CanopyApp = {
                presenter: presenter,
                model: model,
                view: view,
                renderer: renderer,
                
                // Публичные методы API
                getCurrentData: () => presenter.getCurrentData(),
                reset: () => presenter.resetToDefaults(),
                save: () => presenter.onSaveClicked(model.calculateCost()),
                load: (key) => presenter.loadCalculation(key),
                getSaved: () => presenter.getSavedCalculations(),
                exportPDF: () => presenter.exportToPDF(),
                
                // Информация
                version: '2.0.0-MVP',
                architecture: 'Model-View-Presenter'
            };
            
            console.log('=== Приложение готово к работе ===');
            console.log('Доступ через window.CanopyApp');
            
        } catch (error) {
            console.error('Критическая ошибка при инициализации приложения:', error);
            alert('Не удалось загрузить калькулятор. Пожалуйста, обновите страницу.');
        }
    }
    
    // Запуск после загрузки DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }
    
})();

