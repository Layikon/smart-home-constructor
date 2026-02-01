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
    'hub': 'hub.glb'
};

// Налаштування протоколів зв'язку
export const PROTOCOLS = {
    DIRECT: ['wifi', 'matter'], // Працюють самі по собі
    BRIDGE: ['zigbee', 'sub1g', 'bluetooth'], // Шукають хаб
    RANGE_MAX: 15, // Максимальна дальність зв'язку (метрів)
    WALL_ATTENUATION: 0.25 // Ослаблення сигналу за одну стіну (25%)
};

// Кольори для візуалізації
export const COLORS = {
    WIFI_LINE: 0x22c55e, // Зелений
    HUB_LINE: 0x3b82f6,  // Синій
    OFFLINE_RING: 0xef4444 // Червоний
};