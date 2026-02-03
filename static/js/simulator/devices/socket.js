import { BaseDevice } from './BaseDevice.js';
export class Socket extends BaseDevice {
    update(time) {
        this.mesh.userData.simulatedData = { power: (Math.random() * 100).toFixed(1) + " W", state: "ON" };
    }
}