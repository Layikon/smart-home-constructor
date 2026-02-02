import { initScene } from './scene_setup.js';
import { RoomManager } from './room_manager.js';
import { initUI } from './ui_manager.js';
import { initSensorPlacement } from './sensors.js';
import { ProjectManager } from './project_manager.js';
import { Simulator } from './simulator.js'; // Перевір шлях, якщо переніс у папку
import { initLabelRenderer } from './labels.js';
import { initAdminTool } from './admin_tool.js';

const { scene, camera, renderer, controls, draggableObjects, onWindowResize } = initScene('viewport');
const container = document.getElementById('viewport');
window.controls = controls;

const labelRenderer = initLabelRenderer(container);
const roomManager = new RoomManager(scene, camera, renderer);
const simulator = new Simulator(scene);

// ... (код ініціалізації draggableObjects) ...
draggableObjects.push(roomManager.floor, roomManager.wallMesh);
if (roomManager.handles) Object.values(roomManager.handles).forEach(h => draggableObjects.push(h));

let selectedSensorConfig = null;
const uiManager = initUI(scene, camera, controls, (config) => { selectedSensorConfig = config; });
initAdminTool();
initSensorPlacement(container, scene, camera, draggableObjects, () => selectedSensorConfig);
const projectManager = new ProjectManager(scene, roomManager, uiManager, draggableObjects);

// --- ЛОГІКА КНОПОК ---
window.setMode = (mode) => {
    const isEditRoom = (mode === 'room');
    if (isEditRoom && simulator.isActive) window.toggleSimulation(document.getElementById('mode-simulate'));
    roomManager.setEditorMode(isEditRoom);
    if (isEditRoom && window.setPlacementMode) window.setPlacementMode(false);
};

window.toggleSimulation = (btn) => {
    const isActive = btn.classList.contains('active');
    const newState = !isActive;

    if (newState) {
        roomManager.setEditorMode(false);
        btn.classList.add('active', 'bg-orange-500', 'text-white');
        btn.innerHTML = '<i class="fa-solid fa-stop"></i> Стоп';
    } else {
        btn.classList.remove('active', 'bg-orange-500', 'text-white');
        btn.innerHTML = '<i class="fa-solid fa-play"></i> Симуляція';
    }

    // ВАЖЛИВО: Виклик методу класу Simulator
    simulator.toggle(newState);
};

// --- ГОЛОВНИЙ ЦИКЛ ---
function animate() {
    requestAnimationFrame(animate);

    if (uiManager?.updateCamera) uiManager.updateCamera(0.05);

    // ВАЖЛИВО: Оновлення анімації ліній
    if (simulator.isActive) simulator.update();

    controls.update();
    renderer.render(scene, camera);
    if (labelRenderer) labelRenderer.render(scene, camera);
}

document.addEventListener('DOMContentLoaded', async () => {
    await projectManager.loadLastProject();
    roomManager.updateRoom();
    window.setMode('select');
});

animate();