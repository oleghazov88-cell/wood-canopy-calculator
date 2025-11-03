# Калькулятор навесов - Автономная версия

Модульный калькулятор для расчета стоимости деревянных навесов с 3D визуализацией.

## Структура файлов

```
/naves-calc/
├── index.html                      # Главная страница
├── assets/
│   ├── css/
│   │   └── naves-calc.css          # Стили калькулятора
│   └── js/
│       └── naves-calc.bundle.js    # JavaScript модуль
├── upload/
│   └── naves/
│       └── prices.json             # Файл с ценами
└── README.md                       # Документация
```

## Быстрый старт

1. **Загрузите папку** `/naves-calc/` на ваш сервер
2. **Откройте** `http://your-domain.com/naves-calc/`
3. **Готово!** Калькулятор работает автономно

## Интеграция в CMS

### WordPress
```php
// В теме или плагине
wp_enqueue_style('naves-calc', '/naves-calc/assets/css/naves-calc.css');
wp_enqueue_script('naves-calc', '/naves-calc/assets/js/naves-calc.bundle.js', [], '1.0', true);

// В шаблоне
echo '<div class="naves-calc">
    <section id="nc-form"></section>
    <section class="naves-calc__view">
        <canvas id="nc-canvas"></canvas>
        <div id="nc-summary"></div>
    </section>
</div>';

echo '<script>
    window.addEventListener("DOMContentLoaded", () => {
        window.NavesCalc.init("#nc-form", "#nc-canvas", "#nc-summary");
    });
</script>';
```

### Bitrix
```php
// В компоненте или шаблоне
$this->addExternalCss('/naves-calc/assets/css/naves-calc.css');
$this->addExternalJs('/naves-calc/assets/js/naves-calc.bundle.js');
?>

<div class="naves-calc">
    <section id="nc-form"></section>
    <section class="naves-calc__view">
        <canvas id="nc-canvas"></canvas>
        <div id="nc-summary"></div>
    </section>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
    window.NavesCalc.init('#nc-form', '#nc-canvas', '#nc-summary');
});
</script>
```

### Другие CMS
Просто подключите CSS и JS файлы, добавьте HTML разметку и инициализируйте модуль.

## API

### Инициализация
```javascript
window.NavesCalc.init(formSelector, canvasSelector, summarySelector)
```

**Параметры:**
- `formSelector` - селектор для контейнера формы
- `canvasSelector` - селектор для canvas 3D модели  
- `summarySelector` - селектор для контейнера сводки

### Методы
```javascript
// Обновить параметр
window.NavesCalc.updateParam('length', 12.0);

// Пересчитать стоимость
window.NavesCalc.calculate();

// Обновить 3D модель
window.NavesCalc.update3DModel();

// Получить текущие параметры
const params = window.NavesCalc.params;

// Получить цены
const prices = window.NavesCalc.prices;
```

## Настройка цен

Отредактируйте файл `/upload/naves/prices.json`:

```json
{
  "post_glued_150x150": {
    "name": "Клееный брус 150×150 мм",
    "price": 1500,
    "unit": "м.п.",
    "currency": "RUB"
  }
}
```

## Кастомизация стилей

Все стили используют CSS переменные для легкой настройки:

```css
:root {
    --nc-primary: #20B5B9;        /* Основной цвет */
    --nc-secondary: #FF6B6B;      /* Дополнительный цвет */
    --nc-padding: 35px;           /* Отступы */
    --nc-radius: 20px;            /* Радиус скругления */
}
```

## Зависимости

- **Three.js** - автоматически загружается с CDN
- **OrbitControls** - автоматически загружается с CDN

## Совместимость

- ✅ Chrome 70+
- ✅ Firefox 65+
- ✅ Safari 12+
- ✅ Edge 79+
- ✅ Мобильные браузеры

## Размер файлов

- `naves-calc.css` - ~15KB
- `naves-calc.bundle.js` - ~25KB  
- `prices.json` - ~2KB
- **Общий размер: ~42KB**

## Производительность

- Инициализация: ~200ms
- 3D рендеринг: 60 FPS
- Расчеты: <10ms

## Поддержка

Для вопросов и предложений создавайте issues в репозитории проекта.

## Лицензия

MIT License




