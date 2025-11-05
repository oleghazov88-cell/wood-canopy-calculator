/**
 * Калькулятор навесов - Автономная версия
 * Полный код с Three.js из modern_calculator
 */

/**
 * Canopy3DRenderer - ПОЛНЫЙ 3D Рендеринг навеса (MVP Pattern)
 * 
 * Полная версия из naves-calc.bundle.js со всеми функциями:
 * - Все типы столбов (var-1 до var-6) с базами и астрагалами
 * - Все типы ферм (var-1, var-2, var-3) с усовыми подрезками  
 * - Все типы раскосов с GLB моделями
 * - Все типы крыш и материалов
 * - Кэширование и оптимизация производительности
 */
class Canopy3DRenderer {
    constructor(canvasSelector) {
        this.canvasSelector = canvasSelector; // Сохраняем селектор, а не сам элемент
        this.canvasElement = null; // Будет установлен в init()
        
        // ✅ Проверка перенесена в метод init() для избежания ошибок при ранней инициализации
        
        this.config = {
            pricesUrl: '/naves-calc/upload/naves/prices.json',
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
        this.glbCache = {}; // Кэш для GLB моделей
        this.crossbarMaterial = null; // Материал для перемычек
        
        // Three.js переменные
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.canopyGroup = null;
        this.currentPostSpacing = this.params.postSpacing / 10; // Инициализация из параметров (дециметры -> метры)
        
        this.formElement = null;
        // this.canvasElement уже инициализирован выше (строка 19)
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
            
            console.log('✓ Canvas элемент найден:', this.canvasElement);
            
            // Проверяем наличие THREE.js
            if (typeof THREE === 'undefined') {
                throw new Error('Three.js не загружен');
            }
            
            console.log('✓ Three.js загружен');
            
            // Инициализируем Three.js сцену
            this.init3DScene();
            
            console.log('✓ 3D Renderer инициализирован');
            
        } catch (error) {
            console.error('Ошибка инициализации 3D Renderer:', error);
            throw error;
        }
    }
    
    // MVP метод update - обновление 3D модели с новыми параметрами
    update(params) {
        try {
            // Обновляем внутренние параметры
            Object.assign(this.params, params);
            
            // Обновляем currentPostSpacing для корректного расчета
            if (params.postSpacing !== undefined) {
                this.currentPostSpacing = params.postSpacing / 10; // дециметры -> метры
            }
            
            // Перерисовываем 3D модель
            this.update3DModel();
            
        } catch (error) {
            console.error('Ошибка обновления 3D модели:', error);
        }
    }
    
    // Старый монолитный метод (deprecated, для совместимости)
    async init_DEPRECATED(formSelector, canvasSelector, summarySelector) {
        try {
            this.formElement = document.querySelector(formSelector);
            this.canvasElement = document.querySelector(canvasSelector);
            this.summaryElement = document.querySelector(summarySelector);

            if (!this.formElement || !this.canvasElement || !this.summaryElement) {
                throw new Error('Не найдены необходимые элементы DOM');
            }

            // Загружаем цены
            await this.loadPrices();
            
            // Создаем форму
            this.renderForm();
            
            // Инициализируем спецификацию
            this.initSpecification();
            
            // Инициализируем 3D после загрузки Three.js
            this.loadThreeJS().then(() => {
                this.init3DScene();
                this.update3DModel();
            });
            
            // Первый расчет
            this.calculateTotal();
            
            console.log('NavesCalculator инициализирован');
            
        } catch (error) {
            console.error('Ошибка инициализации:', error);
        }
    }

    // Загрузка Three.js
    loadThreeJS() {
        return new Promise((resolve) => {
        if (window.THREE) {
                resolve();
                return;
        }

            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
            script.onload = () => {
                const controlsScript = document.createElement('script');
                controlsScript.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
                controlsScript.onload = () => {
                    // Загружаем GLTFLoader для .glb файлов
                    const gltfLoaderScript = document.createElement('script');
                    gltfLoaderScript.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';
                    gltfLoaderScript.onload = () => resolve();
                    document.head.appendChild(gltfLoaderScript);
                };
                document.head.appendChild(controlsScript);
            };
            document.head.appendChild(script);
        });
    }

    // Загрузка GLB модели раскоса
    async loadBraceGLB(braceType) {
        if (braceType === 'var-1') {
            return null; // Стандартный раскос
        }
        
        // Проверяем кэш
        const cacheKey = `brace_${braceType}`;
        if (this.glbCache[cacheKey]) {
            return this.glbCache[cacheKey];
        }
        
        const glbFile = `../raskos/r${braceType.replace('var-', '')}.glb`;
        
        return new Promise((resolve, reject) => {
            const loader = new THREE.GLTFLoader();
            loader.load(
                glbFile,
                (gltf) => {
                    const model = gltf.scene;
                    model.scale.set(1, 1, 1);
                    model.castShadow = true;
                    model.receiveShadow = true;
                    
                    // Сохраняем в кэш
                    this.glbCache[cacheKey] = model;
                    resolve(model);
                },
                (progress) => {
                    console.log('Загрузка раскоса:', (progress.loaded / progress.total * 100) + '%');
                },
                (error) => {
                    console.error('Ошибка загрузки раскоса:', error);
                    resolve(null); // Возвращаем null при ошибке
                }
            );
        });
    }

    // Загрузка цен
    async loadPrices() {
        try {
            const response = await fetch(this.config.pricesUrl);
            if (response.ok) {
                this.prices = await response.json();
            } else {
                this.prices = this.getDefaultPrices();
            }
        } catch (error) {
            console.warn('Не удалось загрузить цены, используем дефолтные:', error);
            this.prices = this.getDefaultPrices();
        }
    }

    // Дефолтные цены
    getDefaultPrices() {
        return {
            'post_glued_150x150': { price: 1500, unit: 'м.п.' },
            'post_glued_200x200': { price: 2200, unit: 'м.п.' },
            'beam_glued': { price: 1800, unit: 'м.п.' },
            'truss_planed_45x190': { price: 850, unit: 'м.п.' },
            'roof_metal_grandline': { price: 650, unit: 'м²' },
            'roof_shinglas': { price: 450, unit: 'м²' },
            'mounting_base': { price: 2500, unit: 'м²' },
            'delivery_mkad': { price: 35, unit: 'км' }
        };
    }

    // Создание формы
    renderForm() {
        const formHTML = `
            <div class="nc-field">
                <h2 class="nc-heading nc-heading--lg">Калькулятор навесов</h2>
            </div>

            <div class="nc-field">
                <label class="nc-field__label">Форма кровли</label>
                <div class="nc-radio-group">
                    <div class="nc-radio">
                        <input type="radio" class="nc-radio__input" name="type-karkas" value="var-1" id="type-karkas-var-1">
                        <label for="type-karkas-var-1" class="nc-radio__label">
                            <img src="data:image/svg+xml,%3Csvg viewBox='0 0 100 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 50 L90 50 L90 20 L10 40 Z' fill='%2320B5B9'/%3E%3C/svg%3E" alt="Односкатный" class="nc-radio__image">
                        </label>
                    </div>
                    <div class="nc-radio">
                        <input type="radio" class="nc-radio__input" name="type-karkas" value="var-2" id="type-karkas-var-2" checked>
                        <label for="type-karkas-var-2" class="nc-radio__label">
                            <img src="data:image/svg+xml,%3Csvg viewBox='0 0 100 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 50 L90 50 L50 20 Z' fill='%2320B5B9'/%3E%3C/svg%3E" alt="Двускатный" class="nc-radio__image">
                        </label>
                    </div>
                    <div class="nc-radio">
                        <input type="radio" class="nc-radio__input" name="type-karkas" value="var-3" id="type-karkas-var-3">
                        <label for="type-karkas-var-3" class="nc-radio__label">
                            <img src="data:image/svg+xml,%3Csvg viewBox='0 0 100 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 50 Q50 15 90 50' fill='none' stroke='%2320B5B9' stroke-width='3'/%3E%3Cline x1='10' y1='50' x2='90' y2='50' stroke='%2320B5B9' stroke-width='3'/%3E%3C/svg%3E" alt="Арочный" class="nc-radio__image">
                        </label>
                    </div>
                </div>
            </div>

            <div class="nc-field">
                <label class="nc-field__label">Размеры</label>
                
                <div class="nc-slider-description">
                    <span class="nc-slider-description__text">Длина навеса (по фронту)</span>
                </div>
                <div class="nc-slider">
                    <div class="nc-slider__min">от<br>1м</div>
                    <div class="nc-slider__value"><span id="length-value">11.0</span>м</div>
                    <div class="nc-slider__max">до<br>20м</div>
                    <input type="range" class="nc-slider__input" min="10" max="200" step="5" value="110" id="length">
                </div>
                
                <div class="nc-slider-description">
                    <span class="nc-slider-description__text">Ширина навеса (глубина)</span>
                </div>
                <div class="nc-slider">
                    <div class="nc-slider__min">от<br>3м</div>
                    <div class="nc-slider__value"><span id="width-value">6.0</span>м</div>
                    <div class="nc-slider__max">до<br>12м</div>
                    <input type="range" class="nc-slider__input" min="30" max="120" step="5" value="60" id="width">
                </div>
                
                <div class="nc-slider-description">
                    <span class="nc-slider-description__text">Высота столбов</span>
                </div>
                <div class="nc-slider">
                    <div class="nc-slider__min">от<br>2.5м</div>
                    <div class="nc-slider__value"><span id="height-value">3.0</span>м</div>
                    <div class="nc-slider__max">до<br>4м</div>
                    <input type="range" class="nc-slider__input" min="25" max="40" step="1" value="30" id="height">
                </div>
                
                <div class="nc-slider-description">
                    <span class="nc-slider-description__text">Высота кровли (подъем)</span>
                </div>
                <div class="nc-slider">
                    <div class="nc-slider__min">от<br>0.5м</div>
                    <div class="nc-slider__value"><span id="roofHeight-value">1.5</span>м</div>
                    <div class="nc-slider__max">до<br>3м</div>
                    <input type="range" class="nc-slider__input" min="5" max="30" step="1" value="15" id="roofHeight">
                </div>
                
                <div class="nc-slider-description">
                    <span class="nc-slider-description__text">Расстояние между столбами</span>
                </div>
                <div class="nc-slider">
                    <div class="nc-slider__min">от<br>1.0м</div>
                    <div class="nc-slider__value"><span id="columnStep-value">2.5</span>м</div>
                    <div class="nc-slider__max">до<br>3.5м</div>
                    <input type="range" class="nc-slider__input" min="10" max="35" step="1" value="25" id="columnStep">
                </div>
            </div>

            <div class="nc-field">
                <label class="nc-field__label">Материал столбов</label>
                <select class="nc-field__input" id="postMaterial">
                    <option value="glued-100x100">Клееный брус 100×100 мм</option>
                    <option value="glued-200x200">Клееный брус 200×200 мм</option>
                    <option value="glued-240x140">Клееный брус 240×140 мм</option>
                    <option value="glued-150x150" selected>Клееный брус 150×150 мм</option>
                    <option value="planed-90x90">Строганый брус 90×90 мм</option>
                    <option value="planed-140x140">Строганый брус 140×140 мм</option>
                    <option value="planed-190x190">Строганый брус 190×190 мм</option>
                </select>
            </div>

            <div class="nc-field">
                <label class="nc-field__label">Материал ферм</label>
                <select class="nc-field__input" id="trussMaterial">
                    <option value="planed-45x190" selected>Строганая доска 45×190 мм</option>
                    <option value="planed-35x190">Строганая доска 35×190 мм</option>
                    <option value="planed-50x150">Строганая доска 50×150 мм</option>
                </select>
            </div>

            <div class="nc-field">
                <label class="nc-field__label">Тип раскосов</label>
                <select class="nc-field__input" id="braceType">
                    <option value="var-1" selected>Стандартный</option>
                    <option value="var-2">Раскос тип 2</option>
                    <option value="var-3">Раскос тип 3</option>
                    <option value="var-4">Раскос тип 4</option>
                </select>
            </div>

            <div class="nc-field">
                <label class="nc-field__label">Материал кровли</label>
                <select class="nc-field__input" id="roofingMaterial">
                    <option value="metal-grandline" selected>Металлочерепица Grand Line 0.45 мм + снегозадержатели</option>
                    <option value="shinglas-sonata">Гибкая черепица Shinglas Финская Соната</option>
                    <option value="profiled-gl35r">Кровельный профнастил GL 35R</option>
                    <option value="polycarbonate-8mm">Монолитный поликарбонат, 8 мм</option>
                    <option value="no-roofing">Без кровли</option>
                </select>
            </div>

            <div class="nc-field">
                <label class="nc-field__label">Цвет кровли</label>
                <select class="nc-field__input" id="roofColor">
                    <option value="amber" selected>Янтарь</option>
                    <option value="blue">Синий</option>
                    <option value="green">Зеленый</option>
                    <option value="red">Красный</option>
                    <option value="gray">Серый</option>
                </select>
            </div>

            <div class="nc-field">
                <label class="nc-field__label">Выпуски балок</label>
                
                <div class="nc-slider-description">
                    <span class="nc-slider-description__text">Выступ балки за пределы передних столбов</span>
                </div>
                <div class="nc-slider">
                    <div class="nc-slider__min">от<br>0мм</div>
                    <div class="nc-slider__value"><span id="frontBeamExtension-value">200</span>мм</div>
                    <div class="nc-slider__max">до<br>500мм</div>
                    <input type="range" class="nc-slider__input" min="0" max="500" step="10" value="200" id="frontBeamExtension">
                </div>
                
                <div class="nc-slider-description">
                    <span class="nc-slider-description__text">Выступ балки за пределы задних столбов</span>
                </div>
                <div class="nc-slider">
                    <div class="nc-slider__min">от<br>0мм</div>
                    <div class="nc-slider__value"><span id="backBeamExtension-value">200</span>мм</div>
                    <div class="nc-slider__max">до<br>500мм</div>
                    <input type="range" class="nc-slider__input" min="0" max="500" step="10" value="200" id="backBeamExtension">
                </div>
            </div>

            <div class="nc-field">
                <label class="nc-field__label">Монтаж</label>
                <select class="nc-field__input" id="mountingRequired">
                    <option value="yes" selected>Требуется</option>
                    <option value="no">Не требуется</option>
                </select>
            </div>

            <div class="nc-field">
                <label class="nc-field__label">Доставка</label>
                <div class="nc-slider-description">
                    <span class="nc-slider-description__text">Расстояние от МКАД для расчета доставки</span>
                </div>
                <div class="nc-slider">
                    <div class="nc-slider__min">от<br>1км</div>
                    <div class="nc-slider__value"><span id="distanceFromMKAD-value">10</span>км</div>
                    <div class="nc-slider__max">до<br>100км</div>
                    <input type="range" class="nc-slider__input" min="1" max="100" step="1" value="10" id="distanceFromMKAD">
                </div>
            </div>
        `;

        this.formElement.innerHTML = formHTML;
        this.bindFormEvents();
    }

    // Привязка событий формы
    bindFormEvents() {
        // Слайдеры
        const sliders = this.formElement.querySelectorAll('.nc-slider__input');
        sliders.forEach(slider => {
            slider.addEventListener('input', (e) => {
                const valueSpan = e.target.parentElement.querySelector('.nc-slider__value span');
                if (valueSpan) {
                    let displayValue = e.target.value;
                    
                    // Конвертация для отображения
                    if (e.target.id === 'length' || e.target.id === 'width') {
                        displayValue = (parseFloat(e.target.value) / 10).toFixed(1);
                    } else if (e.target.id === 'height' || e.target.id === 'roofHeight') {
                        displayValue = (parseFloat(e.target.value) / 10).toFixed(1);
                    } else if (e.target.id === 'columnStep') {
                        displayValue = (parseFloat(e.target.value) / 10).toFixed(1);
                        this.currentPostSpacing = parseFloat(displayValue);
                    }
                    
                    valueSpan.textContent = displayValue;
                }
                
                this.updateParam(e.target.id, parseFloat(e.target.value));
            });
        });

        // Радио кнопки
        const radios = this.formElement.querySelectorAll('.nc-radio__input');
        radios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.updateParam(e.target.name, e.target.value);
                }
            });
        });

        // Селекты
        const selects = this.formElement.querySelectorAll('select');
        selects.forEach(select => {
            select.addEventListener('change', (e) => {
                this.updateParam(e.target.id, e.target.value);
            });
        });
    }

    // Обновление параметра
    updateParam(key, value) {
        this.params[key] = value;
        
        // Обновление currentPostSpacing при изменении postSpacing
        if (key === 'postSpacing') {
            this.currentPostSpacing = value / 10; // дециметры -> метры
        }
        
        this.calculateTotal();
        this.updateSpecification();
        this.update3DModelDebounced(); // Используем дебаунсинг для 3D модели
    }

    // Инициализация спецификации
    initSpecification() {
        const specItems = document.querySelectorAll('.specification dt');
        specItems.forEach(item => {
            item.addEventListener('click', function() {
                const dd = this.nextElementSibling;
                this.classList.toggle('active');
                dd.classList.toggle('active');
            });
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
        this.scene.background = new THREE.Color(0xf8f9fa); // Более мягкий фон

            // Создание камеры с оптимизированными параметрами
        this.camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 500);
            this.camera.position.set(15, 10, 15);
            this.camera.lookAt(0, 0, 0);

        // Создание рендерера с оптимизированными настройками
            this.renderer = new THREE.WebGLRenderer({ 
                canvas: this.canvasElement, 
            antialias: true,
                alpha: true,
                powerPreference: "high-performance"
            });
            this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Ограничиваем pixel ratio для производительности
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            this.renderer.outputEncoding = THREE.sRGBEncoding;
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.0;

        // Создание контролов с улучшенными настройками
            if (window.THREE.OrbitControls) {
                this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
                this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05; // Более плавное вращение
                this.controls.enableZoom = true;
                this.controls.enablePan = true;
                this.controls.enableRotate = true;
                this.controls.autoRotate = false;
                this.controls.autoRotateSpeed = 0.5;
                this.controls.minDistance = 5;
                this.controls.maxDistance = 50;
            this.controls.maxPolarAngle = Math.PI / 2; // Ограничиваем вертикальный поворот
                this.controls.minPolarAngle = Math.PI / 6;
            this.controls.target.set(0, 2, 0); // Фокус на уровне навеса
            
            // Настройки для плавного вращения мышкой
            this.controls.rotateSpeed = 1.0; // Скорость вращения
            this.controls.zoomSpeed = 1.2; // Скорость зума
            this.controls.panSpeed = 0.8; // Скорость панорамирования
            
            // Настройка кнопок мыши
                this.controls.mouseButtons = {
                LEFT: THREE.MOUSE.ROTATE,    // Левая кнопка - вращение
                MIDDLE: THREE.MOUSE.DOLLY,   // Средняя кнопка - зум
                RIGHT: THREE.MOUSE.PAN       // Правая кнопка - панорамирование
            };
            
            // Настройка колесика мыши
            this.controls.touches = {
                ONE: THREE.TOUCH.ROTATE,     // Один палец - вращение
                TWO: THREE.TOUCH.DOLLY_PAN   // Два пальца - зум и панорамирование
            };
            
            // Включаем инерцию для плавного движения
            this.controls.enableKeys = false;
            
            // Добавляем обработчики событий для лучшего контроля
            this.controls.addEventListener('start', () => {
                this.isAnimating = true;
            });
            
            this.controls.addEventListener('end', () => {
                this.isAnimating = false;
            });
            
            this.controls.addEventListener('change', () => {
                this.needsRender = true;
            });
        }

        // Оптимизированное освещение
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        // Основной источник света (солнце)
        const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
        sunLight.position.set(20, 25, 15);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 1024; // Уменьшаем разрешение теней для производительности
        sunLight.shadow.mapSize.height = 1024;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 50;
        sunLight.shadow.camera.left = -25;
        sunLight.shadow.camera.right = 25;
        sunLight.shadow.camera.top = 25;
        sunLight.shadow.camera.bottom = -25;
        sunLight.shadow.bias = -0.0001;
        sunLight.shadow.normalBias = 0.02;
        this.scene.add(sunLight);

        // Заполняющий свет
        const fillLight = new THREE.DirectionalLight(0x87CEEB, 0.3);
        fillLight.position.set(-15, 15, -10);
        this.scene.add(fillLight);

        // Дополнительный свет для лучшего освещения
        const rimLight = new THREE.DirectionalLight(0xffffff, 0.2);
        rimLight.position.set(0, 10, -20);
        this.scene.add(rimLight);

        // Создание группы для навеса
            this.canopyGroup = new THREE.Group();
            this.scene.add(this.canopyGroup);

        // Переменные для оптимизации
        this.needsRender = true;
        this.isAnimating = false;
        this.lastRenderTime = 0;
        this.renderInterval = 1000 / 60; // 60 FPS максимум
        
        // Система мониторинга производительности
        this.performanceStats = {
            frameCount: 0,
            lastFPSUpdate: 0,
            fps: 60,
            frameTime: 16.67,
            memoryUsage: 0,
            triangleCount: 0,
            drawCalls: 0
        };
        
        // Адаптивное качество рендеринга
        this.qualitySettings = {
            level: 'high', // high, medium, low
            shadowMapSize: 1024,
            pixelRatio: Math.min(window.devicePixelRatio, 2),
            antialias: true,
            maxFPS: 60
        };
        
        // Кэш для оптимизации
        this.geometryCache = new Map();
        this.materialCache = new Map();
        this.textureCache = new Map();

        // Обработка изменения размера с дебаунсингом
        this.resizeTimeout = null;
        window.addEventListener('resize', () => this.handleResizeDebounced());

            // Запуск анимации
            this.animate();
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
        
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastRenderTime;
        
        // Обновляем статистику производительности
        this.updatePerformanceStats(currentTime, deltaTime);
        
        if (this.controls) {
            this.controls.update();
            if (this.controls.changed) {
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
            this.renderer.render(this.scene, this.camera);
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
            
            // Логируем производительность в консоль (можно убрать в продакшене)
            if (this.performanceStats.fps < 30) {
                console.warn(`Низкий FPS: ${this.performanceStats.fps}. Рекомендуется снизить качество.`);
            }
        }
        
        // Обновляем количество треугольников и draw calls
        if (this.renderer && this.renderer.info) {
            this.performanceStats.triangleCount = this.renderer.info.render.triangles;
            this.performanceStats.drawCalls = this.renderer.info.render.calls;
        }
    }
    
    // Адаптивное качество на основе производительности
    adaptQualityBasedOnPerformance() {
        const fps = this.performanceStats.fps;
        const frameTime = this.performanceStats.frameTime;
        
        // Если FPS падает ниже 30, снижаем качество
        if (fps < 30 && this.qualitySettings.level !== 'low') {
            this.setQualityLevel('low');
        }
        // Если FPS выше 50, можем повысить качество
        else if (fps > 50 && this.qualitySettings.level === 'low') {
            this.setQualityLevel('medium');
        }
        // Если FPS стабильно выше 55, устанавливаем высокое качество
        else if (fps > 55 && this.qualitySettings.level === 'medium') {
            this.setQualityLevel('high');
        }
    }
    
    // Установка уровня качества
    setQualityLevel(level) {
        if (this.qualitySettings.level === level) return;
        
        this.qualitySettings.level = level;
        
        switch (level) {
            case 'high':
                this.qualitySettings.shadowMapSize = 2048;
                this.qualitySettings.pixelRatio = Math.min(window.devicePixelRatio, 2);
                this.qualitySettings.antialias = true;
                this.qualitySettings.maxFPS = 60;
                break;
            case 'medium':
                this.qualitySettings.shadowMapSize = 1024;
                this.qualitySettings.pixelRatio = Math.min(window.devicePixelRatio, 1.5);
                this.qualitySettings.antialias = true;
                this.qualitySettings.maxFPS = 45;
                break;
            case 'low':
                this.qualitySettings.shadowMapSize = 512;
                this.qualitySettings.pixelRatio = 1;
                this.qualitySettings.antialias = false;
                this.qualitySettings.maxFPS = 30;
                break;
        }
        
        // Применяем новые настройки
        this.applyQualitySettings();
        
        console.log(`Качество рендеринга изменено на: ${level}`);
    }
    
    // Применение настроек качества
    applyQualitySettings() {
        if (!this.renderer) return;
        
        // Обновляем pixel ratio
        this.renderer.setPixelRatio(this.qualitySettings.pixelRatio);
        
        // Обновляем antialias
        if (this.renderer.antialias !== this.qualitySettings.antialias) {
            // Для изменения antialias нужно пересоздать рендерер
            console.log('Antialias изменен, требуется перезагрузка');
        }
        
        // Обновляем размер shadow map
        this.scene.traverse((object) => {
            if (object.isLight && object.shadow) {
                object.shadow.mapSize.width = this.qualitySettings.shadowMapSize;
                object.shadow.mapSize.height = this.qualitySettings.shadowMapSize;
                object.shadow.map?.dispose();
                object.shadow.map = null;
            }
        });
        
        // Обновляем интервал рендеринга
        this.renderInterval = 1000 / this.qualitySettings.maxFPS;
        
        this.needsRender = true;
    }

    // Обработка изменения размера
    handleResize() {
        if (!this.camera || !this.renderer) return;
        
        const container = this.canvasElement.parentElement;
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.needsRender = true;
    }

    // Дебаунсинг для обновления модели
    update3DModelDebounced() {
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }
        this.updateTimeout = setTimeout(() => {
            this.update3DModel();
        }, 150); // Задержка для группировки изменений
    }

    // Оптимизированное обновление 3D модели
    async update3DModel() {
        if (!this.canopyGroup) return;

        // Показываем индикатор загрузки
        this.showLoadingIndicator();

        // Очистка предыдущей модели с освобождением памяти
        this.disposeModel();

        // Создание новой модели
        await this.createModel();
        
        // Скрываем индикатор загрузки
        this.hideLoadingIndicator();
        
        // Триггерим рендер
        this.needsRender = true;
    }

    // Освобождение памяти от предыдущей модели с оптимизацией
    disposeModel() {
        while (this.canopyGroup.children.length > 0) {
            const child = this.canopyGroup.children[0];
            this.canopyGroup.remove(child);
            
            // Освобождаем геометрию и материалы только если они не в кэше
            if (child.geometry && !this.isGeometryCached(child.geometry)) {
                child.geometry.dispose();
            }
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(material => {
                        if (!this.isMaterialCached(material)) {
                            material.dispose();
                        }
                    });
                } else {
                    if (!this.isMaterialCached(child.material)) {
                        child.material.dispose();
                    }
                }
            }
        }
    }

    // Проверка, находится ли геометрия в кэше
    isGeometryCached(geometry) {
        for (let [key, cachedGeometry] of this.geometryCache) {
            if (cachedGeometry === geometry) {
                return true;
            }
        }
        return false;
    }
    
    // Проверка, находится ли материал в кэше
    isMaterialCached(material) {
        for (let [key, cachedMaterial] of this.materialCache) {
            if (cachedMaterial === material) {
                return true;
            }
        }
        return false;
    }
    
    // Получение или создание кэшированной геометрии
    getCachedGeometry(key, createFunction) {
        if (this.geometryCache.has(key)) {
            return this.geometryCache.get(key);
        }
        
        const geometry = createFunction();
        this.geometryCache.set(key, geometry);
        return geometry;
    }
    
    // Получение или создание кэшированного материала
    getCachedMaterial(key, createFunction) {
        if (this.materialCache.has(key)) {
            return this.materialCache.get(key);
        }
        
        const material = createFunction();
        this.materialCache.set(key, material);
        return material;
    }

    // Получение или создание кэшированной текстуры
    getCachedTexture(key, createFunction) {
        if (this.textureCache.has(key)) {
            return this.textureCache.get(key);
        }
        
        const texture = createFunction();
        this.textureCache.set(key, texture);
        return texture;
    }
    
    // Очистка кэша для освобождения памяти
    clearCache() {
        // Очищаем геометрии
        for (let [key, geometry] of this.geometryCache) {
            geometry.dispose();
        }
        this.geometryCache.clear();
        
        // Очищаем материалы
        for (let [key, material] of this.materialCache) {
            if (Array.isArray(material)) {
                material.forEach(mat => mat.dispose());
            } else {
                material.dispose();
            }
        }
        this.materialCache.clear();
        
        // Очищаем текстуры
        for (let [key, texture] of this.textureCache) {
            texture.dispose();
        }
        this.textureCache.clear();
        
        console.log('Кэш очищен');
    }
    
    // Получение статистики производительности
    getPerformanceStats() {
        return {
            ...this.performanceStats,
            cacheStats: {
                geometryCount: this.geometryCache.size,
                materialCount: this.materialCache.size,
                textureCount: this.textureCache.size
            },
            qualityLevel: this.qualitySettings.level
        };
    }
    
    // Принудительная установка уровня качества
    setQualityLevelManual(level) {
        this.setQualityLevel(level);
    }

    // Создание модели
    async createModel() {
        // Получение параметров
        const length = this.params.length / 10; // конвертация в метры
        const width = this.params.width / 10;
        const height = this.params.height / 10;
        const roofHeight = this.params.roofHeight / 10;
        const frontBeamExtension = this.params.frontBeamExtension / 1000;
        const backBeamExtension = this.params.backBeamExtension / 1000;
        
        const roofType = this.getSelectedRadioValue('type-karkas') || 'var-2';
        const postType = this.params.postType || this.getSelectedRadioValue('type-stolbi') || 'var-1';
        const braceType = this.params.braceType || this.getSelectedRadioValue('type-raskosi') || 'var-1';
        const postMaterial = this.params.postMaterial || 'glued-150x150';
        const trussMaterial = this.params.trussMaterial || 'planed-45x190';
        const frameMaterial = this.params.frameMaterial || 'pine';
        const frameColoring = this.params.frameColoring || 'no-coloring';
        const roofingMaterial = this.params.roofingMaterial || 'metal-grandline';
        const roofColor = this.params.roofColor || 'amber';

        // Материалы
        const woodMaterial = this.createWoodMaterial(frameMaterial, frameColoring);
        const metalMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x555555,
            metalness: 0.8,
            roughness: 0.2
        });

        // Создание элементов навеса
        await this.createPosts(length, width, height, woodMaterial, metalMaterial, postType, postMaterial);
        this.createLongitudinalBeams(length, width, height, woodMaterial, frontBeamExtension, backBeamExtension, postMaterial, postType);
        // ОТКЛЮЧЕНО НА ВРЕМЯ ОТЛАДКИ: await this.createBeamBraces(length, width, height, woodMaterial, frontBeamExtension, backBeamExtension, postMaterial, braceType, postType);
        await this.createTrusses(length, width, height, roofHeight, woodMaterial, roofType, braceType, postMaterial, trussMaterial, postType);
        this.createRoofCovering(length, width, height, roofHeight, roofingMaterial, frontBeamExtension, backBeamExtension, roofType, roofColor, trussMaterial, postType);
        this.createGround();
    }

    // Показать индикатор загрузки
    showLoadingIndicator() {
        if (!this.canvasElement) return;
        
        const canvas = this.canvasElement;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Создаем оверлей для индикатора загрузки
        if (!this.loadingOverlay) {
            this.loadingOverlay = document.createElement('div');
            this.loadingOverlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(248, 249, 250, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                border-radius: 10px;
            `;
            
            this.loadingSpinner = document.createElement('div');
            this.loadingSpinner.style.cssText = `
                width: 40px;
                height: 40px;
                border: 3px solid #e9ecef;
                border-top: 3px solid #20B5B9;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            `;
            
            this.loadingOverlay.appendChild(this.loadingSpinner);
            this.canvasElement.parentElement.style.position = 'relative';
            this.canvasElement.parentElement.appendChild(this.loadingOverlay);
        }
        
        this.loadingOverlay.style.display = 'flex';
    }

    // Скрыть индикатор загрузки
    hideLoadingIndicator() {
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = 'none';
        }
    }

    // Обновление общей цены в блоке
    updateTotalPrice(totalCost) {
        const totalPriceElement = document.getElementById('totalPrice');
        if (totalPriceElement) {
            const formattedPrice = new Intl.NumberFormat('ru-RU', {
                style: 'currency',
                currency: 'RUB',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(totalCost).replace('RUB', '₽');
            
            totalPriceElement.textContent = formattedPrice;
        }
    }

    // Получение выбранного значения радиокнопки
    getSelectedRadioValue(name) {
        const selected = this.formElement.querySelector(`input[name="${name}"]:checked`);
        if (selected) {
            return selected.value;
        }
        return 'var-1';
    }

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
        const postYPosition = height/2;
        
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
            const z = -length/2 + (i * length / (postsAlongLength - 1));
            
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
                    { x: -width/2 - clusterSpacing/2, z: z - clusterSpacing/2 },
                    { x: -width/2 + clusterSpacing/2, z: z - clusterSpacing/2 },
                    { x: -width/2 - clusterSpacing/2, z: z + clusterSpacing/2 },
                    { x: -width/2 + clusterSpacing/2, z: z + clusterSpacing/2 }
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
                bottomPart.position.set(-width/2, bottomPartHeight/2, z);
                bottomPart.castShadow = true;
                bottomPart.receiveShadow = true;
                this.canopyGroup.add(bottomPart);
                
                // Создаем среднюю часть с вогнутостями
                const middleY = bottomPartHeight + recessHeight/2;
                
                // Для создания вогнутости используем 4 угловых столба и центральную утопленную часть
                const cornerSize = (baseWidth - recessWidth) / 2;
                const cornerGeometry = new THREE.BoxGeometry(cornerSize, recessHeight, cornerSize);
                
                // 4 угловых элемента (полная глубина)
                const corners = [
                    { x: -width/2 - baseWidth/2 + cornerSize/2, z: z - baseWidth/2 + cornerSize/2 },
                    { x: -width/2 + baseWidth/2 - cornerSize/2, z: z - baseWidth/2 + cornerSize/2 },
                    { x: -width/2 - baseWidth/2 + cornerSize/2, z: z + baseWidth/2 - cornerSize/2 },
                    { x: -width/2 + baseWidth/2 - cornerSize/2, z: z + baseWidth/2 - cornerSize/2 }
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
                centerPart.position.set(-width/2, middleY, z);
                centerPart.castShadow = true;
                centerPart.receiveShadow = true;
                this.canopyGroup.add(centerPart);
                
                // Боковые утопленные части (по оси X)
                const sideXGeometry = new THREE.BoxGeometry(recessedDepth, recessHeight, recessWidth);
                const sideXPart = new THREE.Mesh(sideXGeometry, woodMaterial);
                sideXPart.position.set(-width/2, middleY, z);
                sideXPart.castShadow = true;
                sideXPart.receiveShadow = true;
                this.canopyGroup.add(sideXPart);
                
                // Создаем верхнюю часть базы (полный размер)
                const topPartY = bottomPartHeight + recessHeight + topPartHeight/2;
                const topGeometry = new THREE.BoxGeometry(baseWidth, topPartHeight, baseWidth);
                const topPart = new THREE.Mesh(topGeometry, woodMaterial);
                topPart.position.set(-width/2, topPartY, z);
                topPart.castShadow = true;
                topPart.receiveShadow = true;
                this.canopyGroup.add(topPart);
                
                // Добавляем астрагал сверху базы
                const astragalY = baseHeight + astragalHeight/2;
                const astragalGeometry = new THREE.BoxGeometry(astragalSize, astragalHeight, astragalSize);
                const astragal = new THREE.Mesh(astragalGeometry, woodMaterial);
                astragal.position.set(-width/2, astragalY, z);
                astragal.castShadow = true;
                astragal.receiveShadow = true;
                this.canopyGroup.add(astragal);
                
                // Если высота столба больше базы, добавляем верхнюю часть с сечением из postMaterial
                if (height > baseHeight + astragalHeight) {
                    const upperPartHeight = height - baseHeight - astragalHeight;
                    // Используем сечение столба из выбранного материала
                    const upperGeometry = new THREE.BoxGeometry(postDimensions.width, upperPartHeight, postDimensions.height);
                    const upperPart = new THREE.Mesh(upperGeometry, woodMaterial);
                    upperPart.position.set(-width/2, baseHeight + astragalHeight + upperPartHeight/2, z);
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
                basePart.position.set(-width/2, baseHeight/2, z);
                basePart.castShadow = true;
                basePart.receiveShadow = true;
                this.canopyGroup.add(basePart);
                
                // Добавляем астрагал сверху базы
                const astragalY = baseHeight + astragalHeight/2;
                const astragalGeometry = new THREE.BoxGeometry(astragalSize, astragalHeight, astragalSize);
                const astragal = new THREE.Mesh(astragalGeometry, woodMaterial);
                astragal.position.set(-width/2, astragalY, z);
                astragal.castShadow = true;
                astragal.receiveShadow = true;
                this.canopyGroup.add(astragal);
                
                // Если высота столба больше базы, добавляем верхнюю часть с сечением из postMaterial
                if (height > baseHeight + astragalHeight) {
                    const upperPartHeight = height - baseHeight - astragalHeight;
                    // Используем сечение столба из выбранного материала
                    const upperGeometry = new THREE.BoxGeometry(postDimensions.width, upperPartHeight, postDimensions.height);
                    const upperPart = new THREE.Mesh(upperGeometry, woodMaterial);
                    upperPart.position.set(-width/2, baseHeight + astragalHeight + upperPartHeight/2, z);
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
                basePart.position.set(-width/2, baseHeight/2, z);
                basePart.castShadow = true;
                basePart.receiveShadow = true;
                this.canopyGroup.add(basePart);
                
                // Добавляем астрагал сверху базы
                const astragalY = baseHeight + astragalHeight/2;
                const astragalGeometry = new THREE.BoxGeometry(astragalSize, astragalHeight, astragalSize);
                const astragal = new THREE.Mesh(astragalGeometry, woodMaterial);
                astragal.position.set(-width/2, astragalY, z);
                astragal.castShadow = true;
                astragal.receiveShadow = true;
                this.canopyGroup.add(astragal);
                
                // Если высота столба больше базы, добавляем верхнюю часть с сечением из postMaterial
                if (height > baseHeight + astragalHeight) {
                    const upperPartHeight = height - baseHeight - astragalHeight;
                    // Используем сечение столба из выбранного материала
                    const upperGeometry = new THREE.BoxGeometry(postDimensions.width, upperPartHeight, postDimensions.height);
                    const upperPart = new THREE.Mesh(upperGeometry, woodMaterial);
                    upperPart.position.set(-width/2, baseHeight + astragalHeight + upperPartHeight/2, z);
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
                basePart.position.set(-width/2, baseHeight/2, z);
                basePart.castShadow = true;
                basePart.receiveShadow = true;
                this.canopyGroup.add(basePart);
                
                // Добавляем нижний астрагал (над базой)
                const bottomAstragalY = baseHeight + astragalHeight/2;
                const bottomAstragalGeometry = new THREE.BoxGeometry(astragalSize, astragalHeight, astragalSize);
                const bottomAstragal = new THREE.Mesh(bottomAstragalGeometry, woodMaterial);
                bottomAstragal.position.set(-width/2, bottomAstragalY, z);
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
                    { x: -width/2 - clusterSpacing/2, z: z - clusterSpacing/2 },
                    { x: -width/2 + clusterSpacing/2, z: z - clusterSpacing/2 },
                    { x: -width/2 - clusterSpacing/2, z: z + clusterSpacing/2 },
                    { x: -width/2 + clusterSpacing/2, z: z + clusterSpacing/2 }
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
                const topAstragalY = height - baseHeight - astragalHeight/2;
                const topAstragalGeometry = new THREE.BoxGeometry(astragalSize, astragalHeight, astragalSize);
                const topAstragal = new THREE.Mesh(topAstragalGeometry, woodMaterial);
                topAstragal.position.set(-width/2, topAstragalY, z);
                topAstragal.castShadow = true;
                topAstragal.receiveShadow = true;
                this.canopyGroup.add(topAstragal);
                
                // Создаем капитель (отзеркаленная база сверху)
                const capitalY = height - baseHeight/2;
                const capitalGeometry = new THREE.BoxGeometry(baseWidth, baseHeight, baseWidth);
                const capitalPart = new THREE.Mesh(capitalGeometry, woodMaterial);
                capitalPart.position.set(-width/2, capitalY, z);
                capitalPart.castShadow = true;
                capitalPart.receiveShadow = true;
                this.canopyGroup.add(capitalPart);
            } else {
                // Стандартный столб для остальных типов
                const leftPost = new THREE.Mesh(postGeometry, woodMaterial);
                leftPost.position.set(-width/2, postYPosition, z);
                leftPost.castShadow = true;
                leftPost.receiveShadow = true;
                this.canopyGroup.add(leftPost);
            }
            
            // Подпятник для левого столба (если нужен, кроме var-2, var-3, var-4 и var-6)
            if (hasFooting && footingGeometry && postType !== 'var-2' && postType !== 'var-3' && postType !== 'var-4' && postType !== 'var-6') {
                const leftFooting = new THREE.Mesh(footingGeometry, woodMaterial);
                // Для var-1 подпятник под балкой (между столбом и балкой), для var-5 и var-4 - внизу
                const leftFootingY = hasTopFooting ? height - footingHeight/2 : footingHeight/2;
                leftFooting.position.set(-width/2, leftFootingY, z);
                leftFooting.castShadow = true;
                leftFooting.receiveShadow = true;
                this.canopyGroup.add(leftFooting);
            }
            
            // Капитель для левого столба (если нужна, кроме var-1, var-2, var-3, var-4 и var-6)
            if (hasCapital && capitalGeometry && postType !== 'var-1' && postType !== 'var-2' && postType !== 'var-3' && postType !== 'var-4' && postType !== 'var-6') {
                const leftCapital = new THREE.Mesh(capitalGeometry, woodMaterial);
                // Капитель размещается на верху столба
                const capitalY = height - capitalHeight/2;
                leftCapital.position.set(-width/2, capitalY, z);
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
                    { x: width/2 - clusterSpacing/2, z: z - clusterSpacing/2 },
                    { x: width/2 + clusterSpacing/2, z: z - clusterSpacing/2 },
                    { x: width/2 - clusterSpacing/2, z: z + clusterSpacing/2 },
                    { x: width/2 + clusterSpacing/2, z: z + clusterSpacing/2 }
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
                bottomPart.position.set(width/2, bottomPartHeight/2, z);
                bottomPart.castShadow = true;
                bottomPart.receiveShadow = true;
                this.canopyGroup.add(bottomPart);
                
                // Создаем среднюю часть с вогнутостями
                const middleY = bottomPartHeight + recessHeight/2;
                
                // Для создания вогнутости используем 4 угловых столба и центральную утопленную часть
                const cornerSize = (baseWidth - recessWidth) / 2;
                const cornerGeometry = new THREE.BoxGeometry(cornerSize, recessHeight, cornerSize);
                
                // 4 угловых элемента (полная глубина)
                const corners = [
                    { x: width/2 - baseWidth/2 + cornerSize/2, z: z - baseWidth/2 + cornerSize/2 },
                    { x: width/2 + baseWidth/2 - cornerSize/2, z: z - baseWidth/2 + cornerSize/2 },
                    { x: width/2 - baseWidth/2 + cornerSize/2, z: z + baseWidth/2 - cornerSize/2 },
                    { x: width/2 + baseWidth/2 - cornerSize/2, z: z + baseWidth/2 - cornerSize/2 }
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
                centerPart.position.set(width/2, middleY, z);
                centerPart.castShadow = true;
                centerPart.receiveShadow = true;
                this.canopyGroup.add(centerPart);
                
                // Боковые утопленные части (по оси X)
                const sideXGeometry = new THREE.BoxGeometry(recessedDepth, recessHeight, recessWidth);
                const sideXPart = new THREE.Mesh(sideXGeometry, woodMaterial);
                sideXPart.position.set(width/2, middleY, z);
                sideXPart.castShadow = true;
                sideXPart.receiveShadow = true;
                this.canopyGroup.add(sideXPart);
                
                // Создаем верхнюю часть базы (полный размер)
                const topPartY = bottomPartHeight + recessHeight + topPartHeight/2;
                const topGeometry = new THREE.BoxGeometry(baseWidth, topPartHeight, baseWidth);
                const topPart = new THREE.Mesh(topGeometry, woodMaterial);
                topPart.position.set(width/2, topPartY, z);
                topPart.castShadow = true;
                topPart.receiveShadow = true;
                this.canopyGroup.add(topPart);
                
                // Добавляем астрагал сверху базы
                const astragalY = baseHeight + astragalHeight/2;
                const astragalGeometry = new THREE.BoxGeometry(astragalSize, astragalHeight, astragalSize);
                const astragal = new THREE.Mesh(astragalGeometry, woodMaterial);
                astragal.position.set(width/2, astragalY, z);
                astragal.castShadow = true;
                astragal.receiveShadow = true;
                this.canopyGroup.add(astragal);
                
                // Если высота столба больше базы, добавляем верхнюю часть с сечением из postMaterial
                if (height > baseHeight + astragalHeight) {
                    const upperPartHeight = height - baseHeight - astragalHeight;
                    // Используем сечение столба из выбранного материала
                    const upperGeometry = new THREE.BoxGeometry(postDimensions.width, upperPartHeight, postDimensions.height);
                    const upperPart = new THREE.Mesh(upperGeometry, woodMaterial);
                    upperPart.position.set(width/2, baseHeight + astragalHeight + upperPartHeight/2, z);
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
                basePart.position.set(width/2, baseHeight/2, z);
                basePart.castShadow = true;
                basePart.receiveShadow = true;
                this.canopyGroup.add(basePart);
                
                // Добавляем астрагал сверху базы
                const astragalY = baseHeight + astragalHeight/2;
                const astragalGeometry = new THREE.BoxGeometry(astragalSize, astragalHeight, astragalSize);
                const astragal = new THREE.Mesh(astragalGeometry, woodMaterial);
                astragal.position.set(width/2, astragalY, z);
                astragal.castShadow = true;
                astragal.receiveShadow = true;
                this.canopyGroup.add(astragal);
                
                // Если высота столба больше базы, добавляем верхнюю часть с сечением из postMaterial
                if (height > baseHeight + astragalHeight) {
                    const upperPartHeight = height - baseHeight - astragalHeight;
                    // Используем сечение столба из выбранного материала
                    const upperGeometry = new THREE.BoxGeometry(postDimensions.width, upperPartHeight, postDimensions.height);
                    const upperPart = new THREE.Mesh(upperGeometry, woodMaterial);
                    upperPart.position.set(width/2, baseHeight + astragalHeight + upperPartHeight/2, z);
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
                basePart.position.set(width/2, baseHeight/2, z);
                basePart.castShadow = true;
                basePart.receiveShadow = true;
                this.canopyGroup.add(basePart);
                
                // Добавляем астрагал сверху базы
                const astragalY = baseHeight + astragalHeight/2;
                const astragalGeometry = new THREE.BoxGeometry(astragalSize, astragalHeight, astragalSize);
                const astragal = new THREE.Mesh(astragalGeometry, woodMaterial);
                astragal.position.set(width/2, astragalY, z);
                astragal.castShadow = true;
                astragal.receiveShadow = true;
                this.canopyGroup.add(astragal);
                
                // Если высота столба больше базы, добавляем верхнюю часть с сечением из postMaterial
                if (height > baseHeight + astragalHeight) {
                    const upperPartHeight = height - baseHeight - astragalHeight;
                    // Используем сечение столба из выбранного материала
                    const upperGeometry = new THREE.BoxGeometry(postDimensions.width, upperPartHeight, postDimensions.height);
                    const upperPart = new THREE.Mesh(upperGeometry, woodMaterial);
                    upperPart.position.set(width/2, baseHeight + astragalHeight + upperPartHeight/2, z);
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
                basePart.position.set(width/2, baseHeight/2, z);
                basePart.castShadow = true;
                basePart.receiveShadow = true;
                this.canopyGroup.add(basePart);
                
                // Добавляем нижний астрагал (над базой)
                const bottomAstragalY = baseHeight + astragalHeight/2;
                const bottomAstragalGeometry = new THREE.BoxGeometry(astragalSize, astragalHeight, astragalSize);
                const bottomAstragal = new THREE.Mesh(bottomAstragalGeometry, woodMaterial);
                bottomAstragal.position.set(width/2, bottomAstragalY, z);
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
                    { x: width/2 - clusterSpacing/2, z: z - clusterSpacing/2 },
                    { x: width/2 + clusterSpacing/2, z: z - clusterSpacing/2 },
                    { x: width/2 - clusterSpacing/2, z: z + clusterSpacing/2 },
                    { x: width/2 + clusterSpacing/2, z: z + clusterSpacing/2 }
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
                const topAstragalY = height - baseHeight - astragalHeight/2;
                const topAstragalGeometry = new THREE.BoxGeometry(astragalSize, astragalHeight, astragalSize);
                const topAstragal = new THREE.Mesh(topAstragalGeometry, woodMaterial);
                topAstragal.position.set(width/2, topAstragalY, z);
                topAstragal.castShadow = true;
                topAstragal.receiveShadow = true;
                this.canopyGroup.add(topAstragal);
                
                // Создаем капитель (отзеркаленная база сверху)
                const capitalY = height - baseHeight/2;
                const capitalGeometry = new THREE.BoxGeometry(baseWidth, baseHeight, baseWidth);
                const capitalPart = new THREE.Mesh(capitalGeometry, woodMaterial);
                capitalPart.position.set(width/2, capitalY, z);
                capitalPart.castShadow = true;
                capitalPart.receiveShadow = true;
                this.canopyGroup.add(capitalPart);
            } else {
                // Стандартный столб для остальных типов
                const rightPost = new THREE.Mesh(postGeometry, woodMaterial);
                rightPost.position.set(width/2, postYPosition, z);
                rightPost.castShadow = true;
                rightPost.receiveShadow = true;
                this.canopyGroup.add(rightPost);
            }
            
            // Подпятник для правого столба (если нужен, кроме var-2, var-3, var-4 и var-6)
            if (hasFooting && footingGeometry && postType !== 'var-2' && postType !== 'var-3' && postType !== 'var-4' && postType !== 'var-6') {
                const rightFooting = new THREE.Mesh(footingGeometry, woodMaterial);
                // Для var-1 подпятник под балкой (между столбом и балкой), для var-5 и var-4 - внизу
                const rightFootingY = hasTopFooting ? height - footingHeight/2 : footingHeight/2;
                rightFooting.position.set(width/2, rightFootingY, z);
                rightFooting.castShadow = true;
                rightFooting.receiveShadow = true;
                this.canopyGroup.add(rightFooting);
            }
            
            // Капитель для правого столба (если нужна, кроме var-1, var-2, var-3, var-4 и var-6)
            if (hasCapital && capitalGeometry && postType !== 'var-1' && postType !== 'var-2' && postType !== 'var-3' && postType !== 'var-4' && postType !== 'var-6') {
                const rightCapital = new THREE.Mesh(capitalGeometry, woodMaterial);
                // Капитель размещается на верху столба
                const capitalY = height - capitalHeight/2;
                rightCapital.position.set(width/2, capitalY, z);
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
        leftBeam.position.set(-width/2, beamHeight, beamOffset);
        leftBeam.castShadow = true;
        leftBeam.receiveShadow = true;
        this.canopyGroup.add(leftBeam);
        
        // Правая балка
        const rightBeam = new THREE.Mesh(beamGeometry, woodMaterial);
        rightBeam.position.set(width/2, beamHeight, beamOffset);
        rightBeam.castShadow = true;
        rightBeam.receiveShadow = true;
        this.canopyGroup.add(rightBeam);
    }

    // Создание раскосов под балками
    async createBeamBraces(length, width, height, woodMaterial, frontExtension, backExtension, postMaterial, braceType, postType) {
        const beamLength = length + frontExtension + backExtension;
        const beamOffset = (frontExtension - backExtension) / 2;
        
        // Балка располагается на высоте = высота_столба + 1/2_сечения_балки
        const beamDimensions = this.getBeamDimensions(postMaterial, postType);
        const beamHeight = height + beamDimensions.height / 2;
        const postSpacing = this.currentPostSpacing;
        const postsAlongLength = Math.ceil(length / postSpacing) + 1;
        
        // Получаем размеры сечения столба для правильного позиционирования раскосов
        const postDimensions = this.getPostDimensions(postMaterial);
        
        // Загружаем GLB модель раскоса
        const glbModel = await this.loadBraceGLB(braceType);
        
        for (let i = 0; i < postsAlongLength; i++) {
            const z = -length/2 + (i * length / (postsAlongLength - 1));
            
            if (glbModel) {
                // Используем GLB модель для раскосов
                
                // Левый раскос (на расстоянии 1/2 сечения столба от оси столба)
                const leftBrace = glbModel.clone();
                leftBrace.position.set(-width/2 - postDimensions.width/2, beamHeight - 0.5, z);
                // Поворачиваем раскос на 90 градусов по вертикали (оси Y)
                leftBrace.rotation.y = Math.PI / 2;
                leftBrace.castShadow = true;
                leftBrace.receiveShadow = true;
                this.canopyGroup.add(leftBrace);
                
                // Правый раскос (на расстоянии 1/2 сечения столба от оси столба)
                const rightBrace = glbModel.clone();
                rightBrace.position.set(width/2 + postDimensions.width/2, beamHeight - 0.5, z);
                // Поворачиваем раскос на 90 градусов по вертикали (оси Y)
                rightBrace.rotation.y = Math.PI / 2;
                rightBrace.castShadow = true;
                rightBrace.receiveShadow = true;
                this.canopyGroup.add(rightBrace);
            } else {
                // Используем стандартные балки для раскосов
                const beamDimensions = this.getBeamDimensions(postMaterial, postType);
                const braceGeometry = new THREE.BoxGeometry(beamDimensions.width, beamHeight/2, beamDimensions.height);
                
                // Левый раскос (на расстоянии 1/2 сечения столба от оси столба)
                const leftBrace = new THREE.Mesh(braceGeometry, woodMaterial);
                leftBrace.position.set(-width/2 - postDimensions.width/2, beamHeight - 0.5, z);
                leftBrace.castShadow = true;
                leftBrace.receiveShadow = true;
                this.canopyGroup.add(leftBrace);
                
                // Правый раскос (на расстоянии 1/2 сечения столба от оси столба)
                const rightBrace = new THREE.Mesh(braceGeometry, woodMaterial);
                rightBrace.position.set(width/2 + postDimensions.width/2, beamHeight - 0.5, z);
                rightBrace.castShadow = true;
                rightBrace.receiveShadow = true;
                this.canopyGroup.add(rightBrace);
            }
        }
    }

    // Функция создания ферм
    async createTrusses(length, width, height, roofHeight, woodMaterial, roofType, braceType, postMaterial, trussMaterial, postType) {
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
        
        for (let i = 0; i < postsAlongLength; i++) {
            const z = -length/2 + (i * length / (postsAlongLength - 1));
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
            const x = -L/2 + L * i / N; // от -L/2 до +L/2
            
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
        const leftU = (postXLeft + L/2) / L;
        const leftPostTop = new THREE.Vector3(postXLeft + leftPostOffset, bottomChordHeight + H * leftU, 0);
        members.push({ type: 'post', P: leftPostBot, Q: leftPostTop, s0: 0, s1: 0 });
        
        // Правая стойка - внешний край на краю нижней балки (сдвигаем влево на -t/2)
        const rightPostOffset = postOffsetBase - t / 2;
        const rightPostBot = new THREE.Vector3(postXRight + rightPostOffset, bottomChordHeight, 0);
        const rightU = (postXRight + L/2) / L;
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
            const x = -L/2 + L * i / N; // от -L/2 до +L/2
            
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
            s1: postTopCut // Торцевая подрезка в коньке
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
                // Для конькового узла (центральный узел верхнего пояса) НЕ применяем усовые подрезки
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
            const x = -L/2 + L * i / N; // от -L/2 до +L/2
            
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
                // Для конькового узла (центральный узел верхнего пояса) НЕ применяем усовые подрезки
                if (type === 'top' && k === Math.floor(segs.length / 2) - 1) {
                    // Пропускаем коньковый узел - там верхние грани стыкуются без усов
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
            -length/2, -h/2, -w/2,  // 0: левый нижний передний
            -length/2,  h/2, -w/2,  // 1: левый верхний передний
            -length/2,  h/2,  w/2,  // 2: левый верхний задний
            -length/2, -h/2,  w/2,  // 3: левый нижний задний
            
            // Правый торец (срезанный вертикально)
            length/2 + bevelOffset, -h/2, -w/2,  // 4: правый нижний передний
            length/2 - bevelOffset,  h/2, -w/2,  // 5: правый верхний передний
            length/2 - bevelOffset,  h/2,  w/2,  // 6: правый верхний задний
            length/2 + bevelOffset, -h/2,  w/2,  // 7: правый нижний задний
        ]);
        
        // Определяем грани (12 треугольников для 6 граней)
        const indices = new Uint16Array([
            // Передняя грань
            0, 1, 5,  0, 5, 4,
            // Задняя грань
            3, 6, 2,  3, 7, 6,
            // Верхняя грань
            1, 2, 6,  1, 6, 5,
            // Нижняя грань
            0, 4, 7,  0, 7, 3,
            // Левый торец
            0, 3, 2,  0, 2, 1,
            // Правый торец (наклонный)
            4, 5, 6,  4, 6, 7
        ]);
        
        // Нормали для освещения
        const normals = new Float32Array([
            // Левый торец
            -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0,
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
            -length/2 - startOffset, -h/2, -w/2,  // 0: левый нижний передний
            -length/2 + startOffset,  h/2, -w/2,  // 1: левый верхний передний
            -length/2 + startOffset,  h/2,  w/2,  // 2: левый верхний задний
            -length/2 - startOffset, -h/2,  w/2,  // 3: левый нижний задний
            
            // Правый торец (срезанный)
            length/2 + endOffset, -h/2, -w/2,  // 4: правый нижний передний
            length/2 - endOffset,  h/2, -w/2,  // 5: правый верхний передний
            length/2 - endOffset,  h/2,  w/2,  // 6: правый верхний задний
            length/2 + endOffset, -h/2,  w/2,  // 7: правый нижний задний
        ]);
        
        const indices = new Uint16Array([
            0, 1, 5,  0, 5, 4,  // Передняя грань
            3, 6, 2,  3, 7, 6,  // Задняя грань
            1, 2, 6,  1, 6, 5,  // Верхняя грань
            0, 4, 7,  0, 7, 3,  // Нижняя грань
            0, 3, 2,  0, 2, 1,  // Левый торец
            4, 5, 6,  4, 6, 7   // Правый торец
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
        
        switch(roofingMaterial) {
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
        
        switch(roofingMaterial) {
            case 'metal-grandline':
                // Нормальная карта для металлочерепицы
                ctx.fillStyle = '#8080ff'; // Базовый цвет для нормальной карты
                ctx.fillRect(0, 0, size, size);
                
                // Создаем рельеф профиля
                for (let y = 0; y < size; y += 8) {
                    ctx.fillStyle = '#a0a0ff'; // Светлее = выше
                    ctx.fillRect(0, y, size, 2);
                    ctx.fillStyle = '#6060ff'; // Темнее = ниже
                    ctx.fillRect(0, y + 2, size, 2);
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
        
        switch(roofingMaterial) {
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
        // Если выбрано "Без кровли", не создаем крышу
        if (roofingMaterial === 'no-roofing') {
            return;
        }
        
        // Создание материала кровли в зависимости от выбранного материала
        const roofMaterial = this.createRoofMaterial(roofingMaterial, roofColor);

        const beamDimensions = this.getBeamDimensions(this.params.postMaterial, postType);
        
        // Параметры крыши согласно математической модели (подпятник не влияет на высоту)
        const trussOverhang = 0.2; // Выступ фермы 200 мм (по 100 мм с каждой стороны)
        const B = width + trussOverhang;  // Пролёт по поперечнику с учетом выступа ферм (ось x ∈ [0, B])
        const L = length + (frontExtension + backExtension);  // Длина навеса (ось y ∈ [0, L])
        
        // Получаем размеры сечения фермы
        const trussDimensions = this.getTrussDimensions(trussMaterial);
        
        // Кровля должна лежать на верхней части ферм (на коньке и стропильных ногах)
        // Ферма поднята на половину высоты мауэрлата от верхней плоскости мауэрлата
        // Центр нижнего пояса = height + beamDimensions.height + beamDimensions.height / 2 + trussDimensions.height / 2
        // Верхняя поверхность нижнего пояса = height + beamDimensions.height + beamDimensions.height / 2 + trussDimensions.height
        // Кровля должна располагаться на высоте стропильных ног + подъем на 15 мм
        const he = height + beamDimensions.height + beamDimensions.height / 2 + trussDimensions.height;  // Высота у карнизов (верхняя поверхность нижнего пояса)
        const H = roofHeight;  // Подъём на полпролёта B/2
        const p = 2 * H / B;  // Уклон ската p = tan(α) = 2H/B
        const roofLift = 0.015;  // Подъем покрытия на 15 мм
        const hr = he + H + roofLift;  // Высота конька на верхней точке стропил + подъем
        
        // Толщина кровельного материала в зависимости от типа
        const roofThickness = this.getRoofThickness(roofingMaterial);
        
        if (roofType === 'var-1') {
            // Создаем односкатную крышу
            this.createSingleSlopeRoof(B, L, he, H, roofMaterial, roofThickness, roofLift);
        } else if (roofType === 'var-2') {
            // Создаем двускатную крышу с правильной толщиной
            // Передаем высоту карниза (верхняя поверхность нижнего пояса фермы)
            this.createGabledRoof(B, L, he, H, p, roofMaterial, roofThickness, 0, roofLift);
        }
    }

    // Получение толщины кровельного материала
    getRoofThickness(roofingMaterial) {
        switch(roofingMaterial) {
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
        // Кровля должна лежать на верхней части ферм
        // baseHeight - это высота нижнего пояса ферм
        // roofHeight - это высота подъема ферм
        // Кровля должна располагаться на высоте сечения фермы от верхней части ферм + подъем на 15 мм
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
                    // Кровля должна лежать на верхней части ферм
                    // baseHeight - высота нижнего пояса ферм
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
                    // Кровля должна лежать на верхней части ферм
                    // baseHeight - высота нижнего пояса ферм
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
                const colorVariation = Math.random() * 0.3 - 0.15; // ±15% вариация
                const baseColor = 0x8B7355;
                const r = Math.max(0, Math.min(255, ((baseColor >> 16) & 0xFF) + colorVariation * 255));
                const g = Math.max(0, Math.min(255, ((baseColor >> 8) & 0xFF) + colorVariation * 255));
                const b = Math.max(0, Math.min(255, (baseColor & 0xFF) + colorVariation * 255));
                
                ctx.fillStyle = `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
                ctx.fillRect(x, y, stoneSize, stoneSize);
                
                // Добавляем тень для объема
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
                'texturol-landscape': 0xDAA520,  // Текстурол Ландшафт - золотой
                'texturol-country': 0x8B4513,    // Текстурол Кантри - темно-коричневый
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

    // Расчет стоимости
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
            'var-3': 'Арочный'
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
            'planed-45x190': 'Строганая доска 45×190 мм',
            'planed-35x190': 'Строганая доска 35×190 мм',
            'planed-50x150': 'Строганая доска 50×150 мм'
        };
        
        // Обновление значений
        const roofType = this.getSelectedRadioValue('type-karkas') || 'var-2';
        
        document.getElementById('specRoofType').textContent = materialNames[roofType] || 'Двускатный';
        document.getElementById('specFrameMaterial').textContent = 'Сосна';
        document.getElementById('specRoofingMaterial').textContent = materialNames[this.params.roofingMaterial] || 'Металлочерепица';
        document.getElementById('specRoofColor').textContent = materialNames[this.params.roofColor] || 'Янтарь';
        document.getElementById('specArea').textContent = area.toFixed(1) + 'м²';
        document.getElementById('specWidth').textContent = (width * 1000) + ' мм';
        document.getElementById('specLength').textContent = Math.round(length * 1000 + frontBeamExtension + backBeamExtension) + ' мм';
        document.getElementById('specHeight').textContent = (height * 1000) + ' мм';
        document.getElementById('specRoofHeight').textContent = (roofHeight * 1000) + ' мм';
        document.getElementById('specPostSpacing').textContent = (postSpacing * 1000) + ' мм';
        
        document.getElementById('specPosts').textContent = postCount + ' шт.';
        document.getElementById('specPostType').textContent = 'Квадратный брус';
        document.getElementById('specPostMaterial').textContent = 'Сосна';
        document.getElementById('specHeightLeft').textContent = (height * 1000) + ' мм';
        document.getElementById('specHeightRight').textContent = (height * 1000) + ' мм';
        document.getElementById('specPostSection').textContent = postSectionNames[this.params.postMaterial] || '150×150 мм';
        
        document.getElementById('specFarms').textContent = trussCount + ' шт.';
        document.getElementById('specTrussMaterial').textContent = trussMaterialNames[this.params.trussMaterial] || 'Строганая доска 45×190 мм';
        document.getElementById('specFarmLength').textContent = (width * 1000) + ' мм';
        document.getElementById('specTrussSpacing').textContent = Math.round(trussSpacing) + ' мм';
        
        document.getElementById('specBraces').textContent = braceCount + ' шт.';
        document.getElementById('specBraceType').textContent = 'Стандартный';
        document.getElementById('specBraceMaterial').textContent = 'Сосна';
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
}

// ✅ MVP: Класс Canopy3DRenderer доступен глобально
// Экземпляр создается в app.js через: new Canopy3DRenderer('#nc-canvas')
// Обертка window.NavesCalc создается в index.html для совместимости