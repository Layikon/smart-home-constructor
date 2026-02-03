import { BaseDevice } from './BaseDevice.js';
const THREE = window.THREE;
export class Camera extends BaseDevice {
    constructor(mesh, scene) {
        super(mesh, scene);
        const geo = new THREE.ConeGeometry(2, 5, 32, 1, true);
        const mat = new THREE.MeshBasicMaterial({ color: 0x3b82f6, opacity: 0.15, transparent: true, side: THREE.DoubleSide, depthWrite: false, fog: false });
        this.cone = new THREE.Mesh(geo, mat);
        this.cone.rotation.x = -Math.PI / 2; this.cone.position.z = 2.5;
        this.mesh.add(this.cone);
        this.cone.visible = false;
    }
    update(time) {
        this.cone.visible = true;
        this.cone.material.opacity = 0.15 + Math.sin(time * 2) * 0.05;
        this.mesh.userData.simulatedData = { status: "REC", fps: 24 };
    }
    onStop() { this.cone.visible = false; }
}