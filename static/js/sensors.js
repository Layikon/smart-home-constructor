// static/js/sensors.js
import { addSensorLabel } from './labels.js';

export function initSensorPlacement(container, scene, camera, draggableObjects, getSelectedSensor) {
    const THREE = window.THREE;
    const loader = new THREE.GLTFLoader();
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    let startX = 0, startY = 0;
    let isPlacementMode = false;
    let hoveredSensor = null;

    const ghostModels = {};
    let currentGhost = null;

    function toggleLabel(sensorObj, show) {
        sensorObj.children.forEach(child => {
            if (child.isCSS2DObject && child.element) {
                if (show) child.element.classList.add('visible');
                else child.element.classList.remove('visible');
            }
        });
    }

    window.setPlacementMode = (val) => {
        isPlacementMode = val;
        Object.values(ghostModels).forEach(m => m.visible = false);
    };

    function createDefaultMesh(color, opacity = 1) {
        const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.05);
        const material = new THREE.MeshStandardMaterial({
            color: color,
            transparent: opacity < 1,
            opacity: opacity
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData.isDefault = true;
        return mesh;
    }

    async function updateGhostModel(sensorConfig) {
        if (!isPlacementMode) return;
        Object.values(ghostModels).forEach(m => m.visible = false);

        const modelName = sensorConfig.model_path;

        if (!modelName) {
            if (!ghostModels['default']) {
                ghostModels['default'] = createDefaultMesh(0xffffff, 0.5);
                scene.add(ghostModels['default']);
            }
            currentGhost = ghostModels['default'];
            currentGhost.material.color.setHex(parseInt(sensorConfig.color || "0xffffff"));
        } else {
            if (!ghostModels[modelName]) {
                loader.load(`/static/models/${modelName}`, (gltf) => {
                    const model = gltf.scene;
                    model.traverse((node) => {
                        if (node.isMesh) {
                            node.material = node.material.clone();
                            node.material.transparent = true;
                            node.material.opacity = 0.5;
                        }
                    });
                    scene.add(model);
                    ghostModels[modelName] = model;
                    currentGhost = model;
                    currentGhost.visible = true;
                });
                return;
            } else {
                currentGhost = ghostModels[modelName];
            }
        }
        if (currentGhost) currentGhost.visible = true;
    }

    container.addEventListener('pointermove', (event) => {
        const rect = container.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        // Підсвітка при наведенні
        const allIntersects = raycaster.intersectObjects(scene.children, true);
        const sensorHit = allIntersects.find(i => {
            let p = i.object;
            while(p) { if(p.userData?.isSensor) return true; p = p.parent; }
            return false;
        });

        if (sensorHit) {
            let obj = sensorHit.object;
            while(obj.parent && !obj.userData.isSensor) obj = obj.parent;
            if (hoveredSensor !== obj) {
                if (hoveredSensor) toggleLabel(hoveredSensor, false);
                hoveredSensor = obj;
                document.body.style.cursor = 'pointer';
                toggleLabel(hoveredSensor, true);
            }
        } else if (hoveredSensor) {
            toggleLabel(hoveredSensor, false);
            hoveredSensor = null;
            document.body.style.cursor = 'default';
        }

        if (!isPlacementMode || !currentGhost) return;

        const intersects = raycaster.intersectObjects(draggableObjects, true)
            .filter(hit => !hit.object.userData.isHandle);

        if (intersects.length > 0) {
            const hit = intersects[0];
            currentGhost.visible = true;
            currentGhost.position.copy(hit.point);

            if (hit.face) {
                const worldNormal = hit.face.normal.clone();
                const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
                worldNormal.applyMatrix3(normalMatrix).normalize();
                currentGhost.lookAt(hit.point.clone().add(worldNormal));
                currentGhost.position.add(worldNormal.multiplyScalar(0.015));
            }
        } else {
            currentGhost.visible = false;
        }
    });

    container.addEventListener('pointerdown', (event) => {
        startX = event.clientX;
        startY = event.clientY;
    });

    container.addEventListener('pointerup', (event) => {
        if (!isPlacementMode || event.button !== 0) return;
        if (Math.abs(event.clientX - startX) > 5 || Math.abs(event.clientY - startY) > 5) return;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(draggableObjects, true)
            .filter(hit => !hit.object.userData.isHandle);

        if (intersects.length > 0) {
            const hit = intersects[0];
            const sensorConfig = getSelectedSensor();

            const finalizePlacement = (obj) => {
                // --- ОНОВЛЕНА ЛОГІКА ДАНИХ ПРИСТРОЮ ---
                obj.userData = {
                    isSensor: true,
                    id: sensorConfig.id,
                    type: sensorConfig.type,
                    brand: sensorConfig.brand,
                    name: sensorConfig.name,
                    // Зберігаємо протоколи в самому об'єкті на сцені
                    capabilities: sensorConfig.capabilities || [],
                    features: sensorConfig.features || {},
                    isConnected: false, // чи підключений до хаба
                    hubId: null        // ID хаба, до якого підключений
                };

                obj.position.copy(hit.point);
                if (hit.face) {
                    const worldNormal = hit.face.normal.clone();
                    const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
                    worldNormal.applyMatrix3(normalMatrix).normalize();
                    obj.lookAt(hit.point.clone().add(worldNormal));
                    obj.position.add(worldNormal.multiplyScalar(0.02));
                }

                addSensorLabel(obj, sensorConfig.name);
                scene.add(obj);

                // Додаємо в масив для взаємодії
                if (window.refreshUIList) window.refreshUIList();

                console.log(`Встановлено: ${sensorConfig.name} (${sensorConfig.type}). Протоколи:`, obj.userData.capabilities);
            };

            if (sensorConfig.model_path) {
                loader.load(`/static/models/${sensorConfig.model_path}`, (gltf) => finalizePlacement(gltf.scene));
            } else {
                finalizePlacement(createDefaultMesh(sensorConfig.color || 0x3b82f6));
            }
        }
    });

    // Видалення на ПКМ
    container.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);
        const hit = intersects.find(i => {
            let p = i.object;
            while(p) { if(p.userData?.isSensor) return true; p = p.parent; }
            return false;
        });

        if (hit) {
            let sensor = hit.object;
            while(sensor.parent && !sensor.userData.isSensor) sensor = sensor.parent;
            scene.remove(sensor);
            if (window.refreshUIList) window.refreshUIList();
        }
    });
}