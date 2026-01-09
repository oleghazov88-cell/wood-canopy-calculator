# Руководство по использованию RoofSystem

## Быстрый старт

```javascript
// В Canopy3DRenderer.js

import { RoofSystem } from './RoofSystem.js';

class Canopy3DRenderer {
    constructor() {
        // ... существующий код ...
        this.roofSystem = null;
    }
    
    async init() {
        // ... инициализация сцены ...
        
        // Создаем систему кровли
        this.roofSystem = new RoofSystem(this.scene, this.canopyGroup);
    }
    
    createRoofCovering(length, width, height, roofHeight, roofingMaterial, 
                       frontExtension, backExtension, roofType, roofColor) {
        
        // Вычисляем базовую высоту кровли
        const beamDimensions = this.getBeamDimensions(this.params.postMaterial, this.params.postType);
        const trussDimensions = this.getTrussDimensions(this.params.trussMaterial);
        const baseHeight = height + beamDimensions.height + 
                          beamDimensions.height / 2 + trussDimensions.height;
        
        // Обновляем параметры кровли
        this.roofSystem.update({
            length: length + frontExtension + backExtension,
            width: width,
            height: height,
            roofHeight: roofHeight,
            roofType: roofType,
            roofingMaterial: roofingMaterial,
            roofColor: roofColor,
            overhang: 0.1, // 100мм
            baseHeight: baseHeight
        });
    }
}
```

## Параметры

### Основные параметры

```javascript
{
    length: 11.0,              // Длина навеса (м)
    width: 6.0,                // Ширина навеса (м)
    height: 3.0,               // Высота столбов (м)
    roofHeight: 1.5,          // Высота подъема кровли (м)
    roofType: 'var-2',         // 'var-1' односкатная, 'var-2'/'var-3' двускатная
    roofingMaterial: 'metal-grandline', // Тип материала
    roofColor: 'amber',        // Цвет кровли
    overhang: 0.1,            // Свесы по краям (м)
    baseHeight: 0             // Высота основания кровли (м)
}
```

### Типы материалов

1. **`shinglas-sonata`** - Гибкая черепица Shinglas Финская Соната
   - Толщина: 3мм
   - Текстура: Имитация черепицы
   - Цвета: amber, blue, green, red, gray

2. **`metal-grandline`** - Металлочерепица Grand Line 0.45мм
   - Толщина: 0.45мм
   - Текстура: Профиль металлочерепицы + нормальная карта
   - Снегозадержатели: Автоматически добавляются
   - Цвета: amber, blue, green, red, gray

3. **`profiled-gl35r`** - Профнастил GL 35R
   - Толщина: 0.5мм
   - Текстура: Профиль профнастила
   - Цвета: amber, blue, green, red, gray

4. **`polycarbonate-8mm`** - Поликарбонат монолитный 8мм
   - Толщина: 8мм
   - Прозрачность: 55%
   - Специальный материал: MeshPhysicalMaterial с transmission

## Элементы кровли

### 1. Основные скаты
- Автоматически создаются в зависимости от `roofType`
- Правильные UV координаты для текстур
- Толщина зависит от материала

### 2. Конёк (Ridge)
- Создается только для двускатных крыш (`var-2`, `var-3`)
- Размеры зависят от материала:
  - Металлочерепица/Профнастил: 150мм ширина
  - Мягкая черепица: 250мм ширина
  - Поликарбонат: 60мм ширина (H-планка)

### 3. Торцевые планки (Verge Trims)
- Устанавливаются на торцах скатов
- Размер: 100мм × 50мм
- Материал соответствует кровле

### 4. Карнизы/Свесы (Eaves)
- Передний и задний свесы
- Высота: 50мм
- Материал: Дерево (коричневый)

### 5. Снегозадержатели
- Автоматически добавляются для `metal-grandline`
- Расстояние между рядами: 80см
- Длина: 30см, высота: 5см

## Интеграция с GUI (dat.GUI)

```javascript
import { GUI } from 'https://cdn.jsdelivr.net/npm/three@0.150.0/examples/jsm/libs/lil-gui.module.min.js';

function setupRoofGUI(roofSystem) {
    const gui = new GUI();
    const roofFolder = gui.addFolder('Кровля');
    
    const params = {
        length: 11.0,
        width: 6.0,
        roofHeight: 1.5,
        roofType: 'var-2',
        roofingMaterial: 'metal-grandline',
        roofColor: 'amber',
        overhang: 0.1
    };
    
    roofFolder.add(params, 'length', 3, 20).onChange(() => updateRoof());
    roofFolder.add(params, 'width', 3, 12).onChange(() => updateRoof());
    roofFolder.add(params, 'roofHeight', 0.5, 3).onChange(() => updateRoof());
    roofFolder.add(params, 'roofType', ['var-1', 'var-2', 'var-3']).onChange(() => updateRoof());
    roofFolder.add(params, 'roofingMaterial', [
        'shinglas-sonata',
        'metal-grandline',
        'profiled-gl35r',
        'polycarbonate-8mm'
    ]).onChange(() => updateRoof());
    roofFolder.add(params, 'roofColor', ['amber', 'blue', 'green', 'red', 'gray']).onChange(() => updateRoof());
    roofFolder.add(params, 'overhang', 0, 0.3).onChange(() => updateRoof());
    
    function updateRoof() {
        roofSystem.update(params);
    }
}
```

## Производительность

### Кэширование
- Материалы кэшируются по ключу `material-color`
- Текстуры кэшируются по размеру
- Повторное использование без пересоздания

### Оптимизация геометрии
- Количество сегментов зависит от размера кровли
- Минимум 20 сегментов для плавности
- Автоматический расчет оптимального количества

### Очистка памяти
```javascript
// При обновлении кровли
roofSystem.dispose(); // Удаляет старую геометрию
roofSystem.update(newParams); // Создает новую
```

## Расширение функциональности

### Добавление нового материала

```javascript
// В RoofSystem.js

getMaterial(materialType, color) {
    // ... существующие материалы ...
    
    case 'new-material':
        material = this.createNewMaterial(color);
        break;
}

createNewMaterial(color) {
    const texture = this.createNewMaterialTexture();
    
    return new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        map: texture,
        roughness: 0.5,
        metalness: 0.0
    });
}
```

### Кастомные текстуры

```javascript
// Загрузка внешней текстуры
const textureLoader = new THREE.TextureLoader();
const texture = textureLoader.load('path/to/texture.jpg');
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.RepeatWrapping;
texture.repeat.set(5, 5);

// Использование в материале
material.map = texture;
```

## Отладка

### Визуализация нормалей
```javascript
const helper = new THREE.VertexNormalsHelper(mesh, 0.1, 0xff0000);
scene.add(helper);
```

### Проверка UV координат
```javascript
// Включить визуализацию UV в материалах
material.wireframe = true; // Временно для отладки
```

## Примеры использования

### Базовый пример
```javascript
const roofSystem = new RoofSystem(scene, canopyGroup);

roofSystem.update({
    length: 10,
    width: 6,
    height: 3,
    roofHeight: 1.5,
    roofType: 'var-2',
    roofingMaterial: 'metal-grandline',
    roofColor: 'blue',
    overhang: 0.1,
    baseHeight: 3.5
});
```

### С анимацией
```javascript
function animate() {
    requestAnimationFrame(animate);
    
    // Изменение параметров со временем
    const time = Date.now() * 0.001;
    roofSystem.update({
        // ... параметры ...
        roofHeight: 1.5 + Math.sin(time) * 0.3
    });
    
    renderer.render(scene, camera);
}
```

## Решение проблем

### Кровля не отображается
- Проверьте, что `baseHeight` правильно вычислен
- Убедитесь, что `canopyGroup` добавлен в сцену
- Проверьте консоль на ошибки

### Текстуры не применяются
- Убедитесь, что UV координаты правильно установлены
- Проверьте `texture.repeat` для правильного масштаба
- Используйте `texture.needsUpdate = true` при изменении

### Проблемы с производительностью
- Уменьшите количество сегментов в геометрии
- Используйте кэширование материалов
- Вызывайте `dispose()` при обновлении

















































