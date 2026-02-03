import { BaseDevice } from './BaseDevice.js';
export class Humidity extends BaseDevice {
    update(time) {
        this.mesh.userData.simulatedData = { humidity: (50 + Math.sin(time * 0.2) * 5).toFixed(0) };
    }
}