// static/js/main.js

import { initScene } from './scene_setup.js';
import { RoomManager } from './room_manager.js';
import { initUI } from './ui_manager.js';
import { initSensorPlacement } from './sensors.js';
import { ProjectManager } from './project_manager.js';
import { Simulator } from './simulator.js';

// 1. Ініціалізація базової сцени (в'юпорт, камера, рендерер)
const { scene, camera, renderer, controls, draggableObjects, onWindowResize } = initScene('viewport');

// 2. Ініціалізація менеджерів
const roomManager = new RoomManager(scene, camera, renderer);
const simulator = new Simulator(scene);

// Перемінна для зберігання конфігурації обраного датчика
let selectedSensorConfig = null;

// Функція-колбек для UI: коли користувач обирає датчик у меню
const onSensorSelect = (config) => {
    selectedSensorConfig = config;
};

// 3. Ініціалізація інтерфейсу (Sidebar, список об'єктів, камери)
const uiManager = initUI(scene, camera, controls, onSensorSelect);

// 4. Ініціалізація системи розміщення датчиків
initSensorPlacement(
    renderer.domElement,
    scene,
    camera,
    draggableObjects,
    () => selectedSensorConfig // Передаємо функцію, яка повертає актуальний конфіг
);

// 5. Менеджер проєктів (Збереження/Завантаження)
const projectManager = new ProjectManager(scene, roomManager, uiManager, draggableObjects);

// --- ГЛОБАЛЬНІ ФУНКЦІЇ ДЛЯ КНОПОК В HTML ---

// Збереження проєкту (викликається з editor.html)
window.saveProject = () => projectManager.saveProject('save-project-btn');

// Перемикання режиму симуляції
window.toggleSimulation = (btn) => {
    const isActive = btn.classList.contains('active');
    if (!isActive) {
        btn.classList.add('active', 'bg-orange-500', 'text-white');
        btn.innerHTML = '<i class="fa-solid fa-stop"></i> Стоп';
        simulator.toggle(true);
    } else {
        btn.classList.remove('active', 'bg-orange-500', 'text-white');
        btn.innerHTML = '<i class="fa-solid fa-play"></i> Симуляція';
        simulator.toggle(false);
    }
};

// Зміна режиму редактора (стіни/датчики)
window.setMode = (mode) => {
    const isEditRoom = (mode === 'room');
    roomManager.setEditorMode(isEditRoom);

    // Якщо перейшли в режим кімнати - вимикаємо розміщення датчиків
    if (isEditRoom && window.setPlacementMode) {
        window.setPlacementMode(false);
    }
};

// 6. ГОЛОВНИЙ ЦИКЛ АНІМАЦІЇ
function animate() {
    requestAnimationFrame(animate);

    // Оновлення плавного руху камери (якщо вибрали об'єкт у списку)
    if (uiManager && uiManager.updateCamera) {
        uiManager.updateCamera(0.05);
    }

    // Оновлення фізики симуляції (лінії зв'язку, анімація)
    if (simulator) {
        simulator.update();
    }

    controls.update();
    renderer.render(scene, camera);
}

// 7. ОБРОБКА ПОДІЙ
window.addEventListener('resize', onWindowResize);

// Автоматичне завантаження проєкту, якщо в URL є ID
document.addEventListener('DOMContentLoaded', () => {
    projectManager.loadLastProject();

    // Початковий режим - вибір (стрілочка)
    window.setMode('select');
});

// Запуск
animate();

console.log("Smart Home Builder: System initialized.");