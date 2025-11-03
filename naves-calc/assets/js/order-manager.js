/**
 * Менеджер для оформления заказов
 * Собирает данные и отправляет на сервер
 */

class OrderManager {
    constructor(apiEndpoint = '/api/orders') {
        this.apiEndpoint = apiEndpoint;
    }

    /**
     * Создать форму заказа
     * @param {Object} calculationData - Данные расчета
     * @returns {HTMLElement} Форма заказа
     */
    createOrderForm(calculationData) {
        const modal = document.createElement('div');
        modal.className = 'order-modal';
        modal.innerHTML = `
            <div class="order-modal-overlay" onclick="this.parentElement.remove()"></div>
            <div class="order-modal-content">
                <div class="order-modal-header">
                    <h2>Оформление заказа</h2>
                    <button class="order-modal-close" onclick="this.closest('.order-modal').remove()">✕</button>
                </div>
                
                <div class="order-modal-body">
                    <form id="order-form" class="order-form">
                        <div class="order-summary">
                            <h3>Ваш заказ:</h3>
                            <p><strong>Тип навеса:</strong> ${calculationData.roofType || 'Не указан'}</p>
                            <p><strong>Размеры:</strong> ${calculationData.length}×${calculationData.width} м</p>
                            <p><strong>Площадь:</strong> ${calculationData.area} м²</p>
                            <p class="total-price"><strong>Итого:</strong> ${calculationData.totalPrice}</p>
                        </div>

                        <div class="form-group">
                            <label for="customer-name">Ваше имя *</label>
                            <input type="text" id="customer-name" name="name" required 
                                   placeholder="Иван Иванов">
                        </div>

                        <div class="form-group">
                            <label for="customer-phone">Телефон *</label>
                            <input type="tel" id="customer-phone" name="phone" required 
                                   placeholder="+7 (999) 123-45-67"
                                   pattern="[+]?[0-9\\s\\-\\(\\)]+">
                        </div>

                        <div class="form-group">
                            <label for="customer-email">Email</label>
                            <input type="email" id="customer-email" name="email" 
                                   placeholder="example@mail.ru">
                        </div>

                        <div class="form-group">
                            <label for="customer-address">Адрес доставки</label>
                            <textarea id="customer-address" name="address" rows="3" 
                                      placeholder="Укажите адрес доставки"></textarea>
                        </div>

                        <div class="form-group">
                            <label for="customer-comment">Комментарий к заказу</label>
                            <textarea id="customer-comment" name="comment" rows="4" 
                                      placeholder="Дополнительные пожелания или вопросы"></textarea>
                        </div>

                        <div class="form-group checkbox-group">
                            <label>
                                <input type="checkbox" name="agree" required>
                                Я согласен с <a href="/privacy" target="_blank">политикой конфиденциальности</a>
                            </label>
                        </div>

                        <div class="order-form-actions">
                            <button type="submit" class="btn btn-primary">Отправить заказ</button>
                            <button type="button" class="btn btn-secondary" 
                                    onclick="this.closest('.order-modal').remove()">Отмена</button>
                        </div>

                        <div class="order-status" id="order-status"></div>
                    </form>
                </div>
            </div>
        `;

        // Добавляем стили
        this.injectStyles();

        // Обработчик отправки формы
        const form = modal.querySelector('#order-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitOrder(form, calculationData);
        });

        return modal;
    }

    /**
     * Отправить заказ
     * @param {HTMLFormElement} form - Форма заказа
     * @param {Object} calculationData - Данные расчета
     */
    async submitOrder(form, calculationData) {
        const statusEl = form.querySelector('#order-status');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // Собираем данные формы
        const formData = new FormData(form);
        const orderData = {
            customer: {
                name: formData.get('name'),
                phone: formData.get('phone'),
                email: formData.get('email'),
                address: formData.get('address'),
                comment: formData.get('comment')
            },
            calculation: calculationData,
            timestamp: new Date().toISOString()
        };

        // Показываем индикатор загрузки
        submitBtn.disabled = true;
        submitBtn.textContent = 'Отправка...';
        statusEl.innerHTML = '<div class="status-loading">⏳ Отправка заказа...</div>';

        try {
            // Отправка на сервер
            const response = await this.sendToServer(orderData);

            if (response.success) {
                statusEl.innerHTML = `
                    <div class="status-success">
                        ✅ Заказ успешно отправлен!<br>
                        Номер заказа: <strong>${response.orderId || 'N/A'}</strong><br>
                        Мы свяжемся с вами в ближайшее время.
                    </div>
                `;
                
                // Очищаем форму
                form.reset();
                
                // Закрываем модальное окно через 3 секунды
                setTimeout(() => {
                    form.closest('.order-modal').remove();
                }, 3000);
            } else {
                throw new Error(response.message || 'Ошибка отправки');
            }
        } catch (error) {
            console.error('Ошибка отправки заказа:', error);
            statusEl.innerHTML = `
                <div class="status-error">
                    ❌ Ошибка отправки заказа: ${error.message}<br>
                    Попробуйте еще раз или свяжитесь с нами по телефону.
                </div>
            `;
            submitBtn.disabled = false;
            submitBtn.textContent = 'Отправить заказ';
        }
    }

    /**
     * Отправка данных на сервер
     * @param {Object} orderData - Данные заказа
     * @returns {Promise<Object>} Ответ сервера
     */
    async sendToServer(orderData) {
        // ВНИМАНИЕ: Это демо-версия
        // В продакшене здесь должен быть реальный API endpoint
        
        // Симуляция отправки на сервер
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Сохраняем локально для демонстрации
                this.saveOrderLocally(orderData);
                
                // Симулируем успешный ответ
                resolve({
                    success: true,
                    orderId: `ORD-${Date.now()}`,
                    message: 'Заказ успешно создан'
                });

                // Для продакшена раскомментируйте:
                /*
                fetch(this.apiEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(orderData)
                })
                .then(response => response.json())
                .then(data => resolve(data))
                .catch(error => reject(error));
                */
            }, 1500);
        });
    }

    /**
     * Сохранить заказ локально (для демо)
     * @param {Object} orderData - Данные заказа
     */
    saveOrderLocally(orderData) {
        const orders = JSON.parse(localStorage.getItem('naves_orders') || '[]');
        orders.unshift({
            id: `ORD-${Date.now()}`,
            ...orderData
        });
        
        // Храним максимум 10 заказов
        if (orders.length > 10) {
            orders.length = 10;
        }
        
        localStorage.setItem('naves_orders', JSON.stringify(orders));
    }

    /**
     * Внедрить стили для формы заказа
     */
    injectStyles() {
        if (document.getElementById('order-modal-styles')) return;

        const style = document.createElement('style');
        style.id = 'order-modal-styles';
        style.textContent = `
            .order-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .order-modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(5px);
            }

            .order-modal-content {
                position: relative;
                background: white;
                border-radius: 20px;
                max-width: 600px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                animation: modalSlideIn 0.3s ease;
            }

            @keyframes modalSlideIn {
                from {
                    opacity: 0;
                    transform: translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .order-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 25px 30px;
                border-bottom: 1px solid #e9ecef;
            }

            .order-modal-header h2 {
                margin: 0;
                font-size: 24px;
                color: #2c3e50;
            }

            .order-modal-close {
                background: none;
                border: none;
                font-size: 28px;
                cursor: pointer;
                color: #999;
                transition: color 0.3s;
                padding: 0;
                width: 30px;
                height: 30px;
            }

            .order-modal-close:hover {
                color: #EB1B24;
            }

            .order-modal-body {
                padding: 30px;
            }

            .order-summary {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 10px;
                margin-bottom: 25px;
            }

            .order-summary h3 {
                margin-top: 0;
                margin-bottom: 15px;
                font-size: 18px;
                color: #2c3e50;
            }

            .order-summary p {
                margin: 8px 0;
                color: #555;
            }

            .order-summary .total-price {
                font-size: 20px;
                color: #EB1B24;
                margin-top: 15px;
                padding-top: 15px;
                border-top: 2px solid #ddd;
            }

            .order-form .form-group {
                margin-bottom: 20px;
            }

            .order-form label {
                display: block;
                margin-bottom: 8px;
                font-weight: 600;
                color: #2c3e50;
            }

            .order-form input,
            .order-form textarea {
                width: 100%;
                padding: 12px 15px;
                border: 2px solid #e9ecef;
                border-radius: 10px;
                font-size: 15px;
                transition: border-color 0.3s;
                font-family: inherit;
            }

            .order-form input:focus,
            .order-form textarea:focus {
                outline: none;
                border-color: #20B5B9;
            }

            .order-form textarea {
                resize: vertical;
            }

            .checkbox-group label {
                display: flex;
                align-items: center;
                font-weight: normal;
            }

            .checkbox-group input[type="checkbox"] {
                width: auto;
                margin-right: 10px;
            }

            .order-form-actions {
                display: flex;
                gap: 10px;
                margin-top: 25px;
            }

            .order-form-actions .btn {
                flex: 1;
                padding: 15px 20px;
                border: none;
                border-radius: 10px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s;
            }

            .order-form-actions .btn-primary {
                background: linear-gradient(90deg, #EB1B24 0%, #FF5058 100%);
                color: white;
            }

            .order-form-actions .btn-primary:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 4px 15px rgba(235, 27, 36, 0.3);
            }

            .order-form-actions .btn-primary:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }

            .order-form-actions .btn-secondary {
                background: #f8f9fa;
                color: #2c3e50;
                border: 2px solid #e9ecef;
            }

            .order-form-actions .btn-secondary:hover {
                background: #e9ecef;
            }

            .order-status {
                margin-top: 20px;
                padding: 15px;
                border-radius: 10px;
                text-align: center;
            }

            .status-loading {
                color: #20B5B9;
                font-size: 16px;
            }

            .status-success {
                background: #d4edda;
                color: #155724;
                padding: 15px;
                border-radius: 10px;
            }

            .status-error {
                background: #f8d7da;
                color: #721c24;
                padding: 15px;
                border-radius: 10px;
            }

            @media (max-width: 768px) {
                .order-modal-content {
                    width: 95%;
                    max-height: 95vh;
                }

                .order-modal-header,
                .order-modal-body {
                    padding: 20px;
                }

                .order-form-actions {
                    flex-direction: column;
                }
            }
        `;

        document.head.appendChild(style);
    }
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OrderManager;
} else {
    window.OrderManager = OrderManager;
}

