@echo off
chcp 65001 >nul
echo ============================================
echo   🚀 ЗАПУСК СЕРВЕРА С АВТОПЕРЕЗАГРУЗКОЙ
echo ============================================
echo.

REM Проверяем наличие Python
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Python найден
    echo.
    echo 📂 Запускаю сервер с автоперезагрузкой...
    echo 🌐 URL: http://localhost:8000/naves-calc/
    echo.
    echo 💡 Страница будет автоматически перезагружаться
    echo    при изменении .html, .js, .css файлов
    echo.
    echo 🛑 Для остановки нажмите Ctrl+C
    echo ============================================
    echo.
    cd /d "%~dp0"
    python auto-reload-server.py
) else (
    echo ❌ Python не найден!
    echo.
    echo 📥 Установите Python: https://www.python.org/downloads/
    echo    ИЛИ используйте Live Server в VS Code
    echo.
    pause
)

