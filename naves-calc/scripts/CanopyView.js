/**
 * CanopyView - Представление калькулятора навесов (MVP Pattern)
 * 
 * Отвечает за:
 * - Рендеринг формы
 * - Отображение результатов расчетов
 * - Обновление спецификации
 * - Обработку UI событий (передает в Presenter)
 */

class CanopyView {
    constructor(formSelector, summarySelector) {
        this.formElement = document.querySelector(formSelector);
        this.summaryElement = document.querySelector(summarySelector);

        if (!this.formElement || !this.summaryElement) {
            throw new Error('Не найдены необходимые элементы DOM');
        }

        // Колбэки для передачи событий в Presenter
        this.onParamChanged = null;
        this.onSaveClicked = null;
        this.onOrderClicked = null;
    }

    /**
     * Рендеринг формы
     */
    renderForm(params) {
        const formHTML = `
            <div class="nc-field">
                <h2 class="nc-heading nc-heading--lg">Калькулятор навесов</h2>
            </div>



            <!-- СЕКЦИЯ 1: ГЕОМЕТРИЯ -->
            <div class="nc-section-title">1. Геометрия</div>
            
            <div class="nc-field">
                <label class="nc-field__label">Габариты (Пятно)</label>
                
                <div class="nc-slider-description">
                    <span class="nc-slider-description__text">Ширина (по фасаду)</span>
                </div>
                <div class="nc-slider">
                    <div class="nc-slider__min">от<br>1м</div>
                    <div class="nc-slider__value"><span id="length-value">${(params.length / 10).toFixed(1)}</span>м</div>
                    <div class="nc-slider__max">до<br>20м</div>
                    <input type="range" class="nc-slider__input" min="10" max="200" step="5" value="${params.length}" id="length">
                </div>
                
                <div class="nc-slider-description">
                    <span class="nc-slider-description__text">Глубина (вдоль ската)</span>
                </div>
                <div class="nc-slider">
                    <div class="nc-slider__min">от<br>3м</div>
                    <div class="nc-slider__value"><span id="width-value">${(params.width / 10).toFixed(1)}</span>м</div>
                    <div class="nc-slider__max">до<br>12м</div>
                    <input type="range" class="nc-slider__input" min="30" max="120" step="5" value="${params.width}" id="width">
                </div>
            </div>

            <div class="nc-field">
                <label class="nc-field__label">Высоты (Силуэт)</label>

                <div class="nc-slider-description">
                    <span class="nc-slider-description__text">Высота столбов</span>
                </div>
                <div class="nc-slider">
                    <div class="nc-slider__min">от<br>2.5м</div>
                    <div class="nc-slider__value"><span id="height-value">${(params.height / 10).toFixed(1)}</span>м</div>
                    <div class="nc-slider__max">до<br>4м</div>
                    <input type="range" class="nc-slider__input" min="25" max="40" step="1" value="${params.height}" id="height">
                </div>
                
                <div class="nc-slider-description">
                    <span class="nc-slider-description__text">Подъем фермы 
                        <span style="font-size: 0.9em; color: #666; font-weight: normal; margin-left: 5px;">
                            (<span id="roofAngle-value">--</span>°)
                        </span>
                    </span>
                </div>
                <div class="nc-slider">
                    <div class="nc-slider__min">от<br>0.5м</div>
                    <div class="nc-slider__value"><span id="roofHeight-value">${(params.roofHeight / 10).toFixed(1)}</span>м</div>
                    <div class="nc-slider__max">до<br>3м</div>
                    <input type="range" class="nc-slider__input" min="5" max="30" step="1" value="${params.roofHeight}" id="roofHeight">
                </div>
            </div>

            <div class="nc-separator"></div>

            <!-- СЕКЦИЯ 2: КОНСТРУКЦИЯ -->
            <div class="nc-section-title">2. Конструкция</div>

            <div class="nc-field">
                <label class="nc-field__label">Тип столбов</label>
                <div class="nc-post-grid-v2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 5px;">
                    <!-- Столб 1 -->
                    <div class="nc-post-item" style="position: relative;">
                        <input type="radio" class="nc-post__input" name="type-stolbi" value="var-1" id="post-type-var-1"
                            ${params.postType === 'var-1' ? 'checked' : ''} style="position: absolute; opacity: 0; pointer-events: none;">
                        <label for="post-type-var-1" style="display: flex; flex-direction: column; align-items: center; padding: 10px; border: 2px solid #e2e8f0; border-radius: 12px; cursor: pointer; transition: all 0.2s ease; background: #fff; height: 100%;">
                            <img src="./assets/images/stolb/st1 .webp" alt="Тип 1" style="width: 100%; height: 80px; object-fit: contain; margin-bottom: 8px;">
                            <span style="font-size: 13px; font-weight: 600; text-align: center;">Тип 1</span>
                            <span style="font-size: 10px; color: #718096; text-align: center;">С подпятником</span>
                        </label>
                    </div>

                    <!-- Столб 2 -->
                    <div class="nc-post-item" style="position: relative;">
                        <input type="radio" class="nc-post__input" name="type-stolbi" value="var-2" id="post-type-var-2"
                            ${params.postType === 'var-2' ? 'checked' : ''} style="position: absolute; opacity: 0; pointer-events: none;">
                        <label for="post-type-var-2" style="display: flex; flex-direction: column; align-items: center; padding: 10px; border: 2px solid #e2e8f0; border-radius: 12px; cursor: pointer; transition: all 0.2s ease; background: #fff; height: 100%;">
                            <img src="./assets/images/stolb/st2.webp" alt="Тип 2" style="width: 100%; height: 80px; object-fit: contain; margin-bottom: 8px;">
                            <span style="font-size: 13px; font-weight: 600; text-align: center;">Тип 2</span>
                            <span style="font-size: 10px; color: #718096; text-align: center;">Классика</span>
                        </label>
                    </div>

                    <!-- Столб 3 -->
                    <div class="nc-post-item" style="position: relative;">
                        <input type="radio" class="nc-post__input" name="type-stolbi" value="var-3" id="post-type-var-3"
                            ${params.postType === 'var-3' ? 'checked' : ''} style="position: absolute; opacity: 0; pointer-events: none;">
                        <label for="post-type-var-3" style="display: flex; flex-direction: column; align-items: center; padding: 10px; border: 2px solid #e2e8f0; border-radius: 12px; cursor: pointer; transition: all 0.2s ease; background: #fff; height: 100%;">
                            <img src="./assets/images/stolb/st3 .webp" alt="Тип 3" style="width: 100%; height: 80px; object-fit: contain; margin-bottom: 8px;">
                            <span style="font-size: 13px; font-weight: 600; text-align: center;">Тип 3</span>
                            <span style="font-size: 10px; color: #718096; text-align: center;">С капителью</span>
                        </label>
                    </div>

                    <!-- Столб 4 -->
                    <div class="nc-post-item" style="position: relative;">
                        <input type="radio" class="nc-post__input" name="type-stolbi" value="var-4" id="post-type-var-4"
                            ${params.postType === 'var-4' ? 'checked' : ''} style="position: absolute; opacity: 0; pointer-events: none;">
                        <label for="post-type-var-4" style="display: flex; flex-direction: column; align-items: center; padding: 10px; border: 2px solid #e2e8f0; border-radius: 12px; cursor: pointer; transition: all 0.2s ease; background: #fff; height: 100%;">
                            <img src="./assets/images/stolb/st4.webp" alt="Тип 4" style="width: 100%; height: 80px; object-fit: contain; margin-bottom: 8px;">
                            <span style="font-size: 13px; font-weight: 600; text-align: center;">Тип 4</span>
                            <span style="font-size: 10px; color: #718096; text-align: center;">Полный декор</span>
                        </label>
                    </div>

                    <!-- Столб 5 -->
                    <div class="nc-post-item" style="position: relative;">
                        <input type="radio" class="nc-post__input" name="type-stolbi" value="var-5" id="post-type-var-5"
                            ${params.postType === 'var-5' ? 'checked' : ''} style="position: absolute; opacity: 0; pointer-events: none;">
                        <label for="post-type-var-5" style="display: flex; flex-direction: column; align-items: center; padding: 10px; border: 2px solid #e2e8f0; border-radius: 12px; cursor: pointer; transition: all 0.2s ease; background: #fff; height: 100%;">
                            <img src="./assets/images/stolb/st5.webp" alt="Тип 5" style="width: 100%; height: 80px; object-fit: contain; margin-bottom: 8px;">
                            <span style="font-size: 13px; font-weight: 600; text-align: center;">Тип 5</span>
                            <span style="font-size: 10px; color: #718096; text-align: center;">Массивный</span>
                        </label>
                    </div>

                    <!-- Столб 6 -->
                    <div class="nc-post-item" style="position: relative;">
                        <input type="radio" class="nc-post__input" name="type-stolbi" value="var-6" id="post-type-var-6"
                            ${params.postType === 'var-6' ? 'checked' : ''} style="position: absolute; opacity: 0; pointer-events: none;">
                        <label for="post-type-var-6" style="display: flex; flex-direction: column; align-items: center; padding: 10px; border: 2px solid #e2e8f0; border-radius: 12px; cursor: pointer; transition: all 0.2s ease; background: #fff; height: 100%;">
                            <img src="./assets/images/stolb/st6.webp" alt="Тип 6" style="width: 100%; height: 80px; object-fit: contain; margin-bottom: 8px;">
                            <span style="font-size: 13px; font-weight: 600; text-align: center;">Тип 6</span>
                            <span style="font-size: 10px; color: #718096; text-align: center;">Усиленный</span>
                        </label>
                    </div>
                </div>
                
                <style>
                    /* Стили активного состояния (для столбов) */
                    .nc-post__input:checked + label {
                        border-color: #20B5B9 !important;
                        background-color: #E6FFFA !important;
                        box-shadow: 0 0 0 3px rgba(32, 181, 185, 0.2);
                    }
                    .nc-post__input:checked + label::after {
                        content: '✓';
                        position: absolute;
                        top: 8px;
                        right: 8px;
                        width: 18px;
                        height: 18px;
                        background: #20B5B9;
                        color: white;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 10px;
                        font-weight: bold;
                    }
                </style>
            </div>

            <div class="nc-field">
                <label class="nc-field__label">Тип раскосов</label>
                <div class="nc-brace-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 5px;">
                    <div class="nc-brace-item" style="position: relative;">
                        <input type="radio" class="nc-brace__input" name="brace-type" value="var-1" id="brace-type-var-1"
                            ${params.braceType === 'var-1' ? 'checked' : ''} style="position: absolute; opacity: 0; pointer-events: none;">
                        <label for="brace-type-var-1" style="display: flex; flex-direction: column; align-items: center; padding: 6px; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; transition: all 0.2s ease;">
                            <img src="./assets/images/raskos/1 (1).webp" alt="Тип 1" style="width: 40px; height: 40px; object-fit: contain;">
                            <span style="font-size: 10px; margin-top: 4px;">Тип 1</span>
                        </label>
                    </div>
                    <div class="nc-brace-item">
                         <input type="radio" class="nc-brace__input" name="brace-type" value="var-2" id="brace-type-var-2"
                            ${params.braceType === 'var-2' ? 'checked' : ''} style="position: absolute; opacity: 0; pointer-events: none;">
                        <label for="brace-type-var-2" style="display: flex; flex-direction: column; align-items: center; padding: 6px; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; transition: all 0.2s ease;">
                            <img src="./assets/images/raskos/2 (1).webp" alt="Тип 2" style="width: 40px; height: 40px; object-fit: contain;">
                             <span style="font-size: 10px; margin-top: 4px;">Тип 2</span>
                        </label>
                    </div>
                    <div class="nc-brace-item">
                         <input type="radio" class="nc-brace__input" name="brace-type" value="var-3" id="brace-type-var-3"
                            ${params.braceType === 'var-3' ? 'checked' : ''} style="position: absolute; opacity: 0; pointer-events: none;">
                        <label for="brace-type-var-3" style="display: flex; flex-direction: column; align-items: center; padding: 6px; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; transition: all 0.2s ease;">
                            <img src="./assets/images/raskos/3 (1).webp" alt="Тип 3" style="width: 40px; height: 40px; object-fit: contain;">
                             <span style="font-size: 10px; margin-top: 4px;">Тип 3</span>
                        </label>
                    </div>
                    <div class="nc-brace-item">
                         <input type="radio" class="nc-brace__input" name="brace-type" value="var-4" id="brace-type-var-4"
                            ${params.braceType === 'var-4' ? 'checked' : ''} style="position: absolute; opacity: 0; pointer-events: none;">
                        <label for="brace-type-var-4" style="display: flex; flex-direction: column; align-items: center; padding: 6px; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; transition: all 0.2s ease;">
                            <img src="./assets/images/raskos/4 (1).webp" alt="Тип 4" style="width: 40px; height: 40px; object-fit: contain;">
                             <span style="font-size: 10px; margin-top: 4px;">Тип 4</span>
                        </label>
                    </div>
                </div>
            </div>

            <div class="nc-field">
                <label class="nc-field__label">Шаг и Свесы</label>

                <div class="nc-slider-description">
                    <span class="nc-slider-description__text">Расстояние между столбами</span>
                </div>
                <div class="nc-slider">
                    <div class="nc-slider__min">от<br>1.0м</div>
                    <div class="nc-slider__value"><span id="columnStep-value">${(params.postSpacing / 10).toFixed(1)}</span>м</div>
                    <div class="nc-slider__max">до<br>3.5м</div>
                    <input type="range" class="nc-slider__input" min="10" max="35" step="1" value="${params.postSpacing}" id="columnStep">
                </div>
                
                <div class="nc-slider-description">
                    <span class="nc-slider-description__text">Выступ спереди (мм)</span>
                </div>
                <div class="nc-slider">
                    <div class="nc-slider__min">0</div>
                    <div class="nc-slider__value"><span id="frontBeamExtension-value">${params.frontBeamExtension}</span></div>
                    <div class="nc-slider__max">500</div>
                    <input type="range" class="nc-slider__input" min="0" max="500" step="10" value="${params.frontBeamExtension}" id="frontBeamExtension">
                </div>

                <div class="nc-slider-description">
                    <span class="nc-slider-description__text">Выступ сзади (мм)</span>
                </div>
                <div class="nc-slider">
                    <div class="nc-slider__min">0</div>
                    <div class="nc-slider__value"><span id="backBeamExtension-value">${params.backBeamExtension}</span></div>
                    <div class="nc-slider__max">500</div>
                    <input type="range" class="nc-slider__input" min="0" max="500" step="10" value="${params.backBeamExtension}" id="backBeamExtension">
                </div>
            </div>



            <div class="nc-separator"></div>

            <!-- СЕКЦИЯ 3: МАТЕРИАЛЫ -->
            <div class="nc-section-title">3. Материалы</div>

            <div class="nc-field">
                <label class="nc-field__label">Сечение столбов</label>
                <select class="nc-field__input" id="postMaterial">
                    <option value="glued-100x100" ${params.postMaterial === 'glued-100x100' ? 'selected' : ''}>Клееный брус 100×100</option>
                    <option value="glued-150x150" ${params.postMaterial === 'glued-150x150' ? 'selected' : ''}>Клееный брус 150×150</option>
                    <option value="glued-200x200" ${params.postMaterial === 'glued-200x200' ? 'selected' : ''}>Клееный брус 200×200</option>
                </select>
            </div>
            
            <div class="nc-field">
                <label class="nc-field__label">Древесина каркаса</label>
                <select class="nc-field__input" id="frameMaterial">
                    <option value="pine" ${params.frameMaterial === 'pine' ? 'selected' : ''}>Сосна</option>
                    <option value="larch" ${params.frameMaterial === 'larch' ? 'selected' : ''}>Лиственница</option>
                    <option value="oak" ${params.frameMaterial === 'oak' ? 'selected' : ''}>Дуб</option>
                </select>
            </div>



            <div class="nc-separator"></div>

            <!-- СЕКЦИЯ 4: СЕРВИС -->
            <div class="nc-section-title">4. Сервис</div>

            <div class="nc-field" style="display: flex; align-items: center; justify-content: space-between;">
                <label class="nc-field__label" style="margin-bottom: 0;">Монтаж</label>
                <select class="nc-field__input" id="mountingRequired" style="width: auto; min-width: 120px;">
                    <option value="yes" ${params.mountingRequired === 'yes' ? 'selected' : ''}>Требуется</option>
                    <option value="no" ${params.mountingRequired === 'no' ? 'selected' : ''}>Нет</option>
                </select>
            </div>

            <div class="nc-field">
                <label class="nc-field__label">Доставка (км от МКАД)</label>
                <div class="nc-slider">
                    <div class="nc-slider__min">0</div>
                    <div class="nc-slider__value"><span id="distanceFromMKAD-value">${params.distanceFromMKAD}</span>км</div>
                    <div class="nc-slider__max">100</div>
                    <input type="range" class="nc-slider__input" min="1" max="100" step="1" value="${params.distanceFromMKAD}" id="distanceFromMKAD">
                </div>
            </div>
        `;

        this.formElement.innerHTML = formHTML;
        this.bindFormEvents();
        this.initSpecification();

        // Initial setup
        setTimeout(() => {
            this.updateRoofAngle();
        }, 50);
    }

    // Удалены устаревшие методы renderDesignRefinement и renderFrameParamsRefinement

    bindFormEvents() {
        // ... (existing binding logic) ...
        super.bindFormEvents ? super.bindFormEvents() : null; // Safety check

        if (!this.formElement) return;

        // --- Event Delegation for Radio Buttons (Robust) ---
        this.formElement.addEventListener('change', (e) => {
            const target = e.target;

            // Post Type
            if (target.name === 'type-stolbi' && target.checked) {
                console.log('🔘 Post type CHANGED via delegation:', target.value);
                if (this.onParamChanged) {
                    this.onParamChanged('postType', target.value);
                }
            }

            // Brace Type
            if (target.name === 'brace-type' && target.checked) {
                console.log('🔘 Brace type CHANGED via delegation:', target.value);
                if (this.onParamChanged) {
                    this.onParamChanged('braceType', target.value);
                }

                // Обновляем визуальное выделение для раскосов
                const allLabels = this.formElement.querySelectorAll('.nc-brace-item label');
                allLabels.forEach(label => {
                    label.style.borderColor = '#e2e8f0';
                    label.style.background = '#f7fafc';
                });

                if (target.checked) {
                    const label = target.nextElementSibling;
                    if (label) {
                        label.style.borderColor = '#20B5B9';
                        label.style.background = 'rgba(32, 181, 185, 0.1)';
                    }
                }
            }

            // Радио кнопки (типы кровли) - existing logic, moved here for delegation
            if (target.classList.contains('nc-radio__input') && target.checked) {
                console.log('🔘 Радиокнопка изменена:', target.name, '=', target.value);
                this.updateRoofAngle(); // Пересчитываем угол при смене типа
                // Маппинг имен параметров: type-karkas → roofType
                const paramName = target.name === 'type-karkas' ? 'roofType' : target.name;
                console.log('🔘 Отправляем в Presenter:', paramName, '=', target.value);
                if (this.onParamChanged) {
                    this.onParamChanged(paramName, target.value);
                }
            }
        });

        // Привязываем события для новых селектов каркаса и материалов
        ['frameMaterial', 'mountingRequired'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', (e) => {
                    if (this.onParamChanged) {
                        this.onParamChanged(id, e.target.value);
                    }
                });
            }
        });

        // Существующая логика привязки basic инпутов
        const inputs = [
            'length', 'width', 'height', 'roofHeight', 'postSpacing',
            'frontBeamExtension', 'backBeamExtension', 'distanceFromMKAD'
        ];

        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', (e) => {
                    this.updateSliderValue(e.target); // Pass the target element directly
                    if (this.onParamChanged) {
                        this.onParamChanged(id, parseFloat(e.target.value));
                    }
                });
            }
        });

        // Selects
        const selects = ['postMaterial', 'trussMaterial', 'roofingMaterial']; // removed old color selects
        selects.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', (e) => {
                    if (this.onParamChanged) {
                        this.onParamChanged(id, e.target.value);
                    }
                });
            }
        });
    }

    /**
     * Обновление отображаемого значения слайдера
     */
    updateSliderValue(slider) {
        const valueSpan = slider.parentElement.querySelector('.nc-slider__value span');
        if (valueSpan) {
            let displayValue = slider.value;

            // Конвертация для отображения
            if (slider.id === 'length' || slider.id === 'width') {
                displayValue = (parseFloat(slider.value) / 10).toFixed(1);
            } else if (slider.id === 'height' || slider.id === 'roofHeight') {
                displayValue = (parseFloat(slider.value) / 10).toFixed(1);
            } else if (slider.id === 'columnStep') {
                displayValue = (parseFloat(slider.value) / 10).toFixed(1);
            }

            valueSpan.textContent = displayValue;
        }

        // Обновляем угол кровли при изменении геометрии
        if (['length', 'width', 'roofHeight', 'type-karkas'].includes(slider.id) || slider.name === 'type-karkas') {
            this.updateRoofAngle();
        }
    }

    /**
     * Расчет и отображение угла кровли
     */
    updateRoofAngle() {
        // Получаем значения из DOM
        const lengthInput = document.getElementById('length'); // "Ширина (по фасаду)"
        const heightInput = document.getElementById('roofHeight');
        const angleSpan = document.getElementById('roofAngle-value');

        // Определяем тип кровли
        const roofTypeRadio = document.querySelector('input[name="type-karkas"]:checked');
        const roofType = roofTypeRadio ? roofTypeRadio.value : 'var-1';

        if (lengthInput && heightInput && angleSpan) {
            const W = parseFloat(lengthInput.value); // Ширина фасада (см)
            const H = parseFloat(heightInput.value); // Подъем (см)

            let angleRad = 0;

            // Расчет угла зависит от типа кровли
            if (roofType === 'var-1') {
                // Односкатная: atan(H / W)
                angleRad = Math.atan(H / W);
            } else {
                // Двускатная: atan(H / (W / 2))
                angleRad = Math.atan(H / (W / 2));
            }

            const angleDeg = (angleRad * 180 / Math.PI).toFixed(1);

            angleSpan.textContent = angleDeg;

            // Цветовая индикация
            if (angleDeg < 10) {
                angleSpan.style.color = '#ff4444'; // Красный (слишком мало)
                angleSpan.title = "Слишком маленький угол наклона для снега";
            } else if (angleDeg < 15) {
                angleSpan.style.color = '#ffbb33'; // Оранжевый
            } else {
                angleSpan.style.color = '#00C851'; // Зеленый (Норма)
            }
        }
    }

    /**
     * Инициализация спецификации (раскрытие/скрытие)
     */
    initSpecification() {
        const specItems = document.querySelectorAll('.specification dt');
        specItems.forEach(item => {
            item.addEventListener('click', function () {
                const dd = this.nextElementSibling;
                this.classList.toggle('active');
                dd.classList.toggle('active');
            });
        });
    }

    /**
     * Рендеринг сводки с ценой
     */
    renderSummary(data) {
        // Update external total price element if it exists
        this.setTextContent('totalPrice', this.formatMoney(data.totalCost));

        const summaryHTML = `
    < div class="nc-summary" >
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
                    <button class="nc-btn nc-btn--primary" id="order-btn" style="width: 48%; margin-right: 4%;">Заказать</button>
                    <button class="nc-btn nc-btn--secondary" id="save-btn" style="width: 48%;">Сохранить</button>
                </div>
            </div >
    `;

        this.summaryElement.innerHTML = summaryHTML;

        const orderBtn = document.getElementById('order-btn');
        const saveBtn = document.getElementById('save-btn');

        if (orderBtn && this.onOrderClicked) {
            orderBtn.addEventListener('click', () => this.onOrderClicked(data));
        }

        if (saveBtn && this.onSaveClicked) {
            saveBtn.addEventListener('click', () => this.onSaveClicked(data));
        }
    }

    /**
     * Обновление спецификации
     */
    updateSpecification(spec) {
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
            'planed-45x190': 'Строганая доска 45×190 мм',
            'planed-35x190': 'Строганая доска 35×190 мм',
            'planed-50x150': 'Строганая доска 50×150 мм'
        };

        const frameColorNames = {
            'no-coloring': 'Без окраса (Под свою покраску)',
            'neomid': 'Neomid (Базовый антисептик)',
            'texturol-landscape': 'Текстурол Ландшафт (Лазурь, видна структура)',
            'texturol-country': 'Текстурол Кантри (Плотная пропитка)',
            'symphony': 'Symphony Wood Guard (Шелковистое покрытие)',
            'olsta': 'Olsta (Премиум масло/краска)',
            'tikkurila-vinha': 'Tikkurila VINHA (Кроющая защита 20 лет, Финляндия)'
        };

        // Обновление значений в DOM
        this.setTextContent('specRoofType', materialNames[spec.roofType] || 'Двускатный');
        this.setTextContent('specFrameMaterial', materialNames[spec.frameMaterial] || 'Сосна');
        this.setTextContent('specRoofingMaterial', materialNames[spec.roofingMaterial] || 'Металлочерепица');
        this.setTextContent('specRoofColor', materialNames[spec.roofColor] || 'Янтарь');
        this.setTextContent('specArea', spec.area + 'м²');
        this.setTextContent('specWidth', spec.width + ' мм');
        this.setTextContent('specLength', spec.length + ' мм');
        this.setTextContent('specHeight', spec.height + ' мм');
        this.setTextContent('specRoofHeight', spec.roofHeight + ' мм');
        this.setTextContent('specPostSpacing', spec.postSpacing + ' мм');

        // New Detailed Specification Mapping
        this.setTextContent('specRoofTypeDetailed', materialNames[spec.roofType] || 'Двускатный');
        this.setTextContent('specFrameMaterialDetailed', materialNames[spec.frameMaterial] || 'Сосна');
        this.setTextContent('specFrameColorDetailed', frameColorNames[spec.frameColoring] || 'Натуральный');
        this.setTextContent('specRoofingMaterialDetailed', materialNames[spec.roofingMaterial] || 'Металлочерепица');
        this.setTextContent('specRoofColorDetailed', materialNames[spec.roofColor] || 'Коричневый');
        this.setTextContent('specAreaDetailed', spec.area + ' м²');
        this.setTextContent('specWidthDetailed', spec.width + ' мм');
        this.setTextContent('specLengthDetailed', spec.length + ' мм');

        this.setTextContent('specPostCountDetailed', spec.postCount + ' шт.');
        this.setTextContent('specPostTypeDetailed', 'Клееный брус'); // Hardcoded for now, could be dynamic
        this.setTextContent('specPostMaterialDetailed', postSectionNames[spec.postMaterial] || '150×150 мм');
        this.setTextContent('specHeightDetailed', spec.height + ' мм');

        this.setTextContent('specTrussCountDetailed', spec.trussCount + ' шт.');
        this.setTextContent('specTrussMaterialDetailed', trussMaterialNames[spec.trussMaterial] || 'Строганая доска 45×190 мм');
        this.setTextContent('specRoofHeightDetailed', spec.roofHeight + ' мм');

        const braceTypeMap = {
            'var-1': 'Тип 1 (Прямой)',
            'var-2': 'Тип 2 (Изогнутый)',
            'var-3': 'Тип 3 (Сложный)',
            'var-4': 'Тип 4 (Декоративный)'
        };
        this.setTextContent('specBraceCountDetailed', spec.braceCount + ' шт.');
        this.setTextContent('specBraceTypeDetailed', braceTypeMap[spec.braceType] || 'Тип 1');

        // Backward compatibility
        this.setTextContent('specPosts', spec.postCount + ' шт.');
        this.setTextContent('specPostType', 'Квадратный брус');
        this.setTextContent('specPostMaterial', 'Сосна');
        this.setTextContent('specHeightLeft', spec.heightLeft + ' мм');
        this.setTextContent('specHeightRight', spec.heightRight + ' мм');
        this.setTextContent('specPostSection', postSectionNames[spec.postMaterial] || '150×150 мм');

        this.setTextContent('specFarms', spec.trussCount + ' шт.');
        this.setTextContent('specTrussMaterial', trussMaterialNames[spec.trussMaterial] || 'Строганая доска 45×190 мм');
        this.setTextContent('specFarmLength', spec.farmLength + ' мм');
        this.setTextContent('specTrussSpacing', spec.trussSpacing + ' мм');

        this.setTextContent('specBraces', spec.braceCount + ' шт.');
        this.setTextContent('specBraceType', 'Стандартный');
        this.setTextContent('specBraceMaterial', materialNames[spec.braceMaterial] || 'Сосна');
    }

    /**
     * Вспомогательная функция для установки текста
     */
    setTextContent(id, content) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = content;
        }
    }

    /**
     * Форматирование денег
     */
    formatMoney(amount) {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    /**
     * Показать индикатор загрузки
     */
    showLoading() {
        // Можно добавить спиннер
        console.log('Загрузка...');
    }

    /**
     * Скрыть индикатор загрузки
     */
    hideLoading() {
        console.log('Загрузка завершена');
    }

    /**
     * Показать сообщение об ошибке
     */
    showError(message) {
        alert('Ошибка: ' + message);
    }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CanopyView;
}

