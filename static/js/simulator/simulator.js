// static/js/simulator.js

const THREE = window.THREE;

export class Simulator {
    constructor(scene) {
        this.scene = scene;
        this.isActive = false;
        this.connectionLines = []; // Тут зберігаємо і лінії, і червоні кільця
        this.raycaster = new THREE.Raycaster();

        // Налаштування стилів ліній
        this.connectionStyles = {
            'wifi': { color: 0x3b82f6, dashSize: 0.4, gapSize: 0.1 },    // Синій
            'zigbee': { color: 0xf59e0b, dashSize: 0.2, gapSize: 0.1 },  // Оранжевий
            'matter': { color: 0xa855f7, dashSize: 0.3, gapSize: 0.2 },  // Фіолетовий
            'sub1g': { color: 0x6366f1, dashSize: 0.1, gapSize: 0.1 },   // Індиго
            'offline': { color: 0xef4444 },                              // Червоний для помилок
            'default': { color: 0x94a3b8, dashSize: 0.2, gapSize: 0.1 }
        };
    }

    toggle(state) {
        this.isActive = state;
        if (this.isActive) {
            this.runSimulation();
        } else {
            this.clearSimulation();
        }
    }

    runSimulation() {
        this.clearSimulation();
        const devices = [];
        const controllers = [];

        // Збираємо об'єкти
        this.scene.traverse((obj) => {
            if (obj.userData && obj.userData.isSensor) {
                if (obj.userData.type === 'hub') controllers.push(obj);
                else devices.push(obj);
            }
        });

        devices.forEach(device => {
            const caps = device.userData.capabilities || [];
            let connected = false;

            // 1. Шукаємо Хаб (Zigbee, Sub1G, Matter)
            const nonWifiProtocols = caps.filter(p => p !== 'wifi');
            if (nonWifiProtocols.length > 0) {
                const bestHub = this.findNearestController(device, controllers, (c) => {
                    return c.userData.subtype === 'hub' &&
                           c.userData.features?.serves_protocols?.some(p => nonWifiProtocols.includes(p));
                });

                if (bestHub) {
                    const protocol = nonWifiProtocols.find(p => bestHub.userData.features.serves_protocols.includes(p));
                    this.drawLink(device.position, bestHub.position, protocol);
                    connected = true;
                }
            }

            // 2. Якщо не підключено і є Wi-Fi — шукаємо Роутер
            if (!connected && caps.includes('wifi')) {
                const router = this.findNearestController(device, controllers, (c) => {
                    return c.userData.subtype === 'router';
                });

                if (router) {
                    this.drawLink(device.position, router.position, 'wifi');
                    connected = true;
                }
            }

            // 3. Якщо все ще не підключено — малюємо червоне кільце
            if (!connected) {
                this.drawWarning(device);
            }
        });
    }

    findNearestController(device, controllers, filterFn) {
        let nearest = null;
        let minDistance = Infinity;

        controllers.forEach(ctrl => {
            if (filterFn(ctrl)) {
                const dist = device.position.distanceTo(ctrl.position);
                const signal = this.getSignalStrength(device.position, ctrl.position);

                if (signal > 0.2 && dist < minDistance) {
                    minDistance = dist;
                    nearest = ctrl;
                }
            }
        });
        return nearest;
    }

    getSignalStrength(start, end) {
        const direction = new THREE.Vector3().subVectors(end, start).normalize();
        const distance = start.distanceTo(end);
        this.raycaster.set(start, direction);
        this.raycaster.far = distance;

        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        const wallsHit = intersects.filter(i => i.object.name === 'wall' || i.object.userData.isWall);

        return Math.max(0, 1.0 - (wallsHit.length * 0.3));
    }

    // МАЛЮЄМО ЛІНІЮ (ШТРИХ-ПУНКТИР)
    drawLink(start, end, protocol) {
        const style = this.connectionStyles[protocol] || this.connectionStyles['default'];
        const material = new THREE.LineDashedMaterial({
            color: style.color,
            dashSize: style.dashSize,
            gapSize: style.gapSize,
            transparent: true,
            opacity: 0.8
        });

        const points = [start.clone(), end.clone()];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        line.computeLineDistances();

        this.scene.add(line);
        this.connectionLines.push(line);
    }

    // МАЛЮЄМО ЧЕРВОНЕ КІЛЬЦЕ (OFFLINE)
    drawWarning(sensor) {
        const ringGeo = new THREE.RingGeometry(0.18, 0.22, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: this.connectionStyles.offline.color,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);

        // Кладемо кільце на підлогу під датчиком
        ring.position.copy(sensor.position);
        ring.position.y = 0.02; // Трохи вище підлоги
        ring.rotation.x = -Math.PI / 2;

        this.scene.add(ring);
        this.connectionLines.push(ring);
    }

    clearSimulation() {
        this.connectionLines.forEach(l => this.scene.remove(l));
        this.connectionLines = [];
    }

    update() {
        if (!this.isActive) return;
        this.connectionLines.forEach(line => {
            if (line.material && line.material.type === 'LineDashedMaterial') {
                line.material.dashOffset -= 0.005;
            }
        });
    }
}