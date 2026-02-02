// static/js/simulator/connections.js

const THREE = window.THREE;

export class ConnectionManager {
    constructor(scene) {
        this.scene = scene;
        this.raycaster = new THREE.Raycaster();
    }

    // Головний метод, який повертає масив усіх необхідних зв'язків
    calculateAllConnections(devices, controllers) {
        const results = []; // Тут будуть об'єкти { type: 'network'|'logic'|'offline', start, end, protocol }

        devices.forEach(device => {
            // 1. Мережеве підключення (Physical Layer)
            const netLink = this.findNetworkConnection(device, controllers);
            if (netLink) {
                results.push(netLink);
                device.userData.isConnected = true;
            } else {
                results.push({
                    type: 'offline',
                    sensor: device
                });
                device.userData.isConnected = false;
            }
        });

        // 2. Логічні зв'язки (Automation Layer)
        const logicLinks = this.findLogicConnections(devices);
        results.push(...logicLinks);

        return results;
    }

    // Логіка пошуку Хаба або Роутера
    findNetworkConnection(device, controllers) {
        const caps = device.userData.capabilities || [];

        // --- ЕТАП 1: Пріоритет спеціалізованих протоколів (Zigbee, Matter, Sub1G) ---
        const nonWifiProtocols = caps.filter(p => p !== 'wifi');

        if (nonWifiProtocols.length > 0) {
            // Шукаємо ХАБ
            const bestHub = this.findNearestController(device, controllers, (c) => {
                return c.userData.subtype === 'hub' &&
                       c.userData.features?.serves_protocols?.some(p => nonWifiProtocols.includes(p));
            });

            if (bestHub) {
                const protocol = nonWifiProtocols.find(p => bestHub.userData.features.serves_protocols.includes(p));
                return {
                    type: 'network',
                    start: device.position,
                    end: bestHub.position,
                    protocol: protocol
                };
            }
        }

        // --- ЕТАП 2: Якщо Хаб не знайдено або є тільки Wi-Fi -> Шукаємо РОУТЕР ---
        if (caps.includes('wifi')) {
            const router = this.findNearestController(device, controllers, (c) => {
                // Важливо: перевіряємо саме subtype 'router'
                return c.userData.subtype === 'router';
            });

            if (router) {
                return {
                    type: 'network',
                    start: device.position,
                    end: router.position,
                    protocol: 'wifi'
                };
            }
        }

        return null; // Не вдалося підключитися
    }

    // Логіка автоматизації (Датчик -> Лампа)
    findLogicConnections(devices) {
        const links = [];
        const triggers = devices.filter(d =>
            ['motion', 'door', 'switch', 'leak', 'button'].includes(d.userData.subtype || d.userData.type)
        );
        const actuators = devices.filter(d =>
            ['light', 'socket', 'relay', 'bulb', 'plug'].includes(d.userData.subtype || d.userData.type)
        );

        triggers.forEach(trigger => {
            // Шукаємо найближчого виконавця в радіусі 6 метрів
            let nearestActuator = null;
            let minDist = 6.0;

            actuators.forEach(actuator => {
                const dist = trigger.position.distanceTo(actuator.position);
                if (dist < minDist) {
                    minDist = dist;
                    nearestActuator = actuator;
                }
            });

            if (nearestActuator) {
                links.push({
                    type: 'logic',
                    start: trigger.position,
                    end: nearestActuator.position
                });
            }
        });

        return links;
    }

    // Допоміжна функція: пошук найближчого з урахуванням стін
    findNearestController(device, controllers, filterFn) {
        let nearest = null;
        let minDistance = Infinity;

        controllers.forEach(ctrl => {
            if (filterFn(ctrl)) {
                const dist = device.position.distanceTo(ctrl.position);
                const signal = this.getSignalStrength(device.position, ctrl.position);

                // Сигнал повинен бути > 20%
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
        // Фільтруємо стіни
        const wallsHit = intersects.filter(i => i.object.userData.isWall || i.object.name === 'wall');

        // Кожна стіна забирає 30% сигналу
        return Math.max(0, 1.0 - (wallsHit.length * 0.3));
    }
}