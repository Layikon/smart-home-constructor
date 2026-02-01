// static/js/simulator.js

const THREE = window.THREE;

export class Simulator {
    constructor(scene) {
        this.scene = scene;
        this.isActive = false;
        this.connectionLines = []; // Лінії логічних зв'язків (датчик -> хаб або хмара)
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

    // Основний цикл симуляції зв'язків
    runSimulation() {
        this.clearSimulation();

        const sensors = [];
        const hubs = [];

        // 1. Сортуємо пристрої
        this.scene.traverse((obj) => {
            if (obj.userData && obj.userData.isSensor) {
                if (obj.userData.type === 'hub') hubs.push(obj);
                else sensors.push(obj);
            }
        });

        // 2. Розраховуємо підключення для кожного датчика
        sensors.forEach(sensor => {
            const caps = sensor.userData.capabilities || [];

            // Визначаємо можливості
            const supportsDirect = caps.includes('wifi') || caps.includes('matter');
            const needsHub = caps.includes('zigbee') || caps.includes('sub1g') || caps.includes('bluetooth');

            let bestHub = null;
            let status = 'offline';

            // Якщо пристрій потребує хаб або підтримує його (Zigbee/Matter/Sub1G)
            if (needsHub || caps.includes('matter')) {
                let minDistance = 15; // Максимальний радіус хаба (метрів)

                hubs.forEach(hub => {
                    const dist = sensor.position.distanceTo(hub.position);
                    if (dist < minDistance) {
                        // Перевірка перешкод (стін)
                        const signal = this.getSignalStrength(sensor.position, hub.position);
                        if (signal > 0.2) { // Мінімальний поріг сигналу
                            minDistance = dist;
                            bestHub = hub;
                            status = 'hub';
                        }
                    }
                });
            }

            // Якщо хаб не знайдено, але є Wi-Fi (як у Tapo P110M)
            if (status === 'offline' && supportsDirect) {
                status = 'cloud';
            }

            // Візуалізуємо зв'язок
            if (status !== 'offline') {
                this.drawLink(sensor, bestHub, status);
                sensor.userData.isConnected = true;
            } else {
                sensor.userData.isConnected = false;
                this.drawWarning(sensor); // Значок помилки (опціонально)
            }
        });
    }

    // Перевірка сигналу крізь стіни
    getSignalStrength(start, end) {
        const direction = new THREE.Vector3().subVectors(end, start).normalize();
        const distance = start.distanceTo(end);

        this.raycaster.set(start, direction);
        this.raycaster.far = distance;

        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        const wallsHit = intersects.filter(i => i.object.userData.isWall || i.object.name?.includes('wall'));

        let strength = 1.0;
        strength -= (wallsHit.length * 0.25); // -25% за кожну стіну

        return Math.max(0, strength);
    }

    // Візуалізація зв'язку (лінії)
    drawLink(sensor, hub, status) {
        const color = status === 'cloud' ? 0x22c55e : 0x3b82f6; // Зелений - WiFi, Синій - Хаб

        const material = new THREE.LineDashedMaterial({
            color: color,
            dashSize: 0.2,
            gapSize: 0.1,
            transparent: true,
            opacity: 0.6
        });

        const points = [];
        points.push(sensor.position.clone());

        if (status === 'hub' && hub) {
            points.push(hub.position.clone());
        } else {
            // Для Wi-Fi малюємо вертикальну лінію "в хмару"
            points.push(sensor.position.clone().add(new THREE.Vector3(0, 2, 0)));
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        line.computeLineDistances();

        this.scene.add(line);
        this.connectionLines.push(line);
    }

    drawWarning(sensor) {
        // Можна додати червону підсвітку під датчиком, якщо він офлайн
        const ringGeo = new THREE.RingGeometry(0.15, 0.2, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(sensor.position);
        ring.position.y += 0.02;
        ring.rotation.x = -Math.PI / 2;
        this.scene.add(ring);
        this.connectionLines.push(ring); // Додаємо в загальний список для очищення
    }

    clearSimulation() {
        this.connectionLines.forEach(l => this.scene.remove(l));
        this.connectionLines = [];
    }

    update() {
        if (!this.isActive) return;
        // Анімація "бігучих ліній"
        this.connectionLines.forEach(line => {
            if (line.material.type === 'LineDashedMaterial') {
                line.material.dashOffset -= 0.01;
            }
        });
    }
}