/**
 * Модуль для экспорта спецификации в PDF
 * Использует jsPDF библиотеку
 */

class PDFExporter {
    constructor() {
        this.loaded = false;
        this.loadJsPDF();
    }

    /**
     * Загрузить библиотеку jsPDF динамически
     */
    async loadJsPDF() {
        if (window.jsPDF) {
            this.loaded = true;
            return;
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = () => {
                this.loaded = true;
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Экспортировать спецификацию в PDF
     * @param {Object} data - Данные для экспорта
     * @param {String} filename - Имя файла
     */
    async exportToPDF(data, filename = 'specification.pdf') {
        if (!this.loaded) {
            await this.loadJsPDF();
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // Настройка шрифта (по умолчанию поддерживает кириллицу ограниченно)
        let y = 20;
        const lineHeight = 7;
        const pageHeight = 297;
        const margin = 20;

        // Заголовок
        doc.setFontSize(20);
        doc.text('SPECIFIKACIYA NAVESA', margin, y);
        y += lineHeight * 2;

        // Дата
        doc.setFontSize(10);
        doc.text(`Data: ${new Date().toLocaleDateString('ru-RU')}`, margin, y);
        y += lineHeight * 1.5;

        // Общая информация
        doc.setFontSize(14);
        doc.text('1. OBSHCHIE PARAMETRY', margin, y);
        y += lineHeight;

        doc.setFontSize(10);
        const generalParams = [
            `Tip navesa: ${data.roofType || 'N/A'}`,
            `Material karkasa: ${data.frameMaterial || 'N/A'}`,
            `Material krovli: ${data.roofingMaterial || 'N/A'}`,
            `Cvet krovli: ${data.roofColor || 'N/A'}`,
            `Ploshchad': ${data.area || 'N/A'} m²`,
            `Shirina: ${data.width || 'N/A'} mm`,
            `Dlina: ${data.length || 'N/A'} mm`,
            `Vysota: ${data.height || 'N/A'} mm`
        ];

        generalParams.forEach(param => {
            if (y > pageHeight - margin) {
                doc.addPage();
                y = margin;
            }
            doc.text(param, margin + 5, y);
            y += lineHeight;
        });

        y += lineHeight;

        // Столбы
        doc.setFontSize(14);
        doc.text('2. STOLBY', margin, y);
        y += lineHeight;

        doc.setFontSize(10);
        const postParams = [
            `Kolichestvo stolbov: ${data.postsCount || 'N/A'} sht.`,
            `Material stolbov: ${data.postMaterial || 'N/A'}`,
            `Sechenie stolbov: ${data.postSection || 'N/A'} mm`
        ];

        postParams.forEach(param => {
            if (y > pageHeight - margin) {
                doc.addPage();
                y = margin;
            }
            doc.text(param, margin + 5, y);
            y += lineHeight;
        });

        y += lineHeight;

        // Фермы
        doc.setFontSize(14);
        doc.text('3. FERMY', margin, y);
        y += lineHeight;

        doc.setFontSize(10);
        const trussParams = [
            `Kolichestvo ferm: ${data.trussCount || 'N/A'} sht.`,
            `Material ferm: ${data.trussMaterial || 'N/A'}`,
            `Shag ferm: ${data.trussSpacing || 'N/A'} mm`
        ];

        trussParams.forEach(param => {
            if (y > pageHeight - margin) {
                doc.addPage();
                y = margin;
            }
            doc.text(param, margin + 5, y);
            y += lineHeight;
        });

        y += lineHeight * 2;

        // Итоговая стоимость
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        if (y > pageHeight - margin) {
            doc.addPage();
            y = margin;
        }
        doc.text(`ITOGO: ${data.totalPrice || 'N/A'}`, margin, y);

        // Сохранение файла
        doc.save(filename);
    }

    /**
     * Экспортировать с изображением 3D модели
     * @param {Object} data - Данные для экспорта
     * @param {String} imageDataUrl - Data URL изображения
     * @param {String} filename - Имя файла
     */
    async exportWithImage(data, imageDataUrl, filename = 'specification.pdf') {
        if (!this.loaded) {
            await this.loadJsPDF();
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        let y = 20;
        const margin = 20;

        // Добавляем изображение
        if (imageDataUrl) {
            doc.addImage(imageDataUrl, 'PNG', margin, y, 170, 100);
            y += 110;
        }

        // Остальное содержимое
        doc.setFontSize(20);
        doc.text('SPECIFIKACIYA NAVESA', margin, y);
        y += 10;

        doc.setFontSize(12);
        doc.text(`ITOGO: ${data.totalPrice || 'N/A'}`, margin, y);

        doc.save(filename);
    }
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PDFExporter;
} else {
    window.PDFExporter = PDFExporter;
}

