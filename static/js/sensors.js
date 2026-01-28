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

    // --- ДОПОМІЖНА ФУНКЦІЯ ДЛЯ ПІДПИСІВ ---
    function toggleLabel(sensorObj, show) {
        sensorObj.children.forEach(child => {
            if (child.isCSS2DObject && child.element) {
                if (show) {
                    child.element.classList.add('visible');
                } else {
                    child.element.classList.remove('visible');
                }
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
            opacity: opacity,
            emissive: 0x000000
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData.isDefault = true;
        return mesh;
    }

    async function updateGhostModel(sensorConfig) {
        if (!isPlacementMode) return;
        Object.values(ghostModels).forEach(m => m.visible = false);

        // Використовуємо model_path з нашого JSON
        const modelName = sensorConfig.model_path || sensorConfig.model;

        if (!modelName) {
            if (!ghostModels['default']) {
                ghostModels['default'] = createDefaultMesh(0xffffff, 0.5);
                scene.add(ghostModels['default']);
            }
            currentGhost = ghostModels['default'];
            currentGhost.material.color.setHex(sensorConfig.color || 0xffffff);
        } else {
            if (!ghostModels[modelName]) {
                loader.load(`/static/models/${modelName}`,
                    (gltf) => {
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
                    },
                    undefined,
                    () => {
                        console.warn(`Модель ${modelName} не знайдена.`);
                        ghostModels[modelName] = createDefaultMesh(0xffffff, 0.5);
                        scene.add(ghostModels[modelName]);
                        currentGhost = ghostModels[modelName];
                    }
                );
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

        // Логіка підсвітки вже встановлених датчиків
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

        if (!isPlacementMode) return;

        const config = getSelectedSensor();
        updateGhostModel(config);

        // ФІЛЬТРАЦІЯ: Ігноруємо ручки (handles) при розрахунку позиції привида
        const intersects = raycaster.intersectObjects(draggableObjects, true)
            .filter(hit => !hit.object.userData.isHandle);

        if (intersects.length > 0 && currentGhost) {
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
        } else if (currentGhost) {
            currentGhost.visible = false;
        }
    });

    container.addEventListener('pointerdown', (event) => {
        startX = event.clientX;
        startY = event.clientY;
    });

    container.addEventListener('pointerup', (event) => {
        if (!isPlacementMode || event.button !== 0) return;

        const diffX = Math.abs(event.clientX - startX);
        const diffY = Math.abs(event.clientY - startY);
        if (diffX > 5 || diffY > 5) return;

        const rect = container.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        // ФІЛЬТРАЦІЯ: Ігноруємо ручки при встановленні
        const intersects = raycaster.intersectObjects(draggableObjects, true)
            .filter(hit => !hit.object.userData.isHandle);

        if (intersects.length > 0) {
            const hit = intersects[0];
            const sensorConfig = getSelectedSensor();
            const modelPath = sensorConfig.model_path || sensorConfig.model;

            const finalizePlacement = (obj) => {
                obj.userData.isSensor = true;
                obj.userData.type = sensorConfig.type;
                obj.userData.name = sensorConfig.name;
                obj.position.copy(hit.point);

                if (hit.face) {
                    const worldNormal = hit.face.normal.clone();
                    const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
                    worldNormal.applyMatrix3(normalMatrix).normalize();
                    obj.lookAt(hit.point.clone().add(worldNormal));
                    obj.position.add(worldNormal.multiplyScalar(0.015));
                }

                addSensorLabel(obj, sensorConfig.name || sensorConfig.type);
                scene.add(obj);
                if (window.refreshUIList) window.refreshUIList();
            };

            if (modelPath) {
                loader.load(`/static/models/${modelPath}`,
                    (gltf) => { finalizePlacement(gltf.scene); },
                    undefined,
                    () => { finalizePlacement(createDefaultMesh(sensorConfig.color || 0xff0000)); }
                );
            } else {
                finalizePlacement(createDefaultMesh(sensorConfig.color || 0xff0000));
            }
        }
    });

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