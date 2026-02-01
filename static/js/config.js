// static/js/config.js

// Словник моделей за замовчуванням (якщо в JSON не вказано model_path)
export const DEFAULT_MODELS = {
    'temp': 'temp_sensor.glb',
    'hum': 'hum_sensor.glb',
    'temp/hum': 'temp_sensor.glb',
    'motion': 'motion_sensor.glb',
    'smoke': 'motion_sensor.glb',
    'door': 'door_sensor.glb',
    'window': 'door_sensor.glb',
    'socket': 'socket.glb',
    'power': 'socket.glb',
    'switch': 'socket.glb',
    'camera': 'camera.glb',
    'hub': 'hub.glb',
    'router': 'hub.glb' // Поки немає окремої моделі роутера, використовуємо модель хаба
};

// Налаштування протоколів зв'язку
export const PROTOCOLS = {
    DIRECT: ['wifi', 'matter'], // Можуть працювати через Роутер або Хмару
    BRIDGE: ['zigbee', 'sub1g', 'bluetooth'], // Працюють виключно через Хаб

    RANGE_MAX: 15,       // Максимальна дальність для Zigbee/Bluetooth (метрів)
    RANGE_WIFI: 30,      // Максимальна дальність для Wi-Fi (метрів)

    WALL_ATTENUATION: 0.25 // Ослаблення сигналу за одну стіну (25%)
};

// Кольори для візуалізації зв'язків
export const COLORS = {
    WIFI_LINE: 0x22c55e,    // Зелений (Зв'язок з Роутером або Хмарою)
    HUB_LINE: 0x3b82f6,     // Синій (Зв'язок з Хабом)
    OFFLINE_RING: 0xef4444  // Червоний (Немає сигналу)
};