import { BaseDevice } from './BaseDevice.js';
export class Pressure extends BaseDevice {
    update(time) {
        this.mesh.userData.simulatedData = { pressure: (1013 + Math.sin(time)*2).toFixed(0) + " hPa" };
    }
}