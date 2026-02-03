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
        const panel = document.getElementById('system-status-panel');

        if (this.isActive) {
            if (panel) panel.classList.remove('opacity-0'); // Показуємо панель статусу
            this.runSimulation();
        } else {
            if (panel) panel.classList.add('opacity-0'); // Ховаємо панель статусу
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
                if (!obj.userData.subtype) {
                    const caps = obj.userData.capabilities || [];

                    if (obj.userData.type === 'hub') {
                        const isSmartHub = caps.some(c => ['zigbee', 'matter', 'sub1g', 'ble'].includes(c));
                        if (isSmartHub) {
                            obj.userData.subtype = 'hub';
                        } else {
                            obj.userData.subtype = 'router';
                        }
                    } else {
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

        // --- ОНОВЛЕННЯ ПАНЕЛІ СТАТУСУ ---
        this.updateStatusPanel(devices, controllers);

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

    updateStatusPanel(devices, controllers) {
        // Рахуємо унікальні пристрої (щоб хаби не рахувалися двічі)
        const allUnique = new Set([...devices, ...controllers]);
        const total = allUnique.size;

        const onlineCount = Array.from(allUnique).filter(d => d.userData.isConnected).length;
        const offlineCount = total - onlineCount;

        const totalEl = document.getElementById('stat-total');
        const onlineEl = document.getElementById('stat-online');
        const offlineEl = document.getElementById('stat-offline');

        if (totalEl) totalEl.textContent = total;
        if (onlineEl) onlineEl.textContent = `${onlineCount} ✅`;
        if (offlineEl) offlineEl.textContent = `${offlineCount} ⚠️`;
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
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(32, 32, 30, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'white';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', 32, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false
        });

        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(0.4, 0.4, 1);
        sprite.position.copy(sensor.position);
        sprite.position.y += 0.5;

        this.scene.add(sprite);
        this.networkLines.push(sprite);
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