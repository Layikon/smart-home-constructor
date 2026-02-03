// static/js/ui_manager.js

export function initUI(scene, camera, controls, onSensorSelectCallback) {
    const sensorsContainer = document.getElementById('dynamic-sensors');
    const selectToolBtn = document.getElementById('tool-select');
    const objectListContainer = document.getElementById('object-list');

    const drawer = document.getElementById('device-drawer');
    const drawerTitle = document.getElementById('drawer-title');
    const drawerContent = document.getElementById('drawer-content');
    const filterContainer = document.getElementById('brand-filter-container');

    const filterDrawer = document.getElementById('filter-drawer');
    const closeFilterBtn = document.getElementById('close-filter-btn');

    // Визначаємо THREE один раз
    const THREE = window.THREE;

    let cameraTarget = null;
    let orbitTarget = null;
    let deviceLibrary = [];

    const UI_STRUCTURE = {
        'Клімат': {
            icon: 'fa-thermometer-half',
            color: 'text-rose-400',
            subtypes: ['temp/hum', 'air', 'press'],
            file: 'climate_devices.json'
        },
        'Безпека': {
            icon: 'fa-shield-alt',
            color: 'text-emerald-400',
            subtypes: ['motion', 'door', 'leak', 'smoke', 'gas'],
            file: 'security_devices.json'
        },
        'Електрика': {
            icon: 'fa-bolt',
            color: 'text-amber-400',
            subtypes: ['power', 'switch', 'relay', 'light'],
            file: 'electricity_devices.json'
        },
        'Камери': {
            icon: 'fa-video',
            color: 'text-slate-400',
            subtypes: ['camera'],
            file: 'cameras.json'
        },
        'Керування': {
            icon: 'fa-microchip',
            color: 'text-indigo-500',
            subtypes: ['hub'],
            file: 'hubs.json'
        }
    };

    const subCategoryLabels = {
        'temp/hum': 'Термометри/Волога',
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

    if (closeFilterBtn) {
        closeFilterBtn.onclick = () => filterDrawer.classList.remove('open');
    }

    async function loadCategoryDevices(categoryName) {
        const config = UI_STRUCTURE[categoryName];
        if (!config) return;

        try {
            const response = await fetch(`/static/data/${config.file}?t=${Date.now()}`);
            if (!response.ok) throw new Error(`Status: ${response.status}`);
            const data = await response.json();
            deviceLibrary = data.library || [];
            return deviceLibrary;
        } catch (error) {
            console.error(`❌ Помилка завантаження:`, error.message);
            deviceLibrary = [];
            return [];
        }
    }

    function renderFixedSidebar() {
        if (!sensorsContainer) return;
        sensorsContainer.innerHTML = '';
        Object.keys(UI_STRUCTURE).forEach(catName => {
            const config = UI_STRUCTURE[catName];
            const btn = document.createElement('button');
            btn.className = `sensor-btn text-slate-400 hover:text-blue-500 text-xl p-2 w-full transition border-l-2 border-transparent`;
            btn.innerHTML = `<i class="fa-solid ${config.icon} ${config.color}"></i>`;
            btn.onclick = async () => {
                document.querySelectorAll('.sensor-btn').forEach(b => b.classList.remove('active', 'border-blue-500'));
                btn.classList.add('active', 'border-blue-500');
                if (selectToolBtn) selectToolBtn.classList.remove('active');
                await loadCategoryDevices(catName);
                openDrawer(catName);
            };
            sensorsContainer.appendChild(btn);
        });
    }

    function openDrawer(categoryName) {
        if (!drawer) return;
        drawerTitle.textContent = categoryName;
        const config = UI_STRUCTURE[categoryName];
        filterContainer.innerHTML = '';
        filterContainer.className = "flex flex-col w-full border-b border-slate-100 bg-white sticky top-0 z-10";

        const filterActionBtn = document.createElement('button');
        filterActionBtn.className = "flex items-center justify-center gap-2 w-full py-2 text-[10px] font-bold text-slate-400 hover:text-orange-500 hover:bg-slate-50 border-b border-slate-50 transition-all uppercase tracking-widest";
        filterActionBtn.innerHTML = `<i class="fa-solid fa-sliders text-[12px]"></i> Фільтри`;
        filterActionBtn.onclick = () => filterDrawer.classList.toggle('open');
        filterContainer.appendChild(filterActionBtn);

        const chipsWrapper = document.createElement('div');
        chipsWrapper.className = "flex flex-wrap gap-2 p-3";

        const createChip = (text, onClick, isActive = false) => {
            const chip = document.createElement('button');
            chip.className = `brand-chip ${isActive ? 'active' : ''} whitespace-nowrap`;
            chip.textContent = text.toUpperCase();
            chip.onclick = () => {
                chipsWrapper.querySelectorAll('.brand-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                onClick();
            };
            return chip;
        };

        chipsWrapper.appendChild(createChip('ВСІ', () => renderDrawerContent(deviceLibrary), true));
        config.subtypes.forEach(type => {
            chipsWrapper.appendChild(createChip(subCategoryLabels[type] || type, () => {
                renderDrawerContent(deviceLibrary.filter(d => d.type === type));
            }));
        });

        filterContainer.appendChild(chipsWrapper);
        renderDrawerContent(deviceLibrary);
        drawer.classList.add('open');
    }

    function renderDrawerContent(devices) {
        if (!drawerContent) return;
        drawerContent.innerHTML = '';
        if (!devices?.length) {
            drawerContent.innerHTML = '<div class="text-[10px] text-slate-400 p-4 italic text-center w-full">Немає пристроїв</div>';
            return;
        }

        const protocolColors = {
            'wifi': 'bg-blue-50 text-blue-600 border-blue-100',
            'zigbee': 'bg-orange-50 text-orange-600 border-orange-100',
            'matter': 'bg-purple-50 text-purple-600 border-purple-100',
            'sub1g': 'bg-indigo-50 text-indigo-600 border-indigo-100'
        };

        devices.forEach((device) => {
            const item = document.createElement('div');
            item.className = 'drawer-item hover:bg-slate-50 border-b border-slate-50 p-3 flex gap-3 cursor-pointer';
            const iconPath = device.icon_file ? `/static/data/icons/${device.icon_file}` : '/static/data/icons/default.png';

            const caps = (device.capabilities?.length > 0) ? device.capabilities : [device.protocol || 'N/A'];
            const protocolsHtml = caps.map(proto => {
                const colorClass = protocolColors[proto.toLowerCase()] || 'bg-slate-50 text-slate-500 border-slate-100';
                return `<span class="text-[7px] ${colorClass} px-1.5 py-0.5 rounded-sm border font-bold uppercase">${proto}</span>`;
            }).join('');

            item.innerHTML = `
                <div class="icon-wrapper w-12 h-12 border border-slate-100 rounded-lg p-1 shadow-sm">
                    <img src="${iconPath}" class="w-full h-full object-contain">
                </div>
                <div class="flex flex-col flex-1 justify-center min-w-0">
                    <span class="text-[9px] text-blue-500 font-bold uppercase">${device.brand}</span>
                    <span class="text-[11px] text-slate-700 font-bold truncate">${device.name}</span>
                    <div class="flex gap-1 mt-1">${protocolsHtml}</div>
                </div>
            `;

            item.onclick = () => {
                onSensorSelectCallback({
                    ...device,
                    subtype: device.subtype || device.type,
                    name: `${device.brand} ${device.name}`
                });
                if (window.setPlacementMode) window.setPlacementMode(true);
            };
            drawerContent.appendChild(item);
        });
    }

    const typeLabels = {
        'temp/hum': { label: 'Температура/Волога', color: 'text-rose-500', border: 'border-rose-200' },
        'sensor': { label: 'Датчики', color: 'text-blue-500', border: 'border-blue-200' },
        'motion': { label: 'Рух', color: 'text-emerald-500', border: 'border-emerald-200' },
        'smoke': { label: 'Дим', color: 'text-gray-500', border: 'border-gray-200' },
        'power': { label: 'Живлення', color: 'text-amber-500', border: 'border-amber-200' },
        'switch': { label: 'Вимикачі', color: 'text-green-500', border: 'border-green-200' },
        'camera': { label: 'Камери', color: 'text-slate-500', border: 'border-slate-200' },
        'hub': { label: 'Хаби', color: 'text-indigo-500', border: 'border-indigo-200' }
    };

    window.refreshUIList = function() {
        if (!objectListContainer) return;
        objectListContainer.innerHTML = '';
        const sensors = scene.children.filter(obj => obj.userData?.isSensor === true);

        const counter = document.getElementById('sensor-count');
        if (counter) counter.textContent = sensors.length;

        const groups = sensors.reduce((acc, s) => {
            const type = s.userData.type;
            if (!acc[type]) acc[type] = [];
            acc[type].push(s);
            return acc;
        }, {});

        Object.keys(typeLabels).forEach(type => {
            if (groups[type]?.length) {
                const header = document.createElement('div');
                header.className = `flex items-center space-x-2 border-b-2 ${typeLabels[type].border} pb-1 mb-2 mt-4`;
                header.innerHTML = `<span class="text-[10px] font-black uppercase ${typeLabels[type].color}">${typeLabels[type].label}</span>`;
                objectListContainer.appendChild(header);

                groups[type].forEach((s) => {
                    const item = document.createElement('div');
                    item.className = "flex flex-col bg-white border border-slate-100 p-2 rounded-lg text-[10px] hover:border-blue-300 transition cursor-pointer mb-1";

                    const isOn = s.userData.isOn !== false;

                    item.innerHTML = `
                        <div class="flex items-center justify-between w-full">
                            <span class="text-slate-600 font-bold truncate pr-2">${s.userData.name || 'Датчик'}</span>
                            <div class="flex items-center gap-3">
                                <label class="toggle-container relative inline-flex items-center cursor-pointer scale-75">
                                    <input type="checkbox" class="sr-only peer" ${isOn ? 'checked' : ''} data-id="${s.id}">
                                    <div class="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:bg-blue-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-full"></div>
                                </label>
                                <button onclick="window.removeSensorById(${s.id})" class="text-slate-300 hover:text-rose-500">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            </div>
                        </div>
                    `;

                    item.onclick = (e) => {
                        if (e.target.closest('button') || e.target.closest('.toggle-container')) return;
                        if (THREE) {
                            cameraTarget = s.position.clone().add(new THREE.Vector3(4, 4, 4));
                            orbitTarget = s.position.clone();
                        }
                    };

                    const toggle = item.querySelector('input[type="checkbox"]');
                    toggle.addEventListener('change', (e) => {
                        const sensor = scene.getObjectById(parseInt(e.target.dataset.id));
                        if (sensor) {
                            if (sensor.userData.deviceInstance) {
                                sensor.userData.deviceInstance.toggle();
                            } else {
                                sensor.userData.isOn = e.target.checked;
                            }
                        }
                    });

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

    if (selectToolBtn) {
        selectToolBtn.addEventListener('click', () => {
            document.querySelectorAll('.sensor-btn').forEach(b => b.classList.remove('active', 'border-blue-500'));
            selectToolBtn.classList.add('active');
            if (drawer) drawer.classList.remove('open');
            if (window.setPlacementMode) window.setPlacementMode(false);
        });
    }

    renderFixedSidebar();

    return {
        addItemToList: () => window.refreshUIList(),
        updateCamera: (lerpFactor) => {
            if (THREE && cameraTarget && orbitTarget) {
                camera.position.lerp(cameraTarget, lerpFactor);
                controls.target.lerp(orbitTarget, lerpFactor);
                if (camera.position.distanceTo(cameraTarget) < 0.05) {
                    cameraTarget = orbitTarget = null;
                }
            }
        }
    };
}