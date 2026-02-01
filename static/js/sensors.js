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

    // --- ФІКС 1: СПИСОК РЕЗЕРВНИХ МОДЕЛЕЙ ---
    // Це вирішує проблему, коли фантом був квадратиком
    const fallbackModels = {
        'temp': 'temp_sensor.glb',
        'hum': 'hum_sensor.glb',
        'temp/hum': 'temp_sensor.glb',
        'motion': 'motion_sensor.glb',
        'socket': 'socket.glb',
        'power': 'socket.glb',
        'switch': 'switch.glb',
        'camera': 'camera.glb',
        'door': 'door_sensor.glb',
        'hub': 'hub.glb'
    };

    function toggleLabel(sensorObj, show) {
        sensorObj.children.forEach(child => {
            if (child.isCSS2DObject && child.element) {
                if (show) child.element.classList.add('visible');
                else child.element.classList.remove('visible');
            }
        });
    }

    window.setPlacementMode = (isActive) => {
        isPlacementMode = isActive;

        // Ховаємо всі привиди при зміні режиму
        Object.values(ghostModels).forEach(m => m.visible = false);

        if (isActive) {
            container.style.cursor = 'crosshair';
            // Одразу оновлюємо фантом
            const config = getSelectedSensor();
            if (config) updateGhostModel(config);
        } else {
            container.style.cursor = 'default';
        }
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

    function showDefaultGhost(color) {
        if (!ghostModels['default']) {
            ghostModels['default'] = createDefaultMesh(0xffffff, 0.5);
            scene.add(ghostModels['default']);
        }
        currentGhost = ghostModels['default'];
        const colorHex = typeof color === 'string' ? parseInt(color.replace('#', '0x')) : (color || 0x3b82f6);
        currentGhost.material.color.setHex(colorHex);
        currentGhost.visible = true;
    }

    function updateGhostModel(sensorConfig) {
        if (!isPlacementMode) return;
        Object.values(ghostModels).forEach(m => m.visible = false);

        // Визначаємо модель: з конфігу або з резервного списку
        const modelName = sensorConfig.model_path || fallbackModels[sensorConfig.type];

        if (!modelName) {
            showDefaultGhost(sensorConfig.color);
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

                    // Перевіряємо, чи актуальна ця модель (поки вантажилась, користувач міг змінити вибір)
                    if (isPlacementMode) {
                        const currentCfg = getSelectedSensor();
                        const currentName = currentCfg.model_path || fallbackModels[currentCfg.type];
                        if (currentName === modelName) {
                            currentGhost = model;
                            currentGhost.visible = true;
                        }
                    }
                }, undefined, (err) => {
                    // Якщо модель не знайдена - показуємо кубик
                    // Це виправить відображення для тих типів, у яких ще немає GLB файлів
                    console.warn(`Ghost load failed for ${modelName}, using fallback.`);
                    showDefaultGhost(sensorConfig.color);
                });
            } else {
                currentGhost = ghostModels[modelName];
                if (currentGhost) currentGhost.visible = true;
            }
        }
    }

    // --- РУХ МИШІ ---
    container.addEventListener('pointermove', (event) => {
        const rect = container.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        if (!isPlacementMode) {
            // Логіка підсвітки (коли не ставимо)
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
                    container.style.cursor = 'pointer';
                    toggleLabel(hoveredSensor, true);
                }
            } else if (hoveredSensor) {
                toggleLabel(hoveredSensor, false);
                hoveredSensor = null;
                container.style.cursor = 'default';
            }
            return;
        }

        // Логіка Фантома (коли ставимо)
        if (!currentGhost) return;

        const intersects = raycaster.intersectObjects(draggableObjects, true)
            .filter(hit => !hit.object.userData.isHandle && !hit.object.userData.isSensor);

        if (intersects.length > 0) {
            const hit = intersects[0];
            currentGhost.visible = true;
            currentGhost.position.copy(hit.point);

            if (hit.face) {
                const worldNormal = hit.face.normal.clone();
                const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
                worldNormal.applyMatrix3(normalMatrix).normalize();
                currentGhost.lookAt(hit.point.clone().add(worldNormal));
                currentGhost.position.add(worldNormal.multiplyScalar(0.02));
            }
        } else {
            currentGhost.visible = false;
        }
    });

    container.addEventListener('pointerdown', (event) => {
        startX = event.clientX;
        startY = event.clientY;
    });

    // --- ВСТАНОВЛЕННЯ (КЛІК) ---
    container.addEventListener('pointerup', (event) => {
        if (!isPlacementMode || event.button !== 0) return;
        if (Math.abs(event.clientX - startX) > 5 || Math.abs(event.clientY - startY) > 5) return;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(draggableObjects, true)
            .filter(hit => !hit.object.userData.isHandle && !hit.object.userData.isSensor);

        if (intersects.length > 0) {
            const hit = intersects[0];
            const sensorConfig = getSelectedSensor();

            const finalizePlacement = (obj) => {
                obj.userData = {
                    isSensor: true,
                    id: Date.now(),
                    db_id: sensorConfig.id,
                    type: sensorConfig.type,
                    brand: sensorConfig.brand,
                    name: sensorConfig.name,
                    capabilities: sensorConfig.capabilities || [],
                    features: sensorConfig.features || {},
                    isConnected: false,
                    hubId: null
                };

                obj.position.copy(hit.point);
                if (hit.face) {
                    const worldNormal = hit.face.normal.clone();
                    const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
                    worldNormal.applyMatrix3(normalMatrix).normalize();
                    obj.lookAt(hit.point.clone().add(worldNormal));
                    obj.position.add(worldNormal.multiplyScalar(0.02));
                }

                obj.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                addSensorLabel(obj, sensorConfig.name);
                scene.add(obj);
                draggableObjects.push(obj);

                window.dispatchEvent(new CustomEvent('sensor-added', { detail: obj }));
                if (window.refreshUIList) window.refreshUIList();

                console.log(`Встановлено: ${sensorConfig.name}`);

                // --- ФІКС 3: ПРИБРАНО СКИНУТТЯ РЕЖИМУ ---
                // Ми більше не викликаємо window.setPlacementMode(false)
                // Тепер можна ставити багато датчиків поспіль
            };

            // Визначаємо модель для завантаження
            const modelToLoad = sensorConfig.model_path || fallbackModels[sensorConfig.type];

            if (modelToLoad) {
                loader.load(
                    `/static/models/${modelToLoad}`,
                    (gltf) => finalizePlacement(gltf.scene),
                    undefined,
                    (err) => {
                        // --- ФІКС 2: ОБРОБКА ПОМИЛКИ ХАБА ---
                        // Якщо модель (hub.glb) не знайдена, ставимо кубик, а не ламаємося
                        console.warn(`Failed to load ${modelToLoad}, fallback to box.`);
                        const colorHex = typeof sensorConfig.color === 'string' ? parseInt(sensorConfig.color.replace('#', '0x')) : (sensorConfig.color || 0x3b82f6);
                        finalizePlacement(createDefaultMesh(colorHex));
                    }
                );
            } else {
                const colorHex = typeof sensorConfig.color === 'string' ? parseInt(sensorConfig.color.replace('#', '0x')) : (sensorConfig.color || 0x3b82f6);
                finalizePlacement(createDefaultMesh(colorHex));
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
            const index = draggableObjects.indexOf(sensor);
            if (index > -1) draggableObjects.splice(index, 1);
            if (window.refreshUIList) window.refreshUIList();
            if (sensor.userData.label) sensor.remove(sensor.userData.label);
        }
    });
}