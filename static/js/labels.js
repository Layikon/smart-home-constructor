// static/js/labels.js

export function initLabelRenderer(container) {
    if (!window.THREE.CSS2DRenderer) {
        console.error("CSS2DRenderer не знайдено!");
        return null;
    }

    const labelRenderer = new window.THREE.CSS2DRenderer();
    labelRenderer.setSize(container.clientWidth, container.clientHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    labelRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(labelRenderer.domElement);
    return labelRenderer;
}

export function updateSensorLabel(sensorMesh, div) {
    const isOn = sensorMesh.userData.isOn !== false; // За замовчуванням true

    // Отримуємо існуючі елементи всередині контейнера
    let statusTag = div.querySelector('.status-tag');
    let infoTag = div.querySelector('.info-tag');

    // Створюємо плашку статусу, якщо її ще немає (світить завжди)
    if (!statusTag) {
        statusTag = document.createElement('div');
        statusTag.className = 'status-tag';
        div.appendChild(statusTag);
    }

    // Створюємо плашку інфо, якщо її ще немає (ховається/показується через CSS)
    if (!infoTag) {
        infoTag = document.createElement('div');
        infoTag.className = 'info-tag';
        infoTag.style = "display: none; background: rgba(15, 23, 42, 0.9); color: white; font-size: 8px; padding: 2px 6px; border-radius: 4px; margin-top: 4px; border: 1px solid rgba(255,255,255,0.1); white-space: nowrap;";
        div.appendChild(infoTag);
    }

    // Оновлюємо візуал ON/OFF
    if (isOn) {
        statusTag.style = "background:#10b981; color:white; font-size:9px; padding:2px 6px; border-radius:10px; font-weight:900; box-shadow:0 2px 4px rgba(0,0,0,0.2); border:1px solid #34d399;";
        statusTag.innerText = 'ON';
    } else {
        statusTag.style = "background:#ef4444; color:white; font-size:9px; padding:2px 6px; border-radius:10px; font-weight:900; box-shadow:0 2px 4px rgba(0,0,0,0.2); border:1px solid #f87171;";
        statusTag.innerText = 'OFF';
    }

    // Оновлюємо дані бренду/моделі
    const brand = sensorMesh.userData.brand || sensorMesh.userData.manufacturer || "Generic";
    const model = sensorMesh.userData.model || "Device";
    infoTag.innerText = `${brand} | ${model}`;
}

export function addSensorLabel(sensorMesh, text) {
    if (!window.THREE.CSS2DObject) return;

    const div = document.createElement('div');
    div.className = 'floating-label';
    div.style.marginTop = '-40px';
    div.style.display = 'flex';
    div.style.flexDirection = 'column';
    div.style.alignItems = 'center';
    div.style.pointerEvents = 'auto'; // Дозволяємо взаємодію для hover

    // Зберігаємо посилання для оновлення
    sensorMesh.userData.labelElement = div;

    // Первинне заповнення
    updateSensorLabel(sensorMesh, div);

    // Додаємо логіку наведення прямо на div
    div.addEventListener('mouseenter', () => {
        const info = div.querySelector('.info-tag');
        if (info) info.style.display = 'block';
    });
    div.addEventListener('mouseleave', () => {
        const info = div.querySelector('.info-tag');
        if (info) info.style.display = 'none';
    });

    const label = new window.THREE.CSS2DObject(div);
    label.position.set(0, 0, 0);
    sensorMesh.add(label);
}