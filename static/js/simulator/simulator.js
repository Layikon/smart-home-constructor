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
            // Примусове відображення
            if (panel) {
                panel.classList.remove('opacity-0');
                panel.style.opacity = '1';
                panel.style.pointerEvents = 'auto';
            }
            this.runSimulation();
        } else {
            // Приховання
            if (panel) {
                panel.classList.add('opacity-0');
                panel.style.opacity = '0';
                panel.style.pointerEvents = 'none';
            }
            this.clearSimulation();
        }
    }

    runSimulation() {
        this.clearSimulation();

        const devices = [];
        const controllers = [];

        this.scene.traverse((obj) => {
            if (obj.userData && obj.userData.isSensor) {
                const subtype = obj.userData.subtype || obj.userData.type;

                if (subtype === 'router') {
                    // Роутер завжди онлайн
                    obj.userData.isConnected = true;
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

        // Оновлюємо панель статистики
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
        const totalEl = document.getElementById('stat-total');
        if (!totalEl) return;

        const allUnique = new Set([...devices, ...controllers]);
        const total = allUnique.size;

        const onlineCount = Array.from(allUnique).filter(d => d.userData.isConnected).length;
        const offlineCount = total - onlineCount;

        const onlineEl = document.getElementById('stat-online');
        const offlineEl = document.getElementById('stat-offline');

        if (totalEl) totalEl.textContent = total;
        if (onlineEl) onlineEl.textContent = `${onlineCount} ✅`;
        if (offlineEl) offlineEl.textContent = `${offlineCount} ⚠️`;
    }

    // --- МАЛЮВАННЯ ---

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
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        ctx.scale(2, 2);

        // 1. Червоне коло
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(32, 32, 28, 0, Math.PI * 2);
        ctx.fill();

        // 2. Біла обводка
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Wi-Fi лінії
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';

        // 3. Точка
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(32, 50, 3, 0, Math.PI * 2);
        ctx.fill();

        // 4. Дуги
        ctx.beginPath(); ctx.arc(32, 50, 11, 1.25 * Math.PI, 1.75 * Math.PI); ctx.stroke();
        ctx.beginPath(); ctx.arc(32, 50, 19, 1.25 * Math.PI, 1.75 * Math.PI); ctx.stroke();
        ctx.beginPath(); ctx.arc(32, 50, 27, 1.25 * Math.PI, 1.75 * Math.PI); ctx.stroke();

        // 5. Перекреслення
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(18, 18);
        ctx.lineTo(46, 46);
        ctx.stroke();

        const texture = new THREE.CanvasTexture(canvas);

        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false, // Щоб було видно крізь стіни
            toneMapped: false, // Ігноруємо освітлення (завжди яскравий колір)
            fog: false // <--- ГОЛОВНА ЗМІНА: Ігноруємо туман (не тьмяніє здалеку)
        });

        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(0.6, 0.6, 1);
        sprite.position.copy(sensor.position);
        sprite.position.y += 0.6;

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