// static/js/simulator/connections.js

const THREE = window.THREE;

export class ConnectionManager {
    constructor(scene) {
        this.scene = scene;
        this.raycaster = new THREE.Raycaster();
    }

    calculateAllConnections(devices, controllers) {
        const results = [];

        devices.forEach(device => {
            // Роутер завжди онлайн
            if (device.userData.subtype === 'router') {
                device.userData.isConnected = true;
                return;
            }

            const validControllers = controllers.filter(c => c.uuid !== device.uuid);
            const netLink = this.findNetworkConnection(device, validControllers);

            if (netLink) {
                results.push(netLink);
                device.userData.isConnected = true;
            } else {
                results.push({ type: 'offline', sensor: device });
                device.userData.isConnected = false;
            }
        });

        // Логіка (сценарії) - тільки для звичайних датчиків
        const simpleSensors = devices.filter(d => d.userData.type !== 'hub');
        results.push(...this.findLogicConnections(simpleSensors));

        return results;
    }

    findNetworkConnection(device, controllers) {
        const caps = device.userData.capabilities || [];

        // 1. Перевірка Zigbee/Matter (потрібен ХАБ)
        const nonWifiProtocols = caps.filter(p => p !== 'wifi');

        if (nonWifiProtocols.length > 0) {
            const bestHub = this.findNearestController(device, controllers, (c) => {
                return c.userData.subtype === 'hub' &&
                       c.userData.features?.serves_protocols?.some(p => nonWifiProtocols.includes(p));
            });

            if (bestHub) {
                const protocol = nonWifiProtocols.find(p => bestHub.userData.features.serves_protocols.includes(p));
                return { type: 'network', start: device.position, end: bestHub.position, protocol: protocol };
            }
        }

        // 2. Перевірка Wi-Fi (потрібен РОУТЕР)
        if (caps.includes('wifi')) {
            const router = this.findNearestController(device, controllers, (c) => {
                return c.userData.subtype === 'router';
            });

            if (router) {
                return { type: 'network', start: device.position, end: router.position, protocol: 'wifi' };
            }
        }

        return null;
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
        const wallsHit = intersects.filter(i => i.object.userData.isWall || i.object.name === 'wall');

        return Math.max(0, 1.0 - (wallsHit.length * 0.3));
    }

    findLogicConnections(devices) {
        const links = [];
        const triggers = devices.filter(d =>
            ['motion', 'door', 'switch', 'leak', 'button'].includes(d.userData.subtype || d.userData.type)
        );
        const actuators = devices.filter(d =>
            ['light', 'socket', 'relay', 'bulb', 'plug'].includes(d.userData.subtype || d.userData.type)
        );

        triggers.forEach(trigger => {
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
}