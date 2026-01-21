/**
 * Калькулятор навесов - Автономная версия
 * Полный код с Three.js из modern_calculator
 */

/**
 * Canopy3DRenderer - ПОЛНЫЙ 3D Рендеринг навеса (MVP Pattern)
 * 
 * Полная версия из naves-calc.bundle.js со всеми функциями:
 * - Все типы столбов (var-1 до var-6) с базами и астрагалами
 * - Все типы ферм (var-1, var-2, var-3) с условными подрезками  
 * - Все типы раскосов с моделями из кода
 * - Все типы крыш и материалов
 * - Кэширование и оптимизация производительности
 */
class CanopyRendererV3 {
    constructor(canvasSelector) {
        this.canvasSelector = canvasSelector; // Сохраняем селектор, а не сам элемент
        this.canvasElement = null; // Будет установлен в init()

        // ✅ Проверка перенесена в метод init() для избежания ошибок при ранней инициализации

        this.config = {
            pricesUrl: './upload/naves/prices.json',
            defaultParams: {
                length: 110, // в дециметрах (11.0 м)
                width: 60,   // в дециметрах (6.0 м)
                height: 30,  // в дециметрах (3.0 м)
                roofHeight: 15, // в дециметрах (1.5 м)
                roofType: 'var-2',
                postType: 'var-5',
                braceType: 'var-1',
                postMaterial: 'glued-150x150',
                trussMaterial: 'planed-45x190',
                roofingMaterial: 'metal-grandline',
                roofColor: 'amber',
                postSpacing: 25, // в дециметрах (2.5 м)
                frontBeamExtension: 200,
                backBeamExtension: 200,
                mountingRequired: 'yes',
                distanceFromMKAD: 10,
                // Новые параметры
                frameMaterial: 'pine',
                frameColoring: 'no-coloring'
            }
        };

        this.params = { ...this.config.defaultParams };
        this.prices = {};
        this.crossbarMaterial = null; // Материал для перемычек
        this.roofMaterialCache = new Map(); // Кэш для материалов кровли
        this.currentRoofGroup = null; // Текущая группа кровли для замены

        // Three.js переменные
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.canopyGroup = null;
        this.currentPostSpacing = this.params.postSpacing / 10; // Инициализация из параметров (дециметры -> метры)

        // Флаг для отображения bounding box раскосов
        this.showBraceBoundingBoxes = false;
        // Флаг для отображения осей раскосов
        this.showBraceAxes = false;

        // Система параметрической кровли
        this.roofSystem = null;

        this.formElement = null;
        // this.canvasElement уже объявлен выше (строка 19)
        this.summaryElement = null;
    }

    // Инициализация калькулятора
    // MVP метод init - только для 3D сцены
    async init() {
        try {
            console.log('Инициализация 3D Renderer...');

            // Получаем canvas элемент (теперь DOM точно загружен)
            this.canvasElement = document.querySelector(this.canvasSelector);

            if (!this.canvasElement) {
                throw new Error(`Canvas элемент не найден: ${this.canvasSelector}`);
            }

            console.log('✅ Canvas элемент найден:', this.canvasElement);

            // Проверяем наличие THREE.js
            if (typeof THREE === 'undefined') {
                throw new Error('Three.js не загружен');
            }

            console.log('✅ Three.js загружен');

            // Инициализируем Three.js сцену
            this.init3DScene();

            // ✅ FIX: Добавляем слушатель изменения размера окна
            window.addEventListener('resize', this.handleResizeDebounced.bind(this));

            // Форсируем обновление размера для корректного DPI сразу после загрузки
            setTimeout(() => this.handleResize(), 50);

            console.log('✅ 3D Renderer инициализирован');

        } catch (error) {
            console.error('Ошибка инициализации 3D Renderer:', error);
            throw error;
        }
    }

    // MVP метод update - обновление 3D модели с новыми параметрами
    update(params) {
        try {
            console.log('🔄 Canopy3DRenderer.update() вызван с параметрами:', params);

            // Обновляем внутренние параметры
            Object.assign(this.params, params);

            console.log('✅ Параметры обновлены. Текущий roofType:', this.params.roofType);

            // Обновляем currentPostSpacing для корректного расчета
            if (params.postSpacing !== undefined) {
                this.currentPostSpacing = params.postSpacing / 10; // дециметры -> метры
            }

            // Перерисовываем 3D модель
            console.log('🔄 Вызываем update3DModel()...');
            this.update3DModel();

        } catch (error) {
            console.error('Ошибка обновления 3D модели:', error);
        }
    }

    // Загрузка Three.js и PostProcessing
    loadThreeJS() {
        return new Promise((resolve) => {
            if (window.THREE && window.THREE.EffectComposer) {
                resolve();
                return;
            }

            const loadScript = (src) => {
                return new Promise((res, rej) => {
                    if (document.querySelector(`script[src="${src}"]`)) {
                        res();
                        return;
                    }
                    const s = document.createElement('script');
                    s.src = src;
                    s.onload = res;
                    s.onerror = rej;
                    document.head.appendChild(s);
                });
            };

            // Order matters
            const baseUrl = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js';

            // Core Three.js loaded in HTML, but we check/load extensions here
            const scripts = [
                `${baseUrl}/postprocessing/EffectComposer.js`,
                `${baseUrl}/postprocessing/RenderPass.js`,
                `${baseUrl}/postprocessing/ShaderPass.js`,
                `${baseUrl}/shaders/CopyShader.js`,
                `${baseUrl}/shaders/SAOShader.js`,
                `${baseUrl}/shaders/DepthLimitedBlurShader.js`,
                `${baseUrl}/shaders/UnpackDepthRGBAShader.js`,
                `${baseUrl}/postprocessing/SAOPass.js`,
                `${baseUrl}/controls/OrbitControls.js` // Ensure controls
            ];

            // Chain loading
            let p = Promise.resolve();
            scripts.forEach(src => {
                p = p.then(() => loadScript(src));
            });

            p.then(() => {
                console.log('✅ Three.js Extensions Loaded');
                resolve();
            }).catch(e => console.error('Error loading Three.js scripts', e));
        });
    }

    // Инициализация 3D сцены
    init3DScene() {
        if (!window.THREE) {
            console.error('Three.js не загружен');
            return;
        }

        const container = this.canvasElement.parentElement;

        // Создание сцены
        this.scene = new THREE.Scene();
        // Используем более "студийный" цвет фона, если окружение не загрузится
        this.scene.background = null;

        // Создание камеры
        this.camera = new THREE.PerspectiveCamera(35, container.clientWidth / container.clientHeight, 0.1, 500); // 35mm lens = more cinematic
        this.camera.position.set(12, 6, 12);
        this.camera.lookAt(0, 1.5, 0);

        // Рендерер
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvasElement,
            antialias: true, // MSAA, но для PostProcessing часто приходится отключать или использовать SMAA
            alpha: true, // TRANSPARENCY ENABLED
            premultipliedAlpha: false,
            powerPreference: "high-performance",
            depth: true
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio); // Убираем ограничение для четкости
        this.renderer.shadowMap.enabled = true; // ENABLED SHADOWS
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        if (parseInt(THREE.REVISION) >= 152) {
            this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        } else {
            this.renderer.outputEncoding = THREE.sRGBEncoding;
        }
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0; // Slightly brighter for shadows

        // --- COMPOSER (POST-PROCESSING) ---
        // Отключаем SAO на мобильных для четкости (Antialiasing) и производительности
        const isMobile = window.innerWidth < 992;
        const enableEffects = true; // ENABLED EFFECTS

        if (enableEffects && !isMobile && window.THREE.EffectComposer && window.THREE.SAOPass) {
            this.composer = new THREE.EffectComposer(this.renderer);
            const renderPass = new THREE.RenderPass(this.scene, this.camera);
            renderPass.clear = true; // Важно, чтобы очищать буфер
            renderPass.clearAlpha = 0;
            this.composer.addPass(renderPass);

            // SAO Pass (Ambient Occlusion)
            // SAO обычно выглядит лучше и быстрее SSAO в старых версиях Three.js
            const saoPass = new THREE.SAOPass(this.scene, this.camera, false, true);
            saoPass.params.saoBias = 0.5;
            saoPass.params.saoIntensity = 0.1; // (было 0.05) Более выраженные углы
            saoPass.params.saoScale = 100; // (было 50) Радиус влияния больше
            saoPass.params.saoKernelRadius = 30;
            saoPass.params.saoMinResolution = 0;
            saoPass.params.saoBlur = true;
            saoPass.params.saoBlurRadius = 4;
            saoPass.params.saoBlurStdDev = 2;
            saoPass.params.saoBlurDepthCutoff = 0.01;

            this.composer.addPass(saoPass);
            this.hasComposer = true;
            console.log('✨ Post-processing enabled (SAO)');
        } else {
            console.warn('⚠️ Post-processing scripts missing, falling back to standard renderer');
            this.hasComposer = false;
        }


        // --- ENVIRONMENT & LIGHTING ---
        // 1. Hemisphere Light (Мягкое заполнение)
        // Снижаем интенсивность для уменьшения засветки
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.3);
        hemiLight.position.set(0, 50, 0);
        this.scene.add(hemiLight);

        // 2. Main Directional Light (Солнце)
        // Снижаем интенсивность с 1.8 до 1.3 и делаем цвет чуть более теплым
        const sunLight = new THREE.DirectionalLight(0xfff0e0, 1.3);
        sunLight.position.set(10, 15, 10);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.bias = -0.0001;

        // Настраиваем камеру тени под размеры навеса
        const d = 10;
        sunLight.shadow.camera.left = -d;
        sunLight.shadow.camera.right = d;
        sunLight.shadow.camera.top = d;
        sunLight.shadow.camera.bottom = -d;

        this.scene.add(sunLight);

        // 3. Rim Light (Контровой свет) - для объема и отрыва от фона
        const rimLight = new THREE.DirectionalLight(0xddeeff, 0.5); // Холодный контровик
        rimLight.position.set(-5, 5, -10); // Сзади-слева-сверху
        this.scene.add(rimLight);

        // 3. Environment Map (Небо/Студия)
        // Генерируем "вкусный" градиент для отражений (металл будет отражать небо)
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        pmremGenerator.compileEquirectangularShader();

        // Создаем текстуру неба программно
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256; // Equirectangular aspect 2:1
        const ctx = canvas.getContext('2d');

        // Градиент неба
        const grad = ctx.createLinearGradient(0, 0, 0, 256);
        grad.addColorStop(0, '#2b32b2'); // Зенит (синий)
        grad.addColorStop(0.5, '#1488cc'); // Горизонт (голубой)
        grad.addColorStop(0.51, '#ffffff'); // Линия горизонта
        grad.addColorStop(1, '#666666'); // Земля (серая)
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 256);

        const envMap = new THREE.CanvasTexture(canvas);
        envMap.mapping = THREE.EquirectangularReflectionMapping;
        this.scene.environment = pmremGenerator.fromEquirectangular(envMap).texture;

        // Controls
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.maxPolarAngle = Math.PI / 2 - 0.02;
            this.controls.minDistance = 2;
            this.controls.maxDistance = 40;
            this.controls.target.set(0, 1.5, 0);

            this.controls.addEventListener('change', () => { this.needsRender = true; });
        }

        this.canopyGroup = new THREE.Group();
        this.scene.add(this.canopyGroup);

        if (typeof RoofSystem !== 'undefined') {
            this.roofSystem = new RoofSystem(this.scene, this.canopyGroup);
        }

        // Stats & State
        this.needsRender = true;
        this.lastRenderTime = 0;
        this.renderInterval = 1000 / 60;
        this.performanceStats = { frameCount: 0 };
        this.resizeTimeout = null;

        window.addEventListener('resize', () => this.handleResizeDebounced());
        this.createGround(); // Создаем пол
        this.animate();
    }

    // Создание пола и сетки (Основание)
    createGround() {
        console.log('Creating Custom Ground (Paving)...');
        // Убедимся, что пол не дублируется
        const existingGround = this.scene.getObjectByName('groundGroup');
        if (existingGround) this.scene.remove(existingGround);

        const groundGroup = new THREE.Group();
        groundGroup.name = 'groundGroup';

        // 1. ПРОЦЕДУРНАЯ БРУСЧАТКА (High Quality)
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');

        // Фон (швы - темный бетон)
        ctx.fillStyle = '#555555';
        ctx.fillRect(0, 0, 1024, 1024);

        // Плитки (светлая брусчатка)
        // Рисуем паттерн "кирпичная кладка" или "квадраты"
        const tileSize = 64;
        const gap = 4;
        const rough = 10; // Шум

        for (let y = 0; y < 1024; y += tileSize) {
            for (let x = 0; x < 1024; x += tileSize) {
                // Вариативность цвета (от светло-серого до теплого серого)
                const baseVal = 200;
                const r = baseVal + (Math.random() - 0.5) * 40;
                const g = baseVal + (Math.random() - 0.5) * 40;
                const b = baseVal + (Math.random() - 0.5) * 30; // Чуть меньше синего = теплее

                ctx.fillStyle = `rgb(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)})`;

                // Рисуем плитку с отступом
                ctx.fillRect(x + gap / 2, y + gap / 2, tileSize - gap, tileSize - gap);

                // Добавляем "шум" на плитку для реализма
                ctx.fillStyle = 'rgba(0,0,0,0.1)';
                if (Math.random() > 0.5) ctx.fillRect(x + gap / 2 + 5, y + gap / 2 + 5, tileSize / 2, tileSize / 2);
            }
        }

        const groundTexture = new THREE.CanvasTexture(canvas);
        groundTexture.wrapS = THREE.RepeatWrapping;
        groundTexture.wrapT = THREE.RepeatWrapping;
        groundTexture.repeat.set(15, 15); // Масштабируем
        groundTexture.anisotropy = 16; // Четкость под углом

        if (parseInt(THREE.REVISION) >= 152) {
            groundTexture.colorSpace = THREE.SRGBColorSpace;
        } else {
            groundTexture.encoding = THREE.sRGBEncoding;
        }

        const groundMaterial = new THREE.MeshStandardMaterial({
            map: groundTexture,
            roughness: 0.9,
            metalness: 0.1,
            color: 0x999999 // Немного приглушим яркость текстуры
        });

        const groundSize = 200; // 20x20 метров
        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(groundSize, groundSize),
            groundMaterial
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.02; // Чуть ниже нуля (чтобы не мерцало с тенями)
        ground.receiveShadow = true;

        groundGroup.add(ground);

        // 2. Shadows only plane (для мягких теней на стыке с белым фоном, если нужно)
        // Но пока оставим просто брусчатку

        // Добавляем GridHelper (Сетка) - всегда полезна для понимания масштаба
        const gridHelper = new THREE.GridHelper(groundSize, 50, 0x000000, 0x000000);
        gridHelper.position.y = 0.01; // Чуть выше плитки
        gridHelper.material.opacity = 0.1;
        gridHelper.material.transparent = true;
        // Убираем depthWrite, чтобы сетка не перекрывала прозрачностью
        gridHelper.material.depthWrite = false;
        groundGroup.add(gridHelper);

        this.scene.add(groundGroup);

        // 3. ЛОГОТИП ЧЕРЕЗ LOGO MANAGER (если есть, а он есть в this.update3DModel)
    }

    // Дебаунсинг для изменения размера
    handleResizeDebounced() {
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        this.resizeTimeout = setTimeout(() => {
            this.handleResize();
        }, 100);
    }

    // Оптимизированная анимация 3D с мониторингом производительности
    animate() {
        requestAnimationFrame(() => this.animate());

        // ✅ AUTO-RESIZE CHECK (Исправляет мыло и растянутость)
        if (this.renderer && this.canvasElement && this.camera) {
            const canvas = this.canvasElement;
            const pixelRatio = Math.min(window.devicePixelRatio, 2.0); // Ограничим DPI для скорости

            const width = Math.floor(canvas.clientWidth * pixelRatio);
            const height = Math.floor(canvas.clientHeight * pixelRatio);

            // Если размер буфера не совпадает с размером на экране (физические пиксели)
            if (canvas.width !== width || canvas.height !== height) {
                // Обновляем буфер рендера
                this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
                this.renderer.setPixelRatio(pixelRatio);

                // Обновляем камеру
                this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
                this.camera.updateProjectionMatrix();

                if (this.hasComposer && this.composer) {
                    this.composer.setSize(width, height);
                }

                this.needsRender = true;
                // console.log('🔄 Auto-resized to:', width, height);
            }
        }

        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastRenderTime;

        // Обновляем статистику производительности
        this.updatePerformanceStats(currentTime, deltaTime);

        if (this.controls) {
            // update() возвращает true, если камера изменила положение (в т.ч. из-за damping или мыши)
            if (this.controls.update()) {
                this.needsRender = true;
            }
        }

        // Адаптивное качество на основе производительности
        this.adaptQualityBasedOnPerformance();

        // Рендерим только при необходимости и с ограничением FPS
        if (this.needsRender && this.renderer && this.scene && this.camera &&
            deltaTime >= this.renderInterval) {

            // Измеряем время рендеринга
            const renderStartTime = performance.now();

            if (this.hasComposer && this.composer) {
                this.composer.render();
            } else {
                this.renderer.render(this.scene, this.camera);
            }

            const renderEndTime = performance.now();

            this.performanceStats.frameTime = renderEndTime - renderStartTime;
            this.needsRender = false;
            this.lastRenderTime = currentTime;
        }
    }

    // Обновление статистики производительности
    updatePerformanceStats(currentTime, deltaTime) {
        this.performanceStats.frameCount++;

        // Обновляем FPS каждую секунду
        if (currentTime - this.performanceStats.lastFPSUpdate >= 1000) {
            this.performanceStats.fps = Math.round(1000 / deltaTime);
            this.performanceStats.lastFPSUpdate = currentTime;
        }

        // Обновляем количество треугольников и draw calls
        if (this.renderer && this.renderer.info) {
            this.performanceStats.triangleCount = this.renderer.info.render.triangles;
            this.performanceStats.drawCalls = this.renderer.info.render.calls;
        }
    }

    // Адаптивное качество на основе производительности
    adaptQualityBasedOnPerformance() {
        // Заглушка для адаптивного качества
    }

    // Установка уровня качества
    setQualityLevel(level) {
        if (this.qualitySettings.level === level) return;
        this.qualitySettings.level = level;
        this.applyQualitySettings();
    }

    // Применение настроек качества
    applyQualitySettings() {
        if (!this.renderer) return;
        this.renderer.setPixelRatio(this.qualitySettings.pixelRatio);
        this.renderInterval = 1000 / this.qualitySettings.maxFPS;
        this.needsRender = true;
    }

    // Обработка изменения размера
    handleResize() {
        if (!this.camera || !this.renderer || !this.canvasElement) return;
        const container = this.canvasElement.parentElement;
        if (!container) return;

        const width = container.clientWidth;
        const height = container.clientHeight;

        // Избегаем нулевых размеров
        if (width === 0 || height === 0) return;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);

        // ✅ High DPI Fix: Обновляем pixelRatio
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.5)); // Ограничиваем до 2.5x для производительности

        if (this.hasComposer && this.composer) {
            this.composer.setSize(width, height);
        }

        this.needsRender = true;
    }

    // Дебаунсинг для обновления модели
    update3DModelDebounced() {
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }
        this.updateTimeout = setTimeout(() => {
            this.update3DModel();
        }, 150);
    }

    // Оптимизированное обновление 3D модели
    async update3DModel() {
        if (!this.canopyGroup) return;

        console.log('🔄 update3DModel() вызван');

        this.showLoadingIndicator();
        this.disposeModel();

        // ВСЕГДА пересоздаем землю при обновлении, чтобы она не терялась
        this.createGround();

        await this.createModel();
        this.hideLoadingIndicator();
        this.needsRender = true;
    }

    // Создание модели
    async createModel() {
        try {
            console.log('🏗️ Начинаем создание модели...');

            // Получение параметров
            const length = this.params.length / 10; // конвертация в метры
            const width = this.params.width / 10;
            const height = this.params.height / 10;
            const roofHeight = this.params.roofHeight / 10;
            const frontBeamExtension = this.params.frontBeamExtension / 1000;
            const backBeamExtension = this.params.backBeamExtension / 1000;
            const sideOverhang = (this.params.sideOverhang || 100) / 1000; // мм -> м

            const roofType = this.params.roofType || 'var-2';
            const postType = this.params.postType || 'var-1';
            const braceType = this.params.braceType || 'var-1';
            const postMaterial = this.params.postMaterial || 'glued-150x150';
            const trussMaterial = this.params.trussMaterial || 'planed-45x190';
            const frameMaterial = this.params.frameMaterial || 'pine';
            const frameColoring = this.params.frameColoring || 'no-coloring';
            const roofingMaterial = this.params.roofingMaterial || 'metal-grandline';
            const roofColor = this.params.roofColor || 'amber';

            console.log('📊 Параметры модели:', {
                length, width, height, roofHeight,
                roofType, postType, braceType,
                postMaterial, trussMaterial, roofingMaterial
            });

            // Материалы
            const woodMaterial = this.createWoodMaterial(frameMaterial, frameColoring);
            const metalMaterial = new THREE.MeshStandardMaterial({
                color: 0x555555,
                metalness: 0.8,
                roughness: 0.2
            });

            // Создание элементов навеса с обработкой ошибок
            try {
                console.log('1️⃣ Создаем столбы...');
                await this.createPosts(length, width, height, woodMaterial, metalMaterial, postType, postMaterial);
            } catch (error) {
                console.error('❌ Ошибка создания столбов:', error);
            }

            try {
                console.log('2️⃣ Создаем продольные балки...');
                this.createLongitudinalBeams(length, width, height, woodMaterial, frontBeamExtension, backBeamExtension, postMaterial, postType);
            } catch (error) {
                console.error('❌ Ошибка создания балок:', error);
            }

            try {
                console.log('3️⃣ Создаем раскосы (braceType:', braceType, ')...');
                await this.createBeamBraces(length, width, height, woodMaterial, frontBeamExtension, backBeamExtension, postMaterial, braceType, postType);
            } catch (error) {
                console.error('❌ Ошибка создания раскосов:', error);
            }

            try {
                console.log('4️⃣ Создаем фермы (roofType:', roofType, ')...');
                await this.createTrusses(length, width, height, roofHeight, woodMaterial, roofType, braceType, postMaterial, trussMaterial, postType);
            } catch (error) {
                console.error('❌ Ошибка создания ферм:', error);
            }

            try {
                console.log('5️⃣ Создаем кровлю (roofingMaterial:', roofingMaterial, ')...');
                this.createRoofCovering(length, width, height, roofHeight, roofingMaterial, frontBeamExtension, backBeamExtension, roofType, roofColor, sideOverhang);
            } catch (error) {
                console.error('❌ Ошибка создания кровли:', error);
            }

            console.log('✅ Модель создана. Элементов в canopyGroup:', this.canopyGroup.children.length);

            // 7️⃣ Обновляем Логотип через новый API LogoManager
            if (this.logoManager) {
                // Конвертируем параметры в метры
                const updateParams = {
                    width: width,
                    length: length,
                    height: height,
                    roofHeight: roofHeight,
                    roofType: this.params.roofType || 'var-2',
                    beamHeight: 0.15 // Примерная высота балки (можно брать из модели)
                };

                // Сначала применяем настройки (если нужно сменить режим)
                // Например, ставим на лобовую доску (fascia)
                this.logoManager.apply({
                    target: 'fascia',
                    width: 2.0,  // Размер логотипа (подберите под дизайн)
                    height: 1.0,
                    offset: { x: 0, y: 0.5, z: 0.1 } // Сдвиг: чуть выше балки, и чуть вперед
                });

                // Обновляем позицию
                this.logoManager.update(updateParams);
            }

        } catch (error) {
            console.error('❌ Критическая ошибка создания модели:', error);
        }
    }

    // --- Procedural Generation Helpers ---

    createProceduralWoodMaps(colorHex) {
        const width = 512;
        const height = 512;

        // --- 1. Diffuse (Color) Canvas ---
        const canvasD = document.createElement('canvas');
        canvasD.width = width; canvasD.height = height;
        const ctxD = canvasD.getContext('2d');

        // --- 2. Normal Canvas ---
        const canvasN = document.createElement('canvas');
        canvasN.width = width; canvasN.height = height;
        const ctxN = canvasN.getContext('2d');

        // Fill backgrounds
        // Diffuse: User Color
        ctxD.fillStyle = '#' + new THREE.Color(colorHex).getHexString();
        ctxD.fillRect(0, 0, width, height);

        // Normal: Flat Purple (128, 128, 255)
        ctxN.fillStyle = '#8080ff';
        ctxN.fillRect(0, 0, width, height);

        // Prepare Diffuse Grain Colors
        const baseColor = new THREE.Color(colorHex);
        const darker = '#' + baseColor.clone().multiplyScalar(0.7).getHexString();

        ctxD.strokeStyle = darker;
        ctxD.lineWidth = 4; // VERY Thicker grain
        ctxD.globalAlpha = 0.6; // High visibility

        // Prepare Normal Grain Colors (Perturbations)
        ctxN.strokeStyle = '#a080ff';
        ctxN.lineWidth = 4;
        ctxN.globalAlpha = 0.8; // Strong normal map

        // Shared Random Seed Logic (to align both textures)
        // We generate lines
        const numLines = 80;

        for (let i = 0; i < numLines; i++) {
            const xVal = Math.random() * width;

            // Draw on BOTH contexts with same coordinates
            ctxD.beginPath(); ctxD.moveTo(xVal, 0);
            ctxN.beginPath(); ctxN.moveTo(xVal, 0);

            let currX = xVal;
            for (let y = 0; y < height; y += 10) {
                currX += (Math.random() - 0.5) * 6; // Wiggle

                ctxD.lineTo(currX, y);
                ctxN.lineTo(currX, y);
            }
            ctxD.stroke();
            ctxN.stroke();
        }

        // Noise / Specks (Reduced count and opacity for smoother finish)
        for (let i = 0; i < 2000; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;

            // Diffuse speck
            ctxD.fillStyle = Math.random() > 0.5 ? '#000000' : '#ffffff';
            ctxD.globalAlpha = 0.03; // More subtle
            ctxD.fillRect(x, y, 1, 6);

            // Normal speck (roughness noise)
            ctxN.fillStyle = '#9090ff'; // Slight bump
            ctxN.globalAlpha = 0.05; // Less noisy normal
            ctxN.fillRect(x, y, 1, 6);
        }

        // Create Textures
        const texD = new THREE.CanvasTexture(canvasD);
        texD.wrapS = THREE.RepeatWrapping;
        texD.wrapT = THREE.RepeatWrapping;
        // Anisotropy helps with oblique viewing angles
        texD.anisotropy = this.renderer.capabilities.getMaxAnisotropy();

        const texN = new THREE.CanvasTexture(canvasN);
        texN.wrapS = THREE.RepeatWrapping;
        texN.wrapT = THREE.RepeatWrapping;
        texN.anisotropy = this.renderer.capabilities.getMaxAnisotropy();

        // SRGB for Color Only
        if (parseInt(THREE.REVISION) >= 152) texD.colorSpace = THREE.SRGBColorSpace;
        else texD.encoding = THREE.sRGBEncoding;

        // Normal Map should be Linear (default)

        return { map: texD, normalMap: texN };
    }

    createWoodMaterial(frameMaterial, frameColoring) {
        // --- СИСТЕМА ПРОФИЛЕЙ КРАСОК (Physically Based Paint Profiles) ---
        // Позволяет клиенту видеть разницу между дешевой пропиткой и дорогой краской

        const paintProfiles = {
            // 1. БАЗА (Натуральное дерево)
            'no-coloring': {
                color: 0xE6D0A5,
                roughness: 0.95,     // Очень шершавое, без блеска
                normalScale: 1.5,    // Глубокий рельеф волокон
                bumpScale: 0.05,
                metalness: 0.0,
                description: 'Натуральное дерево (сухое)'
            },

            // 2. ПРОПИТКИ (Эконом/Средний) - Впитываются, оставляют фактуру
            'neomid': {
                color: 0xD4C179,
                roughness: 0.85,     // Матовое
                normalScale: 1.2,    // Фактура ярко выражена
                bumpScale: 0.04,
                metalness: 0.0,
                description: 'Антисептик Neomid (впитывающийся)'
            },
            'texturol-landscape': {
                color: 0xE6C288,
                roughness: 0.65,     // Легкий сатиновый отблеск
                normalScale: 0.9,    // Фактура видна, но мягче
                bumpScale: 0.03,
                metalness: 0.05,
                description: 'Лазурь Texturol Landscape (полуматовая)'
            },

            // 3. ПЛЕНКООБРАЗУЮЩИЕ (Средний+) - Частично скрывают фактуру
            'texturol-country': {
                color: 0x757575,     // Серый (укрывная)
                roughness: 0.5,      // Полуматовая
                normalScale: 0.5,    // Фактура сглажена
                bumpScale: 0.02,
                metalness: 0.1,      // Чуть больше отражений
                description: 'Укрывная пропитка Texturol Country'
            },
            'symphony': {
                color: 0xA0522D,
                roughness: 0.45,     // Благородный сатин
                normalScale: 0.4,    // Гладкая поверхность
                bumpScale: 0.015,
                metalness: 0.1,
                description: 'Symphony Wood Guard (шелковистая)'
            },

            // 4. ПРЕМИУМ (Краски/Масла) - Идеальная поверхность
            'olsta': {
                color: 0x8B4513,
                roughness: 0.35,     // Гладкий полуглянец
                normalScale: 0.25,   // Волокна еле заметны (залиты краской)
                bumpScale: 0.01,
                metalness: 0.15,
                description: 'Масло/Краска Olsta (Премиум)'
            },
            'tikkurila-vinha': {
                color: 0xF5F5F0,     // Белый/Светлый (плотная краска)
                roughness: 0.25,     // Гладкая, почти пластиковая на ощупь
                normalScale: 0.1,    // Фактуры почти нет (толстая пленка)
                bumpScale: 0.005,
                metalness: 0.1,
                description: 'Tikkurila VINHA (Кроющая защита)'
            }
        };

        // Fallback для материалов, если frameColoring не задан или 'default'
        if ((!frameColoring || frameColoring === 'default') && paintProfiles[frameMaterial]) {
            // Если материал имеет профиль (редкий кейс, обычно материал это размер)
            // Но для совместимости оставим базовый цвет
        }

        // Выбираем профиль
        let profile = paintProfiles['no-coloring'];
        if (frameColoring && paintProfiles[frameColoring]) {
            profile = paintProfiles[frameColoring];
        } else if (paintProfiles[frameMaterial]) {
            // Если вдруг передан материал как цвет (маловероятно, но для страховки)
            profile = paintProfiles[frameMaterial];
        }

        console.log(`🎨 Применяем профиль ЛКП: ${frameColoring || 'base'} => ${profile.description}`);

        // Генерируем текстуры, используя базовый цвет профиля
        const maps = this.createProceduralWoodMaps(profile.color);

        // Создаем материал с физикой (PBR)
        const material = new THREE.MeshStandardMaterial({
            map: maps.map,
            normalMap: maps.normalMap,

            // КЛЮЧЕВОЕ: Управление фактурой через NormalScale
            // 1.5 = очень шершавое дерево, 0.1 = гладкая краска
            normalScale: new THREE.Vector2(profile.normalScale, profile.normalScale),

            color: 0xffffff, // Цвет запечен в карту map

            // КЛЮЧЕВОЕ: Управление блеском через Roughness
            // 0.9 = мел, 0.2 = свежая краска/пластик
            roughness: profile.roughness,

            metalness: profile.metalness,

            bumpMap: maps.normalMap,
            bumpScale: profile.bumpScale,

            // Чем глаже краска, тем четче отражения окружающей среды
            envMapIntensity: 1.2 - profile.roughness
        });

        return material;
    }

    correctBoxUVs(geometry, width, height, depth) {
        const uv = geometry.attributes.uv;
        const norm = geometry.attributes.normal;
        if (!uv || !norm) return;

        for (let i = 0; i < uv.count; i++) {
            const nx = Math.abs(norm.getX(i));
            const ny = Math.abs(norm.getY(i));

            let u = uv.getX(i);
            let v = uv.getY(i);

            if (nx > 0.9) { // Left/Right (YZ)
                u *= depth; // Z
                v *= height; // Y
            } else if (ny > 0.9) { // Top/Bottom (XZ)
                u *= width; // X
                v *= depth; // Z
            } else { // Front/Back (XY)
                u *= width; // X
                v *= height; // Y
            }
            uv.setXY(i, u, v);
        }
    }

    // Создание столбов
    async createPosts(length, width, height, woodMaterial, metalMaterial, postType, postMaterial) {
        // ... (Старая логика столбов - можно восстановить из бэкапа или использовать упрощенную)
        // Для MVP восстановим базовую логику создания столбов, но учитывая типы
        // Поскольку полный код столбов очень длинный (см. предыдущий просмотр), я активирую его
        // Но сейчас в этой функции я просто вызову заглушку, так как код столбов у меня есть во view_file 
        // ВНИМАНИЕ: Код столбов БЫЛ во view_file выше 1250 строки? Нет, он начинался с 539!
        // Значит он ЕСТЬ в файле, просто после disposeModel?
        // Нет, view_file 497 показывает disposeModel на 455 строке. А createPosts на 539.
        // Значит createPosts СУЩЕСТВУЕТ в файле ниже!
        // МОЯ ОШИБКА: Я думал они пропали.

        // Мне нужно вставить ТОЛЬКО createModel и createWoodMaterial?
        // Давайте проверим view_file 497 еще раз.
        // Lines 450-452: end of update3DModel (HIDE LOADING INDICATOR).
        // Lines 455-465: disposeModel()
        // Lines 468-469: isGeometryCached
        // Lines 472-512: showLoadingIndicator
        // Lines 515-519: hideLoadingIndicator
        // Lines 522-534: updateTotalPrice
        // Lines 539+: createPosts (!!! ОНА ЕСТЬ !!!)

        // ЗНАЧИТ: createModel была УДАЛЕНА, а createPosts ОСТАЛАСЬ.
        // НО update3DModel вызывает createModel, которой НЕТ.

        // Решение: Вставить createModel ПЕРЕД disposeModel (или в любое место).
        // В createModel я вызываю this.createPosts, this.createLongitudinalBeams и т.д.
        // Эти методы должны существовать.
    }

    createLongitudinalBeams(length, width, height, woodMaterial, frontExt, backExt, postMaterial, postType) {
        // Простая балка 150x150 или 100x150
        const beamH = this.getBeamDimensions(postMaterial, postType).height;
        const beamW = this.getBeamDimensions(postMaterial, postType).width;
        const fullLen = length + frontExt + backExt;

        const geo = new THREE.BoxGeometry(beamW, beamH, fullLen);
        const meshL = new THREE.Mesh(geo, woodMaterial);
        meshL.position.set(-width / 2, height + beamH / 2, (frontExt - backExt) / 2);
        meshL.castShadow = true; meshL.receiveShadow = true;
        this.canopyGroup.add(meshL);

        const meshR = new THREE.Mesh(geo, woodMaterial);
        meshR.position.set(width / 2, height + beamH / 2, (frontExt - backExt) / 2);
        meshR.castShadow = true; meshR.receiveShadow = true;
        this.canopyGroup.add(meshR);
    }

    getPostDimensions(material) {
        // Парсинг glued-150x150 -> 0.15
        if (material.includes('150x150')) return { width: 0.15, height: 0.15 };
        if (material.includes('100x100')) return { width: 0.1, height: 0.1 };
        if (material.includes('200x200')) return { width: 0.2, height: 0.2 };
        return { width: 0.15, height: 0.15 };
    }

    getBeamDimensions(material, postType) {
        // Обычно балка чуть меньше или такая же
        return this.getPostDimensions(material);
    }

    async createBeamBraces() {
        // Заглушка раскосов, если удалили код
        // Но лучше использовать Braces Code Loader если он есть
        if (window.CanopyApp && window.CanopyApp.bracesLoader) {
            // Использовать глобальный лоадер
        }
    }



    createRoofCovering(length, width, height, roofHeight, roofingMaterial, frontExt, backExt, roofType, roofColor, sideOverhang = 0.1) {
        if (this.roofSystem) {
            this.roofSystem.update({
                length: length,
                width: width,
                height: height,
                roofHeight: roofHeight,
                roofType: roofType,
                roofingMaterial: roofingMaterial,
                roofColor: roofColor,
                overhang: sideOverhang, // Use the passed slider value (in meters)
                baseHeight: height // Start from beam top
            });
        }
    }

    // --- UTILITY METHODS ---

    // Очистка модели и ресурсов
    disposeModel() {
        if (!this.canopyGroup) return;
        while (this.canopyGroup.children.length > 0) {
            const child = this.canopyGroup.children[0];
            this.canopyGroup.remove(child);
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                else child.material.dispose();
            }
        }
    }

    // Показать индикатор загрузки
    showLoadingIndicator() {
        if (!this.canvasElement) return;
        const canvas = this.canvasElement;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (!this.loadingOverlay) {
            this.loadingOverlay = document.createElement('div');
            this.loadingOverlay.style.cssText = `
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(248, 249, 250, 0.8); display: flex;
                align-items: center; justify-content: center;
                z-index: 1000; border-radius: 10px;
            `;
            this.loadingSpinner = document.createElement('div');
            this.loadingSpinner.style.cssText = `
                width: 40px; height: 40px; border: 3px solid #e9ecef;
                border-top: 3px solid #20B5B9; border-radius: 50%;
                animation: spin 1s linear infinite;
            `;
            this.loadingOverlay.appendChild(this.loadingSpinner);
            this.canvasElement.parentElement.style.position = 'relative';
            this.canvasElement.parentElement.appendChild(this.loadingOverlay);
        }
        this.loadingOverlay.style.display = 'flex';
    }

    hideLoadingIndicator() {
        if (this.loadingOverlay) this.loadingOverlay.style.display = 'none';
    }

    updateTotalPrice(totalCost) {
        const totalPriceElement = document.getElementById('totalPrice');
        if (totalPriceElement) {
            const formattedPrice = new Intl.NumberFormat('ru-RU', {
                style: 'currency', currency: 'RUB', minimumFractionDigits: 0, maximumFractionDigits: 0
            }).format(totalCost).replace('RUB', '₽');
            totalPriceElement.textContent = formattedPrice;
        }
    }

    // Геометрия кэширование
    getCachedGeometry(key, createFn) {
        if (!this.geometryCache) this.geometryCache = new Map();
        if (this.geometryCache.has(key)) return this.geometryCache.get(key);
        const geo = createFn();
        this.geometryCache.set(key, geo);
        return geo;
    }

    getCachedMaterial(key, createFn) {
        if (!this.materialCache) this.materialCache = new Map();
        if (this.materialCache.has(key)) return this.materialCache.get(key);
        const mat = createFn();
        this.materialCache.set(key, mat);
        return mat;
    }

    getCachedTexture(key, createFn) {
        if (!this.textureCache) this.textureCache = new Map();
        if (this.textureCache.has(key)) return this.textureCache.get(key);
        const tex = createFn();
        this.textureCache.set(key, tex);
        return tex;
    }

    isGeometryCached(key) { return this.geometryCache && this.geometryCache.has(key); }
    isMaterialCached(key) { return this.materialCache && this.materialCache.has(key); }

    // Получение выбранного значения радиокнопки

    // Функция создания столбов (стандартные геометрические формы)
    async createPosts(length, width, height, woodMaterial, metalMaterial, postType, postMaterial) {
        const postSpacing = this.currentPostSpacing;
        const postsAlongLength = Math.ceil(length / postSpacing) + 1;
        const postDimensions = this.getPostDimensions(postMaterial);
        const beamDimensions = this.getBeamDimensions(postMaterial, postType);

        // Параметры подпятника и капители
        const hasBottomFooting = postType === 'var-5' || postType === 'var-4'; // Подпятник внизу для var-5 и var-4
        const hasTopFooting = postType === 'var-1'; // Подпятник вверху для var-1
        const hasCapital = postType === 'var-3' || postType === 'var-4'; // Капитель для var-3 и var-4
        const hasFooting = hasBottomFooting || hasTopFooting;
        const footingHeight = 0.04; // 40 мм
        const footingOverhang = 0.04; // 40 мм с каждой стороны
        const capitalHeight = 0.08; // 80 мм высота капители
        const capitalOverhang = 0.05; // 50 мм расширение с каждой стороны

        // Высота позиционирования столба (столб входит в подпятник, не поднимается)
        const postYPosition = height / 2;

        // Создаем кэшированную геометрию для столбов
        const postGeometryKey = `post_${postDimensions.width}_${height}_${postDimensions.height}`;
        const postGeometry = this.getCachedGeometry(postGeometryKey, () => {
            return new THREE.BoxGeometry(postDimensions.width, height, postDimensions.height);
        });

        // Создаем геометрию подпятника (если нужна)
        let footingGeometry = null;
        if (hasFooting) {
            const footingWidth = postDimensions.width + footingOverhang * 2;
            const footingDepth = postDimensions.height + footingOverhang * 2;
            footingGeometry = new THREE.BoxGeometry(footingWidth, footingHeight, footingDepth);
        }

        // Создаем геометрию капители (если нужна)
        let capitalGeometry = null;
        if (hasCapital) {
            const capitalWidth = postDimensions.width + capitalOverhang * 2;
            const capitalDepth = postDimensions.height + capitalOverhang * 2;
            capitalGeometry = new THREE.BoxGeometry(capitalWidth, capitalHeight, capitalDepth);
        }

        for (let i = 0; i < postsAlongLength; i++) {
            const z = -length / 2 + (i * length / (postsAlongLength - 1));

            // Левый столб (стандартная геометрия или куст для var-1)
            if (postType === 'var-1') {
                // Создаем куст из 4 квадратных столбов 80x80мм с расстоянием между осями 100мм
                const clusterSize = 0.08; // 80 мм
                const clusterSpacing = 0.1; // 100 мм
                // Высота столбов уменьшена на высоту подпятника (подпятник между столбом и балкой)
                const reducedHeight = height - footingHeight;
                const clusterGeometry = new THREE.BoxGeometry(clusterSize, reducedHeight, clusterSize);
                const clusterYPosition = reducedHeight / 2; // Центр столба на половине его высоты

                // Позиции 4 столбов в квадрате 2x2
                const clusterPositions = [
                    { x: -width / 2 - clusterSpacing / 2, z: z - clusterSpacing / 2 },
                    { x: -width / 2 + clusterSpacing / 2, z: z - clusterSpacing / 2 },
                    { x: -width / 2 - clusterSpacing / 2, z: z + clusterSpacing / 2 },
                    { x: -width / 2 + clusterSpacing / 2, z: z + clusterSpacing / 2 }
                ];

                clusterPositions.forEach(pos => {
                    const clusterPost = new THREE.Mesh(clusterGeometry, woodMaterial);
                    clusterPost.position.set(pos.x, clusterYPosition, pos.z);
                    clusterPost.castShadow = true;
                    clusterPost.receiveShadow = true;
                    this.canopyGroup.add(clusterPost);
                });

                // Создаем перемычки между столбами в кусте
                const crossbarWidth = 0.02; // 20 мм
                const crossbarHeight = 0.15; // 150 мм
                const crossbarDepth = 0.08; // 80 мм
                const verticalSpacing = 0.51; // 510 мм между перемычками по вертикали

                // Количество уровней перемычек
                const numLevels = Math.floor(reducedHeight / verticalSpacing);

                // Создаем перемычки на разных уровнях
                for (let level = 0; level < numLevels; level++) {
                    const crossbarY = verticalSpacing * (level + 1);

                    // Перемычки между столбами (соединяем все 4 столба по периметру)
                    const crossbarConnections = [
                        // По оси Z
                        { start: 0, end: 2, axis: 'z' }, // левый нижний - левый верхний
                        { start: 1, end: 3, axis: 'z' }, // правый нижний - правый верхний
                        // По оси X
                        { start: 0, end: 1, axis: 'x' }, // левый нижний - правый нижний
                        { start: 2, end: 3, axis: 'x' }  // левый верхний - правый верхний
                    ];

                    crossbarConnections.forEach((conn, idx) => {
                        const startPos = clusterPositions[conn.start];
                        const endPos = clusterPositions[conn.end];

                        // Вычисляем центр перемычки
                        const centerX = (startPos.x + endPos.x) / 2;
                        const centerZ = (startPos.z + endPos.z) / 2;

                        // Создаем геометрию перемычки в зависимости от оси
                        let crossbarGeometry;
                        if (conn.axis === 'z') {
                            // Перемычка вдоль оси Z
                            crossbarGeometry = new THREE.BoxGeometry(crossbarDepth, crossbarHeight, clusterSpacing);
                        } else {
                            // Перемычка вдоль оси X
                            crossbarGeometry = new THREE.BoxGeometry(clusterSpacing, crossbarHeight, crossbarDepth);
                        }

                        // Добавляем вариацию в UV-координаты для разнообразия текстуры
                        const uvAttribute = crossbarGeometry.attributes.uv;
                        if (uvAttribute) {
                            // Создаем детерминированное смещение для каждой перемычки
                            const seed = (level * 7 + idx * 13 + i * 5) % 17;
                            const offsetU = (seed % 3) * 0.33; // Смещение по U (0, 0.33, 0.66)
                            const offsetV = (Math.floor(seed / 3) % 3) * 0.33; // Смещение по V

                            for (let j = 0; j < uvAttribute.count; j++) {
                                uvAttribute.setXY(
                                    j,
                                    uvAttribute.getX(j) + offsetU,
                                    uvAttribute.getY(j) + offsetV
                                );
                            }
                            uvAttribute.needsUpdate = true;
                        }

                        const crossbar = new THREE.Mesh(crossbarGeometry, woodMaterial);
                        crossbar.position.set(centerX, crossbarY, centerZ);
                        crossbar.castShadow = true;
                        crossbar.receiveShadow = true;
                        this.canopyGroup.add(crossbar);
                    });
                }
            } else if (postType === 'var-2') {
                // Столб var-2 с вогнутыми плоскостями
                const baseWidth = 0.27; // 270 мм
                const baseHeight = 1.035; // 1035 мм
                const recessWidth = 0.13; // 130 мм - ширина вогнутости
                const recessHeight = 0.894; // 894 мм - высота вогнутости
                const recessDepth = 0.02; // 20 мм - глубина вогнутости
                const astragalSize = 0.29; // 290 мм - астрагал
                const astragalHeight = 0.05; // высота астрагала (примерно)

                // Позиция базы столба
                const baseY = baseHeight / 2;

                // Высота верхней части (над вогнутостью)
                const topPartHeight = (baseHeight - recessHeight) / 2;
                // Высота нижней части (под вогнутостью)
                const bottomPartHeight = topPartHeight;

                // Создаем нижнюю часть базы (полный размер)
                const bottomGeometry = new THREE.BoxGeometry(baseWidth, bottomPartHeight, baseWidth);
                const bottomPart = new THREE.Mesh(bottomGeometry, woodMaterial);
                bottomPart.position.set(-width / 2, bottomPartHeight / 2, z);
                bottomPart.castShadow = true;
                bottomPart.receiveShadow = true;
                this.canopyGroup.add(bottomPart);

                // Создаем среднюю часть с вогнутостями
                const middleY = bottomPartHeight + recessHeight / 2;

                // Для создания вогнутости используем 4 угловых столба и центральную утопленную часть
                const cornerSize = (baseWidth - recessWidth) / 2;
                const cornerGeometry = new THREE.BoxGeometry(cornerSize, recessHeight, cornerSize);

                // 4 угловых элемента (полная глубина)
                const corners = [
                    { x: -width / 2 - baseWidth / 2 + cornerSize / 2, z: z - baseWidth / 2 + cornerSize / 2 },
                    { x: -width / 2 + baseWidth / 2 - cornerSize / 2, z: z - baseWidth / 2 + cornerSize / 2 },
                    { x: -width / 2 - baseWidth / 2 + cornerSize / 2, z: z + baseWidth / 2 - cornerSize / 2 },
                    { x: -width / 2 + baseWidth / 2 - cornerSize / 2, z: z + baseWidth / 2 - cornerSize / 2 }
                ];

                corners.forEach(pos => {
                    const corner = new THREE.Mesh(cornerGeometry, woodMaterial);
                    corner.position.set(pos.x, middleY, pos.z);
                    corner.castShadow = true;
                    corner.receiveShadow = true;
                    this.canopyGroup.add(corner);
                });

                // Центральная утопленная часть (на 20 мм меньше с каждой стороны)
                const recessedDepth = baseWidth - recessDepth * 2;
                const centerGeometry = new THREE.BoxGeometry(recessWidth, recessHeight, recessedDepth);
                const centerPart = new THREE.Mesh(centerGeometry, woodMaterial);
                centerPart.position.set(-width / 2, middleY, z);
                centerPart.castShadow = true;
                centerPart.receiveShadow = true;
                this.canopyGroup.add(centerPart);

                // Боковые утопленные части (по оси X)
                const sideXGeometry = new THREE.BoxGeometry(recessedDepth, recessHeight, recessWidth);
                const sideXPart = new THREE.Mesh(sideXGeometry, woodMaterial);
                sideXPart.position.set(-width / 2, middleY, z);
                sideXPart.castShadow = true;
                sideXPart.receiveShadow = true;
                this.canopyGroup.add(sideXPart);

                // Создаем верхнюю часть базы (полный размер)
                const topPartY = bottomPartHeight + recessHeight + topPartHeight / 2;
                const topGeometry = new THREE.BoxGeometry(baseWidth, topPartHeight, baseWidth);
                const topPart = new THREE.Mesh(topGeometry, woodMaterial);
                topPart.position.set(-width / 2, topPartY, z);
                topPart.castShadow = true;
                topPart.receiveShadow = true;
                this.canopyGroup.add(topPart);

                // Добавляем астрагал сверху базы
                const astragalY = baseHeight + astragalHeight / 2;
                const astragalGeometry = new THREE.BoxGeometry(astragalSize, astragalHeight, astragalSize);
                const astragal = new THREE.Mesh(astragalGeometry, woodMaterial);
                astragal.position.set(-width / 2, astragalY, z);
                astragal.castShadow = true;
                astragal.receiveShadow = true;
                this.canopyGroup.add(astragal);

                // Если высота столба больше базы, добавляем верхнюю часть с сечением из postMaterial
                if (height > baseHeight + astragalHeight) {
                    const upperPartHeight = height - baseHeight - astragalHeight;
                    // Используем сечение столба из выбранного материала
                    const upperGeometry = new THREE.BoxGeometry(postDimensions.width, upperPartHeight, postDimensions.height);
                    const upperPart = new THREE.Mesh(upperGeometry, woodMaterial);
                    upperPart.position.set(-width / 2, baseHeight + astragalHeight + upperPartHeight / 2, z);
                    upperPart.castShadow = true;
                    upperPart.receiveShadow = true;
                    this.canopyGroup.add(upperPart);
                }
            } else if (postType === 'var-3') {
                // Столб var-3 с базой и астрагалом
                const baseWidth = 0.38; // 380 мм
                const baseHeight = 0.7; // 700 мм
                const astragalSize = 0.48; // 480 мм - астрагал
                const astragalHeight = 0.05; // 50 мм - высота астрагала

                // Создаем базу столба
                const baseGeometry = new THREE.BoxGeometry(baseWidth, baseHeight, baseWidth);
                const basePart = new THREE.Mesh(baseGeometry, woodMaterial);
                basePart.position.set(-width / 2, baseHeight / 2, z);
                basePart.castShadow = true;
                basePart.receiveShadow = true;
                this.canopyGroup.add(basePart);

                // Добавляем астрагал сверху базы
                const astragalY = baseHeight + astragalHeight / 2;
                const astragalGeometry = new THREE.BoxGeometry(astragalSize, astragalHeight, astragalSize);
                this.correctBoxUVs(astragalGeometry, astragalSize, astragalHeight, astragalSize);
                const astragal = new THREE.Mesh(astragalGeometry, woodMaterial);
                astragal.position.set(-width / 2, astragalY, z);
                astragal.castShadow = true;
                astragal.receiveShadow = true;
                this.canopyGroup.add(astragal);

                // Если высота столба больше базы, добавляем верхнюю часть с сечением из postMaterial
                if (height > baseHeight + astragalHeight) {
                    const upperPartHeight = height - baseHeight - astragalHeight;
                    // Используем сечение столба из выбранного материала
                    const upperGeometry = new THREE.BoxGeometry(postDimensions.width, upperPartHeight, postDimensions.height);
                    this.correctBoxUVs(upperGeometry, postDimensions.width, upperPartHeight, postDimensions.height);
                    const upperPart = new THREE.Mesh(upperGeometry, woodMaterial);
                    upperPart.position.set(-width / 2, baseHeight + astragalHeight + upperPartHeight / 2, z);
                    upperPart.castShadow = true;
                    upperPart.receiveShadow = true;
                    this.canopyGroup.add(upperPart);
                }
            } else if (postType === 'var-4') {
                // Столб var-4 с базой и астрагалом
                const baseWidth = 0.28; // 280 мм
                const baseHeight = 0.4; // 400 мм
                const astragalSize = 0.3; // 300 мм - астрагал
                const astragalHeight = 0.015; // 15 мм - высота астрагала

                // Создаем базу столба
                const baseGeometry = new THREE.BoxGeometry(baseWidth, baseHeight, baseWidth);
                this.correctBoxUVs(baseGeometry, baseWidth, baseHeight, baseWidth);
                const basePart = new THREE.Mesh(baseGeometry, woodMaterial);
                basePart.position.set(-width / 2, baseHeight / 2, z);
                basePart.castShadow = true;
                basePart.receiveShadow = true;
                this.canopyGroup.add(basePart);

                // Добавляем астрагал сверху базы
                const astragalY = baseHeight + astragalHeight / 2;
                const astragalGeometry = new THREE.BoxGeometry(astragalSize, astragalHeight, astragalSize);
                this.correctBoxUVs(astragalGeometry, astragalSize, astragalHeight, astragalSize);
                const astragal = new THREE.Mesh(astragalGeometry, woodMaterial);
                astragal.position.set(-width / 2, astragalY, z);
                astragal.castShadow = true;
                astragal.receiveShadow = true;
                this.canopyGroup.add(astragal);

                // Если высота столба больше базы, добавляем верхнюю часть с сечением из postMaterial
                if (height > baseHeight + astragalHeight) {
                    const upperPartHeight = height - baseHeight - astragalHeight;
                    // Используем сечение столба из выбранного материала
                    const upperGeometry = new THREE.BoxGeometry(postDimensions.width, upperPartHeight, postDimensions.height);
                    this.correctBoxUVs(upperGeometry, postDimensions.width, upperPartHeight, postDimensions.height);
                    const upperPart = new THREE.Mesh(upperGeometry, woodMaterial);
                    upperPart.position.set(-width / 2, baseHeight + astragalHeight + upperPartHeight / 2, z);
                    upperPart.castShadow = true;
                    upperPart.receiveShadow = true;
                    this.canopyGroup.add(upperPart);
                }
            } else if (postType === 'var-6') {
                // Столб var-6: куст var-1 с базой и капителью
                const baseWidth = 0.28; // 280 мм
                const baseHeight = 0.4; // 400 мм
                const astragalSize = 0.3; // 300 мм
                const astragalHeight = 0.015; // 15 мм

                // Создаем базу столба (внизу)
                const baseGeometry = new THREE.BoxGeometry(baseWidth, baseHeight, baseWidth);
                this.correctBoxUVs(baseGeometry, baseWidth, baseHeight, baseWidth);
                const basePart = new THREE.Mesh(baseGeometry, woodMaterial);
                basePart.position.set(-width / 2, baseHeight / 2, z);
                basePart.castShadow = true;
                basePart.receiveShadow = true;
                this.canopyGroup.add(basePart);

                // Добавляем нижний астрагал (над базой)
                const bottomAstragalY = baseHeight + astragalHeight / 2;
                const bottomAstragalGeometry = new THREE.BoxGeometry(astragalSize, astragalHeight, astragalSize);
                this.correctBoxUVs(bottomAstragalGeometry, astragalSize, astragalHeight, astragalSize);
                const bottomAstragal = new THREE.Mesh(bottomAstragalGeometry, woodMaterial);
                bottomAstragal.position.set(-width / 2, bottomAstragalY, z);
                bottomAstragal.castShadow = true;
                bottomAstragal.receiveShadow = true;
                this.canopyGroup.add(bottomAstragal);

                // Создаем куст из 4 квадратных столбов (как в var-1)
                const clusterSize = 0.08; // 80 мм
                const clusterSpacing = 0.1; // 100 мм
                const clusterStartY = baseHeight + astragalHeight;
                const clusterHeight = height - baseHeight - astragalHeight - astragalHeight - baseHeight; // высота куста
                const clusterGeometry = new THREE.BoxGeometry(clusterSize, clusterHeight, clusterSize);
                this.correctBoxUVs(clusterGeometry, clusterSize, clusterHeight, clusterSize);
                const clusterYPosition = clusterStartY + clusterHeight / 2;

                // Позиции 4 столбов в квадрате 2x2
                const clusterPositions = [
                    { x: -width / 2 - clusterSpacing / 2, z: z - clusterSpacing / 2 },
                    { x: -width / 2 + clusterSpacing / 2, z: z - clusterSpacing / 2 },
                    { x: -width / 2 - clusterSpacing / 2, z: z + clusterSpacing / 2 },
                    { x: -width / 2 + clusterSpacing / 2, z: z + clusterSpacing / 2 }
                ];

                clusterPositions.forEach(pos => {
                    const clusterPost = new THREE.Mesh(clusterGeometry, woodMaterial);
                    clusterPost.position.set(pos.x, clusterYPosition, pos.z);
                    clusterPost.castShadow = true;
                    clusterPost.receiveShadow = true;
                    this.canopyGroup.add(clusterPost);
                });

                // Создаем перемычки между столбами в кусте
                const crossbarWidth = 0.02; // 20 мм
                const crossbarHeight = 0.15; // 150 мм
                const crossbarDepth = 0.08; // 80 мм
                const verticalSpacing = 0.51; // 510 мм
                const numLevels = Math.floor(clusterHeight / verticalSpacing);

                for (let level = 0; level < numLevels; level++) {
                    const crossbarY = clusterStartY + verticalSpacing * (level + 1);

                    const crossbarConnections = [
                        { start: 0, end: 2, axis: 'z' },
                        { start: 1, end: 3, axis: 'z' },
                        { start: 0, end: 1, axis: 'x' },
                        { start: 2, end: 3, axis: 'x' }
                    ];

                    crossbarConnections.forEach((conn, idx) => {
                        const startPos = clusterPositions[conn.start];
                        const endPos = clusterPositions[conn.end];
                        const centerX = (startPos.x + endPos.x) / 2;
                        const centerZ = (startPos.z + endPos.z) / 2;

                        let crossbarGeometry;
                        if (conn.axis === 'z') {
                            crossbarGeometry = new THREE.BoxGeometry(crossbarDepth, crossbarHeight, clusterSpacing);
                            this.correctBoxUVs(crossbarGeometry, crossbarDepth, crossbarHeight, clusterSpacing);
                        } else {
                            crossbarGeometry = new THREE.BoxGeometry(clusterSpacing, crossbarHeight, crossbarDepth);
                            this.correctBoxUVs(crossbarGeometry, clusterSpacing, crossbarHeight, crossbarDepth);
                        }

                        // UV offset is less importnat if we scale correctly, but keeping it for variety
                        const uvAttribute = crossbarGeometry.attributes.uv;
                        if (uvAttribute) {
                            const seed = (level * 7 + idx * 13 + i * 5) % 17;
                            const offsetU = (seed % 3) * 0.33;
                            const offsetV = (Math.floor(seed / 3) % 3) * 0.33;

                            for (let j = 0; j < uvAttribute.count; j++) {
                                uvAttribute.setXY(j, uvAttribute.getX(j) + offsetU, uvAttribute.getY(j) + offsetV);
                            }
                            uvAttribute.needsUpdate = true;
                        }

                        const crossbar = new THREE.Mesh(crossbarGeometry, woodMaterial);
                        crossbar.position.set(centerX, crossbarY, centerZ);
                        crossbar.castShadow = true;
                        crossbar.receiveShadow = true;
                        this.canopyGroup.add(crossbar);
                    });
                }

                // Добавляем верхний астрагал (над кустом)
                const topAstragalY = height - baseHeight - astragalHeight / 2;
                const topAstragalGeometry = new THREE.BoxGeometry(astragalSize, astragalHeight, astragalSize);
                this.correctBoxUVs(topAstragalGeometry, astragalSize, astragalHeight, astragalSize);
                const topAstragal = new THREE.Mesh(topAstragalGeometry, woodMaterial);
                topAstragal.position.set(-width / 2, topAstragalY, z);
                topAstragal.castShadow = true;
                topAstragal.receiveShadow = true;
                this.canopyGroup.add(topAstragal);

                // Создаем капитель (отзеркаленная база сверху)
                const capitalY = height - baseHeight / 2;
                const capitalGeometry = new THREE.BoxGeometry(baseWidth, baseHeight, baseWidth);
                const capitalPart = new THREE.Mesh(capitalGeometry, woodMaterial);
                capitalPart.position.set(-width / 2, capitalY, z);
                capitalPart.castShadow = true;
                capitalPart.receiveShadow = true;
                this.canopyGroup.add(capitalPart);
            } else {
                // Стандартный столб для остальных типов
                const leftPost = new THREE.Mesh(postGeometry, woodMaterial);
                leftPost.position.set(-width / 2, postYPosition, z);
                leftPost.castShadow = true;
                leftPost.receiveShadow = true;
                this.canopyGroup.add(leftPost);
            }

            // Подпятник для левого столба (если нужен, кроме var-2, var-3, var-4 и var-6)
            if (hasFooting && footingGeometry && postType !== 'var-2' && postType !== 'var-3' && postType !== 'var-4' && postType !== 'var-6') {
                const leftFooting = new THREE.Mesh(footingGeometry, woodMaterial);
                // Для var-1 подпятник под балкой (между столбом и балкой), для var-5 и var-4 - внизу
                const leftFootingY = hasTopFooting ? height - footingHeight / 2 : footingHeight / 2;
                leftFooting.position.set(-width / 2, leftFootingY, z);
                leftFooting.castShadow = true;
                leftFooting.receiveShadow = true;
                this.canopyGroup.add(leftFooting);
            }

            // Капитель для левого столба (если нужна, кроме var-1, var-2, var-3, var-4 и var-6)
            if (hasCapital && capitalGeometry && postType !== 'var-1' && postType !== 'var-2' && postType !== 'var-3' && postType !== 'var-4' && postType !== 'var-6') {
                const leftCapital = new THREE.Mesh(capitalGeometry, woodMaterial);
                // Капитель размещается на верху столба
                const capitalY = height - capitalHeight / 2;
                leftCapital.position.set(-width / 2, capitalY, z);
                leftCapital.castShadow = true;
                leftCapital.receiveShadow = true;
                this.canopyGroup.add(leftCapital);
            }

            // Правый столб (стандартная геометрия или куст для var-1)
            if (postType === 'var-1') {
                // Создаем куст из 4 квадратных столбов 80x80мм с расстоянием между осями 100мм
                const clusterSize = 0.08; // 80 мм
                const clusterSpacing = 0.1; // 100 мм
                // Высота столбов уменьшена на высоту подпятника (подпятник между столбом и балкой)
                const reducedHeight = height - footingHeight;
                const clusterGeometry = new THREE.BoxGeometry(clusterSize, reducedHeight, clusterSize);
                const clusterYPosition = reducedHeight / 2; // Центр столба на половине его высоты

                // Позиции 4 столбов в квадрате 2x2
                const clusterPositions = [
                    { x: width / 2 - clusterSpacing / 2, z: z - clusterSpacing / 2 },
                    { x: width / 2 + clusterSpacing / 2, z: z - clusterSpacing / 2 },
                    { x: width / 2 - clusterSpacing / 2, z: z + clusterSpacing / 2 },
                    { x: width / 2 + clusterSpacing / 2, z: z + clusterSpacing / 2 }
                ];

                clusterPositions.forEach(pos => {
                    const clusterPost = new THREE.Mesh(clusterGeometry, woodMaterial);
                    clusterPost.position.set(pos.x, clusterYPosition, pos.z);
                    clusterPost.castShadow = true;
                    clusterPost.receiveShadow = true;
                    this.canopyGroup.add(clusterPost);
                });

                // Создаем перемычки между столбами в кусте
                const crossbarWidth = 0.02; // 20 мм
                const crossbarHeight = 0.15; // 150 мм
                const crossbarDepth = 0.08; // 80 мм
                const verticalSpacing = 0.51; // 510 мм между перемычками по вертикали

                // Количество уровней перемычек
                const numLevels = Math.floor(reducedHeight / verticalSpacing);

                // Создаем перемычки на разных уровнях
                for (let level = 0; level < numLevels; level++) {
                    const crossbarY = verticalSpacing * (level + 1);

                    // Перемычки между столбами (соединяем все 4 столба по периметру)
                    const crossbarConnections = [
                        // По оси Z
                        { start: 0, end: 2, axis: 'z' }, // левый нижний - левый верхний
                        { start: 1, end: 3, axis: 'z' }, // правый нижний - правый верхний
                        // По оси X
                        { start: 0, end: 1, axis: 'x' }, // левый нижний - правый нижний
                        { start: 2, end: 3, axis: 'x' }  // левый верхний - правый верхний
                    ];

                    crossbarConnections.forEach((conn, idx) => {
                        const startPos = clusterPositions[conn.start];
                        const endPos = clusterPositions[conn.end];

                        // Вычисляем центр перемычки
                        const centerX = (startPos.x + endPos.x) / 2;
                        const centerZ = (startPos.z + endPos.z) / 2;

                        // Создаем геометрию перемычки в зависимости от оси
                        let crossbarGeometry;
                        if (conn.axis === 'z') {
                            // Перемычка вдоль оси Z
                            crossbarGeometry = new THREE.BoxGeometry(crossbarDepth, crossbarHeight, clusterSpacing);
                        } else {
                            // Перемычка вдоль оси X
                            crossbarGeometry = new THREE.BoxGeometry(clusterSpacing, crossbarHeight, crossbarDepth);
                        }

                        // Добавляем вариацию в UV-координаты для разнообразия текстуры
                        const uvAttribute = crossbarGeometry.attributes.uv;
                        if (uvAttribute) {
                            // Создаем детерминированное смещение для каждой перемычки
                            const seed = (level * 7 + idx * 13 + i * 5) % 17;
                            const offsetU = (seed % 3) * 0.33; // Смещение по U (0, 0.33, 0.66)
                            const offsetV = (Math.floor(seed / 3) % 3) * 0.33; // Смещение по V

                            for (let j = 0; j < uvAttribute.count; j++) {
                                uvAttribute.setXY(
                                    j,
                                    uvAttribute.getX(j) + offsetU,
                                    uvAttribute.getY(j) + offsetV
                                );
                            }
                            uvAttribute.needsUpdate = true;
                        }

                        const crossbar = new THREE.Mesh(crossbarGeometry, woodMaterial);
                        crossbar.position.set(centerX, crossbarY, centerZ);
                        crossbar.castShadow = true;
                        crossbar.receiveShadow = true;
                        this.canopyGroup.add(crossbar);
                    });
                }
            } else if (postType === 'var-2') {
                // Столб var-2 с вогнутыми плоскостями
                const baseWidth = 0.27; // 270 мм
                const baseHeight = 1.035; // 1035 мм
                const recessWidth = 0.13; // 130 мм - ширина вогнутости
                const recessHeight = 0.894; // 894 мм - высота вогнутости
                const recessDepth = 0.02; // 20 мм - глубина вогнутости
                const astragalSize = 0.29; // 290 мм - астрагал
                const astragalHeight = 0.05; // высота астрагала (примерно)

                // Позиция базы столба
                const baseY = baseHeight / 2;

                // Высота верхней части (над вогнутостью)
                const topPartHeight = (baseHeight - recessHeight) / 2;
                // Высота нижней части (под вогнутостью)
                const bottomPartHeight = topPartHeight;

                // Создаем нижнюю часть базы (полный размер)
                const bottomGeometry = new THREE.BoxGeometry(baseWidth, bottomPartHeight, baseWidth);
                const bottomPart = new THREE.Mesh(bottomGeometry, woodMaterial);
                bottomPart.position.set(width / 2, bottomPartHeight / 2, z);
                bottomPart.castShadow = true;
                bottomPart.receiveShadow = true;
                this.canopyGroup.add(bottomPart);

                // Создаем среднюю часть с вогнутостями
                const middleY = bottomPartHeight + recessHeight / 2;

                // Для создания вогнутости используем 4 угловых столба и центральную утопленную часть
                const cornerSize = (baseWidth - recessWidth) / 2;
                const cornerGeometry = new THREE.BoxGeometry(cornerSize, recessHeight, cornerSize);

                // 4 угловых элемента (полная глубина)
                const corners = [
                    { x: width / 2 - baseWidth / 2 + cornerSize / 2, z: z - baseWidth / 2 + cornerSize / 2 },
                    { x: width / 2 + baseWidth / 2 - cornerSize / 2, z: z - baseWidth / 2 + cornerSize / 2 },
                    { x: width / 2 - baseWidth / 2 + cornerSize / 2, z: z + baseWidth / 2 - cornerSize / 2 },
                    { x: width / 2 + baseWidth / 2 - cornerSize / 2, z: z + baseWidth / 2 - cornerSize / 2 }
                ];

                corners.forEach(pos => {
                    const corner = new THREE.Mesh(cornerGeometry, woodMaterial);
                    corner.position.set(pos.x, middleY, pos.z);
                    corner.castShadow = true;
                    corner.receiveShadow = true;
                    this.canopyGroup.add(corner);
                });

                // Центральная утопленная часть (на 20 мм меньше с каждой стороны)
                const recessedDepth = baseWidth - recessDepth * 2;
                const centerGeometry = new THREE.BoxGeometry(recessWidth, recessHeight, recessedDepth);
                const centerPart = new THREE.Mesh(centerGeometry, woodMaterial);
                centerPart.position.set(width / 2, middleY, z);
                centerPart.castShadow = true;
                centerPart.receiveShadow = true;
                this.canopyGroup.add(centerPart);

                // Боковые утопленные части (по оси X)
                const sideXGeometry = new THREE.BoxGeometry(recessedDepth, recessHeight, recessWidth);
                const sideXPart = new THREE.Mesh(sideXGeometry, woodMaterial);
                sideXPart.position.set(width / 2, middleY, z);
                sideXPart.castShadow = true;
                sideXPart.receiveShadow = true;
                this.canopyGroup.add(sideXPart);

                // Создаем верхнюю часть базы (полный размер)
                const topPartY = bottomPartHeight + recessHeight + topPartHeight / 2;
                const topGeometry = new THREE.BoxGeometry(baseWidth, topPartHeight, baseWidth);
                const topPart = new THREE.Mesh(topGeometry, woodMaterial);
                topPart.position.set(width / 2, topPartY, z);
                topPart.castShadow = true;
                topPart.receiveShadow = true;
                this.canopyGroup.add(topPart);

                // Добавляем астрагал сверху базы
                const astragalY = baseHeight + astragalHeight / 2;
                const astragalGeometry = new THREE.BoxGeometry(astragalSize, astragalHeight, astragalSize);
                const astragal = new THREE.Mesh(astragalGeometry, woodMaterial);
                astragal.position.set(width / 2, astragalY, z);
                astragal.castShadow = true;
                astragal.receiveShadow = true;
                this.canopyGroup.add(astragal);

                // Если высота столба больше базы, добавляем верхнюю часть с сечением из postMaterial
                if (height > baseHeight + astragalHeight) {
                    const upperPartHeight = height - baseHeight - astragalHeight;
                    // Используем сечение столба из выбранного материала
                    const upperGeometry = new THREE.BoxGeometry(postDimensions.width, upperPartHeight, postDimensions.height);
                    const upperPart = new THREE.Mesh(upperGeometry, woodMaterial);
                    upperPart.position.set(width / 2, baseHeight + astragalHeight + upperPartHeight / 2, z);
                    upperPart.castShadow = true;
                    upperPart.receiveShadow = true;
                    this.canopyGroup.add(upperPart);
                }
            } else if (postType === 'var-3') {
                // Столб var-3 с базой и астрагалом
                const baseWidth = 0.38; // 380 мм
                const baseHeight = 0.7; // 700 мм
                const astragalSize = 0.48; // 480 мм - астрагал
                const astragalHeight = 0.05; // 50 мм - высота астрагала

                // Создаем базу столба
                const baseGeometry = new THREE.BoxGeometry(baseWidth, baseHeight, baseWidth);
                const basePart = new THREE.Mesh(baseGeometry, woodMaterial);
                basePart.position.set(width / 2, baseHeight / 2, z);
                basePart.castShadow = true;
                basePart.receiveShadow = true;
                this.canopyGroup.add(basePart);

                // Добавляем астрагал сверху базы
                const astragalY = baseHeight + astragalHeight / 2;
                const astragalGeometry = new THREE.BoxGeometry(astragalSize, astragalHeight, astragalSize);
                const astragal = new THREE.Mesh(astragalGeometry, woodMaterial);
                astragal.position.set(width / 2, astragalY, z);
                astragal.castShadow = true;
                astragal.receiveShadow = true;
                this.canopyGroup.add(astragal);

                // Если высота столба больше базы, добавляем верхнюю часть с сечением из postMaterial
                if (height > baseHeight + astragalHeight) {
                    const upperPartHeight = height - baseHeight - astragalHeight;
                    // Используем сечение столба из выбранного материала
                    const upperGeometry = new THREE.BoxGeometry(postDimensions.width, upperPartHeight, postDimensions.height);
                    const upperPart = new THREE.Mesh(upperGeometry, woodMaterial);
                    upperPart.position.set(width / 2, baseHeight + astragalHeight + upperPartHeight / 2, z);
                    upperPart.castShadow = true;
                    upperPart.receiveShadow = true;
                    this.canopyGroup.add(upperPart);
                }
            } else if (postType === 'var-4') {
                // Столб var-4 с базой и астрагалом
                const baseWidth = 0.28; // 280 мм
                const baseHeight = 0.4; // 400 мм
                const astragalSize = 0.3; // 300 мм - астрагал
                const astragalHeight = 0.015; // 15 мм - высота астрагала

                // Создаем базу столба
                const baseGeometry = new THREE.BoxGeometry(baseWidth, baseHeight, baseWidth);
                const basePart = new THREE.Mesh(baseGeometry, woodMaterial);
                basePart.position.set(width / 2, baseHeight / 2, z);
                basePart.castShadow = true;
                basePart.receiveShadow = true;
                this.canopyGroup.add(basePart);

                // Добавляем астрагал сверху базы
                const astragalY = baseHeight + astragalHeight / 2;
                const astragalGeometry = new THREE.BoxGeometry(astragalSize, astragalHeight, astragalSize);
                const astragal = new THREE.Mesh(astragalGeometry, woodMaterial);
                astragal.position.set(width / 2, astragalY, z);
                astragal.castShadow = true;
                astragal.receiveShadow = true;
                this.canopyGroup.add(astragal);

                // Если высота столба больше базы, добавляем верхнюю часть с сечением из postMaterial
                if (height > baseHeight + astragalHeight) {
                    const upperPartHeight = height - baseHeight - astragalHeight;
                    // Используем сечение столба из выбранного материала
                    const upperGeometry = new THREE.BoxGeometry(postDimensions.width, upperPartHeight, postDimensions.height);
                    const upperPart = new THREE.Mesh(upperGeometry, woodMaterial);
                    upperPart.position.set(width / 2, baseHeight + astragalHeight + upperPartHeight / 2, z);
                    upperPart.castShadow = true;
                    upperPart.receiveShadow = true;
                    this.canopyGroup.add(upperPart);
                }
            } else if (postType === 'var-6') {
                // Столб var-6: куст var-1 с базой и капителью
                const baseWidth = 0.28; // 280 мм
                const baseHeight = 0.4; // 400 мм
                const astragalSize = 0.3; // 300 мм
                const astragalHeight = 0.015; // 15 мм

                // Создаем базу столба (внизу)
                const baseGeometry = new THREE.BoxGeometry(baseWidth, baseHeight, baseWidth);
                const basePart = new THREE.Mesh(baseGeometry, woodMaterial);
                basePart.position.set(width / 2, baseHeight / 2, z);
                basePart.castShadow = true;
                basePart.receiveShadow = true;
                this.canopyGroup.add(basePart);

                // Добавляем нижний астрагал (над базой)
                const bottomAstragalY = baseHeight + astragalHeight / 2;
                const bottomAstragalGeometry = new THREE.BoxGeometry(astragalSize, astragalHeight, astragalSize);
                const bottomAstragal = new THREE.Mesh(bottomAstragalGeometry, woodMaterial);
                bottomAstragal.position.set(width / 2, bottomAstragalY, z);
                bottomAstragal.castShadow = true;
                bottomAstragal.receiveShadow = true;
                this.canopyGroup.add(bottomAstragal);

                // Создаем куст из 4 квадратных столбов (как в var-1)
                const clusterSize = 0.08; // 80 мм
                const clusterSpacing = 0.1; // 100 мм
                const clusterStartY = baseHeight + astragalHeight;
                const clusterHeight = height - baseHeight - astragalHeight - astragalHeight - baseHeight; // высота куста
                const clusterGeometry = new THREE.BoxGeometry(clusterSize, clusterHeight, clusterSize);
                const clusterYPosition = clusterStartY + clusterHeight / 2;

                // Позиции 4 столбов в квадрате 2x2
                const clusterPositions = [
                    { x: width / 2 - clusterSpacing / 2, z: z - clusterSpacing / 2 },
                    { x: width / 2 + clusterSpacing / 2, z: z - clusterSpacing / 2 },
                    { x: width / 2 - clusterSpacing / 2, z: z + clusterSpacing / 2 },
                    { x: width / 2 + clusterSpacing / 2, z: z + clusterSpacing / 2 }
                ];

                clusterPositions.forEach(pos => {
                    const clusterPost = new THREE.Mesh(clusterGeometry, woodMaterial);
                    clusterPost.position.set(pos.x, clusterYPosition, pos.z);
                    clusterPost.castShadow = true;
                    clusterPost.receiveShadow = true;
                    this.canopyGroup.add(clusterPost);
                });

                // Создаем перемычки между столбами в кусте
                const crossbarWidth = 0.02; // 20 мм
                const crossbarHeight = 0.15; // 150 мм
                const crossbarDepth = 0.08; // 80 мм
                const verticalSpacing = 0.51; // 510 мм
                const numLevels = Math.floor(clusterHeight / verticalSpacing);

                for (let level = 0; level < numLevels; level++) {
                    const crossbarY = clusterStartY + verticalSpacing * (level + 1);

                    const crossbarConnections = [
                        { start: 0, end: 2, axis: 'z' },
                        { start: 1, end: 3, axis: 'z' },
                        { start: 0, end: 1, axis: 'x' },
                        { start: 2, end: 3, axis: 'x' }
                    ];

                    crossbarConnections.forEach((conn, idx) => {
                        const startPos = clusterPositions[conn.start];
                        const endPos = clusterPositions[conn.end];
                        const centerX = (startPos.x + endPos.x) / 2;
                        const centerZ = (startPos.z + endPos.z) / 2;

                        let crossbarGeometry;
                        if (conn.axis === 'z') {
                            crossbarGeometry = new THREE.BoxGeometry(crossbarDepth, crossbarHeight, clusterSpacing);
                        } else {
                            crossbarGeometry = new THREE.BoxGeometry(clusterSpacing, crossbarHeight, crossbarDepth);
                        }

                        const uvAttribute = crossbarGeometry.attributes.uv;
                        if (uvAttribute) {
                            const seed = (level * 7 + idx * 13 + i * 5) % 17;
                            const offsetU = (seed % 3) * 0.33;
                            const offsetV = (Math.floor(seed / 3) % 3) * 0.33;

                            for (let j = 0; j < uvAttribute.count; j++) {
                                uvAttribute.setXY(j, uvAttribute.getX(j) + offsetU, uvAttribute.getY(j) + offsetV);
                            }
                            uvAttribute.needsUpdate = true;
                        }

                        const crossbar = new THREE.Mesh(crossbarGeometry, woodMaterial);
                        crossbar.position.set(centerX, crossbarY, centerZ);
                        crossbar.castShadow = true;
                        crossbar.receiveShadow = true;
                        this.canopyGroup.add(crossbar);
                    });
                }

                // Добавляем верхний астрагал (над кустом)
                const topAstragalY = height - baseHeight - astragalHeight / 2;
                const topAstragalGeometry = new THREE.BoxGeometry(astragalSize, astragalHeight, astragalSize);
                const topAstragal = new THREE.Mesh(topAstragalGeometry, woodMaterial);
                topAstragal.position.set(width / 2, topAstragalY, z);
                topAstragal.castShadow = true;
                topAstragal.receiveShadow = true;
                this.canopyGroup.add(topAstragal);

                // Создаем капитель (отзеркаленная база сверху)
                const capitalY = height - baseHeight / 2;
                const capitalGeometry = new THREE.BoxGeometry(baseWidth, baseHeight, baseWidth);
                const capitalPart = new THREE.Mesh(capitalGeometry, woodMaterial);
                capitalPart.position.set(width / 2, capitalY, z);
                capitalPart.castShadow = true;
                capitalPart.receiveShadow = true;
                this.canopyGroup.add(capitalPart);
            } else {
                // Стандартный столб для остальных типов
                const rightPost = new THREE.Mesh(postGeometry, woodMaterial);
                rightPost.position.set(width / 2, postYPosition, z);
                rightPost.castShadow = true;
                rightPost.receiveShadow = true;
                this.canopyGroup.add(rightPost);
            }

            // Подпятник для правого столба (если нужен, кроме var-2, var-3, var-4 и var-6)
            if (hasFooting && footingGeometry && postType !== 'var-2' && postType !== 'var-3' && postType !== 'var-4' && postType !== 'var-6') {
                const rightFooting = new THREE.Mesh(footingGeometry, woodMaterial);
                // Для var-1 подпятник под балкой (между столбом и балкой), для var-5 и var-4 - внизу
                const rightFootingY = hasTopFooting ? height - footingHeight / 2 : footingHeight / 2;
                rightFooting.position.set(width / 2, rightFootingY, z);
                rightFooting.castShadow = true;
                rightFooting.receiveShadow = true;
                this.canopyGroup.add(rightFooting);
            }

            // Капитель для правого столба (если нужна, кроме var-1, var-2, var-3, var-4 и var-6)
            if (hasCapital && capitalGeometry && postType !== 'var-1' && postType !== 'var-2' && postType !== 'var-3' && postType !== 'var-4' && postType !== 'var-6') {
                const rightCapital = new THREE.Mesh(capitalGeometry, woodMaterial);
                // Капитель размещается на верху столба
                const capitalY = height - capitalHeight / 2;
                rightCapital.position.set(width / 2, capitalY, z);
                rightCapital.castShadow = true;
                rightCapital.receiveShadow = true;
                this.canopyGroup.add(rightCapital);
            }
        }
    }

    // Функция создания продольных балок
    createLongitudinalBeams(length, width, height, woodMaterial, frontExtension, backExtension, postMaterial, postType) {
        const beamLength = length + frontExtension + backExtension;
        const beamDimensions = this.getBeamDimensions(postMaterial, postType);
        const beamGeometry = new THREE.BoxGeometry(beamDimensions.width, beamDimensions.height, beamLength);

        const beamOffset = (frontExtension - backExtension) / 2;

        // Балка располагается на высоте = высота_столба + 1/2_сечения_балки
        const beamHeight = height + beamDimensions.height / 2;

        // Левая балка
        const leftBeam = new THREE.Mesh(beamGeometry, woodMaterial);
        leftBeam.position.set(-width / 2, beamHeight, beamOffset);
        leftBeam.castShadow = true;
        leftBeam.receiveShadow = true;
        this.canopyGroup.add(leftBeam);

        // Добавляем оси координат для левой балки (мауэрлата)
        if (this.showBraceAxes) {
            const leftBeamAxes = this.createBraceAxes(leftBeam, 0.5); // Увеличиваем длину осей для мауэрлата
            if (leftBeamAxes) {
                this.canopyGroup.add(leftBeamAxes);
            }
        }

        // Правая балка
        const rightBeam = new THREE.Mesh(beamGeometry, woodMaterial);
        rightBeam.position.set(width / 2, beamHeight, beamOffset);
        rightBeam.castShadow = true;
        rightBeam.receiveShadow = true;
        this.canopyGroup.add(rightBeam);

        // Добавляем оси координат для правой балки (мауэрлата)
        if (this.showBraceAxes) {
            const rightBeamAxes = this.createBraceAxes(rightBeam, 0.5); // Увеличиваем длину осей для мауэрлата
            if (rightBeamAxes) {
                this.canopyGroup.add(rightBeamAxes);
            }
        }
    }

    // Создание раскосов под балками
    async createBeamBraces(length, width, height, woodMaterial, frontExtension, backExtension, postMaterial, braceType, postType) {
        console.log(`🔧 createBeamBraces START: braceType = ${braceType}`);

        const beamLength = length + frontExtension + backExtension;

        // Балка располагается на высоте = высота_столба + 1/2_сечения_балки
        const beamDimensions = this.getBeamDimensions(postMaterial, postType);
        const beamHeight = height + beamDimensions.height / 2;
        const postSpacing = this.currentPostSpacing;
        const postsAlongLength = Math.ceil(length / postSpacing) + 1;

        // Высота балки (нижняя часть балки)
        const beamBottomY = beamHeight - beamDimensions.height / 2;

        // Высота точки крепления раскоса к столбу (70% высоты столба)
        const bracePostAttachmentY = height * 0.7;

        // Проекция раскоса на балку (длина катета вдоль балки)
        // Для угла ~45 градусов проекция равна разнице высот
        const braceHeightDiff = beamBottomY - bracePostAttachmentY;
        const braceProjectionLength = braceHeightDiff; // Угол 45 градусов

        // Создаем модель раскоса из кода
        let braceModel = null;
        if (typeof window.createBraceFromCode === 'function') {
            const typeNum = parseInt(braceType.replace('var-', ''));
            braceModel = window.createBraceFromCode(typeNum);
        }

        // Функция-хелпер (копия из старого кода, но внутри метода)
        const createDiagonalBrace = (braceSource, startX, startY, startZ, endX, endY, endZ, braceNumber = 0, additionalRotationY = 0) => {
            const dx = endX - startX;
            const dy = endY - startY;
            const dz = endZ - startZ;
            const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

            const centerX = (startX + endX) / 2;
            const centerY = (startY + endY) / 2;
            const centerZ = (startZ + endZ) / 2;

            let brace;
            if (braceSource instanceof THREE.Object3D && !(braceSource instanceof THREE.Mesh)) {
                brace = braceSource.clone();
                // Ensure all parts of the group use the canopy wood material
                brace.traverse((child) => {
                    if (child.isMesh) child.material = woodMaterial;
                });
            } else if (braceSource instanceof THREE.Mesh) {
                brace = braceSource.clone();
                brace.material = woodMaterial;
            } else if (braceSource && braceSource.geometry) {
                // Ignore source material, use woodMaterial
                brace = new THREE.Mesh(braceSource.geometry, woodMaterial);
            } else if (braceSource instanceof THREE.BoxGeometry || (braceSource && braceSource.type === 'BoxGeometry')) {
                if (!woodMaterial) return null;
                brace = new THREE.Mesh(braceSource, woodMaterial);
            } else {
                return null;
            }

            if (!brace) return null;

            brace.position.set(centerX, centerY, centerZ);

            // Ориентация раскоса
            const horizontalLength = Math.sqrt(dx * dx + dz * dz);

            // Поворот вокруг Y (азимут)
            // Math.atan2(dx, dz) дает угол от оси Z к X.
            // Для продольного раскоса (вдоль Z) dx=0, angle = 0 или PI.
            // Если dz > 0 (вперед), angle = 0.
            // Если dz < 0 (назад), angle = PI.
            // Стандартная геометрия раскоса имеет вертикаль сзади (Z=0).
            // При повороте на PI, вертикаль становится спереди (max Z локально), что соответствует Min Z в мире (т.е. грани столба, от которого мы идем назад).
            // Поэтому rotationY = Math.atan2(dx, dz) работает корректно для обоих направлений, если геометрия стандартная.

            // НО! Если пользователь говорит "повернуть срезами к столбу", возможно, геометрия имеет скос с другой стороны.
            // Предположим, что стандартный rotationY правильный, но проверим, нужно ли развернуть модель на 180 ВОКРУГ СВОЕЙ ОСИ?
            // Нет, Math.atan2(dx, dz) уже разворачивает её по направлению вектора.

            // Если раскос из кода, и его "срез" (вертикальная часть) находится в начале координат (0,0,0),
            // то при движении ВПЕРЕД (post -> beam, +Z), начало координат (срез) находится у столба. Все верно.
            // При движении НАЗАД (post -> beam, -Z), вектор направлен назад. rotationY = PI.
            // Модель поворачивается на 180. Начало координат (срез) теперь "смотрит" в сторону -Z?
            // Нет, начало координат это ТОЧКА. Она остается на месте (startX, startY, startZ).
            // А тело модели поворачивается. Если модель идет в +Z (локально), то повернутая на 180 она пойдет в -Z.
            // Значит, тело раскоса пойдет назад от столба. Это верно.
            // А вертикальный срез (плоскость Z=const у начала) повернется.
            // Была нормаль -Z (назад). Стала нормаль +Z (вперед).
            // То есть срез будет смотреть ВПЕРЕД, на столб (который находится в +Z от раскоса, идущего назад).
            // Значит, логика верна.

            const rotationY = Math.atan2(dx, dz);

            // Поворот вокруг X (наклон)
            // Отрицательный, т.к. раскос идет вверх по Y при движении вдоль вектора
            let rotationX = -Math.atan2(dy, horizontalLength);

            // SPECIAL HANDLING FOR CODE-GENERATED BRACES
            // Если раскос создан из кода (braceModel), он уже имеет правильную геометрию (45 градусов)
            // Поэтому нам не нужно наклонять его (rotationX), и нужно скорректировать позицию Y
            if (braceSource === braceModel) {
                rotationX = 0; // Не наклоняем, так как геометрия уже наклонная

                // Смещаем вниз, так как origin модели внизу (Y=0), а мы позиционировали центр модели в центр отрезка
                // Центр отрезка Y = (startY + endY) / 2
                // Мы хотим, чтобы низ модели (Y=0) был на startY
                // Разница: centerY - startY = (endY - startY) / 2 = dy / 2
                brace.position.y -= dy / 2;
            }

            brace.rotation.set(rotationX, rotationY + additionalRotationY, 0);

            // Масштабирование по длине для простой геометрии
            if (braceSource instanceof THREE.BoxGeometry || (braceSource && braceSource.type === 'BoxGeometry')) {
                const originalLength = braceSource.parameters?.depth || 0.3;
                if (originalLength > 0) {
                    brace.scale.set(1, 1, length / originalLength);
                }
            } else {
                // Для моделей масштаб может быть другим, тут простая реализация
            }

            brace.castShadow = true;
            brace.receiveShadow = true;

            this.canopyGroup.add(brace);
            brace.updateMatrixWorld(true);

            // Добавляем bounding box, если включено
            if (this.showBraceBoundingBoxes) {
                const braceBox = this.createBraceBoundingBox(brace, braceNumber);
                if (braceBox) {
                    this.canopyGroup.add(braceBox);
                }
            }

            return brace;
        };

        // Геометрия для фоллбэка
        const braceWidth = 0.04;    // 40 мм
        const braceHeight = 0.06;   // 60 мм
        const minBraceLength = 0.3;
        const braceGeometry = new THREE.BoxGeometry(braceWidth, braceHeight, minBraceLength);

        // Цикл по столбам
        for (let i = 0; i < postsAlongLength; i++) {
            // Центр столба по Z
            const postCenterZ = -length / 2 + (i * length / (postsAlongLength - 1));

            // Получаем размеры столба для смещения (предполагаем квадрат 150х150 если нет данных)
            const postSize = 0.15; // 150 мм
            const postHalfWidth = postSize / 2;

            // Размер раскоса
            // braceWidth - горизонтальный катет (вдоль балки)
            // braceHeight - вертикальный катет (вдоль столба)
            let braceWidth = 0.5;
            let braceHeight = 0.5;

            // Для изогнутого раскоса (Type 2) размер 400x400
            if (braceType === 'var-2' || braceType === '2') {
                braceWidth = 0.4;
                braceHeight = 0.4;
            }
            // Для Type 4 (изогнутый Г-образный) асимметричный: 330x500
            else if (braceType === 'var-4' || braceType === '4') {
                braceWidth = 0.33; // 330 мм горизонтально
                braceHeight = 0.5; // 500 мм вертикально
            }

            // Координаты балок (X)
            const leftBeamX = -width / 2;
            const rightBeamX = width / 2;

            // --- ЛЕВЫЙ РЯД ---
            // Раскос ВПЕРЕД (по оси Z) от левого столба
            if (i < postsAlongLength - 1) {
                // Start: Точка на грани столба и на уровне низа раскоса
                // Сдвигаем StartZ НА грань столба (+postHalfWidth)
                const startX = leftBeamX;
                const startY = beamBottomY - braceHeight; // Низ раскоса (используем высоту!)
                const startZ = postCenterZ + postHalfWidth;

                // End: Точка на балке
                const endX = leftBeamX;
                const endY = beamBottomY;
                const endZ = startZ + braceWidth; // Конец на балке (используем ширину!)

                createDiagonalBrace(braceModel || braceGeometry, startX, startY, startZ, endX, endY, endZ, 1);
            }

            // Раскос НАЗАД (против оси Z) от левого столба
            if (i > 0) {
                // Идем ОТ грани столба (-postHalfWidth) назад
                const startX = leftBeamX;
                const startY = beamBottomY - braceHeight;
                const startZ = postCenterZ - postHalfWidth;

                const endX = leftBeamX;
                const endY = beamBottomY;
                const endZ = startZ - braceWidth;

                createDiagonalBrace(braceModel || braceGeometry, startX, startY, startZ, endX, endY, endZ, 2);
            }

            // --- ПРАВЫЙ РЯД ---
            // Раскос ВПЕРЕД от правого столба
            if (i < postsAlongLength - 1) {
                const startX = rightBeamX;
                const startY = beamBottomY - braceHeight;
                const startZ = postCenterZ + postHalfWidth;

                const endX = rightBeamX;
                const endY = beamBottomY;
                const endZ = startZ + braceWidth;

                createDiagonalBrace(braceModel || braceGeometry, startX, startY, startZ, endX, endY, endZ, 3);
            }

            // Раскос НАЗАД от правого столба
            if (i > 0) {
                const startX = rightBeamX;
                const startY = beamBottomY - braceHeight;
                const startZ = postCenterZ - postHalfWidth;

                const endX = rightBeamX;
                const endY = beamBottomY;
                const endZ = startZ - braceWidth;

                createDiagonalBrace(braceModel || braceGeometry, startX, startY, startZ, endX, endY, endZ, 4);
            }

        }

        console.log(`✅ createBeamBraces ЗАВЕРШЕНО (продольные диагональные раскосы)`);
    }

    // Функция создания ферм
    async createTrusses(length, width, height, roofHeight, woodMaterial, roofType, braceType, postMaterial, trussMaterial, postType) {
        console.log(`ЁЯПЧя╕П createTrusses START: roofType = ${roofType}`);

        const beamDimensions = this.getBeamDimensions(postMaterial, postType);
        const trussDimensions = this.getTrussDimensions(trussMaterial);

        // Ферма поднята на половину высоты мауэрлата от верхней плоскости мауэрлата
        // Верхняя поверхность мауэрлата = высота_столба + высота_мауэрлата
        // Центр нижнего пояса = верхняя_поверхность_мауэрлата + половина_высоты_мауэрлата + половина_высоты_фермы
        const trussOverhang = 0.2; // Выступ фермы 200 мм (по 100 мм с каждой стороны)
        const mauerlatTopHeight = height + beamDimensions.height; // Верхняя поверхность мауэрлата
        const trussParams = {
            span: width + trussOverhang,
            rise: roofHeight,
            sectionSize: trussDimensions,
            bottomChordHeight: height + beamDimensions.height + beamDimensions.height / 2 + trussDimensions.height / 2, // Центр нижнего пояса
            mauerlatHeight: mauerlatTopHeight, // Высота верхней поверхности мауэрлата
            showAxes: false
        };

        const postSpacing = this.currentPostSpacing;
        const postsAlongLength = Math.ceil(length / postSpacing) + 1;

        console.log(`   Количество ферм: ${postsAlongLength}`);

        for (let i = 0; i < postsAlongLength; i++) {
            const z = -length / 2 + (i * length / (postsAlongLength - 1));
            let trussGroup;

            // Выбор типа фермы в зависимости от roofType
            if (roofType === 'var-1') {
                // Односкатная ферма балочного типа
                trussGroup = await this.buildSingleSlopeTruss(trussParams, woodMaterial, braceType);
            } else if (roofType === 'var-2') {
                // Двускатная ферма с центральной стойкой
                trussGroup = await this.buildTrussWithCentralPost(trussParams, woodMaterial, braceType);
            } else if (roofType === 'var-3') {
                // Арочная (треугольная) ферма
                trussGroup = await this.buildTriangularTruss(trussParams, woodMaterial, braceType);
            } else {
                // По умолчанию используем двускатную
                trussGroup = await this.buildTrussWithCentralPost(trussParams, woodMaterial, braceType);
            }

            trussGroup.position.set(0, 0, z);
            this.canopyGroup.add(trussGroup);
        }

        console.log(`✅ createTrusses ЗАВЕРШЕНО: создано ${postsAlongLength} ферм`);
    }

    // === УТИЛИТЫ ДЛЯ ФЕРМ ===

    // Нормализация вектора
    unit(v) {
        return v.clone().normalize();
    }

    // Угол между векторами
    angle(u, v) {
        return Math.acos(THREE.MathUtils.clamp(u.dot(v), -1, 1));
    }

    // Смещение для усовой подрезки
    miterOffset(widthInPlane, phi) {
        return (widthInPlane / 2) / Math.tan(phi / 2);
    }

    // Создание бруса с подрезками вдоль оси
    makeMember(P, Q, b, t, sStart = 0, sEnd = 0, material) {
        const v = Q.clone().sub(P);
        const L0 = v.length();
        const d = this.unit(v);
        const L = L0 - (sStart + sEnd);

        if (L < 0.01) {
            return new THREE.Group();
        }

        // Создаем геометрию вдоль оси X
        const geom = new THREE.BoxGeometry(L, b, t);

        // Смещаем геометрию вниз на b/2, чтобы ВЕРХНЯЯ ГРАНЬ была на оси (y=0)
        // По умолчанию центр в (0,0,0), верх на +b/2, низ на -b/2
        // После смещения: верх на 0, низ на -b
        geom.translate(0, -b / 2, 0);

        const mesh = new THREE.Mesh(geom, material);

        // Вычисляем центр бруса с учетом подрезок
        const Pstart = P.clone().add(d.clone().multiplyScalar(sStart));
        const Pend = Q.clone().sub(d.clone().multiplyScalar(sEnd));
        const M = Pstart.clone().add(Pend).multiplyScalar(0.5);
        mesh.position.copy(M);

        // Поворачиваем брус вдоль направления P->Q
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), d);
        mesh.setRotationFromQuaternion(q);

        mesh.castShadow = true;
        mesh.receiveShadow = true;

        return mesh;
    }

    // Построение односкатной фермы балочного типа (для односкатного типа var-1)
    async buildSingleSlopeTruss(params, woodMaterial, braceType) {
        const { span, rise, sectionSize, bottomChordHeight, mauerlatHeight } = params;
        const L = span;
        const H = Math.max(rise, 0.1);

        if (L < 1.0) {
            return new THREE.Group();
        }

        const trussGroup = new THREE.Group();
        const b = sectionSize.height; // высота сечения
        const t = sectionSize.width;  // ширина сечения

        // Количество сегментов
        const N = 8;

        // Узлы нижнего и верхнего поясов
        const bot = [];
        const top = [];

        // Односкатная ферма: наклон от левого края (низ) к правому краю (верх)
        for (let i = 0; i <= N; i++) {
            const x = -L / 2 + L * i / N; // от -L/2 до +L/2

            // Верхний пояс наклонный - линейный подъем от 0 до H
            const yTop = bottomChordHeight + H * (i / N);

            bot.push(new THREE.Vector3(x, bottomChordHeight, 0));
            top.push(new THREE.Vector3(x, yTop, 0));
        }

        // Список стержней
        const members = [];

        // Верхний пояс (наклонная балка)
        for (let i = 0; i < N; i++) {
            members.push({ type: 'top', i0: i, i1: i + 1, P: top[i], Q: top[i + 1], s0: 0, s1: 0 });
        }

        // Нижний пояс (горизонтальная балка)
        for (let i = 0; i < N; i++) {
            members.push({ type: 'bot', i0: i, i1: i + 1, P: bot[i], Q: bot[i + 1], s0: 0, s1: 0 });
        }

        // Вертикальные стойки только по краям (над мауэрлатами/столбами)
        // Вычисляем ширину без выступа фермы (там где стоят столбы)
        const trussOverhang = 0.2; // Выступ фермы
        const widthWithoutOverhang = L - trussOverhang;
        const postXLeft = -widthWithoutOverhang / 2; // Позиция левого столба
        const postXRight = widthWithoutOverhang / 2; // Позиция правого столба

        // Компенсируем смещение от translate(0, -b/2, 0) в makeMember
        // Для вертикальной стойки это смещение становится смещением по оси X влево на -b/2
        // Дополнительно сдвигаем стойку, чтобы она начиналась с края нижней балки
        const postOffsetBase = -b / 2; // Компенсация смещения центра

        // Левая стойка - внешний край на краю нижней балки (сдвигаем вправо на +t/2)
        const leftPostOffset = postOffsetBase + t / 2;
        const leftPostBot = new THREE.Vector3(postXLeft + leftPostOffset, bottomChordHeight, 0);
        const leftU = (postXLeft + L / 2) / L;
        const leftPostTop = new THREE.Vector3(postXLeft + leftPostOffset, bottomChordHeight + H * leftU, 0);
        members.push({ type: 'post', P: leftPostBot, Q: leftPostTop, s0: 0, s1: 0 });

        // Правая стойка - внешний край на краю нижней балки (сдвигаем влево на -t/2)
        const rightPostOffset = postOffsetBase - t / 2;
        const rightPostBot = new THREE.Vector3(postXRight + rightPostOffset, bottomChordHeight, 0);
        const rightU = (postXRight + L / 2) / L;
        const rightPostTop = new THREE.Vector3(postXRight + rightPostOffset, bottomChordHeight + H * rightU, 0);
        members.push({ type: 'post', P: rightPostBot, Q: rightPostTop, s0: 0, s1: 0 });

        // Функция применения усовых подрезок на цепочке узлов (для поясов)
        const applyMiterOnChain = (points, type) => {
            const segs = members.filter(m => m.type === type);
            const sAtEnd = new Array(segs.length).fill(null).map(() => ({ s0: 0, s1: 0 }));

            for (let k = 0; k < segs.length - 1; k++) {
                const a = segs[k];
                const bSeg = segs[k + 1];

                const u_in = this.unit(a.Q.clone().sub(a.P));
                const u_out = this.unit(bSeg.Q.clone().sub(bSeg.P));

                const phi = this.angle(u_in, u_out);

                if (phi < 1e-3 || Math.PI - phi < 1e-3) continue;

                const tanHalfPhi = Math.tan(phi / 2);
                if (Math.abs(tanHalfPhi) < 1e-6) continue;

                const s = (b / 2) / tanHalfPhi;

                const maxOffset = Math.min(a.Q.clone().sub(a.P).length() * 0.45,
                    bSeg.Q.clone().sub(bSeg.P).length() * 0.45);
                const sClamped = Math.min(s, maxOffset);

                sAtEnd[k].s1 = Math.max(sAtEnd[k].s1, sClamped);
                sAtEnd[k + 1].s0 = Math.max(sAtEnd[k + 1].s0, sClamped);
            }

            for (let k = 0; k < segs.length; k++) {
                segs[k].s0 = sAtEnd[k].s0;
                segs[k].s1 = sAtEnd[k].s1;
            }
        };

        // Применяем усовые подрезки на поясах
        applyMiterOnChain(top, 'top');
        applyMiterOnChain(bot, 'bot');

        // Создание мешей
        for (const m of members) {
            const s0 = m.s0 || 0;
            const s1 = m.s1 || 0;
            const mesh = this.makeMember(m.P, m.Q, b, t, s0, s1, woodMaterial);
            trussGroup.add(mesh);
        }

        return trussGroup;
    }

    // Построение двускатной фермы с центральной стойкой (для двускатного типа var-2)
    async buildTrussWithCentralPost(params, woodMaterial, braceType) {
        const { span, rise, sectionSize, bottomChordHeight } = params;
        const L = span;
        const H = Math.max(rise, 0.1);

        if (L < 1.0) {
            return new THREE.Group();
        }

        const trussGroup = new THREE.Group();
        const b = sectionSize.height; // высота сечения
        const t = sectionSize.width;  // ширина сечения

        // Количество сегментов (должно быть четным для симметрии)
        const N = 8;

        // Узлы нижнего и верхнего поясов
        const bot = [];
        const top = [];

        for (let i = 0; i <= N; i++) {
            const x = -L / 2 + L * i / N; // от -L/2 до +L/2

            // Высота верхней грани (там, где должна быть кровля)
            const yTop = bottomChordHeight + H * (1 - Math.abs(2 * i / N - 1));

            bot.push(new THREE.Vector3(x, bottomChordHeight, 0));
            top.push(new THREE.Vector3(x, yTop, 0));
        }

        // Список стержней
        const members = [];

        // Верхний пояс (стропильные ноги)
        for (let i = 0; i < N; i++) {
            members.push({ type: 'top', i0: i, i1: i + 1, P: top[i], Q: top[i + 1], s0: 0, s1: 0 });
        }

        // Нижний пояс
        for (let i = 0; i < N; i++) {
            members.push({ type: 'bot', i0: i, i1: i + 1, P: bot[i], Q: bot[i + 1], s0: 0, s1: 0 });
        }

        // Центральная стойка (вертикальный элемент ровно по центру с торцевой подрезкой)
        // Ось стойки проходит точно по центру фермы (X = 0)

        // Вычисляем угол наклона крыши для торцевой подрезки
        const roofSlope = Math.atan2(H, L / 2); // Угол наклона ската
        const postTopCut = (b / 2) / Math.tan(roofSlope); // Подрезка верхнего торца стойки

        // Компенсируем смещение от translate(0, -b/2, 0) в makeMember
        // Для вертикальной стойки после поворота это становится смещением
        // Смещаем точки влево на -b/2, чтобы центр был на X=0
        const postBot = new THREE.Vector3(-b / 2, bottomChordHeight, 0);
        const postTop = new THREE.Vector3(-b / 2, bottomChordHeight + H, 0);

        members.push({
            type: 'post',
            P: postBot,
            Q: postTop,
            s0: 0,
            s1: postTopCut // Торцевая подрезка в конце
        });

        // Раскосы: убираем по 3 боковых раскоса с каждой стороны (i=0,1,2 и i=5,6,7)
        // Оставляем только 2 центральных раскоса (i=3,4)
        const centerIndex = Math.floor(N / 2); // Индекс центра для раскосов
        for (let i = 3; i < N - 3; i++) {
            // Определяем центральные раскосы
            const isCentralBrace = (i === centerIndex - 1 || i === centerIndex);

            if (i % 2 === 0) {
                if (isCentralBrace) {
                    // В центре меняем направление: снизу i -> вверх i+1
                    members.push({ type: 'web', P: bot[i], Q: top[i + 1], s0: 0, s1: 0 });
                } else {
                    // Обычное: сверху i -> вниз i+1
                    members.push({ type: 'web', P: top[i], Q: bot[i + 1], s0: 0, s1: 0 });
                }
            } else {
                if (isCentralBrace) {
                    // В центре меняем направление: сверху i -> вниз i+1
                    members.push({ type: 'web', P: top[i], Q: bot[i + 1], s0: 0, s1: 0 });
                } else {
                    // Обычное: снизу i -> вверх i+1
                    members.push({ type: 'web', P: bot[i], Q: top[i + 1], s0: 0, s1: 0 });
                }
            }
        }

        // Функция применения усовых подрезок на цепочке узлов (для поясов)
        const applyMiterOnChain = (points, type) => {
            const segs = members.filter(m => m.type === type);
            const sAtEnd = new Array(segs.length).fill(null).map(() => ({ s0: 0, s1: 0 }));

            for (let k = 0; k < segs.length - 1; k++) {
                // Для концевого узла (центральный узел верхнего пояса) НЕ применяем усовые подрезки
                if (type === 'top' && k === Math.floor(segs.length / 2) - 1) {
                    continue;
                }

                const a = segs[k];
                const bSeg = segs[k + 1];

                const u_in = this.unit(a.Q.clone().sub(a.P));
                const u_out = this.unit(bSeg.Q.clone().sub(bSeg.P));

                const phi = this.angle(u_in, u_out);

                if (phi < 1e-3 || Math.PI - phi < 1e-3) continue;

                const tanHalfPhi = Math.tan(phi / 2);
                if (Math.abs(tanHalfPhi) < 1e-6) continue;

                const s = (b / 2) / tanHalfPhi;

                const maxOffset = Math.min(a.Q.clone().sub(a.P).length() * 0.45,
                    bSeg.Q.clone().sub(bSeg.P).length() * 0.45);
                const sClamped = Math.min(s, maxOffset);

                sAtEnd[k].s1 = Math.max(sAtEnd[k].s1, sClamped);
                sAtEnd[k + 1].s0 = Math.max(sAtEnd[k + 1].s0, sClamped);
            }

            for (let k = 0; k < segs.length; k++) {
                segs[k].s0 = sAtEnd[k].s0;
                segs[k].s1 = sAtEnd[k].s1;
            }
        };

        // Применяем усовые подрезки на поясах
        applyMiterOnChain(top, 'top');
        applyMiterOnChain(bot, 'bot');

        // Создание мешей
        for (const m of members) {
            const s0 = m.s0 || 0;
            const s1 = m.s1 || 0;
            const mesh = this.makeMember(m.P, m.Q, b, t, s0, s1, woodMaterial);
            trussGroup.add(mesh);
        }

        return trussGroup;
    }

    // Построение треугольной фермы с усовыми подрезками (для арочного типа var-3)
    async buildTriangularTruss(params, woodMaterial, braceType) {
        const { span, rise, sectionSize, bottomChordHeight } = params;
        const L = span;
        const H = Math.max(rise, 0.1);

        if (L < 1.0) {
            return new THREE.Group();
        }

        const trussGroup = new THREE.Group();
        const b = sectionSize.height; // высота сечения
        const t = sectionSize.width;  // ширина сечения

        // Количество сегментов (должно быть четным для симметрии)
        const N = 8;

        // Узлы нижнего и верхнего поясов
        const bot = [];
        const top = [];

        for (let i = 0; i <= N; i++) {
            const x = -L / 2 + L * i / N; // от -L/2 до +L/2

            // Высота верхней грани (там, где должна быть кровля)
            // Теперь ОСЬ проходит по верхней грани
            const yTop = bottomChordHeight + H * (1 - Math.abs(2 * i / N - 1));

            bot.push(new THREE.Vector3(x, bottomChordHeight, 0));
            top.push(new THREE.Vector3(x, yTop, 0));
        }

        // Список стержней
        const members = [];

        // Верхний пояс (стропильные ноги)
        for (let i = 0; i < N; i++) {
            members.push({ type: 'top', i0: i, i1: i + 1, P: top[i], Q: top[i + 1], s0: 0, s1: 0 });
        }

        // Нижний пояс
        for (let i = 0; i < N; i++) {
            members.push({ type: 'bot', i0: i, i1: i + 1, P: bot[i], Q: bot[i + 1], s0: 0, s1: 0 });
        }

        // Раскосы: чередуем диагонали (Т-стык, без усов)
        for (let i = 0; i < N; i++) {
            if (i % 2 === 0) {
                // снизу i -> вверх i+1
                members.push({ type: 'web', P: bot[i], Q: top[i + 1], s0: 0, s1: 0 });
            } else {
                // сверху i -> вниз i+1
                members.push({ type: 'web', P: top[i], Q: bot[i + 1], s0: 0, s1: 0 });
            }
        }

        // Функция применения усовых подрезок на цепочке узлов (для поясов)
        const applyMiterOnChain = (points, type) => {
            const segs = members.filter(m => m.type === type);
            const sAtEnd = new Array(segs.length).fill(null).map(() => ({ s0: 0, s1: 0 }));

            for (let k = 0; k < segs.length - 1; k++) {
                // Для концевого узла (центральный узел верхнего пояса) НЕ применяем усовые подрезки
                if (type === 'top' && k === Math.floor(segs.length / 2) - 1) {
                    // Пропускаем концевой узел - там верхние грани стыкуются без усов
                    continue;
                }

                const a = segs[k];
                const bSeg = segs[k + 1];

                // Вычисляем направления векторов, входящих в узел
                // u_in: направление от начала левого сегмента К узлу
                // u_out: направление ОТ узла к концу правого сегмента
                const u_in = this.unit(a.Q.clone().sub(a.P));   // направление вдоль левого сегмента
                const u_out = this.unit(bSeg.Q.clone().sub(bSeg.P)); // направление вдоль правого сегмента

                // Угол между направлениями
                const phi = this.angle(u_in, u_out);

                // Пропускаем вырожденные случаи
                if (phi < 1e-3 || Math.PI - phi < 1e-3) continue;

                // Вычисляем смещение для усовой подрезки
                const tanHalfPhi = Math.tan(phi / 2);
                if (Math.abs(tanHalfPhi) < 1e-6) continue; // защита от деления на ноль

                const s = (b / 2) / tanHalfPhi;

                // Ограничиваем максимальное смещение (для очень острых углов)
                const maxOffset = Math.min(a.Q.clone().sub(a.P).length() * 0.45,
                    bSeg.Q.clone().sub(bSeg.P).length() * 0.45);
                const sClamped = Math.min(s, maxOffset);

                // Применяем одинаковое смещение к обоим сегментам для плотного прилегания
                sAtEnd[k].s1 = Math.max(sAtEnd[k].s1, sClamped);
                sAtEnd[k + 1].s0 = Math.max(sAtEnd[k + 1].s0, sClamped);
            }

            for (let k = 0; k < segs.length; k++) {
                segs[k].s0 = sAtEnd[k].s0;
                segs[k].s1 = sAtEnd[k].s1;
            }
        };

        // Применяем усовые подрезки на поясах
        applyMiterOnChain(top, 'top');
        applyMiterOnChain(bot, 'bot');

        // Создание мешей
        for (const m of members) {
            const s0 = m.s0 || 0;
            const s1 = m.s1 || 0;
            const mesh = this.makeMember(m.P, m.Q, b, t, s0, s1, woodMaterial);
            trussGroup.add(mesh);
        }

        return trussGroup;
    }

    // Создание балки между точками
    createBeam(startNode, endNode, sectionSize, material) {
        const dx = endNode.x - startNode.x;
        const dy = endNode.y - startNode.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length < 0.01) {
            return new THREE.Group();
        }

        const beamGeometry = new THREE.BoxGeometry(length, sectionSize.height, sectionSize.width);

        // Correct UVs to match real world dimensions (prevent stretching)
        const uv = beamGeometry.attributes.uv;
        const norm = beamGeometry.attributes.normal;

        if (uv && norm) {
            for (let i = 0; i < uv.count; i++) {
                const nx = Math.abs(norm.getX(i));
                const ny = Math.abs(norm.getY(i));
                // Z is implicit if not X or Y, but we check anyway

                let u = uv.getX(i);
                let v = uv.getY(i);

                if (nx > 0.9) { // Left/Right faces (Plane YZ)
                    u *= sectionSize.width;  // Z
                    v *= sectionSize.height; // Y
                } else if (ny > 0.9) { // Top/Bottom faces (Plane XZ)
                    u *= length;             // X
                    v *= sectionSize.width;  // Z
                } else { // Front/Back faces (Plane XY)
                    u *= length;             // X
                    v *= sectionSize.height; // Y
                }

                uv.setXY(i, u, v);
            }
        }

        const beam = new THREE.Mesh(beamGeometry, material);

        const centerX = (startNode.x + endNode.x) / 2;
        const centerY = (startNode.y + endNode.y) / 2;
        beam.position.set(centerX, centerY, 0);

        const angle = Math.atan2(dy, dx);
        beam.rotation.z = angle;

        beam.castShadow = true;
        beam.receiveShadow = true;

        return beam;
    }

    // Создание балки с торцевым срезом под углом (для стропильных ног)
    createBeveledBeam(startNode, endNode, sectionSize, material, bevelAngle) {
        const dx = endNode.x - startNode.x;
        const dy = endNode.y - startNode.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length < 0.01) {
            return new THREE.Group();
        }

        // Создаем геометрию с торцевым срезом
        const w = sectionSize.width;  // ширина сечения (вдоль оси Z)
        const h = sectionSize.height; // высота сечения (вдоль оси Y)

        // Вычисляем смещение вдоль оси балки для ВЕРТИКАЛЬНОГО среза
        // Если балка наклонена под углом bevelAngle, то вертикальный срез
        // создает смещение = (высота сечения / 2) / tan(угол наклона)
        const tanAngle = Math.tan(Math.abs(bevelAngle));
        const bevelOffsetAbs = tanAngle > 0.001 ? (h / 2) / tanAngle : 0;

        // Учитываем знак угла для правильного направления среза
        const bevelOffset = bevelOffsetAbs * Math.sign(bevelAngle);

        // Создаем BufferGeometry для призмы с наклонным торцом
        const geometry = new THREE.BufferGeometry();

        // Определяем вершины (8 вершин для призмы с одним наклонным торцом)
        // Правый торец срезан вертикально, центр среза находится ровно в endNode
        // Для положительного угла: нижняя часть выступает, верхняя утоплена
        // Для отрицательного угла: верхняя часть выступает, нижняя утоплена
        const vertices = new Float32Array([
            // Левый торец (прямой)
            -length / 2, -h / 2, -w / 2,  // 0: левый нижний передний
            -length / 2, h / 2, -w / 2,  // 1: левый верхний передний
            -length / 2, h / 2, w / 2,  // 2: левый верхний задний
            -length / 2, -h / 2, w / 2,  // 3: левый нижний задний

            // Правый торец (срезанный вертикально)
            length / 2 + bevelOffset, -h / 2, -w / 2,  // 4: правый нижний передний
            length / 2 - bevelOffset, h / 2, -w / 2,  // 5: правый верхний передний
            length / 2 - bevelOffset, h / 2, w / 2,  // 6: правый верхний задний
            length / 2 + bevelOffset, -h / 2, w / 2,  // 7: правый нижний задний
        ]);

        // Определяем грани (12 треугольников для 6 граней)
        const indices = new Uint16Array([
            // Передняя грань
            0, 1, 5, 0, 5, 4,
            // Задняя грань
            3, 6, 2, 3, 7, 6,
            // Верхняя грань
            1, 2, 6, 1, 6, 5,
            // Нижняя грань
            0, 4, 7, 0, 7, 3,
            // Левый торец
            0, 3, 2, 0, 2, 1,
            // Правый торец (наклонный)
            4, 5, 6, 4, 6, 7
        ]);

        // Нормали для освещения
        const normals = new Float32Array([
            // Левый торец
            -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
            // Правый торец (наклонный)
            Math.cos(bevelAngle), Math.sin(bevelAngle), 0,
            Math.cos(bevelAngle), Math.sin(bevelAngle), 0,
            Math.cos(bevelAngle), Math.sin(bevelAngle), 0,
            Math.cos(bevelAngle), Math.sin(bevelAngle), 0,
        ]);

        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
        geometry.setIndex(new THREE.BufferAttribute(indices, 1));
        geometry.computeVertexNormals();

        const beam = new THREE.Mesh(geometry, material);

        const centerX = (startNode.x + endNode.x) / 2;
        const centerY = (startNode.y + endNode.y) / 2;
        beam.position.set(centerX, centerY, 0);

        const angle = Math.atan2(dy, dx);
        beam.rotation.z = angle;

        beam.castShadow = true;
        beam.receiveShadow = true;

        return beam;
    }

    // Создание балки с двумя торцевыми срезами (для стропильных ног)
    createDoubleBeveledBeam(startNode, endNode, sectionSize, material, startBevelAngle, endBevelAngle) {
        const dx = endNode.x - startNode.x;
        const dy = endNode.y - startNode.y;
        const baseLength = Math.sqrt(dx * dx + dy * dy);

        if (baseLength < 0.01) {
            return new THREE.Group();
        }

        const w = sectionSize.width;
        const h = sectionSize.height;

        // Вычисляем смещения для обоих срезов
        const tanStartAngle = Math.tan(Math.abs(startBevelAngle));
        const startBevelOffset = tanStartAngle > 0.001 ? (h / 2) / tanStartAngle : 0;
        const startOffset = startBevelOffset * Math.sign(startBevelAngle);

        const tanEndAngle = Math.tan(Math.abs(endBevelAngle));
        const endBevelOffset = tanEndAngle > 0.001 ? (h / 2) / tanEndAngle : 0;
        const endOffset = endBevelOffset * Math.sign(endBevelAngle);

        // Длина балки с учетом обоих срезов
        const length = baseLength;

        const geometry = new THREE.BufferGeometry();

        // 8 вершин для балки с двумя наклонными торцами
        const vertices = new Float32Array([
            // Левый торец (срезанный)
            -length / 2 - startOffset, -h / 2, -w / 2,  // 0: левый нижний передний
            -length / 2 + startOffset, h / 2, -w / 2,  // 1: левый верхний передний
            -length / 2 + startOffset, h / 2, w / 2,  // 2: левый верхний задний
            -length / 2 - startOffset, -h / 2, w / 2,  // 3: левый нижний задний

            // Правый торец (срезанный)
            length / 2 + endOffset, -h / 2, -w / 2,  // 4: правый нижний передний
            length / 2 - endOffset, h / 2, -w / 2,  // 5: правый верхний передний
            length / 2 - endOffset, h / 2, w / 2,  // 6: правый верхний задний
            length / 2 + endOffset, -h / 2, w / 2,  // 7: правый нижний задний
        ]);

        const indices = new Uint16Array([
            0, 1, 5, 0, 5, 4,  // Передняя грань
            3, 6, 2, 3, 7, 6,  // Задняя грань
            1, 2, 6, 1, 6, 5,  // Верхняя грань
            0, 4, 7, 0, 7, 3,  // Нижняя грань
            0, 3, 2, 0, 2, 1,  // Левый торец
            4, 5, 6, 4, 6, 7   // Правый торец
        ]);

        const normals = new Float32Array([
            Math.cos(startBevelAngle), Math.sin(startBevelAngle), 0,
            Math.cos(startBevelAngle), Math.sin(startBevelAngle), 0,
            Math.cos(startBevelAngle), Math.sin(startBevelAngle), 0,
            Math.cos(startBevelAngle), Math.sin(startBevelAngle), 0,
            Math.cos(endBevelAngle), Math.sin(endBevelAngle), 0,
            Math.cos(endBevelAngle), Math.sin(endBevelAngle), 0,
            Math.cos(endBevelAngle), Math.sin(endBevelAngle), 0,
            Math.cos(endBevelAngle), Math.sin(endBevelAngle), 0,
        ]);

        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
        geometry.setIndex(new THREE.BufferAttribute(indices, 1));
        geometry.computeVertexNormals();

        const beam = new THREE.Mesh(geometry, material);

        const centerX = (startNode.x + endNode.x) / 2;
        const centerY = (startNode.y + endNode.y) / 2;
        beam.position.set(centerX, centerY, 0);

        const angle = Math.atan2(dy, dx);
        beam.rotation.z = angle;

        beam.castShadow = true;
        beam.receiveShadow = true;

        return beam;
    }

    // Создание процедурных текстур для кровельных материалов с кэшированием
    createRoofTexture(roofingMaterial, size = 512) {
        const textureKey = `roof_texture_${roofingMaterial}_${size}`;

        return this.getCachedTexture(textureKey, () => {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');

            switch (roofingMaterial) {
                case 'metal-grandline':
                    // Текстура металлочерепицы с профилем
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, size, size);

                    // Создаем эффект профиля металлочерепицы
                    for (let y = 0; y < size; y += 8) {
                        ctx.strokeStyle = `rgba(0, 0, 0, ${0.1 + Math.random() * 0.1})`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(0, y);
                        ctx.lineTo(size, y);
                        ctx.stroke();
                    }

                    // Добавляем блики
                    for (let i = 0; i < 20; i++) {
                        const x = Math.random() * size;
                        const y = Math.random() * size;
                        const radius = Math.random() * 10 + 5;
                        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
                        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
                        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                        ctx.fillStyle = gradient;
                        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
                    }
                    break;

                case 'metal-grandline':
                    // Металлочерепица Grand Line (Монтеррей)
                    // Волны по вертикали, ступеньки по горизонтали
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, size, size);

                    // 1. Волны (вертикальные полосы объема)
                    // Имитируем плавный изгиб волны градиентом
                    const glWaveWidth = size / 5; // ~5 волн на текстуру
                    for (let x = 0; x < size; x += glWaveWidth) {
                        const waveGrad = ctx.createLinearGradient(x, 0, x + glWaveWidth, 0);
                        // Левый склон (тень) -> Вершина (свет) -> Правый склон (тень)
                        waveGrad.addColorStop(0.0, 'rgba(0,0,0,0.15)');
                        waveGrad.addColorStop(0.2, 'rgba(255,255,255,0.05)'); // Блик на гребне
                        waveGrad.addColorStop(0.5, 'rgba(255,255,255,0.2)');  // Основной свет
                        waveGrad.addColorStop(0.8, 'rgba(255,255,255,0.05)');
                        waveGrad.addColorStop(1.0, 'rgba(0,0,0,0.15)');
                        ctx.fillStyle = waveGrad;
                        ctx.fillRect(x, 0, glWaveWidth, size);
                    }

                    // 2. Ступеньки (горизонтальные)
                    const glStepHeight = size / 4; // Шаг металлочерепицы
                    for (let y = 0; y < size; y += glStepHeight) {
                        if (y === 0) continue;

                        // Резкая тень под ступенькой (создает объем нахлеста)
                        const shadowGrad = ctx.createLinearGradient(0, y, 0, y + size * 0.08); // Короткая тень
                        shadowGrad.addColorStop(0, 'rgba(0,0,0,0.5)');
                        shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');

                        ctx.fillStyle = shadowGrad;
                        ctx.fillRect(0, y, size, size * 0.08);

                        // Тонкая линия кромки ступеньки (для четкости)
                        ctx.fillStyle = 'rgba(0,0,0,0.3)';
                        ctx.fillRect(0, y, size, 2);
                    }
                    break;

                case 'profiled-gl35r':
                    // Текстура профнастила с волнами (повернута на 90 градусов)
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, size, size);

                    // Создаем волны профнастила (теперь по вертикали)
                    for (let x = 0; x < size; x += 20) {
                        ctx.strokeStyle = `rgba(0, 0, 0, ${0.05 + Math.random() * 0.05})`;
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        for (let y = 0; y < size; y += 2) {
                            const wave = Math.sin(y * 0.1) * 3;
                            if (y === 0) {
                                ctx.moveTo(x + wave, y);
                            } else {
                                ctx.lineTo(x + wave, y);
                            }
                        }
                        ctx.stroke();
                    }
                    break;

                case 'shinglas-sonata':
                    // Текстура гибкой черепицы с гранулятом
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, size, size);

                    // Создаем эффект гранулята
                    for (let i = 0; i < 1000; i++) {
                        const x = Math.random() * size;
                        const y = Math.random() * size;
                        const radius = Math.random() * 2 + 1;
                        const alpha = Math.random() * 0.3 + 0.1;
                        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
                        ctx.beginPath();
                        ctx.arc(x, y, radius, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    break;

                case 'polycarbonate-8mm':
                    // Текстура поликарбоната с ребрами жесткости
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                    ctx.fillRect(0, 0, size, size);

                    // Создаем ребра жесткости
                    for (let x = 0; x < size; x += 40) {
                        ctx.strokeStyle = `rgba(0, 0, 0, ${0.1 + Math.random() * 0.1})`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(x, 0);
                        ctx.lineTo(x, size);
                        ctx.stroke();
                    }
                    break;
            }

            const texture = new THREE.CanvasTexture(canvas);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(8, 2); // Больше повторений по X, меньше по Y для избежания растяжения
            return texture;
        });
    }

    // Создание нормальных карт для эффекта рельефа с кэшированием
    createRoofNormalMap(roofingMaterial, size = 512) {
        const normalMapKey = `roof_normal_${roofingMaterial}_${size}`;

        return this.getCachedTexture(normalMapKey, () => {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');

            switch (roofingMaterial) {
                case 'metal-grandline':
                    // Металлочерепица: карта нормалей
                    // Плоскость (база) - смотрящая вверх (0,0,1) -> RGB(128,128,255)
                    ctx.fillStyle = '#8080ff';
                    ctx.fillRect(0, 0, size, size);

                    // 1. Волны
                    const nWaveWidth = size / 5;
                    for (let x = 0; x < size; x += nWaveWidth) {
                        // Цилиндрическая волна: слева нормаль влево, справа вправо
                        const grad = ctx.createLinearGradient(x, 0, x + nWaveWidth, 0);
                        // Нормаль X: <128 влево, >128 вправо. Y~128. Z изменяется.
                        // Левый склон (X= -0.5 -> R=64)
                        grad.addColorStop(0.0, 'rgb(64, 128, 192)');
                        // Вершина (X= 0 -> R=128)
                        grad.addColorStop(0.5, 'rgb(128, 128, 255)');
                        // Правый склон (X= +0.5 -> R=192)
                        grad.addColorStop(1.0, 'rgb(192, 128, 192)');

                        ctx.fillStyle = grad;
                        ctx.fillRect(x, 0, nWaveWidth, size);
                    }

                    // 2. Ступеньки (резкий наклон по Y)
                    const nStepHeight = size / 4;
                    for (let y = nStepHeight; y < size; y += nStepHeight) {
                        // Полоса изменения нормали по Y (ступенька вниз)
                        // Низ ступеньки смотрит вниз (Y < 0 -> G < 128)
                        ctx.fillStyle = 'rgb(128, 64, 192)';
                        ctx.fillRect(0, y, size, 4);
                    }
                    break;

                case 'profiled-gl35r':
                    // Нормальная карта для профнастила (повернута на 90 градусов)
                    ctx.fillStyle = '#8080ff';
                    ctx.fillRect(0, 0, size, size);

                    // Создаем волны (теперь по вертикали)
                    for (let x = 0; x < size; x += 20) {
                        ctx.fillStyle = '#a0a0ff';
                        ctx.beginPath();
                        for (let y = 0; y < size; y += 2) {
                            const wave = Math.sin(y * 0.1) * 3;
                            if (y === 0) {
                                ctx.moveTo(x + wave, y);
                            } else {
                                ctx.lineTo(x + wave, y);
                            }
                        }
                        ctx.lineWidth = 4;
                        ctx.stroke();
                    }
                    break;

                case 'shinglas-sonata':
                    // Нормальная карта для гибкой черепицы
                    ctx.fillStyle = '#8080ff';
                    ctx.fillRect(0, 0, size, size);

                    // Создаем шероховатую поверхность
                    for (let i = 0; i < 500; i++) {
                        const x = Math.random() * size;
                        const y = Math.random() * size;
                        const radius = Math.random() * 3 + 1;
                        const brightness = Math.random() * 0.4 + 0.3;
                        const color = `rgb(${Math.floor(128 + brightness * 127)}, ${Math.floor(128 + brightness * 127)}, 255)`;
                        ctx.fillStyle = color;
                        ctx.beginPath();
                        ctx.arc(x, y, radius, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    break;

                case 'polycarbonate-8mm':
                    // Нормальная карта для поликарбоната
                    ctx.fillStyle = '#8080ff';
                    ctx.fillRect(0, 0, size, size);

                    // Создаем ребра жесткости
                    for (let x = 0; x < size; x += 40) {
                        ctx.fillStyle = '#a0a0ff';
                        ctx.fillRect(x, 0, 2, size);
                    }
                    break;
            }

            const normalMap = new THREE.CanvasTexture(canvas);
            normalMap.wrapS = THREE.RepeatWrapping;
            normalMap.wrapT = THREE.RepeatWrapping;
            normalMap.repeat.set(8, 2); // Синхронизируем с основной текстурой
            return normalMap;
        });
    }

    // Получение материала кровли с кэшированием (новая система)
    getRoofMaterialCached(roofingMaterial, roofColor) {
        const key = `roof-${roofingMaterial}-${roofColor}`;
        if (this.roofMaterialCache.has(key)) {
            return this.roofMaterialCache.get(key);
        }

        let material;

        // Определяем базовый тип материала
        if (roofingMaterial === 'polycarbonate-8mm') {
            // Поликарбонат - полупрозрачный
            material = new THREE.MeshPhysicalMaterial({
                color: 0x9ec9ff,
                transparent: true,
                opacity: 0.55,
                roughness: 0.2,
                metalness: 0.0,
                transmission: 0.0,
                side: THREE.DoubleSide
            });
        } else if (roofingMaterial === 'profiled-gl35r' || roofingMaterial === 'metal-grandline') {
            // Профилист / металлочерепица - металлик
            const metalColors = {
                'amber': 0xD2691E,
                'blue': 0x4169E1,
                'green': 0x228B22,
                'red': 0xDC143C,
                'gray': 0x6b7685
            };
            material = new THREE.MeshStandardMaterial({
                color: metalColors[roofColor] || 0x6b7685,
                roughness: 0.35,
                metalness: 0.6,
                side: THREE.DoubleSide
            });
        } else if (roofingMaterial === 'shinglas-sonata') {
            // Мягкая черепица - шероховатая
            const shingleColors = {
                'amber': 0x8B4513,
                'blue': 0x2F4F4F,
                'green': 0x2F4F2F,
                'red': 0x8B0000,
                'gray': 0x4a4a4a
            };
            material = new THREE.MeshStandardMaterial({
                color: shingleColors[roofColor] || 0x4a4a4a,
                roughness: 0.9,
                metalness: 0.0,
                side: THREE.DoubleSide
            });
        } else {
            // Дефолтный материал
            material = new THREE.MeshStandardMaterial({
                color: 0x808080,
                roughness: 0.5,
                metalness: 0.2,
                side: THREE.DoubleSide
            });
        }

        this.roofMaterialCache.set(key, material);
        return material;
    }

    // Создание материала кровли с реалистичными текстурами
    createRoofMaterial(roofingMaterial, roofColor) {
        const roofColors = {
            'amber': 0xD2691E,
            'blue': 0x4169E1,
            'green': 0x228B22,
            'red': 0xDC143C,
            'brown': 0x8B4513,
            'gray': 0x708090
        };

        const color = roofColors[roofColor] || roofColors['amber'];

        // Создаем процедурную текстуру и нормальную карту для материала
        const texture = this.createRoofTexture(roofingMaterial);
        const normalMap = this.createRoofNormalMap(roofingMaterial);

        switch (roofingMaterial) {
            case 'no-roofing':
                return null; // Без кровли

            case 'metal-grandline':
                // Металлочерепица Grand Line 0.45мм с профилем
                return new THREE.MeshStandardMaterial({
                    color: color,
                    map: texture,
                    normalMap: normalMap,
                    metalness: 0.95,
                    roughness: 0.05,
                    envMapIntensity: 1.2,
                    side: THREE.DoubleSide, // Двусторонний материал
                    // Добавляем эффект профиля через нормальную карту
                    normalScale: new THREE.Vector2(0.3, 0.3)
                });

            case 'profiled-gl35r':
                // Профнастил GL 35R с волнами
                return new THREE.MeshStandardMaterial({
                    color: color,
                    map: texture,
                    normalMap: normalMap,
                    metalness: 0.9,
                    roughness: 0.1,
                    envMapIntensity: 1.0,
                    side: THREE.DoubleSide, // Двусторонний материал
                    // Эффект волн профнастила
                    normalScale: new THREE.Vector2(0.5, 0.2)
                });

            case 'shinglas-sonata':
                // Гибкая черепица с гранулятом
                return new THREE.MeshPhongMaterial({
                    color: color,
                    map: texture,
                    normalMap: normalMap,
                    shininess: 5,
                    transparent: false,
                    side: THREE.DoubleSide, // Двусторонний материал
                    // Шероховатая поверхность гранулята
                    normalScale: new THREE.Vector2(0.8, 0.8)
                });

            case 'polycarbonate-8mm':
                // Поликарбонат 8мм с ребрами жесткости
                return new THREE.MeshPhysicalMaterial({
                    color: color,
                    map: texture,
                    normalMap: normalMap,
                    metalness: 0.0,
                    roughness: 0.1,
                    transmission: 0.6,
                    transparent: true,
                    opacity: 0.8,
                    thickness: 0.008, // 8мм толщина
                    ior: 1.49, // Коэффициент преломления поликарбоната
                    clearcoat: 0.1,
                    clearcoatRoughness: 0.1,
                    side: THREE.DoubleSide, // Двусторонний материал
                    // Эффект ребер жесткости
                    normalScale: new THREE.Vector2(0.2, 0.1)
                });

            default:
                return new THREE.MeshPhongMaterial({
                    color: color,
                    map: texture,
                    normalMap: normalMap,
                    shininess: 80,
                    transparent: true,
                    opacity: 0.95,
                    side: THREE.DoubleSide // Двусторонний материал
                });
        }
    }

    // Создание кровельного покрытия
    createRoofCovering(length, width, height, roofHeight, roofingMaterial, frontExtension, backExtension, roofType, roofColor, trussMaterial, postType) {
        console.log(`🏠 createRoofCovering START: roofingMaterial = ${roofingMaterial}, roofType = ${roofType}`);

        // Если выбрано "Без кровли", не создаем крышу
        if (roofingMaterial === 'no-roofing') {
            console.log('   Кровля отключена (no-roofing)');
            if (this.roofSystem) this.roofSystem.dispose(); // Очищаем если была
            return;
        }

        // Подготовка параметров для RoofSystem
        const beamDimensions = this.getBeamDimensions(this.params.postMaterial, postType);
        const trussDimensions = this.getTrussDimensions(trussMaterial);

        // Высота основания кровли (верхняя поверхность нижнего пояса + высота фермы?)
        // В старом коде: he = height + beamK + trussK.
        // baseHeight в RoofSystem - это высота, от которой начинается крыша (нижний край ската для двускатной).
        // Для двускатной RoofSystem строит от baseHeight до baseHeight+roofHeight.
        // Значит baseHeight должна быть высотой мауэрлата + высота фермы?
        // Нет, ферма треугольная. Нижний пояс лежит на мауэрлате.
        // Верхний пояс поднимается на RoofHeight.
        // То есть RoofSystem baseHeight = Высота мауэрлата (или чуть выше, если ферма имеет толщину нижнего пояса).
        // Старый код: he = height + beamDims.height + beamDims.height/2 + trussDims.height.
        // Это кажется очень высоко.
        // Давайте посмотрим buildGabledRoof в старом коде: z = baseHeight + ...
        // baseHeight передавался как `he`.
        // Значит используем ту же формулу.

        const baseRoofHeight = height + beamDimensions.height + beamDimensions.height / 2 + trussDimensions.height;

        if (this.roofSystem) {
            this.roofSystem.update({
                length: length, // Длина навеса (вдоль конька)
                width: width,   // Ширина навеса (пролет)
                height: height,
                roofHeight: roofHeight,
                roofType: roofType === 'var-1' ? 'var-1' : 'var-2', // RoofSystem поддерживает var-1 и var-2 (gable)
                roofingMaterial: roofingMaterial,
                roofColor: roofColor,
                overhang: 0.1, // 100мм
                baseHeight: baseRoofHeight
            });
            // RoofSystem сама добавит себя в canopyGroup
        } else {
            console.error("RoofSystem не инициализирована!");
        }

        console.log(`✅ createRoofCovering ЗАВЕРШЕНО (через RoofSystem)`);
    }

    // Получение толщины кровельного материала
    getRoofThickness(roofingMaterial) {
        switch (roofingMaterial) {
            case 'metal-grandline':
                return 0.00045; // 0.45мм
            case 'profiled-gl35r':
                return 0.0005;  // 0.5мм
            case 'shinglas-sonata':
                return 0.003;   // 3мм (многослойная структура)
            case 'polycarbonate-8mm':
                return 0.008;   // 8мм
            default:
                return 0.001;   // 1мм по умолчанию
        }
    }

    // Создание конька для двускатной крыши
    createRidgeProfile(roofingMaterial, roofColor, length, ridgeHeight) {
        const ridgeGroup = new THREE.Group();
        ridgeGroup.name = 'ridgeProfile';

        let ridgeWidth, ridgeThickness, ridgeMaterial;

        if (roofingMaterial === 'profiled-gl35r' || roofingMaterial === 'metal-grandline') {
            // Профилист / металлочерепица - П-образный доборный элемент
            ridgeWidth = 0.15; // 150 мм
            ridgeThickness = 0.002;

            const metalColors = {
                'amber': 0xD2691E,
                'blue': 0x4169E1,
                'green': 0x228B22,
                'red': 0xDC143C,
                'gray': 0x6b7685
            };
            ridgeMaterial = new THREE.MeshStandardMaterial({
                color: metalColors[roofColor] || 0x6b7685,
                metalness: 0.7,
                roughness: 0.3
            });
        } else if (roofingMaterial === 'shinglas-sonata') {
            // Мягкая черепица - полоса из гонтов
            ridgeWidth = 0.25; // 250 мм
            ridgeThickness = 0.004;

            const shingleColors = {
                'amber': 0x8B4513,
                'blue': 0x2F4F4F,
                'green': 0x2F4F2F,
                'red': 0x8B0000,
                'gray': 0x3f3f3f
            };
            ridgeMaterial = new THREE.MeshStandardMaterial({
                color: shingleColors[roofColor] || 0x3f3f3f,
                roughness: 0.95
            });
        } else if (roofingMaterial === 'polycarbonate-8mm') {
            // Поликарбонат - узкая H-планка
            ridgeWidth = 0.06; // 60 мм
            ridgeThickness = 0.002;
            ridgeMaterial = new THREE.MeshPhysicalMaterial({
                color: 0x9ec9ff,
                transparent: true,
                opacity: 0.6
            });
        } else {
            // Дефолт
            ridgeWidth = 0.15;
            ridgeThickness = 0.002;
            ridgeMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
        }

        // Создаём коробку конька
        const ridgeGeometry = new THREE.BoxGeometry(length, ridgeThickness, ridgeWidth);
        const ridgeMesh = new THREE.Mesh(ridgeGeometry, ridgeMaterial);

        // Позиционируем конёк на высоте конька
        ridgeMesh.position.y = ridgeHeight + ridgeThickness / 2 + 0.005; // Чуть выше скатов
        ridgeMesh.position.z = 0; // По центру ширины
        ridgeMesh.castShadow = true;
        ridgeMesh.receiveShadow = true;

        ridgeGroup.add(ridgeMesh);
        return ridgeGroup;
    }

    // Создание односкатной крыши с толщиной
    createSingleSlopeRoof(width, length, baseHeight, roofHeight, material, thickness, roofLift) {
        // Односкатная крыша: наклон от левого края (низ) к правому краю (верх)
        const roofGeometry = new THREE.BufferGeometry();
        const vertices = [];
        const indices = [];
        const uvs = [];

        // Параметры крыши
        const lowHeight = baseHeight + roofLift; // Низкий край
        const highHeight = baseHeight + roofHeight + roofLift; // Высокий край

        const segmentsX = Math.max(20, Math.floor(width * 20));
        const segmentsY = Math.max(20, Math.floor(length * 20));

        // Создаем верхнюю и нижнюю поверхности
        for (let side = 0; side < 2; side++) {
            const yOffset = side === 0 ? thickness / 2 : -thickness / 2;

            for (let iy = 0; iy <= segmentsY; iy++) {
                const z = -length / 2 + (iy / segmentsY) * length;
                const v = iy / segmentsY;

                for (let ix = 0; ix <= segmentsX; ix++) {
                    const x = -width / 2 + (ix / segmentsX) * width;
                    const u = ix / segmentsX;

                    // Линейная интерполяция высоты от lowHeight до highHeight
                    const y = lowHeight + (highHeight - lowHeight) * u + yOffset;

                    vertices.push(x, y, z);
                    uvs.push(u, v);
                }
            }
        }

        // Индексы для треугольников
        for (let side = 0; side < 2; side++) {
            const offset = side * (segmentsX + 1) * (segmentsY + 1);

            for (let iy = 0; iy < segmentsY; iy++) {
                for (let ix = 0; ix < segmentsX; ix++) {
                    const a = offset + iy * (segmentsX + 1) + ix;
                    const b = offset + iy * (segmentsX + 1) + ix + 1;
                    const c = offset + (iy + 1) * (segmentsX + 1) + ix;
                    const d = offset + (iy + 1) * (segmentsX + 1) + ix + 1;

                    if (side === 0) {
                        indices.push(a, b, c);
                        indices.push(b, d, c);
                    } else {
                        indices.push(a, c, b);
                        indices.push(b, c, d);
                    }
                }
            }
        }

        // Торцы (4 стороны)
        // Передний торец (низкий край)
        const frontOffset = vertices.length / 3;
        for (let iy = 0; iy <= 1; iy++) {
            const z = -length / 2;
            const yOffset = iy === 0 ? thickness / 2 : -thickness / 2;

            for (let ix = 0; ix <= segmentsX; ix++) {
                const x = -width / 2 + (ix / segmentsX) * width;
                const u = ix / segmentsX;
                const y = lowHeight + (highHeight - lowHeight) * u + yOffset;
                vertices.push(x, y, z);
                uvs.push(u, iy);
            }
        }

        for (let ix = 0; ix < segmentsX; ix++) {
            const a = frontOffset + ix;
            const b = frontOffset + ix + 1;
            const c = frontOffset + segmentsX + 1 + ix;
            const d = frontOffset + segmentsX + 1 + ix + 1;
            indices.push(a, c, b);
            indices.push(b, c, d);
        }

        // Задний торец (высокий край)
        const backOffset = vertices.length / 3;
        for (let iy = 0; iy <= 1; iy++) {
            const z = length / 2;
            const yOffset = iy === 0 ? thickness / 2 : -thickness / 2;

            for (let ix = 0; ix <= segmentsX; ix++) {
                const x = -width / 2 + (ix / segmentsX) * width;
                const u = ix / segmentsX;
                const y = lowHeight + (highHeight - lowHeight) * u + yOffset;
                vertices.push(x, y, z);
                uvs.push(u, iy);
            }
        }

        for (let ix = 0; ix < segmentsX; ix++) {
            const a = backOffset + ix;
            const b = backOffset + ix + 1;
            const c = backOffset + segmentsX + 1 + ix;
            const d = backOffset + segmentsX + 1 + ix + 1;
            indices.push(a, b, c);
            indices.push(b, d, c);
        }

        roofGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        roofGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        roofGeometry.setIndex(indices);
        roofGeometry.computeVertexNormals();

        const roofMesh = new THREE.Mesh(roofGeometry, material);
        roofMesh.castShadow = true;
        roofMesh.receiveShadow = true;
        this.canopyGroup.add(roofMesh);
    }

    // Создание двускатной крыши с толщиной
    createGabledRoof(width, length, baseHeight, roofHeight, slope, material, thickness, trussSectionHeight, roofLift) {
        // Создаем два ската крыши
        const halfWidth = width / 2;
        // Кровля должна лежать на верхней части фермы
        // baseHeight - это высота нижнего пояса фермы
        // roofHeight - это высота подъёма фермы
        // Кровля должна располагаться на высоте сечения фермы от верхней части фермы + подъём на 15 мм
        const ridgeHeight = baseHeight + roofHeight + trussSectionHeight / 2 + roofLift;

        // Левый скат
        const leftSlopeGeometry = new THREE.BufferGeometry();
        const leftVertices = [];
        const leftIndices = [];
        const leftUvs = [];

        // Верхняя поверхность левого ската
        const segmentsX = Math.max(20, Math.floor(width * 20));
        const segmentsY = Math.max(20, Math.floor(length * 20));

        // Создаем верхнюю и нижнюю поверхности
        for (let side = 0; side < 2; side++) {
            const yOffset = side === 0 ? thickness / 2 : -thickness / 2;

            for (let i = 0; i <= segmentsY; i++) {
                const y = (i / segmentsY) * length - length / 2;
                for (let j = 0; j <= segmentsX / 2; j++) {
                    const x = (j / (segmentsX / 2)) * halfWidth - halfWidth;
                    // Кровля должна лежать на верхней части фермы
                    // baseHeight - высота нижнего пояса фермы
                    // slope * (halfWidth - Math.abs(x)) - высота стропильной ноги в точке x
                    // trussSectionHeight / 2 - половина сечения фермы для правильного позиционирования
                    const z = baseHeight + slope * (halfWidth - Math.abs(x)) + trussSectionHeight / 2 + roofLift + yOffset;

                    leftVertices.push(x, z, y);
                    leftUvs.push(j / (segmentsX / 2), i / segmentsY);
                }
            }
        }

        // Создаем индексы для треугольников
        const verticesPerSide = (segmentsY + 1) * (segmentsX / 2 + 1);

        // Верхняя поверхность
        for (let i = 0; i < segmentsY; i++) {
            for (let j = 0; j < segmentsX / 2; j++) {
                const a = i * (segmentsX / 2 + 1) + j;
                const b = a + 1;
                const c = a + segmentsX / 2 + 1;
                const d = c + 1;

                leftIndices.push(a, b, c);
                leftIndices.push(b, d, c);
            }
        }

        // Нижняя поверхность
        for (let i = 0; i < segmentsY; i++) {
            for (let j = 0; j < segmentsX / 2; j++) {
                const a = verticesPerSide + i * (segmentsX / 2 + 1) + j;
                const b = a + 1;
                const c = a + segmentsX / 2 + 1;
                const d = c + 1;

                leftIndices.push(a, c, b);
                leftIndices.push(b, c, d);
            }
        }

        // Боковые грани
        this.addSideFaces(leftVertices, leftIndices, leftUvs, segmentsY, thickness, true);

        leftSlopeGeometry.setIndex(leftIndices);
        leftSlopeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(leftVertices, 3));
        leftSlopeGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(leftUvs, 2));
        leftSlopeGeometry.computeVertexNormals();

        const leftSlope = new THREE.Mesh(leftSlopeGeometry, material);
        leftSlope.receiveShadow = true;
        leftSlope.castShadow = true;
        this.canopyGroup.add(leftSlope);

        // Правый скат (зеркально)
        const rightSlopeGeometry = new THREE.BufferGeometry();
        const rightVertices = [];
        const rightIndices = [];
        const rightUvs = [];

        for (let side = 0; side < 2; side++) {
            const yOffset = side === 0 ? thickness / 2 : -thickness / 2;

            for (let i = 0; i <= segmentsY; i++) {
                const y = (i / segmentsY) * length - length / 2;
                for (let j = 0; j <= segmentsX / 2; j++) {
                    const x = (j / (segmentsX / 2)) * halfWidth;
                    // Кровля должна лежать на верхней части фермы
                    // baseHeight - высота нижнего пояса фермы
                    // slope * (halfWidth - Math.abs(x)) - высота стропильной ноги в точке x
                    // trussSectionHeight / 2 - половина сечения фермы для правильного позиционирования
                    const z = baseHeight + slope * (halfWidth - Math.abs(x)) + trussSectionHeight / 2 + roofLift + yOffset;

                    rightVertices.push(x, z, y);
                    rightUvs.push(j / (segmentsX / 2), i / segmentsY);
                }
            }
        }

        // Индексы для правого ската
        for (let i = 0; i < segmentsY; i++) {
            for (let j = 0; j < segmentsX / 2; j++) {
                const a = i * (segmentsX / 2 + 1) + j;
                const b = a + 1;
                const c = a + segmentsX / 2 + 1;
                const d = c + 1;

                rightIndices.push(a, c, b);
                rightIndices.push(b, c, d);
            }
        }

        // Нижняя поверхность правого ската
        for (let i = 0; i < segmentsY; i++) {
            for (let j = 0; j < segmentsX / 2; j++) {
                const a = verticesPerSide + i * (segmentsX / 2 + 1) + j;
                const b = a + 1;
                const c = a + segmentsX / 2 + 1;
                const d = c + 1;

                rightIndices.push(a, b, c);
                rightIndices.push(b, d, c);
            }
        }

        // Боковые грани правого ската
        this.addSideFaces(rightVertices, rightIndices, rightUvs, segmentsY, thickness, false);

        rightSlopeGeometry.setIndex(rightIndices);
        rightSlopeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(rightVertices, 3));
        rightSlopeGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(rightUvs, 2));
        rightSlopeGeometry.computeVertexNormals();

        const rightSlope = new THREE.Mesh(rightSlopeGeometry, material);
        rightSlope.receiveShadow = true;
        rightSlope.castShadow = true;
        this.canopyGroup.add(rightSlope);
    }

    // Добавление боковых граней крыши
    addSideFaces(vertices, indices, uvs, segmentsY, thickness, isLeft) {
        const verticesPerSide = (segmentsY + 1) * 2;
        const startIndex = vertices.length / 3;

        // Передняя грань
        for (let i = 0; i <= segmentsY; i++) {
            const y = (i / segmentsY) - 0.5;
            const baseZ = vertices[i * 3 + 1]; // Z координата из верхней поверхности
            const baseX = vertices[i * 3];     // X координата из верхней поверхности

            // Верхняя точка
            vertices.push(baseX, baseZ + thickness / 2, y);
            uvs.push(0, i / segmentsY);

            // Нижняя точка
            vertices.push(baseX, baseZ - thickness / 2, y);
            uvs.push(1, i / segmentsY);
        }

        // Создаем треугольники для передней грани
        for (let i = 0; i < segmentsY; i++) {
            const a = startIndex + i * 2;
            const b = a + 1;
            const c = a + 2;
            const d = c + 1;

            if (isLeft) {
                indices.push(a, b, c);
                indices.push(b, d, c);
            } else {
                indices.push(a, c, b);
                indices.push(b, c, d);
            }
        }

        // Задняя грань
        const backStartIndex = vertices.length / 3;
        for (let i = 0; i <= segmentsY; i++) {
            const y = (i / segmentsY) - 0.5;
            const baseZ = vertices[verticesPerSide + i * 3 + 1]; // Z координата из нижней поверхности
            const baseX = vertices[verticesPerSide + i * 3];     // X координата из нижней поверхности

            // Верхняя точка
            vertices.push(baseX, baseZ + thickness / 2, y);
            uvs.push(0, i / segmentsY);

            // Нижняя точка
            vertices.push(baseX, baseZ - thickness / 2, y);
            uvs.push(1, i / segmentsY);
        }

        // Создаем треугольники для задней грани
        for (let i = 0; i < segmentsY; i++) {
            const a = backStartIndex + i * 2;
            const b = a + 1;
            const c = a + 2;
            const d = c + 1;

            if (isLeft) {
                indices.push(a, c, b);
                indices.push(b, c, d);
            } else {
                indices.push(a, b, c);
                indices.push(b, d, c);
            }
        }
    }

    // Создание площадки под навесом с брусчаткой
    createGround() {
        // Получаем размеры навеса
        const length = this.params.length / 10; // конвертация в метры
        const width = this.params.width / 10;
        const frontBeamExtension = this.params.frontBeamExtension / 1000;
        const backBeamExtension = this.params.backBeamExtension / 1000;

        // Размеры площадки: площадь навеса + 2 метра по краям
        const pavingLength = length + frontBeamExtension + backBeamExtension + 4; // +2м с каждой стороны
        const pavingWidth = width + 4; // +2м с каждой стороны

        // Создаем геометрию площадки
        const pavingGeometry = new THREE.PlaneGeometry(pavingWidth, pavingLength);

        // Создаем материал с текстурой брусчатки
        const pavingMaterial = this.createPavingMaterial();

        // Создаем меш площадки
        const paving = new THREE.Mesh(pavingGeometry, pavingMaterial);
        paving.rotation.x = -Math.PI / 2;
        paving.position.y = 0.001; // Немного выше уровня земли для избежания z-fighting
        paving.receiveShadow = true;
        this.canopyGroup.add(paving);
    }

    // Создание материала брусчатки
    createPavingMaterial() {
        // Создаем процедурную текстуру брусчатки
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Базовый цвет брусчатки
        ctx.fillStyle = '#8B7355'; // Коричневый цвет брусчатки
        ctx.fillRect(0, 0, 512, 512);

        // Создаем эффект отдельных камней брусчатки
        const stoneSize = 32; // Размер одного камня в пикселях
        const gapSize = 2; // Размер зазора между камнями

        for (let y = 0; y < 512; y += stoneSize + gapSize) {
            for (let x = 0; x < 512; x += stoneSize + gapSize) {
                // Случайные вариации цвета для каждого камня
                const colorVariation = Math.random() * 0.3 - 0.15; // ±15% вариации
                const baseColor = 0x8B7355;
                const r = Math.max(0, Math.min(255, ((baseColor >> 16) & 0xFF) + colorVariation * 255));
                const g = Math.max(0, Math.min(255, ((baseColor >> 8) & 0xFF) + colorVariation * 255));
                const b = Math.max(0, Math.min(255, (baseColor & 0xFF) + colorVariation * 255));

                ctx.fillStyle = `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
                ctx.fillRect(x, y, stoneSize, stoneSize);

                // Добавляем тень для объёма
                ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                ctx.fillRect(x, y, stoneSize, 1);
                ctx.fillRect(x, y, 1, stoneSize);
            }
        }

        // Создаем текстуру
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(6, 6); // Больше повторений для более детальной брусчатки

        // Создаем нормальную карту для эффекта рельефа
        const normalCanvas = document.createElement('canvas');
        normalCanvas.width = 512;
        normalCanvas.height = 512;
        const normalCtx = normalCanvas.getContext('2d');

        // Базовый цвет для нормальной карты
        normalCtx.fillStyle = '#8080ff';
        normalCtx.fillRect(0, 0, 512, 512);

        // Создаем рельеф для каждого камня
        for (let y = 0; y < 512; y += stoneSize + gapSize) {
            for (let x = 0; x < 512; x += stoneSize + gapSize) {
                // Светлые края (выступы)
                normalCtx.fillStyle = '#a0a0ff';
                normalCtx.fillRect(x, y, stoneSize, 2);
                normalCtx.fillRect(x, y, 2, stoneSize);

                // Темные зазоры (углубления)
                normalCtx.fillStyle = '#6060ff';
                normalCtx.fillRect(x + stoneSize - 1, y, 2, stoneSize);
                normalCtx.fillRect(x, y + stoneSize - 1, stoneSize, 2);
            }
        }

        const normalTexture = new THREE.CanvasTexture(normalCanvas);
        normalTexture.wrapS = THREE.RepeatWrapping;
        normalTexture.wrapT = THREE.RepeatWrapping;
        normalTexture.repeat.set(6, 6); // Синхронизируем с основной текстурой брусчатки

        // Создаем материал с текстурой и нормальной картой
        return new THREE.MeshStandardMaterial({
            map: texture,
            normalMap: normalTexture,
            normalScale: new THREE.Vector2(0.3, 0.3),
            roughness: 0.8,
            metalness: 0.0
        });
    }

    // Получение размеров столба
    getPostDimensions(postMaterial) {
        if (typeof postMaterial !== 'string') return { width: 0.15, height: 0.15 };
        const match = postMaterial.match(/(\d+)x(\d+)/);
        if (match) {
            const width = parseInt(match[1]) / 1000;
            const height = parseInt(match[2]) / 1000;
            return { width, height };
        }
        return { width: 0.15, height: 0.15 };
    }

    // Получение размеров фермы
    getTrussDimensions(trussMaterial) {
        if (typeof trussMaterial !== 'string') return { width: 0.045, height: 0.19 };
        const match = trussMaterial.match(/(\d+)x(\d+)/);
        if (match) {
            const width = parseInt(match[1]) / 1000;
            const height = parseInt(match[2]) / 1000;
            return { width, height };
        }
        return { width: 0.045, height: 0.19 };
    }

    // Получение размеров балки в зависимости от типа столба
    getBeamDimensions(postMaterial, postType) {
        // Для var-1 и var-5 используем фиксированное сечение 200×200 мм
        if (postType === 'var-1' || postType === 'var-5') {
            return { width: 0.2, height: 0.2 };
        } else {
            // Для var-2, var-3, var-4 используем сечение столбов
            return this.getPostDimensions(postMaterial);
        }
    }

    // Создание деревянного материала с кэшированием
    createWoodMaterial(frameMaterial, frameColoring) {
        const materialKey = `wood_${frameMaterial}_${frameColoring}`;

        return this.getCachedMaterial(materialKey, () => {
            // Базовые цвета для разных пород дерева
            const woodColors = {
                'pine': 0xDEB887,      // Сосна - светлый коричневый
                'larch': 0xD2B48C,     // Лиственница - более темный коричневый
                'oak': 0x8B4513,       // Дуб - темно-коричневый
                'spruce': 0xF5DEB3     // Ель - очень светлый коричневый
            };

            // Цвета для различных видов окраса
            const coloringColors = {
                'no-coloring': null,   // Без окраса - используем натуральный цвет дерева
                'neomid': 0xCD853F,    // Neomid - золотисто-коричневый
                'texturol-landscape': 0xDAA520,  // Текстуrol Ландшафт - золотой
                'texturol-country': 0x8B4513,    // Текстуrol Кантри - темно-коричневый
                'symphony-wood-guard': 0xDEB887, // Symphony wood-guard - натуральный
                'olsta': 0x2F4F4F,     // Olsta - темно-серый
                'tikkurila': 0x8B4513  // Tikkurila - темно-коричневый
            };

            let baseColor = woodColors[frameMaterial] || woodColors['pine'];

            // Если выбран окрас, используем его цвет
            if (frameColoring && frameColoring !== 'no-coloring' && coloringColors[frameColoring]) {
                baseColor = coloringColors[frameColoring];
            }

            return new THREE.MeshLambertMaterial({
                color: baseColor,
                roughness: 0.8,
                metalness: 0.0
            });
        });
    }

    // Создание материала для перемычек с текстурой бамбука
    createCrossbarMaterial() {
        if (this.crossbarMaterial) {
            return this.crossbarMaterial;
        }

        // Загружаем текстуру
        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load(
            './assets/textures/Wood_Bamboo.jpg',
            // onLoad callback
            (texture) => {
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.set(1, 1);
                console.log('Текстура Wood_Bamboo.jpg загружена успешно');
            },
            // onProgress callback
            undefined,
            // onError callback
            (error) => {
                console.error('Ошибка загрузки текстуры Wood_Bamboo.jpg:', error);
                console.log('Убедитесь, что файл находится в папке naves-calc/assets/textures/');
            }
        );

        this.crossbarMaterial = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.8,
            metalness: 0.0
        });

        return this.crossbarMaterial;
    }

    // Расчёт стоимости
    calculateTotal() {
        const length = this.params.length / 10;
        const width = this.params.width / 10;
        const height = this.params.height / 10;
        const postSpacing = this.currentPostSpacing;
        const mountingRequired = this.params.mountingRequired;
        const distanceFromMKAD = this.params.distanceFromMKAD;

        const area = length * width;
        const postsAlongLength = Math.ceil(length / postSpacing) + 1;
        const postCount = postsAlongLength * 2;
        const trussCount = postsAlongLength; // Количество ферм равно количеству столбов вдоль длины
        const braceCount = postCount * 2;

        // Стоимость материалов
        let materialsCost = 0;
        materialsCost += area * (this.prices['roof_metal_grandline']?.price || 650);
        materialsCost += postCount * height * (this.prices['post_glued_150x150']?.price || 1500);
        materialsCost += trussCount * width * (this.prices['truss_planed_45x190']?.price || 850);

        // Стоимость монтажа
        let mountingCost = 0;
        if (mountingRequired === 'yes') {
            mountingCost = area * (this.prices['mounting_base']?.price || 2500);
        }

        // Доставка
        const deliveryCost = distanceFromMKAD * (this.prices['delivery_mkad']?.price || 35);

        const totalCost = materialsCost + mountingCost + deliveryCost;

        this.renderSummary({
            area,
            postCount,
            trussCount,
            braceCount,
            materialsCost,
            mountingCost,
            deliveryCost,
            totalCost
        });

        // Обновляем цену в новом блоке
        this.updateTotalPrice(totalCost);
    }

    // Обновление спецификации
    updateSpecification() {
        const length = this.params.length / 10;
        const width = this.params.width / 10;
        const height = this.params.height / 10;
        const roofHeight = this.params.roofHeight / 10;
        const frontBeamExtension = this.params.frontBeamExtension;
        const backBeamExtension = this.params.backBeamExtension;
        const postSpacing = this.currentPostSpacing;

        const area = length * width;
        const postsAlongLength = Math.ceil(length / postSpacing) + 1;
        const postCount = postsAlongLength * 2;
        const trussCount = postsAlongLength; // Количество ферм равно количеству столбов вдоль длины
        const braceCount = postCount * 2;
        const trussSpacing = trussCount > 1 ? (length * 1000) / (trussCount - 1) : 0;

        // Словари названий
        const materialNames = {
            'pine': 'Сосна',
            'larch': 'Лиственница',
            'no-roofing': 'Без кровли',
            'metal-grandline': 'Металлочерепица Grand Line 0.45 мм + снегозадержатели',
            'shinglas-sonata': 'Гибкая черепица Shinglas Финская Соната',
            'profiled-gl35r': 'Кровельный профнастил GL 35R',
            'polycarbonate-8mm': 'Монолитный поликарбонат, 8 мм',
            'amber': 'Янтарь',
            'blue': 'Синий',
            'green': 'Зеленый',
            'red': 'Красный',
            'gray': 'Серый',
            'var-1': 'Односкатный',
            'var-2': 'Двускатный',
            'var-3': 'Двускатный со стойкой'
        };

        const postSectionNames = {
            'glued-100x100': '100×100 мм',
            'glued-200x200': '200×200 мм',
            'glued-240x140': '240×140 мм',
            'glued-150x150': '150×150 мм',
            'planed-90x90': '90×90 мм',
            'planed-140x140': '140×140 мм',
            'planed-190x190': '190×190 мм'
        };

        const trussMaterialNames = {
            'planed-45x190': 'Строганная доска 45×190 мм',
            'planed-35x190': 'Строганная доска 35×190 мм',
            'planed-50x150': 'Строганная доска 50×150 мм'
        };

        // Обновление значений
        // ✅ MVP: Используем параметры из модели
        const roofType = this.params.roofType || 'var-2';

        // ✅ MVP: Безопасное обновление элементов с проверкой существования
        const updateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        };

        updateElement('specRoofType', materialNames[roofType] || 'Двускатный');
        updateElement('specFrameMaterial', 'Сосна');
        updateElement('specRoofingMaterial', materialNames[this.params.roofingMaterial] || 'Металлочерепица');
        updateElement('specRoofColor', materialNames[this.params.roofColor] || 'Янтарь');
        updateElement('specArea', area.toFixed(1) + ' м²');
        updateElement('specWidth', (width * 1000) + ' мм');
        updateElement('specLength', Math.round(length * 1000 + frontBeamExtension + backBeamExtension) + ' мм');
        updateElement('specHeight', (height * 1000) + ' мм');
        updateElement('specRoofHeight', (roofHeight * 1000) + ' мм');
        updateElement('specPostSpacing', (postSpacing * 1000) + ' мм');

        updateElement('specPosts', postCount + ' шт.');
        updateElement('specPostType', 'Квадратный брус');
        updateElement('specPostMaterial', 'Сосна');
        updateElement('specHeightLeft', (height * 1000) + ' мм');
        updateElement('specHeightRight', (height * 1000) + ' мм');
        updateElement('specPostSection', postSectionNames[this.params.postMaterial] || '150×150 мм');

        updateElement('specFarms', trussCount + ' шт.');
        updateElement('specTrussMaterial', trussMaterialNames[this.params.trussMaterial] || 'Строганная доска 45×190 мм');
        updateElement('specFarmLength', (width * 1000) + ' мм');
        updateElement('specTrussSpacing', Math.round(trussSpacing) + ' мм');

        updateElement('specBraces', braceCount + ' шт.');
        updateElement('specBraceType', 'Стандартный');
        updateElement('specBraceMaterial', 'Сосна');
    }

    /**
     * Создание полупрозрачного bounding box для раскоса
     * Размеры вычисляются из реальной геометрии раскоса в мировых координатах
     * Стороны квадрата расположены строго под прямым углом относительно осей координат сцены
     * @param {THREE.Object3D} braceObject - Объект раскоса, для которого создается bounding box
     * @param {number} braceNumber - Номер раскоса (1-4) для отображения на боксе
     */
    createBraceBoundingBox(braceObject, braceNumber = 0) {
        if (!braceObject) {
            console.warn('createBraceBoundingBox: braceObject не передан');
            return null;
        }

        // ВАЖНО: Обновляем матрицы раскоса перед вычислением bounding box
        // Это гарантирует, что все трансформации (позиция, поворот, масштаб) учтены
        braceObject.updateMatrixWorld(true);

        // Вычисляем AABB (axis-aligned bounding box) раскоса в мировых координатах
        // Это гарантирует, что стороны box будут строго по осям координат сцены
        const worldBox = new THREE.Box3();
        worldBox.setFromObject(braceObject);

        if (worldBox.isEmpty()) {
            console.warn('createBraceBoundingBox: bounding box пуст');
            return null;
        }

        // Получаем размеры AABB в мировых координатах
        const size = new THREE.Vector3();
        worldBox.getSize(size);

        // Выводим размеры в консоль для отладки
        console.log(`📦 Размеры bounding box раскоса:`, {
            'X (ширина)': `${(size.x * 1000).toFixed(1)} мм`,
            'Y (высота)': `${(size.y * 1000).toFixed(1)} мм`,
            'Z (глубина)': `${(size.z * 1000).toFixed(1)} мм`,
            'X (м)': size.x.toFixed(3),
            'Y (м)': size.y.toFixed(3),
            'Z (м)': size.z.toFixed(3)
        });

        // Получаем центр AABB в мировых координатах
        const center = new THREE.Vector3();
        worldBox.getCenter(center);

        // Создаем геометрию box с реальными размерами раскоса
        // BoxGeometry(width, height, depth) - стороны строго по осям координат
        const boxGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);

        // Создаем полупрозрачный материал для стенок
        const boxMaterial = new THREE.MeshStandardMaterial({
            color: 0x00ff00,  // Зеленый цвет для видимости
            transparent: true,
            opacity: 0.2,     // Полупрозрачность 20%
            side: THREE.DoubleSide,
            wireframe: false
        });

        // Создаем mesh для bounding box
        const boundingBox = new THREE.Mesh(boxGeometry, boxMaterial);
        boundingBox.name = `brace-bounding-box`;

        // Позиционируем bounding box в центр AABB (в мировых координатах)
        // Box выровнен по осям координат (без поворота)
        boundingBox.position.copy(center);
        boundingBox.rotation.set(0, 0, 0); // Без поворота - строго по осям координат

        // Добавляем wireframe для лучшей видимости краев
        const wireframeGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        const wireframeMaterial = new THREE.LineBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.6
        });
        const wireframe = new THREE.LineSegments(
            new THREE.EdgesGeometry(wireframeGeometry),
            wireframeMaterial
        );
        boundingBox.add(wireframe);

        // Не отбрасываем и не получаем тени для bounding box
        boundingBox.castShadow = false;
        boundingBox.receiveShadow = false;

        // Создаем текстовую метку с номером раскоса, если номер указан
        if (braceNumber > 0) {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 256;
            canvas.height = 256;

            // Рисуем фон
            context.fillStyle = 'rgba(0, 255, 0, 0.8)';
            context.fillRect(0, 0, canvas.width, canvas.height);

            // Рисуем текст с номером
            context.fillStyle = '#000000';
            context.font = 'bold 120px Arial';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(braceNumber.toString(), canvas.width / 2, canvas.height / 2);

            // Создаем текстуру из canvas
            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;

            // Создаем спрайт с текстом
            const spriteMaterial = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                depthTest: false,
                depthWrite: false
            });
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.scale.set(0.3, 0.3, 1); // Размер спрайта
            sprite.position.set(0, size.y / 2 + 0.1, 0); // Позиция над bounding box
            sprite.renderOrder = 999; // Рендерим поверх всего

            boundingBox.add(sprite);
        }

        return boundingBox;
    }

    /**
     * Создание визуализации осей координат для раскоса
     * Оси показывают локальную систему координат раскоса в мировых координатах
     * X - красный, Y - зеленый, Z - синий
     * @param {THREE.Object3D} braceObject - Объект раскоса, для которого создаются оси
     * @param {number} axisLength - Длина осей в метрах (по умолчанию 0.2 м)
     */
    createBraceAxes(braceObject, axisLength = 0.2) {
        if (!braceObject) {
            console.warn('createBraceAxes: braceObject не передан');
            return null;
        }

        // Обновляем матрицы раскоса для правильного вычисления позиции и поворота
        braceObject.updateMatrixWorld(true);

        // Вычисляем центр раскоса в мировых координатах
        const box = new THREE.Box3();
        box.setFromObject(braceObject);

        if (box.isEmpty()) {
            console.warn('createBraceAxes: bounding box пуст');
            return null;
        }

        const center = new THREE.Vector3();
        box.getCenter(center);

        // Создаем группу для всех осей
        const axesGroup = new THREE.Group();
        axesGroup.name = `brace-axes`;

        // Получаем матрицу поворота раскоса в мировых координатах
        const worldMatrix = new THREE.Matrix4();
        worldMatrix.extractRotation(braceObject.matrixWorld);

        // Создаем направления осей в локальной системе координат раскоса
        const localX = new THREE.Vector3(1, 0, 0);
        const localY = new THREE.Vector3(0, 1, 0);
        const localZ = new THREE.Vector3(0, 0, 1);

        // Преобразуем направления в мировые координаты
        const worldX = localX.clone().applyMatrix4(worldMatrix).normalize();
        const worldY = localY.clone().applyMatrix4(worldMatrix).normalize();
        const worldZ = localZ.clone().applyMatrix4(worldMatrix).normalize();

        // Создаем стрелки для каждой оси
        // Ось X - красная
        const arrowX = new THREE.ArrowHelper(
            worldX,
            center,
            axisLength,
            0xff0000,  // Красный
            axisLength * 0.2,  // Длина наконечника
            axisLength * 0.1   // Радиус наконечника
        );
        axesGroup.add(arrowX);

        // Ось Y - зеленая
        const arrowY = new THREE.ArrowHelper(
            worldY,
            center,
            axisLength,
            0x00ff00,  // Зеленый
            axisLength * 0.2,
            axisLength * 0.1
        );
        axesGroup.add(arrowY);

        // Ось Z - синяя
        const arrowZ = new THREE.ArrowHelper(
            worldZ,
            center,
            axisLength,
            0x0000ff,  // Синий
            axisLength * 0.2,
            axisLength * 0.1
        );
        axesGroup.add(arrowZ);

        // Не отбрасываем и не получаем тени для осей
        axesGroup.traverse((child) => {
            if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
                child.castShadow = false;
                child.receiveShadow = false;
            }
        });

        return axesGroup;
    }

    // Отображение сводки
    renderSummary(data) {
        const summaryHTML = `
            <div class="nc-summary">
                <div class="nc-summary__price">${this.formatMoney(data.totalCost)}</div>
                
                <div class="nc-summary__spec">
                    <div class="nc-summary__item">
                        <span class="nc-summary__label">Площадь навеса</span>
                        <span class="nc-summary__value">${data.area.toFixed(1)} м²</span>
                    </div>
                    <div class="nc-summary__item">
                        <span class="nc-summary__label">Количество столбов</span>
                        <span class="nc-summary__value">${data.postCount} шт</span>
                    </div>
                    <div class="nc-summary__item">
                        <span class="nc-summary__label">Количество ферм</span>
                        <span class="nc-summary__value">${data.trussCount} шт</span>
                    </div>
                    <div class="nc-summary__item">
                        <span class="nc-summary__label">Материалы</span>
                        <span class="nc-summary__value">${this.formatMoney(data.materialsCost)}</span>
                    </div>
                    <div class="nc-summary__item">
                        <span class="nc-summary__label">Монтаж</span>
                        <span class="nc-summary__value">${this.formatMoney(data.mountingCost)}</span>
                    </div>
                    <div class="nc-summary__item">
                        <span class="nc-summary__label">Доставка</span>
                        <span class="nc-summary__value">${this.formatMoney(data.deliveryCost)}</span>
                    </div>
                </div>
                
                <div style="margin-top: 20px;">
                    <button class="nc-btn nc-btn--primary" style="width: 48%; margin-right: 4%;">Заказать</button>
                    <button class="nc-btn nc-btn--secondary" style="width: 48%;">Сохранить</button>
                </div>
            </div>
        `;

        this.summaryElement.innerHTML = summaryHTML;
    }

    // Форматирование денег
    formatMoney(amount) {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    // Управление автоповоротом
    toggleAutoRotation(enable) {
        if (this.controls) {
            this.controls.autoRotate = (enable !== undefined) ? enable : !this.controls.autoRotate;
            this.controls.autoRotateSpeed = 2.0;
        }
    }
}

// ✅ MVP: Класс CanopyRendererV3 доступен глобально
// Экземпляр создается в app.js
if (typeof window !== 'undefined') {
    window.CanopyRendererV3 = CanopyRendererV3;
    // For backward compatibility if needed
    window.Canopy3DRenderer = CanopyRendererV3;
}
