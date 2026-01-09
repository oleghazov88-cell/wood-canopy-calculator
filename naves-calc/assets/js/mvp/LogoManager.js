/**
 * LogoManager.js
 * Модуль управления логотипом в 3D-сцене Three.js.
 * Реализует паттерн MVP, поддерживает динамическое позиционирование 
 * и адаптацию к параметрам навеса.
 */

class LogoManager {
    constructor() {
        this.scene = null;
        this.mesh = null;
        this.texture = null;
        this.isVisible = true;

        // Конфигурация по умолчанию
        this.config = {
            target: 'fascia', // 'fascia' | 'gable' | 'custom'
            url: 'assets/textures/logo.svg',
            width: 1.2,
            height: 0.6,
            offset: { x: 0, y: 0, z: 0.05 }, // z offset для предотвращения z-fighting
            rotation: { x: 0, y: 0, z: 0 },
            opacity: 0.9
        };

        // Текущие параметры навеса (кэш)
        this.currentCanopyParams = null;
    }

    /**
     * Инициализация модуля
     * @param {THREE.Scene} scene - Сцена Three.js
     */
    init(scene) {
        if (!scene) {
            console.error('LogoManager: Scene is required for init');
            return;
        }
        this.scene = scene;
        console.log('🖼️ LogoManager: Initialized');
    }

    /**
     * Загрузка/Установка логотипа
     * @param {string} url - Путь к изображению
     */
    setLogo(url) {
        if (!url) return;
        this.config.url = url;

        const loader = new THREE.TextureLoader();
        // Добавляем timestamp для обхода кэша
        const loadUrl = `${url}?t=${Date.now()}`;

        loader.load(loadUrl, (tex) => {
            console.log(`✅ LogoManager: Logo loaded from ${url}`);

            // Настройка цветового пространства
            if (parseInt(THREE.REVISION) >= 152) {
                tex.colorSpace = THREE.SRGBColorSpace;
            } else {
                tex.encoding = THREE.sRGBEncoding;
            }

            this.texture = tex;
            this._rebuildMesh();

        }, undefined, (err) => {
            console.error('❌ LogoManager: Failed to load logo', err);
        });
    }

    /**
     * Применение настроек отображения
     * @param {Object} options - Настройки (target, dimensions, offset, etc.)
     */
    apply(options = {}) {
        // Объединяем с текущим конфигом (deep merge не нужен для простой структуры)
        Object.assign(this.config, options);

        // Если изменились размеры или таргет, возможно нужно пересоздать/обновить меш
        if (this.mesh) {
            // Обновляем размеры геометрии
            if (options.width || options.height) {
                this.mesh.geometry.dispose();
                this.mesh.geometry = new THREE.PlaneGeometry(this.config.width, this.config.height);
            }

            // Обновляем позицию, если есть данные о навесе
            if (this.currentCanopyParams) {
                this.update(this.currentCanopyParams);
            }
        }
    }

    /**
     * Обновление позиции при изменении параметров навеса
     * @param {Object} canopyParams - { width, length, height, roofHeight, roofType }
     */
    update(canopyParams) {
        if (!this.mesh || !canopyParams) return;

        this.currentCanopyParams = canopyParams;
        const { width, length, height, roofHeight, roofType, beamHeight = 0.15 } = canopyParams;

        // Базовая позиция: Центр передней грани (Front Facade)
        // Z = половина длины
        const zFront = length / 2;

        const position = new THREE.Vector3(0, 0, 0);
        let rotation = new THREE.Euler(0, 0, 0);

        switch (this.config.target) {
            case 'fascia':
                // Лобовая доска (на уровне балки мауэрлата)
                // Y = Высота столба + половина высоты балки (если логотип центрируется по балке)
                // Или просто чуть выше столба. 
                // Обычно лого вешают на горизонтальную балку прогона.
                position.set(0, height + (beamHeight / 2), zFront);
                break;

            case 'gable':
                // Фронтон (треугольник крыши)
                // Y = Высота столба + половина высоты крыши (примерный центр треугольника)
                const gableCenterY = height + (roofHeight / 2);
                position.set(0, gableCenterY, zFront);
                break;

            case 'custom':
                // Используем координаты как есть (относительно 0,0,0)
                // Но можно добавить логику "относительного" позиционирования
                position.set(0, height, zFront);
                break;
        }

        // Применяем оффсеты пользователя
        position.x += this.config.offset.x;
        position.y += this.config.offset.y;
        position.z += this.config.offset.z; // Сдвиг вперед, чтобы не мерцало (z-fighting)

        // Применяем вращение
        rotation.x = this.config.rotation.x;
        rotation.y = this.config.rotation.y;
        rotation.z = this.config.rotation.z;

        // Обновляем меш
        this.mesh.position.copy(position);
        this.mesh.rotation.copy(rotation);

        // Убеждаемся, что материал обновлен
        this.mesh.visible = this.isVisible;
    }

    /**
     * Включение / выключение видимости
     * @param {boolean} isVisible 
     */
    toggle(isVisible) {
        this.isVisible = isVisible;
        if (this.mesh) {
            this.mesh.visible = isVisible;
        }
    }

    /**
     * Освобождение ресурсов
     */
    dispose() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
            this.mesh = null;
        }
        // Текстуру не диспозим, так как она может использоваться где-то еще,
        // но в рамках модуля можно, если мы единственные владельцы.
        if (this.texture) {
            this.texture.dispose();
            this.texture = null;
        }
    }

    /**
     * Внутренний метод: Пересоздание меша
     */
    _rebuildMesh() {
        // Удаляем старый
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }

        if (!this.texture && !this.config.debugColor) return;

        const geometry = new THREE.PlaneGeometry(this.config.width, this.config.height);

        const material = new THREE.MeshStandardMaterial({
            map: this.texture || null,
            color: this.texture ? 0xffffff : (this.config.debugColor || 0xff0000), // Белый или красный дебаг
            transparent: true,
            opacity: this.config.opacity,
            side: THREE.DoubleSide,
            depthWrite: false, // Важно для прозрачности и наложения
            roughness: 0.5,
            metalness: 0
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.renderOrder = 1; // Рисовать поверх (если нужно)

        this.scene.add(this.mesh);

        // Если есть параметры навеса, сразу обновляем позицию
        if (this.currentCanopyParams) {
            this.update(this.currentCanopyParams);
        }
    }
}
