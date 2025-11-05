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

            <div class="nc-field">
                <label class="nc-field__label">Форма кровли</label>
                <div class="nc-radio-group">
                    <div class="nc-radio">
                        <input type="radio" class="nc-radio__input" name="type-karkas" value="var-1" id="type-karkas-var-1"
                            ${params.roofType === 'var-1' ? 'checked' : ''}>
                        <label for="type-karkas-var-1" class="nc-radio__label">
                            <img src="data:image/svg+xml,%3Csvg viewBox='0 0 100 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 50 L90 50 L90 20 L10 40 Z' fill='%2320B5B9'/%3E%3C/svg%3E" alt="Односкатный" class="nc-radio__image">
                        </label>
                    </div>
                    <div class="nc-radio">
                        <input type="radio" class="nc-radio__input" name="type-karkas" value="var-2" id="type-karkas-var-2"
                            ${params.roofType === 'var-2' ? 'checked' : ''}>
                        <label for="type-karkas-var-2" class="nc-radio__label">
                            <img src="data:image/svg+xml,%3Csvg viewBox='0 0 100 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 50 L90 50 L50 20 Z' fill='%2320B5B9'/%3E%3C/svg%3E" alt="Двускатный" class="nc-radio__image">
                        </label>
                    </div>
                    <div class="nc-radio">
                        <input type="radio" class="nc-radio__input" name="type-karkas" value="var-3" id="type-karkas-var-3"
                            ${params.roofType === 'var-3' ? 'checked' : ''}>
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
                    <div class="nc-slider__value"><span id="length-value">${(params.length / 10).toFixed(1)}</span>м</div>
                    <div class="nc-slider__max">до<br>20м</div>
                    <input type="range" class="nc-slider__input" min="10" max="200" step="5" value="${params.length}" id="length">
                </div>
                
                <div class="nc-slider-description">
                    <span class="nc-slider-description__text">Ширина навеса (глубина)</span>
                </div>
                <div class="nc-slider">
                    <div class="nc-slider__min">от<br>3м</div>
                    <div class="nc-slider__value"><span id="width-value">${(params.width / 10).toFixed(1)}</span>м</div>
                    <div class="nc-slider__max">до<br>12м</div>
                    <input type="range" class="nc-slider__input" min="30" max="120" step="5" value="${params.width}" id="width">
                </div>
                
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
                    <span class="nc-slider-description__text">Высота кровли (подъем)</span>
                </div>
                <div class="nc-slider">
                    <div class="nc-slider__min">от<br>0.5м</div>
                    <div class="nc-slider__value"><span id="roofHeight-value">${(params.roofHeight / 10).toFixed(1)}</span>м</div>
                    <div class="nc-slider__max">до<br>3м</div>
                    <input type="range" class="nc-slider__input" min="5" max="30" step="1" value="${params.roofHeight}" id="roofHeight">
                </div>
                
                <div class="nc-slider-description">
                    <span class="nc-slider-description__text">Расстояние между столбами</span>
                </div>
                <div class="nc-slider">
                    <div class="nc-slider__min">от<br>1.0м</div>
                    <div class="nc-slider__value"><span id="columnStep-value">${(params.postSpacing / 10).toFixed(1)}</span>м</div>
                    <div class="nc-slider__max">до<br>3.5м</div>
                    <input type="range" class="nc-slider__input" min="10" max="35" step="1" value="${params.postSpacing}" id="columnStep">
                </div>
            </div>

            <div class="nc-field">
                <label class="nc-field__label">Материал столбов</label>
                <select class="nc-field__input" id="postMaterial">
                    <option value="glued-100x100" ${params.postMaterial === 'glued-100x100' ? 'selected' : ''}>Клееный брус 100×100 мм</option>
                    <option value="glued-150x150" ${params.postMaterial === 'glued-150x150' ? 'selected' : ''}>Клееный брус 150×150 мм</option>
                    <option value="glued-200x200" ${params.postMaterial === 'glued-200x200' ? 'selected' : ''}>Клееный брус 200×200 мм</option>
                    <option value="glued-240x140" ${params.postMaterial === 'glued-240x140' ? 'selected' : ''}>Клееный брус 240×140 мм</option>
                    <option value="planed-90x90" ${params.postMaterial === 'planed-90x90' ? 'selected' : ''}>Строганый брус 90×90 мм</option>
                    <option value="planed-140x140" ${params.postMaterial === 'planed-140x140' ? 'selected' : ''}>Строганый брус 140×140 мм</option>
                    <option value="planed-190x190" ${params.postMaterial === 'planed-190x190' ? 'selected' : ''}>Строганый брус 190×190 мм</option>
                </select>
            </div>

            <div class="nc-field">
                <label class="nc-field__label">Материал ферм</label>
                <select class="nc-field__input" id="trussMaterial">
                    <option value="planed-45x190" ${params.trussMaterial === 'planed-45x190' ? 'selected' : ''}>Строганая доска 45×190 мм</option>
                    <option value="planed-35x190" ${params.trussMaterial === 'planed-35x190' ? 'selected' : ''}>Строганая доска 35×190 мм</option>
                    <option value="planed-50x150" ${params.trussMaterial === 'planed-50x150' ? 'selected' : ''}>Строганая доска 50×150 мм</option>
                </select>
            </div>

            <div class="nc-field">
                <label class="nc-field__label">Тип раскосов</label>
                <select class="nc-field__input" id="braceType">
                    <option value="var-1" ${params.braceType === 'var-1' ? 'selected' : ''}>Стандартный</option>
                    <option value="var-2" ${params.braceType === 'var-2' ? 'selected' : ''}>Раскос тип 2</option>
                    <option value="var-3" ${params.braceType === 'var-3' ? 'selected' : ''}>Раскос тип 3</option>
                    <option value="var-4" ${params.braceType === 'var-4' ? 'selected' : ''}>Раскос тип 4</option>
                </select>
            </div>

            <div class="nc-field">
                <label class="nc-field__label">Материал кровли</label>
                <select class="nc-field__input" id="roofingMaterial">
                    <option value="metal-grandline" ${params.roofingMaterial === 'metal-grandline' ? 'selected' : ''}>Металлочерепица Grand Line 0.45 мм + снегозадержатели</option>
                    <option value="shinglas-sonata" ${params.roofingMaterial === 'shinglas-sonata' ? 'selected' : ''}>Гибкая черепица Shinglas Финская Соната</option>
                    <option value="profiled-gl35r" ${params.roofingMaterial === 'profiled-gl35r' ? 'selected' : ''}>Кровельный профнастил GL 35R</option>
                    <option value="polycarbonate-8mm" ${params.roofingMaterial === 'polycarbonate-8mm' ? 'selected' : ''}>Монолитный поликарбонат, 8 мм</option>
                    <option value="no-roofing" ${params.roofingMaterial === 'no-roofing' ? 'selected' : ''}>Без кровли</option>
                </select>
            </div>

            <div class="nc-field">
                <label class="nc-field__label">Цвет кровли</label>
                <select class="nc-field__input" id="roofColor">
                    <option value="amber" ${params.roofColor === 'amber' ? 'selected' : ''}>Янтарь</option>
                    <option value="blue" ${params.roofColor === 'blue' ? 'selected' : ''}>Синий</option>
                    <option value="green" ${params.roofColor === 'green' ? 'selected' : ''}>Зеленый</option>
                    <option value="red" ${params.roofColor === 'red' ? 'selected' : ''}>Красный</option>
                    <option value="gray" ${params.roofColor === 'gray' ? 'selected' : ''}>Серый</option>
                </select>
            </div>

            <div class="nc-field">
                <label class="nc-field__label">Выпуски балок</label>
                
                <div class="nc-slider-description">
                    <span class="nc-slider-description__text">Выступ балки за пределы передних столбов</span>
                </div>
                <div class="nc-slider">
                    <div class="nc-slider__min">от<br>0мм</div>
                    <div class="nc-slider__value"><span id="frontBeamExtension-value">${params.frontBeamExtension}</span>мм</div>
                    <div class="nc-slider__max">до<br>500мм</div>
                    <input type="range" class="nc-slider__input" min="0" max="500" step="10" value="${params.frontBeamExtension}" id="frontBeamExtension">
                </div>
                
                <div class="nc-slider-description">
                    <span class="nc-slider-description__text">Выступ балки за пределы задних столбов</span>
                </div>
                <div class="nc-slider">
                    <div class="nc-slider__min">от<br>0мм</div>
                    <div class="nc-slider__value"><span id="backBeamExtension-value">${params.backBeamExtension}</span>мм</div>
                    <div class="nc-slider__max">до<br>500мм</div>
                    <input type="range" class="nc-slider__input" min="0" max="500" step="10" value="${params.backBeamExtension}" id="backBeamExtension">
                </div>
            </div>

            <div class="nc-field">
                <label class="nc-field__label">Монтаж</label>
                <select class="nc-field__input" id="mountingRequired">
                    <option value="yes" ${params.mountingRequired === 'yes' ? 'selected' : ''}>Требуется</option>
                    <option value="no" ${params.mountingRequired === 'no' ? 'selected' : ''}>Не требуется</option>
                </select>
            </div>

            <div class="nc-field">
                <label class="nc-field__label">Доставка</label>
                <div class="nc-slider-description">
                    <span class="nc-slider-description__text">Расстояние от МКАД для расчета доставки</span>
                </div>
                <div class="nc-slider">
                    <div class="nc-slider__min">от<br>1км</div>
                    <div class="nc-slider__value"><span id="distanceFromMKAD-value">${params.distanceFromMKAD}</span>км</div>
                    <div class="nc-slider__max">до<br>100км</div>
                    <input type="range" class="nc-slider__input" min="1" max="100" step="1" value="${params.distanceFromMKAD}" id="distanceFromMKAD">
                </div>
            </div>
        `;

        this.formElement.innerHTML = formHTML;
        this.bindFormEvents();
        this.initSpecification();
    }

    /**
     * Привязка событий формы (передача в Presenter)
     */
    bindFormEvents() {
        // Слайдеры
        const sliders = this.formElement.querySelectorAll('.nc-slider__input');
        sliders.forEach(slider => {
            slider.addEventListener('input', (e) => {
                this.updateSliderValue(e.target);
                
                if (this.onParamChanged) {
                    this.onParamChanged(e.target.id, parseFloat(e.target.value));
                }
            });
        });

        // Радио кнопки
        const radios = this.formElement.querySelectorAll('.nc-radio__input');
        radios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked && this.onParamChanged) {
                    this.onParamChanged(e.target.name, e.target.value);
                }
            });
        });

        // Селекты
        const selects = this.formElement.querySelectorAll('select');
        selects.forEach(select => {
            select.addEventListener('change', (e) => {
                if (this.onParamChanged) {
                    this.onParamChanged(e.target.id, e.target.value);
                }
            });
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
    }

    /**
     * Инициализация спецификации (раскрытие/скрытие)
     */
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

    /**
     * Рендеринг сводки с ценой
     */
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
                    <button class="nc-btn nc-btn--primary" id="order-btn" style="width: 48%; margin-right: 4%;">Заказать</button>
                    <button class="nc-btn nc-btn--secondary" id="save-btn" style="width: 48%;">Сохранить</button>
                </div>
            </div>
        `;

        this.summaryElement.innerHTML = summaryHTML;
        
        // Привязка кнопок
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

