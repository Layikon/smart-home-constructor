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

    async function loadDeviceLibrary() {
        try {
            const response = await fetch('/static/data/devices.json');
            const data = await response.json();
            deviceLibrary = data.library;
            renderCategoryIcons(deviceLibrary);
        } catch (error) {
            console.error("Помилка завантаження бібліотеки:", error);
        }
    }

    // 1. Рендеримо іконки в сайдбар (Світлий стиль)
   function renderCategoryIcons(library) {
    sensorsContainer.innerHTML = '';
    // Отримуємо унікальні типи, включаючи hub
    const types = [...new Set(library.map(d => d.type))];

    types.forEach(type => {
        const btn = document.createElement('button');
        btn.className = `sensor-btn text-slate-400 hover:text-blue-500 text-xl p-2 w-full transition border-l-2 border-transparent`;

        let iconClass = 'fa-gear';
        // Визначаємо іконку залежно від типу
        if (type === 'temp') iconClass = 'fa-temperature-high text-rose-400';
        if (type === 'hum') iconClass = 'fa-droplet text-sky-400';
        if (type === 'motion') iconClass = 'fa-person-walking text-emerald-400';
        if (type === 'power') iconClass = 'fa-bolt text-amber-400';
        if (type === 'camera') iconClass = 'fa-video text-slate-400';
        if (type === 'hub') iconClass = 'fa-circle-nodes text-indigo-500';
        // --------------------------------

        btn.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;

        btn.onclick = () => {
            document.querySelectorAll('.sensor-btn').forEach(b => b.classList.remove('active', 'border-blue-500'));
            btn.classList.add('active', 'border-blue-500');
            selectToolBtn.classList.remove('active');

            const firstDevice = library.find(d => d.type === type);
            // Якщо для хаба в JSON категорія "Керування", він відкриє відповідну групу
            const catName = firstDevice.category || 'Керування';
            openDrawer(catName, type);
        };
        sensorsContainer.appendChild(btn);
    });
}

    function openDrawer(categoryName, deviceType) {
        const friendlyTitles = {
            'Клімат': 'Клімат та температура',
            'Безпека': 'Системи безпеки',
            'Електрика': 'Енергоспоживання',
            'Камери': 'Системи відеонагляду',
            'Керування': 'Центральні хаби' // Додано заголовок
        };

        drawerTitle.textContent = friendlyTitles[categoryName] || categoryName;

        const categoryDevices = deviceLibrary.filter(d => d.type === deviceType);
        const uniqueBrands = ['Всі', ...new Set(categoryDevices.map(d => d.brand))];

        filterContainer.innerHTML = '';
        uniqueBrands.forEach(brand => {
            const chip = document.createElement('button');
            chip.className = `brand-chip ${brand === "Всі" ? "active" : ""}`;
            chip.textContent = brand.toUpperCase();

            chip.onclick = () => {
                document.querySelectorAll('.brand-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                const filtered = brand === "Всі" ? categoryDevices : categoryDevices.filter(d => d.brand === brand);
                renderDrawerContent(filtered);
            };
            filterContainer.appendChild(chip);
        });

        renderDrawerContent(categoryDevices);
        drawer.classList.add('open');
    }

    // 2. Рендер списку моделей (Світла тема)
    function renderDrawerContent(devices) {
        drawerContent.innerHTML = '';
        devices.forEach((device) => {
            const item = document.createElement('div');
            item.className = 'drawer-item hover:bg-slate-50 transition-colors';

            const iconPath = device.icon_file ? `/static/data/icons/${device.icon_file}` : '/static/data/icons/default.png';

            // Відображаємо перший протокол або "No Prot."
            const mainProtocol = device.capabilities && device.capabilities.length > 0 ? device.capabilities[0] : 'N/A';

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
                // ОНОВЛЕНО: Тепер передаємо повний об'єкт технічних характеристик
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

    // 3. Права панель (Список встановлених датчиків)
    const typeLabels = {
        'temp': { label: 'Температура', color: 'text-rose-500', border: 'border-rose-200' },
        'hum': { label: 'Вологість', color: 'text-sky-500', border: 'border-sky-200' },
        'motion': { label: 'Рух', color: 'text-emerald-500', border: 'border-emerald-200' },
        'power': { label: 'Живлення', color: 'text-amber-500', border: 'border-amber-200' },
        'camera': { label: 'Камери', color: 'text-slate-500', border: 'border-slate-200' },
        'hub': { label: 'Хаби', color: 'text-indigo-500', border: 'border-indigo-200' } // Додано лейбл для хабів
    };

    window.refreshUIList = function() {
        objectListContainer.innerHTML = '';
        const sensors = scene.children.filter(obj => obj.userData && obj.userData.isSensor === true);
        const groups = {};

        sensors.forEach(s => {
            const type = s.userData.type;
            if (!groups[type]) groups[type] = [];
            groups[type].push(s);
        });

        Object.keys(typeLabels).forEach(type => {
            if (groups[type]) {
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