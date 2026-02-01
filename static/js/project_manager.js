// static/js/project_manager.js

export class ProjectManager {
    constructor(scene, roomManager, uiManager, draggableObjects) {
        this.scene = scene;
        this.room = roomManager;
        this.uiManager = uiManager;
        this.draggableObjects = draggableObjects;

        this.currentProjectId = null;
        this.currentProjectName = null;
        this.THREE = window.THREE;

        // Синхронізовані шляхи до моделей
        this.modelPaths = {
            'temp': '/static/models/temp_sensor.glb',
            'hum': '/static/models/hum_sensor.glb',
            'temp/hum': '/static/models/temp_sensor.glb',
            'motion': '/static/models/motion_sensor.glb',
            'smoke': '/static/models/motion_sensor.glb',
            'socket': '/static/models/socket.glb',
            'power': '/static/models/socket.glb',
            'switch': '/static/models/socket.glb',
            'camera': '/static/models/camera.glb',
            'door': '/static/models/door_sensor.glb',
            'hub': '/static/models/hub.glb'
        };
    }

    // --- ЗБЕРЕЖЕННЯ ---
    async saveProject(buttonId) {
        const saveBtn = document.getElementById(buttonId);
        if (!saveBtn) return;

        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ...';
        saveBtn.disabled = true;

        const projectData = {
            room: this.room.params,
            sensors: []
        };

        this.scene.traverse((obj) => {
            if (obj.userData && obj.userData.isSensor) {
                projectData.sensors.push({
                    type: obj.userData.type || 'generic',
                    name: obj.userData.name || 'Пристрій',
                    brand: obj.userData.brand || '',
                    model_path: obj.userData.model_path || '', // Зберігаємо шлях моделі
                    position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
                    rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z }
                });
            }
        });

        const payload = {
            scene: projectData,
            name: this.currentProjectName || `Мій Проєкт (${new Date().toLocaleDateString()})`
        };

        if (this.currentProjectId) {
            payload.id = this.currentProjectId;
        } else {
            const userProjectName = prompt("Введіть назву проєкту:", payload.name);
            if (userProjectName === null) {
                saveBtn.innerHTML = originalText;
                saveBtn.disabled = false;
                return;
            }
            payload.name = userProjectName;
        }

        try {
            const response = await fetch('/api/save_project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (response.ok) {
                if (result.id) {
                    this.currentProjectId = result.id;
                    this.currentProjectName = payload.name;
                    const newUrl = `${window.location.pathname}?id=${result.id}`;
                    window.history.pushState({ path: newUrl }, '', newUrl);
                }

                saveBtn.innerHTML = '<i class="fa-solid fa-check"></i> Збережено!';
                saveBtn.classList.replace('bg-blue-600', 'bg-green-600');

                setTimeout(() => {
                    saveBtn.innerHTML = originalText;
                    saveBtn.classList.replace('bg-green-600', 'bg-blue-600');
                    saveBtn.disabled = false;
                }, 2000);
            }
        } catch (error) {
            console.error('Save error:', error);
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }

    // --- ЗАВАНТАЖЕННЯ ---
    async loadLastProject() {
        const loadingOverlay = document.getElementById('loading-overlay');
        const urlParams = new URLSearchParams(window.location.search);
        const projectId = urlParams.get('id');

        if (!projectId) return;

        if(loadingOverlay) loadingOverlay.classList.remove('hidden');

        try {
            const projectResp = await fetch(`/api/project/${projectId}`);
            if (!projectResp.ok) return;

            const projectData = await projectResp.json();

            if (projectData.status === 'success') {
                this.currentProjectId = projectData.id;
                this.currentProjectName = projectData.name;
                this.reconstructScene(projectData.scene);
            }
        } catch (err) {
            console.error("Load error:", err);
        } finally {
            if(loadingOverlay) {
                setTimeout(() => loadingOverlay.classList.add('hidden'), 500);
            }
        }
    }

    reconstructScene(sceneData) {
        // 1. Відновлюємо кімнату
        if (sceneData.room) {
            this.room.params = sceneData.room;
            this.room.updateRoom();
            this.room.syncUI();
        }

        // 2. Відновлюємо датчики
        if (sceneData.sensors && sceneData.sensors.length > 0) {
            const loader = new this.THREE.GLTFLoader();

            sceneData.sensors.forEach(sensor => {
                // Пріоритет: шлях із бази -> шлях зі словника
                const path = sensor.model_path || this.modelPaths[sensor.type];

                const setupObj = (obj) => {
                    obj.position.set(sensor.position.x, sensor.position.y, sensor.position.z);
                    obj.rotation.set(sensor.rotation.x, sensor.rotation.y, sensor.rotation.z);

                    obj.userData = {
                        isSensor: true,
                        id: Date.now() + Math.random(),
                        type: sensor.type,
                        name: sensor.name,
                        brand: sensor.brand,
                        model_path: sensor.model_path
                    };

                    obj.traverse((n) => { if(n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });

                    this.scene.add(obj);
                    this.draggableObjects.push(obj);

                    // Додаємо 2D підпис назви
                    if (window.addSensorLabel) {
                        window.addSensorLabel(obj, sensor.name);
                    }

                    // Сповіщаємо UI Manager для оновлення списку праворуч
                    window.dispatchEvent(new CustomEvent('sensor-added', { detail: obj }));
                    if (this.uiManager && this.uiManager.addItemToList) {
                        this.uiManager.addItemToList(obj);
                    }
                };

                if (path) {
                    loader.load(path, (gltf) => {
                        const model = gltf.scene;
                        model.scale.set(0.5, 0.5, 0.5);
                        setupObj(model);
                    }, undefined, () => {
                        // Fallback на куб
                        const geo = new this.THREE.BoxGeometry(0.2, 0.2, 0.05);
                        const mat = new this.THREE.MeshStandardMaterial({ color: 0x3b82f6 });
                        setupObj(new this.THREE.Mesh(geo, mat));
                    });
                } else {
                    const geo = new this.THREE.BoxGeometry(0.2, 0.2, 0.05);
                    const mat = new this.THREE.MeshStandardMaterial({ color: 0x3b82f6 });
                    setupObj(new this.THREE.Mesh(geo, mat));
                }
            });
        }
    }
}