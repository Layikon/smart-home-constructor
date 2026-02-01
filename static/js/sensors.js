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

    // Кеш для завантажених фантомів
    const ghostModels = {};
    let currentGhost = null;
    let activeModelName = null; // Зберігаємо ім'я поточної необхідної моделі

    // Розширений список дефолтних моделей (якщо в JSON пусто)
    const fallbackModels = {
        'temp': 'temp_sensor.glb',
        'hum': 'hum_sensor.glb',
        'temp/hum': 'temp_sensor.glb',
        'motion': 'motion_sensor.glb',
        'smoke': 'motion_sensor.glb', // Використовуємо датчик руху як заглушку для диму, якщо нема своєї
        'socket': 'socket.glb',
        'power': 'socket.glb',
        'switch': 'socket.glb',       // Для вимикачів теж сокет, або switch.glb якщо є
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

        // Ховаємо всі фантоми
        Object.values(ghostModels).forEach(m => m.visible = false);

        if (isActive) {
            container.style.cursor = 'crosshair';
            const config = getSelectedSensor();
            if (config) updateGhostModel(config);
        } else {
            container.style.cursor = 'default';
            activeModelName = null;
        }
    };

    // Створення стандартного кубика (поки вантажиться модель)
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

    // Показати кубик
    function showDefaultGhost(color) {
        if (!ghostModels['default']) {
            ghostModels['default'] = createDefaultMesh(0xffffff, 0.5);
            scene.add(ghostModels['default']);
        }

        // Якщо вже є активний фантом-модель, ховаємо його
        if (currentGhost && currentGhost !== ghostModels['default']) {
            currentGhost.visible = false;
        }

        currentGhost = ghostModels['default'];

        const colorHex = typeof color === 'string' ? parseInt(color.replace('#', '0x')) : (color || 0x3b82f6);
        currentGhost.material.color.setHex(colorHex);
        currentGhost.visible = true;
    }

    function updateGhostModel(sensorConfig) {
        if (!isPlacementMode) return;

        // 1. Визначаємо, яка модель нам потрібна
        let modelName = sensorConfig.model_path;
        if (!modelName || modelName.trim() === "") {
            modelName = fallbackModels[sensorConfig.type];
        }

        // Запам'ятовуємо, що ми зараз хочемо саме цю модель
        activeModelName = modelName;

        // Якщо моделі взагалі немає -> кубик
        if (!modelName) {
            showDefaultGhost(sensorConfig.color);
            return;
        }

        // 2. Якщо модель вже є в кеші -> показуємо її
        if (ghostModels[modelName]) {
            if (ghostModels['default']) ghostModels['default'].visible = false; // Ховаємо куб

            // Ховаємо попередній фантом, якщо він був іншим
            if (currentGhost && currentGhost !== ghostModels[modelName]) {
                currentGhost.visible = false;
            }

            currentGhost = ghostModels[modelName];
            currentGhost.visible = true;
            return;
        }

        // 3. Якщо моделі немає -> показуємо кубик і починаємо завантаження
        showDefaultGhost(sensorConfig.color);

        loader.load(
            `/static/models/${modelName}`,
            (gltf) => {
                const model = gltf.scene;

                // Робимо модель напівпрозорою
                model.traverse((node) => {
                    if (node.isMesh) {
                        node.material = node.material.clone();
                        node.material.transparent = true;
                        node.material.opacity = 0.5;
                    }
                });

                scene.add(model);
                ghostModels[modelName] = model;

                // 4. ПЕРЕВІРКА: Чи ми все ще хочемо цю модель?
                // (Користувач міг вже переключитись на інший пристрій, поки це вантажилось)
                if (isPlacementMode && activeModelName === modelName) {
                    if (ghostModels['default']) ghostModels['default'].visible = false; // Ховаємо куб
                    if (currentGhost) currentGhost.visible = false; // Ховаємо старе

                    currentGhost = model;
                    currentGhost.visible = true;
                } else {
                    model.visible = false;
                }
            },
            undefined,
            (error) => {
                console.warn(`Ghost model not found: ${modelName}. Using box.`);
                // Якщо помилка - залишаємо кубик активним
                if (activeModelName === modelName) {
                    showDefaultGhost(sensorConfig.color);
                }
            }
        );
    }

    // --- РУХ МИШІ ---
    container.addEventListener('pointermove', (event) => {
        const rect = container.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        // Логіка підсвітки вже встановлених (коли не в режимі розміщення)
        if (!isPlacementMode) {
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

        // Логіка руху Фантома
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
                currentGhost.position.add(worldNormal.multiplyScalar(0.02)); // Трохи над поверхнею
            }
        } else {
            currentGhost.visible = false;
        }
    });

    container.addEventListener('pointerdown', (event) => {
        startX = event.clientX;
        startY = event.clientY;
    });

    // --- ВСТАНОВЛЕННЯ ПРИСТРОЮ ---
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
            };

            // Визначаємо, що вантажити
            let modelToLoad = sensorConfig.model_path;
            if (!modelToLoad || modelToLoad.trim() === "") {
                modelToLoad = fallbackModels[sensorConfig.type];
            }

            if (modelToLoad) {
                loader.load(
                    `/static/models/${modelToLoad}`,
                    (gltf) => finalizePlacement(gltf.scene),
                    undefined,
                    (err) => {
                        console.warn(`Load failed for placement: ${modelToLoad}. Using box.`);
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

    // Видалення (ПКМ)
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