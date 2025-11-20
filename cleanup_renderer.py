#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Скрипт для очистки Canopy3DRenderer.js от устаревших методов"""

import re

# Читаем файл
with open('naves-calc/assets/js/mvp/Canopy3DRenderer.js', 'r', encoding='utf-8') as f:
    content = f.read()

original_length = len(content)

# 1. Удаляем init_DEPRECATED (строки ~126-159)
pattern1 = r'    // Старый монолитный метод.*?\n    async init_DEPRECATED\(.*?\n    \}\n'
replacement1 = '    // ✅ УДАЛЕНО: init_DEPRECATED() - заменено на MVP архитектуру\n\n'
content = re.sub(pattern1, replacement1, content, flags=re.DOTALL)

# 2. Удаляем loadPrices (строки ~259-236)
pattern2 = r'    // Загрузка цен\n    async loadPrices\(\).*?\n    \}\n'
replacement2 = '    // ✅ УДАЛЕНО: loadPrices() - цены загружаются через CanopyModel\n\n'
content = re.sub(pattern2, replacement2, content, flags=re.DOTALL)

# 3. Удаляем renderForm + bindFormEvents + updateParam (большой блок ~240-486)
pattern3 = r'    // Создание формы\n    renderForm\(\).*?    \}\n\n    // Инициализация спецификации'
replacement3 = '    // ✅ УДАЛЕНО: renderForm(), bindFormEvents(), updateParam() - управляется через CanopyView\n\n    // Инициализация спецификации'
content = re.sub(pattern3, replacement3, content, flags=re.DOTALL)

# 4. Удаляем initSpecification
pattern4 = r'    // Инициализация спецификации\n    initSpecification\(\).*?\n    \}\n'
replacement4 = '    // ✅ УДАЛЕНО: initSpecification() - управляется через CanopyView\n\n'
content = re.sub(pattern4, replacement4, content, flags=re.DOTALL)

# 5. Удаляем getSelectedRadioValue
pattern5 = r'    // Получение выбранного значения радиокнопки.*?\n    getSelectedRadioValue\(.*?\n    \}\n'
replacement5 = '    // ✅ УДАЛЕНО: getSelectedRadioValue() - параметры управляются через CanopyView\n\n'
content = re.sub(pattern5, replacement5, content, flags=re.DOTALL)

# Записываем обратно
with open('naves-calc/assets/js/mvp/Canopy3DRenderer.js', 'w', encoding='utf-8') as f:
    f.write(content)

new_length = len(content)
removed = original_length - new_length

print(f"✅ Очистка Canopy3DRenderer.js завершена!")
print(f"   Было символов: {original_length}")
print(f"   Стало символов: {new_length}")
print(f"   Удалено: {removed} символов")
print(f"   Удалено методов: 5 (init_DEPRECATED, loadPrices, renderForm, bindFormEvents, updateParam, initSpecification, getSelectedRadioValue)")

