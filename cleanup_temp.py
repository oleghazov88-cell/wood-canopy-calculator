#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Временный скрипт для очистки кода"""

# Удаление initOrderFunctions_DEPRECATED из index.html
with open('naves-calc/index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Удаляем строки 1865-2144 (280 строк)
new_lines = (
    lines[:1864] +
    ['        // УДАЛЕНО: initOrderFunctions_DEPRECATED()\n',
     '        // Все функции управляются через MVP архитектуру в app.js\n',
     '        \n'] +
    lines[2144:]
)

with open('naves-calc/index.html', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"✅ Удалено {2144 - 1864} строк из index.html")
print(f"   Было строк: {len(lines)}")
print(f"   Стало строк: {len(new_lines)}")


