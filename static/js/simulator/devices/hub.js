import { BaseDevice } from './BaseDevice.js';
export class Hub extends BaseDevice {
    update(time) {
        this.mesh.userData.simulatedData = { devices: 5, status: "Online", upload: "100 Mbps" };
    }
}