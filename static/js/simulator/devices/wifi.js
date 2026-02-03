import { BaseDevice } from './BaseDevice.js';
export class Wifi extends BaseDevice {
    update(time) {
        this.mesh.userData.simulatedData = { devices: 5, status: "Online", upload: "100 Mbps" };
    }
}