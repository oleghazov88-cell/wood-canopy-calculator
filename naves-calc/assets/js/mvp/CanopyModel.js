/**
 * CanopyModel - Модель данных калькулятора навесов (MVP Pattern)
 * 
 * Отвечает за:
 * - Хранение параметров навеса
 * - Загрузку и хранение цен
 * - Бизнес-логику расчетов
 * - Валидацию данных
 */

class CanopyModel {
    constructor() {
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
                frontBeamExtension: 200, // в мм
                backBeamExtension: 200,  // в мм
                mountingRequired: 'yes',
                distanceFromMKAD: 10,
                frameMaterial: 'pine',
                frameColoring: 'no-coloring'
            }
        };
        
        this.params = { ...this.config.defaultParams };
        this.prices = {};
        this.currentPostSpacing = this.params.postSpacing / 10; // Конвертация в метры
        
        // Колбэки для уведомления об изменениях
        this.onDataChanged = null;
        this.onPricesLoaded = null;
    }

    /**
     * Загрузка цен из JSON
     */
    async loadPrices() {
        try {
            const response = await fetch(this.config.pricesUrl);
            if (response.ok) {
                this.prices = await response.json();
            } else {
                this.prices = this.getDefaultPrices();
            }
            
            if (this.onPricesLoaded) {
                this.onPricesLoaded(this.prices);
            }
            
            return this.prices;
        } catch (error) {
            console.warn('Не удалось загрузить цены, используем дефолтные:', error);
            this.prices = this.getDefaultPrices();
            
            if (this.onPricesLoaded) {
                this.onPricesLoaded(this.prices);
            }
            
            return this.prices;
        }
    }

    /**
     * Получение дефолтных цен
     */
    getDefaultPrices() {
        return {
            'post_glued_100x100': { price: 1200, unit: 'м.п.' },
            'post_glued_150x150': { price: 1500, unit: 'м.п.' },
            'post_glued_200x200': { price: 2200, unit: 'м.п.' },
            'post_glued_240x140': { price: 1800, unit: 'м.п.' },
            'post_planed_90x90': { price: 850, unit: 'м.п.' },
            'post_planed_140x140': { price: 1100, unit: 'м.п.' },
            'post_planed_190x190': { price: 1400, unit: 'м.п.' },
            'beam_glued': { price: 1800, unit: 'м.п.' },
            'beam_planed': { price: 1200, unit: 'м.п.' },
            'truss_planed_45x190': { price: 850, unit: 'м.п.' },
            'truss_planed_35x190': { price: 780, unit: 'м.п.' },
            'truss_planed_50x150': { price: 920, unit: 'м.п.' },
            'roof_metal_grandline': { price: 650, unit: 'м²' },
            'roof_shinglas_sonata': { price: 450, unit: 'м²' },
            'roof_profiled_gl35r': { price: 520, unit: 'м²' },
            'roof_polycarbonate_8mm': { price: 380, unit: 'м²' },
            'mounting_base': { price: 2500, unit: 'м²' },
            'mounting_complex': { price: 3500, unit: 'м²' },
            'delivery_mkad': { price: 35, unit: 'км' }
        };
    }

    /**
     * Обновление параметра
     */
    updateParam(key, value) {
        this.params[key] = value;
        
        // Обновление currentPostSpacing при изменении postSpacing
        if (key === 'postSpacing') {
            this.currentPostSpacing = value / 10; // дециметры -> метры
        }
        
        // Уведомляем подписчиков об изменении
        if (this.onDataChanged) {
            this.onDataChanged(key, value);
        }
    }

    /**
     * Получение текущих параметров
     */
    getParams() {
        return { ...this.params };
    }

    /**
     * Получение параметра по ключу
     */
    getParam(key) {
        return this.params[key];
    }

    /**
     * Расчет стоимости навеса
     */
    calculateCost() {
        const length = this.params.length / 10; // метры
        const width = this.params.width / 10;   // метры
        const height = this.params.height / 10; // метры
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
        
        return {
            area,
            length,
            width,
            height,
            postCount,
            trussCount,
            braceCount,
            postsAlongLength,
            postSpacing,
            materialsCost,
            mountingCost,
            deliveryCost,
            totalCost
        };
    }

    /**
     * Получение спецификации навеса
     */
    getSpecification() {
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
        const trussCount = postsAlongLength;
        const braceCount = postCount * 2;
        const trussSpacing = trussCount > 1 ? (length * 1000) / (trussCount - 1) : 0;
        
        return {
            roofType: this.params.roofType,
            frameMaterial: this.params.frameMaterial,
            roofingMaterial: this.params.roofingMaterial,
            roofColor: this.params.roofColor,
            area: area.toFixed(1),
            width: width * 1000, // мм
            length: Math.round(length * 1000 + frontBeamExtension + backBeamExtension), // мм
            height: height * 1000, // мм
            roofHeight: roofHeight * 1000, // мм
            postSpacing: postSpacing * 1000, // мм
            postCount,
            postType: this.params.postType,
            postMaterial: this.params.postMaterial,
            heightLeft: height * 1000,
            heightRight: height * 1000,
            trussMaterial: this.params.trussMaterial,
            trussCount,
            farmLength: width * 1000,
            trussSpacing: Math.round(trussSpacing),
            braceCount,
            braceType: this.params.braceType,
            braceMaterial: this.params.frameMaterial
        };
    }

    /**
     * Получение размеров балки в зависимости от материала столба
     */
    getBeamDimensions(postMaterial, postType) {
        const beamSizes = {
            'glued-100x100': { width: 0.1, height: 0.1 },
            'glued-150x150': { width: 0.15, height: 0.15 },
            'glued-200x200': { width: 0.2, height: 0.2 },
            'glued-240x140': { width: 0.24, height: 0.14 },
            'planed-90x90': { width: 0.09, height: 0.09 },
            'planed-140x140': { width: 0.14, height: 0.14 },
            'planed-190x190': { width: 0.19, height: 0.19 }
        };
        
        return beamSizes[postMaterial] || { width: 0.15, height: 0.15 };
    }

    /**
     * Получение размеров стропила
     */
    getTrussDimensions(trussMaterial) {
        const trussSizes = {
            'planed-45x190': { width: 0.045, height: 0.19 },
            'planed-35x190': { width: 0.035, height: 0.19 },
            'planed-50x150': { width: 0.05, height: 0.15 }
        };
        
        return trussSizes[trussMaterial] || { width: 0.045, height: 0.19 };
    }

    /**
     * Получение размеров столба
     */
    getPostDimensions(postMaterial) {
        const postSizes = {
            'glued-100x100': { width: 0.1, depth: 0.1 },
            'glued-150x150': { width: 0.15, depth: 0.15 },
            'glued-200x200': { width: 0.2, depth: 0.2 },
            'glued-240x140': { width: 0.24, depth: 0.14 },
            'planed-90x90': { width: 0.09, depth: 0.09 },
            'planed-140x140': { width: 0.14, depth: 0.14 },
            'planed-190x190': { width: 0.19, depth: 0.19 }
        };
        
        return postSizes[postMaterial] || { width: 0.15, depth: 0.15 };
    }

    /**
     * Сброс параметров к дефолтным
     */
    resetToDefaults() {
        this.params = { ...this.config.defaultParams };
        this.currentPostSpacing = this.params.postSpacing / 10;
        
        if (this.onDataChanged) {
            this.onDataChanged('reset', this.params);
        }
    }

    /**
     * Экспорт данных для сохранения
     */
    exportData() {
        return {
            params: this.params,
            calculation: this.calculateCost(),
            specification: this.getSpecification(),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Импорт данных
     */
    importData(data) {
        if (data.params) {
            this.params = { ...this.config.defaultParams, ...data.params };
            this.currentPostSpacing = this.params.postSpacing / 10;
            
            if (this.onDataChanged) {
                this.onDataChanged('import', this.params);
            }
        }
    }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CanopyModel;
}
