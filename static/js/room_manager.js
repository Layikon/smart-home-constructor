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

        this.materials = {
            wall: new THREE.MeshPhongMaterial({
                color: 0xd1d5db,
                transparent: true,
                opacity: 0.25,
                side: THREE.DoubleSide,
                shininess: 40
            }),
            floor: new THREE.MeshStandardMaterial({
                color: 0xcccccc,
                roughness: 0.8,
                metalness: 0.1
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

    // ВИПРАВЛЕНО: Більш надійна логіка видимості
    setEditorMode(isVisible) {
        this.isDragging = false;
        this.activeHandle = null;

        if (this.handles) {
            Object.values(this.handles).forEach(handle => {
                handle.visible = isVisible;

                if (handle.userData.label) {
                    // Керуємо видимістю самого CSS2D об'єкта
                    handle.userData.label.visible = isVisible;

                    if (handle.userData.label.element) {
                        const el = handle.userData.label.element;
                        if (isVisible) {
                            el.style.display = 'block';
                            el.style.opacity = '1';
                        } else {
                            el.style.display = 'none';
                        }
                    }
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
        // Додано перевірку класів
        div.className = 'wall-label bg-white/95 text-slate-600 px-2 py-1 rounded text-[11px] font-black border border-slate-200 backdrop-blur-sm pointer-events-none shadow-sm z-50';
        div.style.marginTop = '-2em';
        // Прибираємо display: none звідси, керуємо лише через setEditorMode
        return new THREE.CSS2DObject(div);
    }

    init() {
        this.floorThickness = 0.2;
        this.floor = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), this.materials.floor);
        this.floor.userData.isWall = false;
        this.roomGroup.add(this.floor);

        this.grid = new THREE.GridHelper(1, 1, 0x3b82f6, 0xbfdbfe);
        this.grid.position.y = 0.002;
        this.grid.material.transparent = true;
        this.grid.material.opacity = 0.3;
        this.roomGroup.add(this.grid);

        this.wallMesh = new THREE.Mesh(new THREE.BufferGeometry(), this.materials.wall);
        this.wallMesh.userData.isWall = true;
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
        // Початковий стан — вимкнено
        this.setEditorMode(false);
    }

    createHandle(side, geo) {
        const mesh = new THREE.Mesh(geo, this.materials.handle.clone());
        mesh.userData.side = side;
        mesh.userData.isHandle = true;
        mesh.userData.label = this.createLabel();
        mesh.add(mesh.userData.label);
        this.roomGroup.add(mesh);
        return mesh;
    }

    updateRoom() {
        const { width, depth, height, thickness } = this.params;

        this.floor.scale.set(width, this.floorThickness, depth);
        this.floor.position.y = -(this.floorThickness / 2);
        this.grid.scale.set(width, 1, depth);

        const shape = new THREE.Shape();
        const hw = width / 2;
        const hd = depth / 2;

        shape.moveTo(-hw, -hd);
        shape.lineTo(hw, -hd);
        shape.lineTo(hw, hd);
        shape.lineTo(-hw, hd);
        shape.closePath();

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
        this.wallMesh.position.y = 0.001;

        if (this.wallEdges.geometry) this.wallEdges.geometry.dispose();
        this.wallEdges.geometry = new THREE.EdgesGeometry(this.wallMesh.geometry);
        this.wallEdges.rotation.copy(this.wallMesh.rotation);
        this.wallEdges.position.y = this.wallMesh.position.y;

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
            e.preventDefault();

            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);

            if (this.raycaster.ray.intersectPlane(this.dragPlane, this.intersection)) {
                const side = this.activeHandle.userData.side;
                if (side === 'right') this.params.width = this.snapValue(Math.max(2, this.intersection.x * 2));
                if (side === 'left') this.params.width = this.snapValue(Math.max(2, -this.intersection.x * 2));
                if (side === 'front') this.params.depth = this.snapValue(Math.max(2, this.intersection.z * 2));
                if (side === 'back') this.params.depth = this.snapValue(Math.max(2, -this.intersection.z * 2));

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
        window.addEventListener('pointermove', onMove, { passive: false });
        window.addEventListener('pointerup', onUp);
    }

    syncUI() {
        const inW = document.getElementById('room-w'), inD = document.getElementById('room-d');
        if(inW) inW.value = this.params.width;
        if(inD) inD.value = this.params.depth;
    }

    updateSensors() {
        const { width, depth } = this.params;
        const hw = width / 2;
        const hd = depth / 2;
        this.scene.traverse((obj) => {
            if (obj.userData && obj.userData.isSensor) {
                const pos = obj.position;
                pos.x = Math.max(-hw + 0.2, Math.min(hw - 0.2, pos.x));
                pos.z = Math.max(-hd + 0.2, Math.min(hd - 0.2, pos.z));
            }
        });
    }
}