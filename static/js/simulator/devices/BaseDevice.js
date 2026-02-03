export class BaseDevice {
    constructor(mesh, scene) {
        this.mesh = mesh;
        this.scene = scene;
        this.data = { value: 0, status: 'ok' };
    }
    update(time) {}
    onStop() {}
}