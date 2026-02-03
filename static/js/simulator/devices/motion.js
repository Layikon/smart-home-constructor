import { BaseDevice } from './BaseDevice.js';
export class Motion extends BaseDevice {
    constructor(mesh, scene) { super(mesh, scene); this.triggered = false; }
    update(time) {
        if (!this.triggered && Math.random() < 0.005) {
            this.triggered = true;
            this.mesh.material.emissive.setHex(0xff0000);
            setTimeout(() => { this.triggered = false; this.mesh.material.emissive.setHex(0x000000); }, 2000);
        }
        this.mesh.userData.simulatedData = { motion: this.triggered };
    }
    onStop() { if(this.mesh.material) this.mesh.material.emissive.setHex(0x000000); }
}