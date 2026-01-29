// static/js/room_manager.js

const THREE = window.THREE;

export class RoomManager {
    constructor(scene, camera, renderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;

        // Група кімнати, яку ми будемо рухати для ефекту розтягування
        this.roomGroup = new THREE.Group();
        this.scene.add(this.roomGroup);

        this.params = { width: 8, depth: 6, height: 3, thickness: 0.2 };
        this.snapStep = 0.1;

        this.isDragging = false;
        this.activeHandle = null;

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        // Площина перетягування завжди на рівні підлоги (Y=0)
        this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        this.intersection = new THREE.Vector3();

        // Матеріали (Optimized reuse)
        this.materials = {
            wall: new THREE.MeshPhongMaterial({
                color: 0xd1d5db,
                transparent: true,
                opacity: 0.25,
                side: THREE.DoubleSide,
                shininess: 40
            }),
            floor: new THREE.MeshPhongMaterial({
                color: 0xffffff,
                transparent: false,
                opacity: 1
            }),
            handle: new THREE.MeshBasicMaterial({
                color: 0x3b82f6,
                transparent: true,
                opacity: 0.8
            }),
            edges: new THREE.LineBasicMaterial({
                color: 0x64748b,
                transparent: true,
                opacity: 0.5
            })
        };

        this.init();
        this.initDragLogic();
    }

    setEditorMode(isVisible) {
        this.isDragging = false;
        this.activeHandle = null;

        if (this.handles) {
            Object.values(this.handles).forEach(handle => {
                handle.visible = isVisible;
                if (handle.userData.label && handle.userData.label.element) {
                    const style = handle.userData.label.element.style;
                    style.visibility = isVisible ? 'visible' : 'hidden';
                    style.display = isVisible ? 'block' : 'none';
                }
            });
        }

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

    // Оновлена логіка датчиків: враховує зміщення центру кімнати
    updateSensors() {
        const { width, depth } = this.params;
        const center = this.roomGroup.position;

        // Глобальні межі стін
        const minX = center.x - width / 2;
        const maxX = center.x + width / 2;
        const minZ = center.z - depth / 2;
        const maxZ = center.z + depth / 2;

        const tolerance = 0.5;

        this.scene.traverse((obj) => {
            if (obj.userData && obj.userData.isSensor) {
                const pos = obj.position;

                // Перевіряємо вихід за межі по X
                if (pos.x > maxX - tolerance) pos.x = maxX;
                else if (pos.x < minX + tolerance) pos.x = minX;

                // Перевіряємо вихід за межі по Z
                if (pos.z > maxZ - tolerance) pos.z = maxZ;
                else if (pos.z < minZ + tolerance) pos.z = minZ;
            }
        });
    }

    init() {
        this.floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.materials.floor);
        this.floor.rotation.x = -Math.PI / 2;
        this.roomGroup.add(this.floor);

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
        // Створюємо ручки один раз, далі тільки оновлюємо позиції
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
        const hw = width / 2;
        const hd = depth / 2;

        // Зовнішній контур
        shape.moveTo(-hw, -hd);
        shape.lineTo(hw, -hd);
        shape.lineTo(hw, hd);
        shape.lineTo(-hw, hd);
        shape.closePath();

        // Внутрішній отвір (стіни)
        const hole = new THREE.Path();
        hole.moveTo(-hw + thickness, -hd + thickness);
        hole.lineTo(hw - thickness, -hd + thickness);
        hole.lineTo(hw - thickness, hd - thickness);
        hole.lineTo(-hw + thickness, hd - thickness);
        hole.closePath();
        shape.holes.push(hole);

        this.wallMesh.geometry.dispose();
        this.wallMesh.geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
        this.wallMesh.rotation.x = -Math.PI / 2;

        if (this.wallEdges.geometry) this.wallEdges.geometry.dispose();
        this.wallEdges.geometry = new THREE.EdgesGeometry(this.wallMesh.geometry);
        this.wallEdges.rotation.copy(this.wallMesh.rotation);

        // Оновлення позицій ручок
        const formatDim = (val) => {
            const m = Math.floor(val);
            const cm = Math.round((val - m) * 100);
            return cm > 0 ? `${m}м ${cm}см` : `${m}м`;
        };

        const hPos = 0.1, offset = 0.6;

        this.handles.right.position.set(hw + offset, hPos, 0);
        this.handles.right.rotation.set(0, Math.PI/2, 0);
        this.handles.right.userData.label.element.textContent = formatDim(depth);

        this.handles.left.position.set(-hw - offset, hPos, 0);
        this.handles.left.rotation.set(0, Math.PI/2, 0);
        this.handles.left.userData.label.element.textContent = formatDim(depth);

        this.handles.front.position.set(0, hPos, hd + offset);
        this.handles.front.rotation.set(0, 0, 0);
        this.handles.front.userData.label.element.textContent = formatDim(width);

        this.handles.back.position.set(0, hPos, -hd - offset);
        this.handles.back.rotation.set(0, 0, 0);
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
                const currentPos = this.roomGroup.position;
                const { width, depth } = this.params;

                // --- НОВА ЛОГІКА РОЗТЯГУВАННЯ ---
                // Ми змінюємо розмір І зміщуємо центр кімнати, щоб протилежна сторона стояла на місці

                if (side === 'right') {
                    // Ліва стіна фіксована
                    const leftEdgeX = currentPos.x - width / 2;
                    let newWidth = this.snapValue(this.intersection.x - leftEdgeX);
                    if (newWidth < 2) newWidth = 2;

                    this.params.width = newWidth;
                    this.roomGroup.position.x = leftEdgeX + newWidth / 2;
                }
                else if (side === 'left') {
                    // Права стіна фіксована
                    const rightEdgeX = currentPos.x + width / 2;
                    let newWidth = this.snapValue(rightEdgeX - this.intersection.x);
                    if (newWidth < 2) newWidth = 2;

                    this.params.width = newWidth;
                    this.roomGroup.position.x = rightEdgeX - newWidth / 2;
                }
                else if (side === 'front') {
                    // Задня стіна фіксована
                    const backEdgeZ = currentPos.z - depth / 2;
                    let newDepth = this.snapValue(this.intersection.z - backEdgeZ);
                    if (newDepth < 2) newDepth = 2;

                    this.params.depth = newDepth;
                    this.roomGroup.position.z = backEdgeZ + newDepth / 2;
                }
                else if (side === 'back') {
                    // Передня стіна фіксована
                    const frontEdgeZ = currentPos.z + depth / 2;
                    let newDepth = this.snapValue(frontEdgeZ - this.intersection.z);
                    if (newDepth < 2) newDepth = 2;

                    this.params.depth = newDepth;
                    this.roomGroup.position.z = frontEdgeZ - newDepth / 2;
                }

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