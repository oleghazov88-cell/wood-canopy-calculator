/**
 * Canopy3DRenderer - 3D Рендеринг навеса (MVP Pattern)
 * 
 * Отвечает за:
 * - Инициализацию Three.js сцены
 * - Создание и обновление 3D модели навеса
 * - Рендеринг и анимацию
 * - Управление камерой и освещением
 */

class Canopy3DRenderer {
    constructor(canvasSelector) {
        this.canvasElement = document.querySelector(canvasSelector);
        
        if (!this.canvasElement) {
            throw new Error('Не найден canvas элемент');
        }
        
        // Three.js объекты
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.canopyGroup = null;
        
        // Кэш
        this.glbCache = {};
        this.crossbarMaterial = null;
        
        // Флаг инициализации
        this.isInitialized = false;
        
        // Колбэки
        this.onRenderComplete = null;
    }

    /**
     * Загрузка Three.js библиотеки
     */
    async loadThreeJS() {
        if (window.THREE) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
            script.onload = () => {
                const controlsScript = document.createElement('script');
                controlsScript.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
                controlsScript.onload = () => {
                    const gltfLoaderScript = document.createElement('script');
                    gltfLoaderScript.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';
                    gltfLoaderScript.onload = () => resolve();
                    gltfLoaderScript.onerror = () => reject(new Error('Не удалось загрузить GLTFLoader'));
                    document.head.appendChild(gltfLoaderScript);
                };
                controlsScript.onerror = () => reject(new Error('Не удалось загрузить OrbitControls'));
                document.head.appendChild(controlsScript);
            };
            script.onerror = () => reject(new Error('Не удалось загрузить Three.js'));
            document.head.appendChild(script);
        });
    }

    /**
     * Инициализация 3D сцены
     */
    async init() {
        try {
            // Загружаем Three.js если еще не загружен
            await this.loadThreeJS();
            
            if (!window.THREE) {
                throw new Error('Three.js не загружен');
            }

            const container = this.canvasElement.parentElement;
            
            // Создание сцены
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0xf8f9fa);

            // Создание камеры
            this.camera = new THREE.PerspectiveCamera(
                60, 
                container.clientWidth / container.clientHeight, 
                0.1, 
                500
            );
            this.camera.position.set(15, 10, 15);
            this.camera.lookAt(0, 0, 0);

            // Создание рендерера
            this.renderer = new THREE.WebGLRenderer({ 
                canvas: this.canvasElement, 
                antialias: true,
                alpha: true,
                powerPreference: "high-performance"
            });
            this.renderer.setSize(container.clientWidth, container.clientHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            this.renderer.outputEncoding = THREE.sRGBEncoding;
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.0;

            // Создание контролов
            if (window.THREE.OrbitControls) {
                this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
                this.controls.enableDamping = true;
                this.controls.dampingFactor = 0.05;
                this.controls.minDistance = 5;
                this.controls.maxDistance = 50;
                this.controls.maxPolarAngle = Math.PI / 2;
                this.controls.minPolarAngle = Math.PI / 6;
                this.controls.target.set(0, 2, 0);
            }

            // Освещение
            this.setupLighting();

            // Земля
            this.createGround();

            // Группа для навеса
            this.canopyGroup = new THREE.Group();
            this.scene.add(this.canopyGroup);

            // Обработчик изменения размера окна
            window.addEventListener('resize', () => this.onWindowResize());

            // Запуск анимации
            this.animate();

            this.isInitialized = true;
            console.log('3D сцена инициализирована');
            
        } catch (error) {
            console.error('Ошибка инициализации 3D сцены:', error);
            throw error;
        }
    }

    /**
     * Настройка освещения
     */
    setupLighting() {
        // Направленный свет (солнце)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -20;
        directionalLight.shadow.camera.right = 20;
        directionalLight.shadow.camera.top = 20;
        directionalLight.shadow.camera.bottom = -20;
        this.scene.add(directionalLight);

        // Окружающий свет
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Заполняющий свет
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
        fillLight.position.set(-10, 10, -10);
        this.scene.add(fillLight);
    }

    /**
     * Создание земли
     */
    createGround() {
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Сетка
        const gridHelper = new THREE.GridHelper(50, 50, 0x888888, 0xcccccc);
        this.scene.add(gridHelper);
    }

    /**
     * Обновление 3D модели
     */
    update(params) {
        if (!this.isInitialized) {
            console.warn('3D сцена не инициализирована');
            return;
        }

        // Очищаем предыдущую модель
        while (this.canopyGroup.children.length > 0) {
            const object = this.canopyGroup.children[0];
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(mat => mat.dispose());
                } else {
                    object.material.dispose();
                }
            }
            this.canopyGroup.remove(object);
        }

        // Создаем новую модель
        this.buildCanopy(params);

        if (this.onRenderComplete) {
            this.onRenderComplete();
        }
    }

    /**
     * Построение навеса
     * TODO: Реализовать полную логику создания 3D модели
     */
    buildCanopy(params) {
        const length = params.length / 10; // метры
        const width = params.width / 10;
        const height = params.height / 10;
        const roofHeight = params.roofHeight / 10;

        // Создаем простую модель (заглушка)
        // В полной версии здесь будет вызов всех create* методов
        const woodMaterial = this.createSimpleWoodMaterial();
        
        // Столбы (упрощенная версия)
        this.createSimplePosts(length, width, height, woodMaterial, params);
        
        // Балки
        this.createSimpleBeams(length, width, height, woodMaterial, params);
        
        // Крыша
        this.createSimpleRoof(length, width, height, roofHeight, params);

        console.log('3D модель обновлена (упрощенная версия)');
    }

    /**
     * Создание простых столбов (заглушка)
     */
    createSimplePosts(length, width, height, material, params) {
        const postSpacing = params.postSpacing / 10;
        const postsAlongLength = Math.ceil(length / postSpacing) + 1;
        const postGeometry = new THREE.BoxGeometry(0.15, height, 0.15);

        for (let i = 0; i < postsAlongLength; i++) {
            const z = -length / 2 + (i * length) / (postsAlongLength - 1);
            
            // Левый столб
            const leftPost = new THREE.Mesh(postGeometry, material);
            leftPost.position.set(-width / 2, height / 2, z);
            leftPost.castShadow = true;
            this.canopyGroup.add(leftPost);
            
            // Правый столб
            const rightPost = new THREE.Mesh(postGeometry, material);
            rightPost.position.set(width / 2, height / 2, z);
            rightPost.castShadow = true;
            this.canopyGroup.add(rightPost);
        }
    }

    /**
     * Создание простых балок (заглушка)
     */
    createSimpleBeams(length, width, height, material, params) {
        const beamGeometry = new THREE.BoxGeometry(0.15, 0.15, length);
        
        // Левая балка
        const leftBeam = new THREE.Mesh(beamGeometry, material);
        leftBeam.position.set(-width / 2, height + 0.075, 0);
        leftBeam.castShadow = true;
        this.canopyGroup.add(leftBeam);
        
        // Правая балка
        const rightBeam = new THREE.Mesh(beamGeometry, material);
        rightBeam.position.set(width / 2, height + 0.075, 0);
        rightBeam.castShadow = true;
        this.canopyGroup.add(rightBeam);
    }

    /**
     * Создание простой крыши (заглушка)
     */
    createSimpleRoof(length, width, height, roofHeight, params) {
        const roofMaterial = new THREE.MeshStandardMaterial({
            color: 0xD2691E,
            metalness: 0.5,
            roughness: 0.5
        });

        if (params.roofType === 'var-2') {
            // Двускатная крыша (упрощенно)
            const leftRoofGeometry = new THREE.PlaneGeometry(width / 2, length);
            const leftRoof = new THREE.Mesh(leftRoofGeometry, roofMaterial);
            leftRoof.rotation.z = Math.atan2(roofHeight, width / 2);
            leftRoof.position.set(-width / 4, height + roofHeight / 2, 0);
            this.canopyGroup.add(leftRoof);

            const rightRoofGeometry = new THREE.PlaneGeometry(width / 2, length);
            const rightRoof = new THREE.Mesh(rightRoofGeometry, roofMaterial);
            rightRoof.rotation.z = -Math.atan2(roofHeight, width / 2);
            rightRoof.position.set(width / 4, height + roofHeight / 2, 0);
            this.canopyGroup.add(rightRoof);
        } else {
            // Односкатная крыша
            const roofGeometry = new THREE.PlaneGeometry(width, length);
            const roof = new THREE.Mesh(roofGeometry, roofMaterial);
            roof.rotation.z = Math.atan2(roofHeight, width);
            roof.position.set(0, height + roofHeight / 2, 0);
            this.canopyGroup.add(roof);
        }
    }

    /**
     * Создание простого материала дерева
     */
    createSimpleWoodMaterial() {
        return new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.8,
            metalness: 0.0
        });
    }

    /**
     * Анимационный цикл
     */
    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.controls) {
            this.controls.update();
        }

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    /**
     * Обработчик изменения размера окна
     */
    onWindowResize() {
        if (!this.camera || !this.renderer) return;

        const container = this.canvasElement.parentElement;
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }

    /**
     * Очистка ресурсов
     */
    dispose() {
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        if (this.controls) {
            this.controls.dispose();
        }
        
        window.removeEventListener('resize', this.onWindowResize);
    }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Canopy3DRenderer;
}

