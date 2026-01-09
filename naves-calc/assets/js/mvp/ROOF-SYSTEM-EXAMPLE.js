/**
 * Пример интеграции RoofSystem в Canopy3DRenderer
 * 
 * Этот файл показывает, как интегрировать RoofSystem
 * в существующий Canopy3DRenderer
 */

// Пример модификации метода createRoofCovering в Canopy3DRenderer.js

/*
// В конструкторе Canopy3DRenderer:
constructor(canvasSelector) {
    // ... существующий код ...
    this.roofSystem = null;
}

// В методе init():
async init() {
    // ... существующая инициализация ...
    
    // Создаем систему кровли после инициализации сцены
    this.roofSystem = new RoofSystem(this.scene, this.canopyGroup);
}

// Заменяем существующий метод createRoofCovering:
createRoofCovering(length, width, height, roofHeight, roofingMaterial, 
                   frontExtension, backExtension, roofType, roofColor, 
                   trussMaterial, postType) {
    
    console.log(`🏠 createRoofCovering: ${roofingMaterial}, ${roofType}`);
    
    if (roofingMaterial === 'no-roofing') {
        if (this.roofSystem) {
            this.roofSystem.dispose();
        }
        return;
    }
    
    // Вычисляем базовую высоту кровли
    const beamDimensions = this.getBeamDimensions(this.params.postMaterial, postType);
    const trussDimensions = this.getTrussDimensions(trussMaterial);
    const baseHeight = height + beamDimensions.height + 
                      beamDimensions.height / 2 + trussDimensions.height;
    
    // Обновляем параметры кровли
    if (!this.roofSystem) {
        this.roofSystem = new RoofSystem(this.scene, this.canopyGroup);
    }
    
    this.roofSystem.update({
        length: length + frontExtension + backExtension,
        width: width,
        height: height,
        roofHeight: roofHeight / 10, // Конвертируем из дециметров в метры
        roofType: roofType,
        roofingMaterial: roofingMaterial,
        roofColor: roofColor,
        overhang: 0.1, // 100мм свесы
        baseHeight: baseHeight
    });
    
    console.log('✅ Кровля создана через RoofSystem');
}
*/

/**
 * Пример использования с dat.GUI для отладки
 */
function setupRoofDebugGUI(roofSystem, renderer) {
    // Убедитесь, что dat.GUI загружен
    // <script src="https://cdn.jsdelivr.net/npm/three@0.150.0/examples/jsm/libs/lil-gui.module.min.js"></script>
    
    if (typeof GUI === 'undefined') {
        console.warn('GUI не загружен. Пропускаем создание отладочной панели.');
        return;
    }
    
    const gui = new GUI();
    gui.title('Отладка кровли');
    
    const params = {
        length: 11.0,
        width: 6.0,
        height: 3.0,
        roofHeight: 1.5,
        roofType: 'var-2',
        roofingMaterial: 'metal-grandline',
        roofColor: 'amber',
        overhang: 0.1,
        baseHeight: 3.5
    };
    
    const roofFolder = gui.addFolder('Параметры кровли');
    
    roofFolder.add(params, 'length', 3, 20, 0.1)
        .name('Длина (м)')
        .onChange(() => updateRoof());
    
    roofFolder.add(params, 'width', 3, 12, 0.1)
        .name('Ширина (м)')
        .onChange(() => updateRoof());
    
    roofFolder.add(params, 'roofHeight', 0.5, 3, 0.1)
        .name('Высота подъема (м)')
        .onChange(() => updateRoof());
    
    roofFolder.add(params, 'roofType', ['var-1', 'var-2', 'var-3'])
        .name('Тип кровли')
        .onChange(() => updateRoof());
    
    roofFolder.add(params, 'roofingMaterial', [
        'shinglas-sonata',
        'metal-grandline',
        'profiled-gl35r',
        'polycarbonate-8mm'
    ])
        .name('Материал')
        .onChange(() => updateRoof());
    
    roofFolder.add(params, 'roofColor', ['amber', 'blue', 'green', 'red', 'gray'])
        .name('Цвет')
        .onChange(() => updateRoof());
    
    roofFolder.add(params, 'overhang', 0, 0.3, 0.01)
        .name('Свесы (м)')
        .onChange(() => updateRoof());
    
    roofFolder.add(params, 'baseHeight', 0, 10, 0.1)
        .name('Базовая высота (м)')
        .onChange(() => updateRoof());
    
    function updateRoof() {
        roofSystem.update(params);
        if (renderer && renderer.render) {
            renderer.render();
        }
    }
    
    // Инициализация
    updateRoof();
}

/**
 * Пример анимации изменения параметров
 */
function animateRoofParameters(roofSystem, duration = 5000) {
    const startParams = { ...roofSystem.params };
    const endParams = {
        ...startParams,
        roofHeight: startParams.roofHeight * 1.5,
        length: startParams.length * 1.2
    };
    
    const startTime = Date.now();
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing функция (ease-in-out)
        const eased = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        
        // Интерполяция параметров
        const currentParams = {
            ...startParams,
            roofHeight: startParams.roofHeight + (endParams.roofHeight - startParams.roofHeight) * eased,
            length: startParams.length + (endParams.length - startParams.length) * eased
        };
        
        roofSystem.update(currentParams);
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    animate();
}

/**
 * Пример экспорта геометрии кровли
 */
function exportRoofGeometry(roofSystem) {
    const exporter = new THREE.GLTFExporter();
    const scene = new THREE.Scene();
    
    // Клонируем группу кровли
    const clonedGroup = roofSystem.roofGroup.clone();
    scene.add(clonedGroup);
    
    exporter.parse(scene, (gltf) => {
        const output = JSON.stringify(gltf, null, 2);
        const blob = new Blob([output], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'roof-geometry.gltf';
        link.click();
        
        URL.revokeObjectURL(url);
    });
}

/**
 * Пример проверки коллизий (упрощенный)
 */
function checkRoofCollision(roofSystem, point) {
    // Упрощенная проверка - проверяем, находится ли точка внутри объема кровли
    const { length, width, baseHeight, roofHeight } = roofSystem.params;
    
    // Проверка по X и Z
    if (Math.abs(point.x) > width / 2 || Math.abs(point.z) > length / 2) {
        return false;
    }
    
    // Проверка по Y (упрощенная для двускатной крыши)
    const maxHeight = baseHeight + roofHeight;
    if (point.y > maxHeight || point.y < baseHeight) {
        return false;
    }
    
    return true;
}

// Экспорт функций для использования
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        setupRoofDebugGUI,
        animateRoofParameters,
        exportRoofGeometry,
        checkRoofCollision
    };
}

















































