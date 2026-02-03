import { BaseDevice } from './BaseDevice.js';
export class Opening extends BaseDevice {
    update(time) {
        // Симуляція відкриття/закриття
        const isOpen = Math.sin(time * 0.2) > 0.8;
        this.mesh.userData.simulatedData = { state: isOpen ? "Open" : "Closed" };
    }
}