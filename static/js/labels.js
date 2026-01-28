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

export function addSensorLabel(sensorMesh, text) {
    if (!window.THREE.CSS2DObject) return;

    const div = document.createElement('div');
    div.className = 'floating-label';
    div.textContent = text;

    // ТРЮК: Додаємо відступ прямо в стилі елемента,
    // щоб він "ріс" від точки прив'язки вгору.
    div.style.marginTop = '-40px'; // Піднімаємо сам текст вгору відносно точки прив'язки

    const label = new window.THREE.CSS2DObject(div);

    // ВАЖЛИВО: Ставимо точку прив'язки в ЦЕНТР датчика (0, 0, 0).
    // Тоді при віддаленні камери напис буде "зумитись" в цю точку,
    // а не відлітати вгору.
    label.position.set(0, 0, 0);

    sensorMesh.add(label);
}