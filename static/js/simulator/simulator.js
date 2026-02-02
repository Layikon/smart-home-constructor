// static/js/simulator/simulator.js
import { ConnectionManager } from './connections.js';

const THREE = window.THREE;

export class Simulator {
    constructor(scene) {
        this.scene = scene;
        this.isActive = false;

        this.networkLines = [];
        this.logicLines = [];

        this.connectionManager = new ConnectionManager(scene);

        this.connectionStyles = {
            'wifi': { color: 0x3b82f6, dashSize: 0.4, gapSize: 0.1, opacity: 0.5 },
            'zigbee': { color: 0xf59e0b, dashSize: 0.2, gapSize: 0.1, opacity: 0.5 },
            'matter': { color: 0xa855f7, dashSize: 0.3, gapSize: 0.2, opacity: 0.5 },
            'sub1g': { color: 0x6366f1, dashSize: 0.1, gapSize: 0.1, opacity: 0.5 },
            'logic': { color: 0xfacc15, dashSize: 0.1, gapSize: 0.05, opacity: 0.9 },
            'offline': { color: 0xef4444 },
            'default': { color: 0x94a3b8, dashSize: 0.2, gapSize: 0.1, opacity: 0.5 }
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

        this.scene.traverse((obj) => {
            if (obj.userData && obj.userData.isSensor) {

                // --- АВТОМАТИЧНЕ ВИПРАВЛЕННЯ ДАНИХ (AUTO-REPAIR) ---
                // Якщо завантажили збереження, де ще не було subtype, або він загубився
                if (!obj.userData.subtype) {
                    const caps = obj.userData.capabilities || [];

                    if (obj.userData.type === 'hub') {
                        // Якщо це "Хаб" за типом, треба зрозуміти: це Роутер чи Розумний Хаб?
                        // Перевірка: Якщо є Zigbee, Matter, Sub1G або BLE - це Розумний Хаб.
                        const isSmartHub = caps.some(c => ['zigbee', 'matter', 'sub1g', 'ble'].includes(c));

                        if (isSmartHub) {
                            obj.userData.subtype = 'hub';
                        } else {
                            // Якщо тільки Wi-Fi (або пусто) - вважаємо Роутером
                            obj.userData.subtype = 'router';
                        }
                    } else {
                        // Для звичайних датчиків (motion, door і т.д.) підтип = тип
                        obj.userData.subtype = obj.userData.type;
                    }
                }
                // ----------------------------------------------------

                const subtype = obj.userData.subtype;

                if (subtype === 'router') {
                    controllers.push(obj);
                } else if (subtype === 'hub') {
                    controllers.push(obj);
                    devices.push(obj);
                } else {
                    devices.push(obj);
                }
            }
        });

        const results = this.connectionManager.calculateAllConnections(devices, controllers);

        results.forEach(res => {
            if (res.type === 'network') {
                this.drawNetworkLink(res.start, res.end, res.protocol);
            } else if (res.type === 'logic') {
                this.drawLogicLink(res.start, res.end);
            } else if (res.type === 'offline') {
                this.drawWarning(res.sensor);
            }
        });
    }

    // --- МЕТОДИ МАЛЮВАННЯ ---

    drawNetworkLink(start, end, protocol) {
        const style = this.connectionStyles[protocol] || this.connectionStyles['default'];
        const line = this.createDashedLine(start, end, style);
        this.scene.add(line);
        this.networkLines.push(line);
    }

    drawLogicLink(start, end) {
        const style = this.connectionStyles['logic'];
        const startUp = start.clone().add(new THREE.Vector3(0, 0.5, 0));
        const endUp = end.clone().add(new THREE.Vector3(0, 0.5, 0));
        const line = this.createDashedLine(startUp, endUp, style);
        this.scene.add(line);
        this.logicLines.push(line);
    }

    drawWarning(sensor) {
        const ringGeo = new THREE.RingGeometry(0.18, 0.22, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(sensor.position);
        ring.position.y = 0.02;
        ring.rotation.x = -Math.PI / 2;
        this.scene.add(ring);
        this.networkLines.push(ring);
    }

    createDashedLine(start, end, style) {
        const material = new THREE.LineDashedMaterial({
            color: style.color,
            dashSize: style.dashSize,
            gapSize: style.gapSize,
            transparent: true,
            opacity: style.opacity
        });
        const points = [start, end];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        line.computeLineDistances();
        return line;
    }

    clearSimulation() {
        this.networkLines.forEach(l => this.scene.remove(l));
        this.logicLines.forEach(l => this.scene.remove(l));
        this.networkLines = [];
        this.logicLines = [];
    }

    update() {
        if (!this.isActive) return;
        this.networkLines.forEach(line => { if (line.material.dashOffset !== undefined) line.material.dashOffset -= 0.005; });
        this.logicLines.forEach(line => { if (line.material.dashOffset !== undefined) line.material.dashOffset -= 0.02; });
    }
}