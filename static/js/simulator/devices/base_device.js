export class BaseDevice {
    constructor(mesh, scene) {
        this.mesh = mesh;
        this.scene = scene;
        // Базова структура даних, яку ми будемо наповнювати
        this.data = {
            value: 0,
            status: 'ok',
            lastUpdate: Date.now()
        };
    }

    update(time) {
        // Цей метод буде перезаписаний у конкретних датчиках
    }

    onStop() {
        // Метод для очистки (якщо треба вимкнути анімацію)
    }
}