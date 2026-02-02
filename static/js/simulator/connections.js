// static/js/simulator/connections.js

const THREE = window.THREE;

export class ConnectionManager {
    constructor(scene) {
        this.scene = scene;
        this.raycaster = new THREE.Raycaster();
    }

    // Головний метод розрахунку
    calculateAllConnections(devices, controllers) {
        const results = [];

        devices.forEach(device => {
            // ПРАВКА 1: Роутер завжди онлайн, йому не треба нікуди підключатись
            if (device.userData.subtype === 'router') {
                device.userData.isConnected = true;
                return;
            }

            // ПРАВКА 2: Пристрій не може підключитись до самого себе (актуально для Хабів)
            const validControllers = controllers.filter(c => c.uuid !== device.uuid);

            // 1. Шукаємо мережеве підключення (Physical Layer)
            const netLink = this.findNetworkConnection(device, validControllers);

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

        // 2. Шукаємо логічні зв'язки (Automation Layer)
        // Хаби не беруть участі в простих сценаріях як тригери
        const simpleSensors = devices.filter(d => d.userData.type !== 'hub');
        const logicLinks = this.findLogicConnections(simpleSensors);
        results.push(...logicLinks);

        return results;
    }

    // --- ОСНОВНА ЛОГІКА ПРІОРИТЕТІВ ---
    findNetworkConnection(device, controllers) {
        const caps = device.userData.capabilities || [];

        // КРОК 1: Виділяємо протоколи для Хаба (все, крім Wi-Fi)
        const nonWifiProtocols = caps.filter(p => p !== 'wifi');

        // Спроба підключитися до ХАБА (Zigbee, Matter, Sub1G)
        if (nonWifiProtocols.length > 0) {
            const bestHub = this.findNearestController(device, controllers, (c) => {
                // Шукаємо Хаб (не Роутер), який підтримує цей протокол
                return c.userData.subtype === 'hub' &&
                       c.userData.features?.serves_protocols?.some(p => nonWifiProtocols.includes(p));
            });

            if (bestHub) {
                // Знайшли Хаб -> підключаємось
                const protocol = nonWifiProtocols.find(p => bestHub.userData.features.serves_protocols.includes(p));
                return {
                    type: 'network',
                    start: device.position,
                    end: bestHub.position,
                    protocol: protocol
                };
            }
        }

        // КРОК 2: Спрацьовує ТІЛЬКИ якщо Хаб не знайдено АБО пристрій має Wi-Fi
        // Шукаємо РОУТЕР
        if (caps.includes('wifi')) {
            const router = this.findNearestController(device, controllers, (c) => {
                // Шукаємо саме РОУТЕР
                return c.userData.subtype === 'router';
            });

            if (router) {
                // Знайшли Роутер -> підключаємось
                return {
                    type: 'network',
                    start: device.position,
                    end: router.position,
                    protocol: 'wifi'
                };
            }
        }

        // Якщо нічого не знайшли
        return null;
    }

    // Пошук найближчого контролера з перевіркою стін
    findNearestController(device, controllers, filterFn) {
        let nearest = null;
        let minDistance = Infinity;

        controllers.forEach(ctrl => {
            if (filterFn(ctrl)) {
                const dist = device.position.distanceTo(ctrl.position);

                // Перевіряємо сигнал крізь стіни
                const signal = this.getSignalStrength(device.position, ctrl.position);

                // Умова: Сигнал є (>0.2) І цей контролер ближче за попередній
                if (signal > 0.2 && dist < minDistance) {
                    minDistance = dist;
                    nearest = ctrl;
                }
            }
        });
        return nearest;
    }

    // Розрахунок проходження сигналу
    getSignalStrength(start, end) {
        const direction = new THREE.Vector3().subVectors(end, start).normalize();
        const distance = start.distanceTo(end);

        this.raycaster.set(start, direction);
        this.raycaster.far = distance;

        // Ігноруємо сам датчик і ціль, шукаємо тільки стіни
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        const wallsHit = intersects.filter(i => i.object.userData.isWall || i.object.name === 'wall');

        // Кожна стіна зменшує сигнал на 30%
        return Math.max(0, 1.0 - (wallsHit.length * 0.3));
    }

    // Логіка сценаріїв (Датчик -> Лампа)
    findLogicConnections(devices) {
        const links = [];
        // Тригери: Рух, Двері, Вимикачі, Протікання
        const triggers = devices.filter(d =>
            ['motion', 'door', 'switch', 'leak', 'button'].includes(d.userData.subtype || d.userData.type)
        );
        // Виконавці: Світло, Розетки, Реле
        const actuators = devices.filter(d =>
            ['light', 'socket', 'relay', 'bulb', 'plug'].includes(d.userData.subtype || d.userData.type)
        );

        triggers.forEach(trigger => {
            let nearestActuator = null;
            let minDist = 6.0; // Радіус дії сценарію (одна кімната)

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
}