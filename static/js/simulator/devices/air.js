import { BaseDevice } from './BaseDevice.js';
export class Air extends BaseDevice {
    update(time) {
        this.mesh.userData.simulatedData = { co2: (420 + Math.random() * 10).toFixed(0), aqi: "Good" };
    }
}