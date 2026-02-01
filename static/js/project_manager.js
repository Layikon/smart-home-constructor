// static/js/project_manager.js

// ПРИБРАНО ІМПОРТИ, використовуємо глобальний THREE з window

export class ProjectManager {
    constructor(scene, roomManager, uiManager, draggableObjects) {
        this.scene = scene;
        this.room = roomManager;
        this.uiManager = uiManager;
        this.draggableObjects = draggableObjects;

        // Стан поточного проєкту
        this.currentProjectId = null;
        this.currentProjectName = null;

        // Використовуємо глобальний об'єкт THREE
        this.THREE = window.THREE;

        // Шляхи до моделей
        this.modelPaths = {
            'temp': '/static/models/temp_sensor.glb',
            'hum': '/static/models/hum_sensor.glb',
            'motion': '/static/models/motion_sensor.glb',
            'socket': '/static/models/socket.glb',
            'switch': '/static/models/switch.glb',
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

        // 1. Збираємо дані сцени
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
                    // Зберігаємо точні координати та поворот
                    position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
                    rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z }
                });
            }
        });

        // 2. Формуємо запит
        const payload = {
            scene: projectData,
            name: this.currentProjectName || `Мій Проєкт (${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()})`
        };

        // Якщо це редагування існуючого - додаємо ID
        if (this.currentProjectId) {
            payload.id = this.currentProjectId;
        } else {
            // Якщо новий - питаємо ім'я (один раз)
            const userProjectName = prompt("Введіть назву проєкту:", payload.name);
            if (userProjectName === null) {
                // Користувач скасував збереження
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
                // Успіх! Оновлюємо стан
                if (result.id) {
                    this.currentProjectId = result.id;
                    this.currentProjectName = payload.name;

                    // Оновлюємо URL без перезавантаження, щоб наступні сейви йшли в цей ID
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
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Save error:', error);
            alert('Помилка збереження: ' + error.message);
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }

    // --- ЗАВАНТАЖЕННЯ (Оновлено для роботи з URL) ---
    async loadLastProject() {
        const loadingOverlay = document.getElementById('loading-overlay');

        // 1. Перевіряємо URL на наявність ID (?id=123)
        const urlParams = new URLSearchParams(window.location.search);
        const projectId = urlParams.get('id');

        // Якщо ID немає, значить користувач створює новий проєкт
        if (!projectId) {
            console.log("Режим створення нового проєкту");
            return;
        }

        if(loadingOverlay) loadingOverlay.classList.remove('hidden');

        try {
            // 2. Вантажимо конкретний проєкт по ID
            const projectResp = await fetch(`/api/project/${projectId}`);
            if (projectResp.status === 403 || projectResp.status === 401) {
                alert("У вас немає доступу до цього проєкту або ви не авторизовані.");
                window.location.href = '/login';
                return;
            }

            const projectData = await projectResp.json();

            if (projectData.status === 'success') {
                this.currentProjectId = projectData.id;
                this.currentProjectName = projectData.name;

                this.reconstructScene(projectData.scene);
                console.log(`Проєкт "${projectData.name}" завантажено!`);
            } else {
                alert('Не вдалося завантажити проєкт: ' + projectData.message);
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
        // 1. Відновлюємо параметри кімнати
        if (sceneData.room) {
            this.room.params = sceneData.room;
            this.room.updateRoom();
            this.room.syncUI();
        }

        // 2. Відновлюємо датчики та пристрої
        if (sceneData.sensors && sceneData.sensors.length > 0) {
            if (!this.THREE.GLTFLoader) {
                console.error("GLTFLoader missing!");
                return;
            }

            const loader = new this.THREE.GLTFLoader();

            // Використовуємо Promise.all для паралельного завантаження (швидше)
            sceneData.sensors.forEach(sensor => {
                const path = this.modelPaths[sensor.type];

                // Функція створення об'єкта (спільна для моделі і заглушки)
                const setupObj = (obj) => {
                    obj.position.set(sensor.position.x, sensor.position.y, sensor.position.z);
                    obj.rotation.set(sensor.rotation.x, sensor.rotation.y, sensor.rotation.z);

                    obj.userData = {
                        isSensor: true,
                        id: Date.now() + Math.random(), // Новий runtime ID
                        type: sensor.type,
                        name: sensor.name,
                        brand: sensor.brand
                    };

                    // Тіні
                    obj.traverse((n) => { if(n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });

                    this.scene.add(obj);
                    this.draggableObjects.push(obj); // Додаємо до взаємодії

                    // Сповіщаємо UI Manager (щоб з'явилось у списку праворуч)
                    if (window.dispatchEvent) {
                        window.dispatchEvent(new CustomEvent('sensor-added', { detail: obj }));
                    } else if (this.uiManager && this.uiManager.addItemToList) {
                        this.uiManager.addItemToList(obj);
                    }
                };

                if (path) {
                    loader.load(path, (gltf) => {
                        const model = gltf.scene;
                        model.scale.set(0.5, 0.5, 0.5); // Стандартний масштаб
                        setupObj(model);
                    }, undefined, (err) => {
                        console.warn(`Failed to load ${path}, using fallback box.`);
                        // Фолбек, якщо модель не знайдена
                        const geo = new this.THREE.BoxGeometry(0.2, 0.2, 0.2);
                        const mat = new this.THREE.MeshStandardMaterial({ color: 0x999999 });
                        setupObj(new this.THREE.Mesh(geo, mat));
                    });
                } else {
                    // Якщо шляху немає в словнику - просто кубик
                    const geo = new this.THREE.BoxGeometry(0.2, 0.2, 0.2);
                    const mat = new this.THREE.MeshStandardMaterial({ color: 0x3b82f6 });
                    setupObj(new this.THREE.Mesh(geo, mat));
                }
            });
        }
    }
}