/**
 * app_v2.js - Основной файл инициализации MVP (Version 2)
 * Предназначен для обхода кэширования и использования новой архитектуры
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 App V2: Инициализация приложения...');

    // Проверка зависимостей
    if (typeof THREE === 'undefined') {
        console.error('❌ Three.js not loaded!');
        return;
    }

    // Инициализация компонентов
    try {
        // 1. Модель (Данные)
        const model = new CanopyModel();
        console.log('✓ Model created');

        // 2. View (UI)
        const view = new CanopyView('#nc-form', '#nc-summary');
        console.log('✓ View created');

        // 3. Создаем 3D Renderer V3
        const renderer = new CanopyRendererV3('#nc-canvas');
        console.log('✓ Renderer V3 created');

        // 4. Создаем Presenter (связывает все компоненты)
        const presenter = new CanopyPresenter(model, view, renderer);
        console.log('✓ Presenter created');

        // Запускаем
        presenter.init();

        // Экспортируем для отладки и внешних скриптов
        window.CanopyApp = {
            model: model,
            view: view,
            renderer: renderer,
            presenter: presenter
        };

        console.log('✅ App V2: Ready!');
        // alert('DEBUG: App V2 & LogoManager Loaded Successfully!');

    } catch (error) {
        console.error('❌ Critical Error during App V2 Init:', error);
        alert('Critical Error: ' + error.message);
    }
});
