import { BaseDevice } from './BaseDevice.js';
export class Temperature extends BaseDevice {
    constructor(mesh, scene) { super(mesh, scene); this.baseVal = 22; }
    update(time) {
        const t = this.baseVal + Math.sin(time * 0.1) * 0.5;
        this.mesh.userData.simulatedData = { temp: t.toFixed(1), humidity: (45 + Math.cos(time * 0.1)*2).toFixed(0) };
    }
}