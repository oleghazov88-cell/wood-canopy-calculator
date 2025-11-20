# -*- coding: utf-8 -*-
"""Удаление debug-layout из index.html"""

# Читаем файл
with open('naves-calc/index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Находим начало и конец блока debug-layout
start_idx = None
end_idx = None

for i, line in enumerate(lines):
    if '<!-- ОТЛАДОЧНЫЙ МАКЕТ ДЛЯ РАЗРАБОТКИ -->' in line:
        start_idx = i
    if '<!-- ОРИГИНАЛЬНЫЙ МАКЕТ -->' in line:
        end_idx = i
        break

if start_idx is not None and end_idx is not None:
    # Создаем новый файл без отладочного блока
    new_lines = (
        lines[:start_idx] + 
        ['    <!-- ✅ УДАЛЕНО: Отладочный макет (debug-layout) -->\n', '\n'] +
        lines[end_idx:]
    )
    
    # Записываем
    with open('naves-calc/index.html', 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    
    removed = end_idx - start_idx
    print(f"OK: Удалено {removed} строк debug-layout")
    print(f"   Было строк: {len(lines)}")
    print(f"   Стало строк: {len(new_lines)}")
else:
    print("ERROR: Не найдены границы блока")

