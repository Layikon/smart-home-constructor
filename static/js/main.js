// static/js/main.js
import { initScene } from './scene_setup.js';
import { RoomManager } from './room_manager.js';
import { initUI } from './ui_manager.js';
import { initSensorPlacement } from './sensors.js';
import { ProjectManager } from './project_manager.js';
import { Simulator } from './simulator.js';
import { initLabelRenderer } from './labels.js';

// 1. Ініціалізація базової сцени
const { scene, camera, renderer, controls, draggableObjects, onWindowResize } = initScene('viewport');
const container = document.getElementById('viewport');

// 2. Рендерер для 2D написів (розміри стін, назви датчиків)
const labelRenderer = initLabelRenderer(container);

// 3. Ініціалізація менеджерів
const roomManager = new RoomManager(scene, camera, renderer);
const simulator = new Simulator(scene);

// ДОДАЄМО ОБ'ЄКТИ КІМНАТИ В МАСИВ ВЗАЄМОДІЇ
// Це дозволяє ставити датчики на стіни/підлогу та бачити ручки розтягування
draggableObjects.push(roomManager.floor, roomManager.wallMesh);
if (roomManager.handles) {
    Object.values(roomManager.handles).forEach(handle => draggableObjects.push(handle));
}

let selectedSensorConfig = null;
const onSensorSelect = (config) => {
    selectedSensorConfig = config;
};

// 4. Ініціалізація UI та системи розміщення
const uiManager = initUI(scene, camera, controls, onSensorSelect);

initSensorPlacement(
    container,
    scene,
    camera,
    draggableObjects,
    () => selectedSensorConfig
);

// 5. Менеджер проєктів
const projectManager = new ProjectManager(scene, roomManager, uiManager, draggableObjects);

// --- ГЛОБАЛЬНІ ФУНКЦІЇ ДЛЯ INTERFACE ---

window.saveProject = () => projectManager.saveProject('save-project-btn');

window.toggleSimulation = (btn) => {
    const isActive = btn.classList.contains('active');

    // Перемикаємо стан симулятора
    simulator.toggle(!isActive);
    // Вимикаємо редагування кімнати під час симуляції
    roomManager.setEditorMode(isActive);

    if (!isActive) {
        btn.classList.add('active', 'bg-orange-500', 'text-white');
        btn.innerHTML = '<i class="fa-solid fa-stop"></i> Стоп';
        if (window.setPlacementMode) window.setPlacementMode(false);
    } else {
        btn.classList.remove('active', 'bg-orange-500', 'text-white');
        btn.innerHTML = '<i class="fa-solid fa-play"></i> Симуляція';
    }
};

window.setMode = (mode) => {
    const isEditRoom = (mode === 'room');
    roomManager.setEditorMode(isEditRoom);

    // Якщо вибрано режим кімнати - вимикаємо режим встановлення датчиків
    if (isEditRoom && window.setPlacementMode) {
        window.setPlacementMode(false);
    }

    // Оновлюємо статус в UI (якщо потрібно)
    const statusText = document.getElementById('status-text');
    if (statusText) statusText.textContent = isEditRoom ? "Room Edit" : "Select Mode";
};

// 6. ГОЛОВНИЙ ЦИКЛ АНІМАЦІЇ
function animate() {
    requestAnimationFrame(animate);

    // Плавний рух камери до об'єктів
    if (uiManager?.updateCamera) uiManager.updateCamera(0.05);

    // Робота симулятора зв'язків
    if (simulator.isActive) simulator.update();

    controls.update();
    renderer.render(scene, camera);

    // ВАЖЛИВО: рендер 2D шару (метри та підписи)
    if (labelRenderer) labelRenderer.render(scene, camera);
}

// 7. ОБРОБНИКИ ПОДІЙ
window.addEventListener('resize', () => {
    onWindowResize();
    labelRenderer?.setSize(container.clientWidth, container.clientHeight);
});

document.addEventListener('DOMContentLoaded', () => {
    // Завантаження збереженого проєкту з бази даних
    projectManager.loadLastProject();

    // Початковий режим — вибір
    window.setMode('select');
});

animate();