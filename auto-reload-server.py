#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Локальный сервер с автоматической перезагрузкой страницы
при изменении файлов .html, .js, .css
"""

import http.server
import socketserver
import os
import time
import threading
from pathlib import Path
from datetime import datetime

PORT = 8000
WATCH_EXTENSIONS = ['.html', '.js', '.css', '.json']
CHECK_INTERVAL = 1  # секунды

class ReloadHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP обработчик с инъекцией скрипта автоперезагрузки"""
    
    def end_headers(self):
        # Отключаем кэширование
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()
    
    def do_GET(self):
        # Если это HTML файл, добавляем скрипт автоперезагрузки
        if self.path.endswith('.html') or self.path == '/' or '/naves-calc' in self.path:
            try:
                # Читаем оригинальный файл
                file_path = self.translate_path(self.path)
                if os.path.isdir(file_path):
                    file_path = os.path.join(file_path, 'index.html')
                
                if os.path.exists(file_path):
                    with open(file_path, 'rb') as f:
                        content = f.read()
                    
                    # Инъекция скрипта автоперезагрузки
                    reload_script = b"""
<script>
(function() {
    let lastCheck = Date.now();
    console.log('%c[AUTO-RELOAD] %cАктивирована автоматическая перезагрузка', 'color: #4CAF50; font-weight: bold', 'color: #666');
    
    setInterval(function() {
        fetch('/__reload_check__?t=' + Date.now())
            .then(r => r.text())
            .then(serverTime => {
                if (lastCheck && parseInt(serverTime) > lastCheck) {
                    console.log('%c[AUTO-RELOAD] %cОбнаружены изменения, перезагружаю...', 'color: #FF9800; font-weight: bold', 'color: #666');
                    location.reload();
                }
                lastCheck = Date.now();
            })
            .catch(() => {});
    }, 1000);
})();
</script>
</body>
"""
                    # Заменяем закрывающий тег body
                    if b'</body>' in content:
                        content = content.replace(b'</body>', reload_script)
                    else:
                        content += reload_script
                    
                    self.send_response(200)
                    self.send_header('Content-type', 'text/html; charset=utf-8')
                    self.send_header('Content-Length', len(content))
                    self.end_headers()
                    self.wfile.write(content)
                    return
            except:
                pass
        
        # Обработка проверки изменений
        if '/__reload_check__' in self.path:
            self.send_response(200)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            self.wfile.write(str(int(file_monitor.last_change_time)).encode())
            return
        
        # Для всех остальных файлов - стандартная обработка
        super().do_GET()

class FileMonitor:
    """Мониторинг изменений файлов"""
    
    def __init__(self, watch_dir, extensions):
        self.watch_dir = Path(watch_dir)
        self.extensions = extensions
        self.last_change_time = time.time()
        self.file_times = {}
        self._scan_files()
    
    def _scan_files(self):
        """Сканирует все файлы и запоминает время изменения"""
        for ext in self.extensions:
            for file_path in self.watch_dir.rglob(f'*{ext}'):
                try:
                    self.file_times[str(file_path)] = file_path.stat().st_mtime
                except:
                    pass
    
    def check_changes(self):
        """Проверяет изменения в файлах"""
        changed = False
        for ext in self.extensions:
            for file_path in self.watch_dir.rglob(f'*{ext}'):
                try:
                    file_str = str(file_path)
                    current_mtime = file_path.stat().st_mtime
                    
                    if file_str not in self.file_times:
                        # Новый файл
                        print(f"[{datetime.now().strftime('%H:%M:%S')}] ➕ Новый: {file_path.name}")
                        self.file_times[file_str] = current_mtime
                        changed = True
                    elif self.file_times[file_str] < current_mtime:
                        # Файл изменён
                        print(f"[{datetime.now().strftime('%H:%M:%S')}] 🔄 Изменён: {file_path.name}")
                        self.file_times[file_str] = current_mtime
                        changed = True
                except:
                    pass
        
        if changed:
            self.last_change_time = time.time()
        
        return changed
    
    def start_monitoring(self):
        """Запускает мониторинг в отдельном потоке"""
        def monitor_loop():
            print(f"\n👁️  Мониторинг файлов: {', '.join(self.extensions)}")
            print("=" * 60)
            while True:
                self.check_changes()
                time.sleep(CHECK_INTERVAL)
        
        thread = threading.Thread(target=monitor_loop, daemon=True)
        thread.start()

# Глобальный монитор файлов
file_monitor = FileMonitor('.', WATCH_EXTENSIONS)

def main():
    """Запуск сервера"""
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    print("=" * 60)
    print("  🚀 ЛОКАЛЬНЫЙ СЕРВЕР С АВТОПЕРЕЗАГРУЗКОЙ")
    print("=" * 60)
    print(f"\n📂 Директория: {os.getcwd()}")
    print(f"🌐 URL: http://localhost:{PORT}/naves-calc/")
    print(f"⚡ Порт: {PORT}")
    print(f"\n💡 Страница будет автоматически перезагружаться при изменении файлов")
    print(f"   Отслеживаются: {', '.join(WATCH_EXTENSIONS)}")
    print(f"\n🛑 Для остановки нажмите Ctrl+C")
    print("=" * 60)
    
    # Запускаем мониторинг файлов
    file_monitor.start_monitoring()
    
    # Запускаем HTTP сервер
    with socketserver.TCPServer(("", PORT), ReloadHandler) as httpd:
        try:
            # Открываем браузер
            import webbrowser
            webbrowser.open(f'http://localhost:{PORT}/naves-calc/')
            
            print(f"\n✅ Сервер запущен! Браузер должен открыться автоматически\n")
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n🛑 Сервер остановлен")

if __name__ == '__main__':
    main()


