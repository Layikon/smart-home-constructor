// static/js/ui_manager.js

export function initUI(scene, camera, controls, onSensorSelectCallback) {
    const sensorsContainer = document.getElementById('dynamic-sensors');
    const selectToolBtn = document.getElementById('tool-select');
    const objectListContainer = document.getElementById('object-list');

    const drawer = document.getElementById('device-drawer');
    const drawerTitle = document.getElementById('drawer-title');
    const drawerContent = document.getElementById('drawer-content');
    const filterContainer = document.getElementById('brand-filter-container');

    let cameraTarget = null;
    let orbitTarget = null;
    let deviceLibrary = [];

    // --- СТАТИЧНА СТРУКТУРА ІНТЕРФЕЙСУ (ЯК У BLENDER) ---
    const UI_STRUCTURE = {
        'Клімат': {
            icon: 'fa-thermometer-half',
            color: 'text-rose-400',
            subtypes: ['temp', 'hum', 'air', 'press']
        },
        'Безпека': {
            icon: 'fa-shield-halved',
            color: 'text-emerald-400',
            subtypes: ['motion', 'door', 'leak', 'smoke', 'gas']
        },
        'Електрика': {
            icon: 'fa-bolt',
            color: 'text-amber-400',
            subtypes: ['power', 'switch', 'relay', 'light']
        },
        'Камери': {
            icon: 'fa-video',
            color: 'text-slate-400',
            subtypes: ['camera']
        },
        'Керування': {
            icon: 'fa-microchip',
            color: 'text-indigo-500',
            subtypes: ['hub']
        }
    };

    // Словник для гарних назв підкатегорій (чіпсів)
    const subCategoryLabels = {
        'temp': 'Термометри',
        'hum': 'Вологість',
        'air': 'Повітря',
        'press': 'Тиск',
        'motion': 'Рух',
        'door': 'Відкриття',
        'leak': 'Протікання',
        'smoke': 'Дим',
        'gas': 'Газ',
        'power': 'Розетки',
        'switch': 'Вимикачі',
        'relay': 'Реле',
        'light': 'Світло',
        'camera': 'Камери',
        'hub': 'Хаби'
    };

    async function loadDeviceLibrary() {
        try {
            const response = await fetch(`/static/data/devices.json?t=${Date.now()}`);
            const data = await response.json();
            deviceLibrary = data.library;
            renderFixedSidebar(); // Рендеримо сталий сайдбар
        } catch (error) {
            console.error("Помилка завантаження бібліотеки:", error);
        }
    }

    // 1. Рендеримо фіксований сайдбар за нашою структурою
    function renderFixedSidebar() {
        sensorsContainer.innerHTML = '';

        Object.keys(UI_STRUCTURE).forEach(catName => {
            const config = UI_STRUCTURE[catName];
            const btn = document.createElement('button');
            btn.className = `sensor-btn text-slate-400 hover:text-blue-500 text-xl p-2 w-full transition border-l-2 border-transparent`;

            btn.innerHTML = `<i class="fa-solid ${config.icon} ${config.color}"></i>`;

            btn.onclick = () => {
                document.querySelectorAll('.sensor-btn').forEach(b => b.classList.remove('active', 'border-blue-500'));
                btn.classList.add('active', 'border-blue-500');
                selectToolBtn.classList.remove('active');
                openDrawer(catName);
            };
            sensorsContainer.appendChild(btn);
        });
    }

    // 2. Відкриваємо шторку з наперед заданими підкатегоріями
    function openDrawer(categoryName) {
        const friendlyTitles = {
            'Клімат': 'Клімат та середовище',
            'Безпека': 'Системи безпеки',
            'Електрика': 'Енергоспоживання',
            'Камери': 'Відеонагляд',
            'Керування': 'Центральні хаби'
        };

        drawerTitle.textContent = friendlyTitles[categoryName] || categoryName;
        const config = UI_STRUCTURE[categoryName];

        // Фільтруємо пристрої, які належать до ТИПІВ цієї великої категорії
        const categoryDevices = deviceLibrary.filter(d => config.subtypes.includes(d.type));

        filterContainer.innerHTML = '';

        // Кнопка "Всі" для цієї категорії
        const allChip = document.createElement('button');
        allChip.className = `brand-chip active`;
        allChip.textContent = 'ВСІ';
        allChip.onclick = () => {
            document.querySelectorAll('.brand-chip').forEach(c => c.classList.remove('active'));
            allChip.classList.add('active');
            renderDrawerContent(categoryDevices);
        };
        filterContainer.appendChild(allChip);

        // Створюємо чіпси підкатегорій, які МИ ЗАДАЛИ (навіть якщо пристроїв ще немає)
        config.subtypes.forEach(type => {
            const chip = document.createElement('button');
            chip.className = `brand-chip`;
            chip.textContent = (subCategoryLabels[type] || type).toUpperCase();

            chip.onclick = () => {
                document.querySelectorAll('.brand-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                // Показуємо пристрої тільки цього конкретного типу
                const filtered = categoryDevices.filter(d => d.type === type);
                renderDrawerContent(filtered);
            };
            filterContainer.appendChild(chip);
        });

        renderDrawerContent(categoryDevices);
        drawer.classList.add('open');
    }

    function renderDrawerContent(devices) {
        drawerContent.innerHTML = '';
        if (devices.length === 0) {
            drawerContent.innerHTML = '<div class="text-[10px] text-slate-400 p-4 italic text-center w-full">У цій категорії ще немає пристроїв</div>';
            return;
        }

        devices.forEach((device) => {
            const item = document.createElement('div');
            item.className = 'drawer-item hover:bg-slate-50 transition-colors';
            const iconPath = device.icon_file ? `/static/data/icons/${device.icon_file}` : '/static/data/icons/default.png';
            const mainProtocol = (device.capabilities && device.capabilities.length > 0) ? device.capabilities[0] : (device.protocol || 'N/A');

            item.innerHTML = `
                <div class="icon-wrapper border-slate-100 bg-white shadow-sm">
                    <img src="${iconPath}" class="w-full h-full object-contain">
                </div>
                <div class="flex flex-col overflow-hidden">
                    <div class="flex items-center gap-2">
                        <span class="text-[10px] text-blue-500 font-bold uppercase tracking-tighter opacity-80">${device.brand}</span>
                        <span class="text-[8px] bg-slate-100 px-1 rounded text-slate-500 font-mono uppercase">${mainProtocol}</span>
                    </div>
                    <span class="text-[11px] text-slate-700 font-bold leading-tight truncate">${device.name}</span>
                </div>
            `;

            item.onclick = () => {
                const sensorConfig = {
                    id: device.id,
                    brand: device.brand,
                    type: device.type,
                    name: `${device.brand} ${device.name}`,
                    model_path: device.model_path,
                    color: device.color,
                    capabilities: device.capabilities || [],
                    features: device.features || {}
                };
                if (window.setPlacementMode) window.setPlacementMode(true);
                onSensorSelectCallback(sensorConfig);
            };
            drawerContent.appendChild(item);
        });
    }

    // 3. Права панель
    const typeLabels = {
        'temp': { label: 'Температура', color: 'text-rose-500', border: 'border-rose-200' },
        'hum': { label: 'Вологість', color: 'text-sky-500', border: 'border-sky-200' },
        'motion': { label: 'Рух', color: 'text-emerald-500', border: 'border-emerald-200' },
        'power': { label: 'Живлення', color: 'text-amber-500', border: 'border-amber-200' },
        'camera': { label: 'Камери', color: 'text-slate-500', border: 'border-slate-200' },
        'hub': { label: 'Хаби', color: 'text-indigo-500', border: 'border-indigo-200' }
    };

    window.refreshUIList = function() {
        objectListContainer.innerHTML = '';
        const sensors = scene.children.filter(obj => obj.userData && obj.userData.isSensor === true);
        const counter = document.getElementById('sensor-count');
        if (counter) counter.textContent = sensors.length;
        const groups = {};
        sensors.forEach(s => {
            const type = s.userData.type;
            if (!groups[type]) groups[type] = [];
            groups[type].push(s);
        });

        Object.keys(typeLabels).forEach(type => {
            if (groups[type] && groups[type].length > 0) {
                const header = document.createElement('div');
                header.className = `flex items-center space-x-2 border-b-2 ${typeLabels[type].border} pb-1 mb-2 mt-4`;
                header.innerHTML = `<span class="text-[10px] font-black uppercase ${typeLabels[type].color}">${typeLabels[type].label}</span>`;
                objectListContainer.appendChild(header);

                groups[type].forEach((s) => {
                    const item = document.createElement('div');
                    item.className = "flex items-center justify-between bg-white border border-slate-100 p-2 rounded-lg text-[10px] hover:border-blue-300 hover:shadow-sm transition cursor-pointer group mb-1";
                    item.onclick = (e) => {
                        if (e.target.closest('button')) return;
                        const sensor = scene.getObjectById(s.id);
                        if (sensor) {
                            cameraTarget = sensor.position.clone().add(new window.THREE.Vector3(4, 4, 4));
                            orbitTarget = sensor.position.clone();
                        }
                    };
                    item.innerHTML = `
                        <span class="text-slate-600 font-medium">${s.userData.name || 'Датчик'}</span>
                        <button onclick="window.removeSensorById(${s.id})" class="text-slate-300 hover:text-rose-500 transition">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    `;
                    objectListContainer.appendChild(item);
                });
            }
        });
    };

    window.removeSensorById = function(id) {
        const sensor = scene.getObjectById(id);
        if (sensor) {
            scene.remove(sensor);
            window.refreshUIList();
        }
    };

    selectToolBtn.addEventListener('click', () => {
        document.querySelectorAll('.sensor-btn').forEach(b => b.classList.remove('active', 'border-blue-500'));
        selectToolBtn.classList.add('active');
        drawer.classList.remove('open');
        if (window.setPlacementMode) window.setPlacementMode(false);
    });

    loadDeviceLibrary();

    return {
        updateCamera: (lerpFactor) => {
            if (cameraTarget && orbitTarget) {
                camera.position.lerp(cameraTarget, lerpFactor);
                controls.target.lerp(orbitTarget, lerpFactor);
                if (camera.position.distanceTo(cameraTarget) < 0.05) {
                    cameraTarget = null;
                    orbitTarget = null;
                }
            }
        }
    };
}