// static/js/simulator.js
import { PROTOCOLS, COLORS } from './config.js';

const THREE = window.THREE;

export class Simulator {
    constructor(scene) {
        this.scene = scene;
        this.isActive = false;
        this.connectionLines = []; // Лінії логічних зв'язків (датчик -> хаб або роутер)
        this.raycaster = new THREE.Raycaster();
    }

    // Оновлений метод toggle
    toggle(state) {
        this.isActive = state;
        if (this.isActive) {
            this.runSimulation();
        } else {
            this.clearSimulation();
            // Скидаємо статус підключення у userData всіх сенсорів при вимкненні
            this.scene.traverse((obj) => {
                if (obj.userData && obj.userData.isSensor) {
                    obj.userData.isConnected = false;
                }
            });
        }
    }

    // Основний цикл симуляції зв'язків
    runSimulation() {
        this.clearSimulation();

        const sensors = [];
        const hubs = [];

        // 1. Сортуємо пристрої на хаби/роутери та інші датчики
        this.scene.traverse((obj) => {
            if (obj.userData && obj.userData.isSensor) {
                if (obj.userData.type === 'hub') hubs.push(obj);
                else sensors.push(obj);
            }
        });

        // 2. Розраховуємо підключення для кожного датчика
        sensors.forEach(sensor => {
            const caps = sensor.userData.capabilities || [];

            // Визначаємо можливості на основі конфігу
            const supportsDirect = caps.some(c => PROTOCOLS.DIRECT.includes(c));
            const needsHub = caps.some(c => PROTOCOLS.BRIDGE.includes(c));

            let bestTarget = null;
            let status = 'offline';

            // ЛОГІКА ДЛЯ Zigbee / Sub1G / Matter (через Хаб)
            if (needsHub || caps.includes('matter')) {
                let minDistance = PROTOCOLS.RANGE_MAX;

                hubs.forEach(hub => {
                    // Ігноруємо роутери для протоколів, що потребують саме Хаб
                    if (hub.userData.subtype !== 'router') {
                        const dist = sensor.position.distanceTo(hub.position);
                        if (dist < minDistance) {
                            const signal = this.getSignalStrength(sensor.position, hub.position);
                            if (signal > 0.2) {
                                minDistance = dist;
                                bestTarget = hub;
                                status = 'hub';
                            }
                        }
                    }
                });
            }

            // ЛОГІКА ДЛЯ Wi-Fi (через Роутер)
            if (status === 'offline' && supportsDirect) {
                let minDistance = 30; // Wi-Fi має більший радіус

                hubs.forEach(hub => {
                    if (hub.userData.subtype === 'router') {
                        const dist = sensor.position.distanceTo(hub.position);
                        if (dist < minDistance) {
                            const signal = this.getSignalStrength(sensor.position, hub.position);
                            if (signal > 0.1) {
                                minDistance = dist;
                                bestTarget = hub;
                                status = 'cloud';
                            }
                        }
                    }
                });
            }

            // Візуалізуємо результат
            if (status !== 'offline') {
                this.drawLink(sensor, bestTarget, status);
                sensor.userData.isConnected = true;
            } else {
                sensor.userData.isConnected = false;
                this.drawWarning(sensor);
            }
        });
    }

    // Перевірка сигналу крізь стіни за допомогою Raycaster
    getSignalStrength(start, end) {
        const direction = new THREE.Vector3().subVectors(end, start).normalize();
        const distance = start.distanceTo(end);

        this.raycaster.set(start, direction);
        this.raycaster.far = distance;

        // Перевіряємо тільки об'єкти, що мають властивість isWall або ім'я wall
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        const wallsHit = intersects.filter(i =>
            i.object.userData.isWall ||
            (i.object.name && i.object.name.toLowerCase().includes('wall'))
        );

        let strength = 1.0;
        strength -= (wallsHit.length * PROTOCOLS.WALL_ATTENUATION);

        return Math.max(0, strength);
    }

    // Візуалізація зв'язку (пунктирні лінії)
    drawLink(sensor, target, status) {
        const color = status === 'cloud' ? COLORS.WIFI_LINE : COLORS.HUB_LINE;

        const material = new THREE.LineDashedMaterial({
            color: color,
            dashSize: 0.2,
            gapSize: 0.1,
            transparent: true,
            opacity: 0.6
        });

        const points = [];
        points.push(sensor.position.clone());

        if (target) {
            points.push(target.position.clone());
        } else {
            points.push(sensor.position.clone().add(new THREE.Vector3(0, 2, 0)));
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        line.computeLineDistances();

        this.scene.add(line);
        this.connectionLines.push(line);
    }

    // Червоне кільце
    drawWarning(sensor) {
        const ringGeo = new THREE.RingGeometry(0.15, 0.2, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: COLORS.OFFLINE_RING,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(sensor.position);
        ring.position.y += 0.02;
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
                line.material.dashOffset -= 0.01;
            }
        });
    }
}