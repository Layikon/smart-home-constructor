// static/js/main.js
import { initScene } from './scene_setup.js';
import { RoomManager } from './room_manager.js';
import { initUI } from './ui_manager.js';
import { initSensorPlacement } from './sensors.js';
import { ProjectManager } from './project_manager.js';
// Зверни увагу на шлях: тепер ми беремо симулятор з папки simulator
import { Simulator } from './simulator/simulator.js';
import { initLabelRenderer } from './labels.js';
import { initAdminTool } from './admin_tool.js';

// 1. Ініціалізація сцени
const { scene, camera, renderer, controls, draggableObjects, onWindowResize } = initScene('viewport');
const container = document.getElementById('viewport');
window.controls = controls;

// 2. Ініціалізація менеджерів
const labelRenderer = initLabelRenderer(container);
const roomManager = new RoomManager(scene, camera, renderer);
const simulator = new Simulator(scene);

// Додаємо об'єкти кімнати до перетягування
draggableObjects.push(roomManager.floor, roomManager.wallMesh);
if (roomManager.handles) Object.values(roomManager.handles).forEach(h => draggableObjects.push(h));

// 3. UI та Інструменти
let selectedSensorConfig = null;
const uiManager = initUI(scene, camera, controls, (config) => { selectedSensorConfig = config; });

initAdminTool();
initSensorPlacement(container, scene, camera, draggableObjects, () => selectedSensorConfig);

const projectManager = new ProjectManager(scene, roomManager, uiManager, draggableObjects);

// 4. Логіка перемикання режимів
window.setMode = (mode) => {
    const isEditRoom = (mode === 'room');

    // Якщо включаємо редактор кімнати, вимикаємо симуляцію
    if (isEditRoom && simulator.isActive) {
        const simBtn = document.getElementById('mode-simulate');
        if (simBtn) window.toggleSimulation(simBtn);
    }

    roomManager.setEditorMode(isEditRoom);

    // Вимикаємо розміщення датчиків
    if (isEditRoom && window.setPlacementMode) {
        window.setPlacementMode(false);
    }
};

window.toggleSimulation = (btn) => {
    if (!btn) return;
    const isActive = btn.classList.contains('active');
    const newState = !isActive;

    if (newState) {
        // Старт симуляції
        roomManager.setEditorMode(false);
        if (window.setPlacementMode) window.setPlacementMode(false);

        btn.classList.add('active', 'bg-orange-500', 'text-white');
        btn.innerHTML = '<i class="fa-solid fa-stop"></i> Стоп';
    } else {
        // Стоп симуляції
        btn.classList.remove('active', 'bg-orange-500', 'text-white');
        btn.innerHTML = '<i class="fa-solid fa-play"></i> Симуляція';
    }

    simulator.toggle(newState);
};

// 5. Головний цикл анімації
function animate() {
    requestAnimationFrame(animate);

    // Оновлення камер та контролів
    if (uiManager && uiManager.updateCamera) uiManager.updateCamera(0.05);
    controls.update();

    // Оновлення симуляції (лінії зв'язку)
    if (simulator && simulator.isActive) {
        simulator.update();
    }

    renderer.render(scene, camera);
    if (labelRenderer && typeof labelRenderer.render === 'function') {
        labelRenderer.render(scene, camera);
    }
}

// 6. Завантаження проекту при старті
document.addEventListener('DOMContentLoaded', async () => {
    await projectManager.loadLastProject();
    roomManager.updateRoom();
    // За замовчуванням режим вибору
    window.setMode('select');
});

animate();