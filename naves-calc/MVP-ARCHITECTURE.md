# MVP Архитектура Калькулятора Навесов

## 🎯 Обзор

Калькулятор навесов полностью переписан с использованием паттерна **MVP (Model-View-Presenter)**.

### ✅ Преимущества новой архитектуры:

- **Разделение ответственности** - каждый компонент отвечает за свою задачу
- **Тестируемость** - компоненты можно тестировать изолированно
- **Поддерживаемость** - легко вносить изменения без риска сломать другие части
- **Масштабируемость** - просто добавлять новые функции
- **Переиспользуемость** - компоненты можно использовать в других проектах

---

## 📁 Структура файлов

```
/naves-calc/
├── assets/
│   └── js/
│       └── mvp/
│           ├── CanopyModel.js        # Модель данных
│           ├── CanopyView.js         # Представление (UI)
│           ├── Canopy3DRenderer.js   # 3D рендеринг
│           ├── CanopyPresenter.js    # Координатор
│           └── app.js                # Точка входа
├── index.html                         # Главная страница
└── MVP-ARCHITECTURE.md                # Эта документация
```

---

## 🏗️ Компоненты MVP

### 1️⃣ **CanopyModel** (Модель)

**Файл:** `assets/js/mvp/CanopyModel.js`

**Отвечает за:**
- Хранение параметров навеса (`params`)
- Хранение цен (`prices`)
- Загрузку данных из JSON
- Бизнес-логику расчетов
- Валидацию данных
- Экспорт/импорт данных

**Основные методы:**
```javascript
// Загрузка цен
await model.loadPrices()

// Обновление параметра
model.updateParam('length', 120)

// Расчет стоимости
const calculation = model.calculateCost()

// Получение спецификации
const spec = model.getSpecification()

// Экспорт данных
const data = model.exportData()
```

**Колбэки:**
- `onDataChanged(key, value)` - вызывается при изменении данных
- `onPricesLoaded(prices)` - вызывается после загрузки цен

---

### 2️⃣ **CanopyView** (Представление)

**Файл:** `assets/js/mvp/CanopyView.js`

**Отвечает за:**
- Рендеринг формы с элементами управления
- Отображение результатов расчетов
- Обновление спецификации
- Обработку UI событий (клики, изменения)
- Форматирование данных для отображения

**Основные методы:**
```javascript
// Рендеринг формы
view.renderForm(params)

// Отображение сводки
view.renderSummary(calculation)

// Обновление спецификации
view.updateSpecification(spec)

// Форматирование денег
view.formatMoney(totalCost)
```

**Колбэки:**
- `onParamChanged(key, value)` - передает изменения в Presenter
- `onSaveClicked(data)` - обработка сохранения
- `onOrderClicked(data)` - обработка заказа

---

### 3️⃣ **Canopy3DRenderer** (3D Рендеринг)

**Файл:** `assets/js/mvp/Canopy3DRenderer.js`

**Отвечает за:**
- Инициализацию Three.js сцены
- Создание 3D модели навеса
- Рендеринг и анимацию
- Управление камерой и освещением
- Оптимизацию производительности

**Основные методы:**
```javascript
// Инициализация 3D
await renderer.init()

// Обновление модели
renderer.update(params)

// Очистка ресурсов
renderer.dispose()
```

**Особенности:**
- Автоматическая загрузка Three.js из CDN
- Дебаунсинг для плавности
- Оптимизированные настройки рендеринга
- Адаптивность к размеру экрана

---

### 4️⃣ **CanopyPresenter** (Координатор)

**Файл:** `assets/js/mvp/CanopyPresenter.js`

**Отвечает за:**
- Связь между Model, View и Renderer
- Управление жизненным циклом приложения
- Обработку бизнес-логики
- Синхронизацию данных
- Управление состоянием

**Основные методы:**
```javascript
// Инициализация приложения
await presenter.init()

// Получение текущих данных
const data = presenter.getCurrentData()

// Сброс к дефолтным значениям
presenter.resetToDefaults()

// Сохранение расчета
presenter.onSaveClicked(data)

// Загрузка расчета
presenter.loadCalculation(key)
```

---

## 🔄 Поток данных (Data Flow)

```
┌──────────────────────────────────────────────────────────────┐
│                         USER ACTION                          │
│         (изменяет слайдер, выбирает опцию)                  │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    CanopyView                                │
│  - Ловит событие UI                                          │
│  - Вызывает onParamChanged(key, value)                      │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  CanopyPresenter                             │
│  - Получает событие от View                                  │
│  - Обновляет Model                                           │
│  - Запускает пересчет                                        │
└───────────────────────────┬─────────────────────────────────┘
                            │
                 ┌──────────┴──────────┐
                 ▼                     ▼
┌────────────────────────┐  ┌────────────────────────┐
│    CanopyModel         │  │  Canopy3DRenderer      │
│  - Обновляет params    │  │  - Обновляет 3D модель │
│  - Выполняет расчеты   │  │  - Рендерит сцену      │
└────────────┬───────────┘  └────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                  CanopyPresenter                             │
│  - Получает результаты расчета                              │
│  - Обновляет View                                            │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    CanopyView                                │
│  - Обновляет отображение цены                               │
│  - Обновляет спецификацию                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Использование

### Базовая инициализация

```javascript
// Автоматическая инициализация при загрузке страницы
// Происходит в app.js

// Доступ к приложению через глобальный объект
window.CanopyApp
```

### API для работы с приложением

```javascript
// Получить текущие данные
const data = window.CanopyApp.getCurrentData()

// Сбросить к дефолтным параметрам
window.CanopyApp.reset()

// Сохранить расчет
window.CanopyApp.save()

// Загрузить расчет
window.CanopyApp.load('canopy_calculation_1234567890')

// Получить список сохраненных расчетов
const saved = window.CanopyApp.getSaved()

// Экспорт в PDF
window.CanopyApp.exportPDF()
```

### Прямой доступ к компонентам

```javascript
// Model
window.CanopyApp.model.updateParam('length', 150)
window.CanopyApp.model.calculateCost()

// View
window.CanopyApp.view.renderForm(params)

// Renderer
window.CanopyApp.renderer.update(params)

// Presenter
window.CanopyApp.presenter.resetToDefaults()
```

---

## 🔌 Расширение функциональности

### Добавление нового параметра

**1. В Model (`CanopyModel.js`):**
```javascript
defaultParams: {
    // ... существующие параметры
    newParameter: 100 // новый параметр
}
```

**2. В View (`CanopyView.js`):**
```html
<div class="nc-field">
    <label class="nc-field__label">Новый параметр</label>
    <input type="range" id="newParameter" value="${params.newParameter}">
</div>
```

**3. Использование:**
```javascript
// Автоматически будет обрабатываться через Presenter
```

### Добавление нового расчета

**В Model:**
```javascript
calculateNewMetric() {
    // ваша логика
    return result;
}
```

**В Presenter:**
```javascript
calculateAndUpdate() {
    const calculation = this.model.calculateCost();
    const newMetric = this.model.calculateNewMetric(); // добавить
    
    this.view.renderSummary(calculation);
}
```

---

## 📊 Сравнение: Старая vs Новая архитектура

| Аспект | Старая (Monolithic) | Новая (MVP) |
|--------|---------------------|-------------|
| **Файлов** | 1 большой (3732 строки) | 5 модульных (≈1500 строк) |
| **Тестируемость** | ❌ Низкая | ✅ Высокая |
| **Поддерживаемость** | ❌ Сложная | ✅ Простая |
| **Разделение ответственности** | ❌ Нет | ✅ Есть |
| **Повторное использование** | ❌ Невозможно | ✅ Легко |
| **Расширяемость** | ⚠️ Сложная | ✅ Простая |
| **Читаемость кода** | ⚠️ Средняя | ✅ Высокая |

---

## 🔧 Отладка

### Логирование

Все компоненты выводят информацию в консоль:

```javascript
// Model
console.log('Параметр "length" изменен на:', value)

// View  
console.log('Форма отрендерена')

// Renderer
console.log('3D модель обновлена')

// Presenter
console.log('Расчет завершен')
```

### Инспекция состояния

```javascript
// Текущие параметры
console.log(window.CanopyApp.model.getParams())

// Результат расчета
console.log(window.CanopyApp.model.calculateCost())

// Спецификация
console.log(window.CanopyApp.model.getSpecification())
```

---

## 📦 Восстановление старой версии

Если нужно вернуться к старой версии:

```html
<!-- В index.html замените: -->

<!-- Новая версия (MVP) -->
<script src="/naves-calc/assets/js/mvp/CanopyModel.js"></script>
<script src="/naves-calc/assets/js/mvp/CanopyView.js"></script>
<script src="/naves-calc/assets/js/mvp/Canopy3DRenderer.js"></script>
<script src="/naves-calc/assets/js/mvp/CanopyPresenter.js"></script>
<script src="/naves-calc/assets/js/mvp/app.js"></script>

<!-- На старую версию: -->
<script src="/naves-calc/assets/js/naves-calc.bundle.BACKUP.js"></script>
<script>
    window.addEventListener('DOMContentLoaded', () => {
        window.NavesCalc.init('#nc-form', '#nc-canvas', '#nc-summary');
    });
</script>
```

---

## 🎓 Обучение

### Рекомендуемый порядок изучения:

1. **CanopyModel.js** - начните с понимания данных и расчетов
2. **CanopyView.js** - изучите как данные отображаются
3. **CanopyPresenter.js** - поймите как компоненты связаны
4. **Canopy3DRenderer.js** - углубитесь в 3D визуализацию
5. **app.js** - посмотрите точку входа

### Дополнительные ресурсы:

- [MVP Pattern Explained](https://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93presenter)
- [Three.js Documentation](https://threejs.org/docs/)
- [JavaScript Design Patterns](https://www.patterns.dev/)

---

## 📝 Changelog

### Version 2.0.0-MVP (30.10.2025)

- ✨ Полная переработка на MVP архитектуру
- 📦 Разделение на 5 модулей
- 🧪 Улучшенная тестируемость
- 🔧 Упрощенное расширение функциональности
- 📚 Добавлена документация

### Version 1.0.0 (Предыдущая)

- Монолитная архитектура
- Один файл `naves-calc.bundle.js`
- God Object паттерн

---

## 👥 Авторы

- **Рефакторинг в MVP:** Claude AI (30.10.2025)
- **Оригинальная версия:** Предыдущая команда разработки

---

## 📄 Лицензия

MIT License

---

**Версия документации:** 1.0.0  
**Дата:** 30 октября 2025

