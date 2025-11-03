# Инструкция по загрузке Three.js

## Для полной автономности проекта необходимо скачать:

1. **Three.js (минифицированная версия)**
   - URL: https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js
   - Сохранить как: `three.module.min.js`

2. **OrbitControls**
   - URL: https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js
   - Сохранить как: `OrbitControls.js`

## Команды для загрузки (Windows PowerShell):

```powershell
cd assets/libs/three

# Скачать Three.js
Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js" -OutFile "three.module.min.js"

# Скачать OrbitControls
Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js" -OutFile "OrbitControls.js"
```

## После скачивания:

1. Убедитесь, что файлы находятся в папке `naves-calc/assets/libs/three/`
2. Обновите index.html, заменив CDN ссылки на локальные:

```html
<!-- Было: -->
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
  }
}
</script>

<!-- Стало: -->
<script type="importmap">
{
  "imports": {
    "three": "./assets/libs/three/three.module.min.js",
    "three/addons/": "./assets/libs/three/"
  }
}
</script>
```

## Проверка работы:

Откройте консоль браузера (F12) и убедитесь, что нет ошибок загрузки модулей.

