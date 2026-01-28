// static/js/simulator.js

const THREE = window.THREE;

export class Simulator {
    constructor(scene) {
        this.scene = scene;
        this.isActive = false;
        this.coverageHelpers = []; // Зони покриття
        this.connectionLines = []; // Лінії логічних зв'язків
        this.raycaster = new THREE.Raycaster();
    }

    toggle(state) {
        this.isActive = state;
        if (this.isActive) {
            this.runSimulation();
        } else {
            this.clearSimulation();
        }
    }

    // Основний цикл запуску симуляції
    runSimulation() {
        const sensors = [];
        this.scene.traverse((obj) => {
            if (obj.userData && obj.userData.isSensor) sensors.push(obj);
        });

        sensors.forEach(sensor => {
            this.createCoverageZone(sensor);
            this.calculateLogicConnections(sensor, sensors);
        });
    }

    // 1. Створення зони покриття на основі ТТХ
    createCoverageZone(sensor) {
        const type = sensor.userData.type;
        const features = sensor.userData.features || {};
        const range = features.range_m || 5;

        let geometry;
        if (type === 'motion') {
            // Сектор огляду для датчиків руху (110 градусів)
            geometry = new THREE.ConeGeometry(range, range * 1.5, 32, 1, false, 0, Math.PI * 0.6);
        } else {
            // Сфера для датчиків температури/диму
            geometry = new THREE.SphereGeometry(range / 2, 16, 16);
        }

        const material = new THREE.MeshPhongMaterial({
            color: new THREE.Color(sensor.userData.color || 0x3b82f6),
            transparent: true,
            opacity: 0.05, // Дуже прозоро, як у Zircon3D
            wireframe: true,
            side: THREE.DoubleSide
        });

        const coverage = new THREE.Mesh(geometry, material);
        coverage.position.copy(sensor.position);

        // Орієнтація конуса від стіни
        coverage.rotation.copy(sensor.rotation);
        if (type === 'motion') coverage.rotateX(Math.PI / 2);

        this.scene.add(coverage);
        this.coverageHelpers.push(coverage);
    }

    // 2. Логіка взаємодії та перевірка сигналу крізь стіни
    calculateLogicConnections(source, allSensors) {
        const sourceData = source.userData;
        if (!sourceData.features || !sourceData.features.interacts_with) return;

        allSensors.forEach(target => {
            if (source === target) return;

            // Перевірка сумісності типів
            const canInteract = sourceData.features.interacts_with.includes(target.userData.type) ||
                               sourceData.features.interacts_with.includes(target.userData.protocol);

            if (canInteract) {
                const distance = source.position.distanceTo(target.position);
                const maxRange = sourceData.features.range_m || 20;

                if (distance <= maxRange) {
                    const signalStrength = this.getSignalStrength(source.position, target.position);
                    if (signalStrength > 0) {
                        this.drawLink(source.position, target.position, signalStrength);
                    }
                }
            }
        });
    }

    // 3. Перевірка перешкод за допомогою Raycaster
    getSignalStrength(start, end) {
        const direction = new THREE.Vector3().subVectors(end, start).normalize();
        const distance = start.distanceTo(end);

        this.raycaster.set(start, direction);
        this.raycaster.far = distance;

        // Шукаємо перетини зі стінами (RoomManager.wallMesh)
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        const wallsHit = intersects.filter(i => i.object.name === 'wall' || i.object.userData.isWall);

        let strength = 1.0;
        strength -= (wallsHit.length * 0.3); // -30% потужності за кожну стіну

        return Math.max(0, strength);
    }

    // 4. Візуалізація зв'язків (пунктирні лінії)
    drawLink(start, end, strength) {
        const color = strength > 0.6 ? 0x10b981 : (strength > 0.3 ? 0xf59e0b : 0xef4444);

        const material = new THREE.LineDashedMaterial({
            color: color,
            dashSize: 0.2,
            gapSize: 0.1,
            transparent: true,
            opacity: 0.5
        });

        const points = [start, end];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        line.computeLineDistances();

        this.scene.add(line);
        this.connectionLines.push(line);
    }

    clearSimulation() {
        this.coverageHelpers.forEach(h => this.scene.remove(h));
        this.connectionLines.forEach(l => this.scene.remove(l));
        this.coverageHelpers = [];
        this.connectionLines = [];
    }

    update() {
        if (!this.isActive) return;
        // Анімація ліній зв'язку (бігучі тире)
        this.connectionLines.forEach(line => {
            line.material.dashOffset -= 0.01;
        });
    }
}