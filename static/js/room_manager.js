// static/js/room_manager.js

const THREE = window.THREE;

export class RoomManager {
    constructor(scene, camera, renderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.roomGroup = new THREE.Group();
        this.scene.add(this.roomGroup);

        this.params = { width: 8, depth: 6, height: 3, thickness: 0.2 };
        this.snapStep = 0.1;

        this.isDragging = false;
        this.activeHandle = null;

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        this.intersection = new THREE.Vector3();

        // Оновлені матеріали (Blueprint Style)
        this.materials = {
            wall: new THREE.MeshPhongMaterial({
                color: 0xd1d5db,       // Світло-сірий
                transparent: true,
                opacity: 0.25,
                side: THREE.DoubleSide,
                shininess: 40
            }),
            floor: new THREE.MeshPhongMaterial({
                color: 0xffffff,       // Чисто біла підлога для контрасту
                transparent: false,
                opacity: 1
            }),
            handle: new THREE.MeshBasicMaterial({
                color: 0x3b82f6,
                transparent: true,
                opacity: 0.8
            }),
            edges: new THREE.LineBasicMaterial({
                color: 0x64748b,       // Темніші контури (Slate 500)
                transparent: true,
                opacity: 0.5
            })
        };

        this.init();
        this.initDragLogic();
    }

    // ВАЖЛИВО: Цей метод тепер правильно вписаний у клас
    setEditorMode(isVisible) {
        this.isDragging = false;
        this.activeHandle = null;

        if (this.handles) {
            Object.values(this.handles).forEach(handle => {
                // 1. Приховуємо сам 3D об'єкт маніпулятора
                handle.visible = isVisible;

                // 2. Приховуємо DOM-елемент мітки через CSS
                if (handle.userData.label && handle.userData.label.element) {
                    handle.userData.label.element.style.visibility = isVisible ? 'visible' : 'hidden';
                    handle.userData.label.element.style.display = isVisible ? 'block' : 'none';
                }
            });
        }

        // 3. Приховуємо сітку кімнати в режимі симуляції для чистоти
        if (this.grid) {
            this.grid.visible = isVisible;
        }
    }

    snapValue(value) {
        return Math.round(value / this.snapStep) * this.snapStep;
    }

    createLabel() {
        if (!THREE.CSS2DObject) return new THREE.Group();
        const div = document.createElement('div');
        div.className = 'wall-label bg-white/95 text-slate-600 px-2 py-1 rounded text-[11px] font-black border border-slate-200 backdrop-blur-sm pointer-events-none shadow-sm';
        div.style.marginTop = '-2em';
        return new THREE.CSS2DObject(div);
    }

    updateSensors() {
        const { width, depth } = this.params;
        const halfW = width / 2;
        const halfD = depth / 2;
        const tolerance = 0.5;

        this.scene.traverse((obj) => {
            if (obj.userData && obj.userData.isSensor) {
                const pos = obj.position;
                if (Math.abs(pos.x - halfW) < tolerance || pos.x > halfW) pos.x = halfW;
                else if (Math.abs(pos.x + halfW) < tolerance || pos.x < -halfW) pos.x = -halfW;
                if (Math.abs(pos.z - halfD) < tolerance || pos.z > halfD) pos.z = halfD;
                else if (Math.abs(pos.z + halfD) < tolerance || pos.z < -halfD) pos.z = -halfD;
            }
        });
    }

    init() {
        this.floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.materials.floor);
        this.floor.rotation.x = -Math.PI / 2;
        this.roomGroup.add(this.floor);

        // Сітка кімнати (більш насичена)
        this.grid = new THREE.GridHelper(1, 1, 0x3b82f6, 0xbfdbfe);
        this.grid.position.y = 0.01;
        this.grid.material.transparent = true;
        this.grid.material.opacity = 0.3;
        this.roomGroup.add(this.grid);

        this.wallMesh = new THREE.Mesh(new THREE.BufferGeometry(), this.materials.wall);
        this.roomGroup.add(this.wallMesh);

        this.wallEdges = new THREE.LineSegments(new THREE.BufferGeometry(), this.materials.edges);
        this.roomGroup.add(this.wallEdges);

        const handleGeo = new THREE.BoxGeometry(1.2, 0.15, 0.15);
        this.handles = {
            right: this.createHandle('right', handleGeo),
            left: this.createHandle('left', handleGeo),
            front: this.createHandle('front', handleGeo),
            back: this.createHandle('back', handleGeo)
        };

        this.updateRoom();
    }

    createHandle(side, geo) {
        const mesh = new THREE.Mesh(geo, this.materials.handle.clone());
        mesh.userData.side = side;
        mesh.userData.label = this.createLabel();
        mesh.add(mesh.userData.label);
        this.roomGroup.add(mesh);
        return mesh;
    }

    updateRoom() {
        const { width, depth, height, thickness } = this.params;

        this.floor.scale.set(width, depth, 1);
        this.grid.scale.set(width, 1, depth);

        const shape = new THREE.Shape();
        shape.moveTo(-width/2, -depth/2);
        shape.lineTo(width/2, -depth/2);
        shape.lineTo(width/2, depth/2);
        shape.lineTo(-width/2, depth/2);
        shape.closePath();

        const hole = new THREE.Path();
        hole.moveTo(-width/2 + thickness, -depth/2 + thickness);
        hole.lineTo(width/2 - thickness, -depth/2 + thickness);
        hole.lineTo(width/2 - thickness, depth/2 - thickness);
        hole.lineTo(-width/2 + thickness, depth/2 - thickness);
        hole.closePath();
        shape.holes.push(hole);

        this.wallMesh.geometry.dispose();
        this.wallMesh.geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
        this.wallMesh.rotation.x = -Math.PI / 2;

        if (this.wallEdges.geometry) this.wallEdges.geometry.dispose();
        this.wallEdges.geometry = new THREE.EdgesGeometry(this.wallMesh.geometry);
        this.wallEdges.rotation.copy(this.wallMesh.rotation);

        const formatDim = (val) => {
            const m = Math.floor(val);
            const cm = Math.round((val - m) * 100);
            return cm > 0 ? `${m}м ${cm}см` : `${m}м`;
        };

        const hPos = 0.1, offset = 0.6;
        this.handles.right.position.set(width/2 + offset, hPos, 0);
        this.handles.right.rotation.set(0, Math.PI/2, 0);
        this.handles.right.userData.label.element.textContent = formatDim(depth);

        this.handles.left.position.set(-width/2 - offset, hPos, 0);
        this.handles.left.rotation.set(0, Math.PI/2, 0);
        this.handles.left.userData.label.element.textContent = formatDim(depth);

        this.handles.front.position.set(0, hPos, depth/2 + offset);
        this.handles.front.userData.label.element.textContent = formatDim(width);

        this.handles.back.position.set(0, hPos, -depth/2 - offset);
        this.handles.back.userData.label.element.textContent = formatDim(width);

        this.updateSensors();
    }

    initDragLogic() {
        const onDown = (e) => {
            if (this.handles.right && !this.handles.right.visible) return;

            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(Object.values(this.handles));
            if (intersects.length > 0) {
                this.isDragging = true;
                this.activeHandle = intersects[0].object;
                this.activeHandle.material.color.setHex(0x60a5fa);
                if (window.controls) window.controls.enabled = false;
            }
        };

        const onMove = (e) => {
            if (!this.isDragging || !this.activeHandle) return;
            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            this.raycaster.setFromCamera(this.mouse, this.camera);
            if (this.raycaster.ray.intersectPlane(this.dragPlane, this.intersection)) {
                const side = this.activeHandle.userData.side;
                if (side === 'right') this.params.width = Math.max(2, this.snapValue(this.intersection.x * 2));
                if (side === 'left') this.params.width = Math.max(2, this.snapValue(-this.intersection.x * 2));
                if (side === 'front') this.params.depth = Math.max(2, this.snapValue(this.intersection.z * 2));
                if (side === 'back') this.params.depth = Math.max(2, this.snapValue(-this.intersection.z * 2));
                this.updateRoom();
                this.syncUI();
            }
        };

        const onUp = () => {
            if (this.activeHandle) this.activeHandle.material.color.setHex(0x3b82f6);
            this.isDragging = false;
            this.activeHandle = null;
            if (window.controls) window.controls.enabled = true;
        };

        this.renderer.domElement.addEventListener('pointerdown', onDown);
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    }

    syncUI() {
        const inW = document.getElementById('room-w'), inD = document.getElementById('room-d');
        const valW = document.getElementById('val-room-w'), valD = document.getElementById('val-room-d');
        if(inW) inW.value = this.params.width;
        if(inD) inD.value = this.params.depth;
        if(valW) valW.textContent = `${this.params.width}m`;
        if(valD) valD.textContent = `${this.params.depth}m`;
    }
}