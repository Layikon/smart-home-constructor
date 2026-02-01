// static/js/main.js
import { initScene } from './scene_setup.js';
import { RoomManager } from './room_manager.js';
import { initUI } from './ui_manager.js';
import { initSensorPlacement } from './sensors.js';
import { ProjectManager } from './project_manager.js';
import { Simulator } from './simulator.js';
import { initLabelRenderer } from './labels.js';
import { initAdminTool } from './admin_tool.js';

// 1. Ініціалізація базової сцени
const { scene, camera, renderer, controls, draggableObjects, onWindowResize } = initScene('viewport');
const container = document.getElementById('viewport');

// ВАЖЛИВО: Робимо контрол глобальним для блокування камери при розтягуванні
window.controls = controls;

// 2. Рендерер для 2D написів
const labelRenderer = initLabelRenderer(container);

// 3. Ініціалізація менеджерів
const roomManager = new RoomManager(scene, camera, renderer);
const simulator = new Simulator(scene);

// Додаємо об'єкти кімнати в масив взаємодії
draggableObjects.push(roomManager.floor, roomManager.wallMesh);
if (roomManager.handles) {
    Object.values(roomManager.handles).forEach(handle => draggableObjects.push(handle));
}

let selectedSensorConfig = null;
const onSensorSelect = (config) => {
    selectedSensorConfig = config;
};

// 4. Ініціалізація UI, системи розміщення та адмін-панелі
const uiManager = initUI(scene, camera, controls, onSensorSelect);
initAdminTool();

initSensorPlacement(
    container,
    scene,
    camera,
    draggableObjects,
    () => selectedSensorConfig
);

// 5. Менеджер проєктів
const projectManager = new ProjectManager(scene, roomManager, uiManager, draggableObjects);

// --- ГЛОБАЛЬНІ ФУНКЦІЇ ---

window.saveProject = () => projectManager.saveProject('save-project-btn');

window.toggleSimulation = (btn) => {
    const isCurrentlyActive = btn.classList.contains('active');
    const newState = !isCurrentlyActive;

    simulator.toggle(newState);
    roomManager.setEditorMode(!newState);

    if (newState) {
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

    // Вмикаємо/вимикаємо ручки
    roomManager.setEditorMode(isEditRoom);

    if (isEditRoom && window.setPlacementMode) {
        window.setPlacementMode(false);
    }

    // Оновлюємо статус в UI
    const statusText = document.getElementById('status-text');
    if (statusText) statusText.textContent = isEditRoom ? "Конструктор приміщення" : "Режим вибору";
};

// 6. ГОЛОВНИЙ ЦИКЛ АНІМАЦІЇ
function animate() {
    requestAnimationFrame(animate);

    if (uiManager?.updateCamera) uiManager.updateCamera(0.05);
    if (simulator.isActive) simulator.update();

    controls.update();
    renderer.render(scene, camera);

    if (labelRenderer) labelRenderer.render(scene, camera);
}

// 7. ОБРОБНИКИ ПОДІЙ
window.addEventListener('resize', () => {
    onWindowResize();
    labelRenderer?.setSize(container.clientWidth, container.clientHeight);
});

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Завантажуємо проєкт
    await projectManager.loadLastProject();

    // 2. ПРИМУСОВО ОНОВЛЮЄМО КІМНАТУ (щоб з'явилися метри/розміри стін відразу)
    roomManager.updateRoom();
    roomManager.syncUI();

    // 3. Встановлюємо початковий режим
    // Якщо хочеш, щоб ручки були відразу — став 'room', якщо ні — 'select'
    window.setMode('select');
});

animate();