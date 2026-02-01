// static/js/main.js
import { setupScene } from './viewer.js';
import { createRoom, drawDimensions } from './objects.js';

// 1. Отримуємо контейнер для рендеру
const container = document.getElementById('viewport');
const uiOverlay = document.getElementById('ui-overlay');

// 2. Налаштовуємо сцену (камера зверху, світло, сітка)
const { scene, camera, renderer, controls } = setupScene(container);

// 3. Створюємо початкову кімнату (наприклад, 6 на 4 метри)
// У майбутньому ми зможемо викликати цю функцію при натисканні на кнопку "+"
let mainRoom = createRoom(scene, 6, 4);

// 4. Головний цикл анімації
function animate() {
    requestAnimationFrame(animate);

    // Оновлюємо контролери (OrbitControls)
    controls.update();

    // Оновлюємо відображення розмірів (см) поверх 3D об'єкта
    if (mainRoom) {
        drawDimensions(uiOverlay, mainRoom, camera, container);
    }

    // Малюємо сцену
    renderer.render(scene, camera);
}

// 5. Обробка зміни розміру вікна браузера
window.addEventListener('resize', () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    const aspect = width / height;

    // Оновлюємо параметри ортографічної камери
    const d = 5;
    camera.left = -d * aspect;
    camera.right = d * aspect;
    camera.top = d;
    camera.bottom = -d;

    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
});

// 6. Додаємо обробник для кнопки "Додати кімнату" (якщо потрібно створити нову)
const addRoomBtn = document.getElementById('add-room');
if (addRoomBtn) {
    addRoomBtn.addEventListener('click', () => {
        // Логіка створення ще однієї кімнати
        console.log("Додаємо нову кімнату...");
        const newRoom = createRoom(scene, 3, 3);
        // Можна додати логіку вибору кімнати для редагування
    });
}

// Запускаємо рендер
animate();

console.log("Smart Home Editor: Main module loaded.");