// static/js/admin_tool.js

export function initAdminTool() {
    const modal = document.getElementById('device-modal');
    const btn = document.getElementById('admin-add-device');
    const form = document.getElementById('device-form');
    const typeSelect = document.getElementById('dev-type');

    if (!modal || !form) return;

    // 1. Відкриття модального вікна
    if (btn) {
        btn.onclick = () => {
            modal.classList.remove('hidden');
            updateVisibleFields();
        };
    }

    // 2. Логіка закриття (X, кнопка "Скасувати" та клік поза межами)
    const closeElements = ['close-modal', 'close-modal-x'];
    closeElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.onclick = () => modal.classList.add('hidden');
    });

    window.addEventListener('click', (event) => {
        if (event.target === modal) modal.classList.add('hidden');
    });

    // 3. Перемикання полів залежно від класу (sensor, power, motion, hub, camera)
    function updateVisibleFields() {
        const selectedValue = typeSelect.value;
        const groups = document.querySelectorAll('.field-group');

        groups.forEach(group => {
            if (group.getAttribute('data-type') === selectedValue) {
                group.classList.remove('hidden');
            } else {
                group.classList.add('hidden');
            }
        });
    }

    if (typeSelect) {
        typeSelect.onchange = updateVisibleFields;
    }

    // 4. Відправка форми
    form.onsubmit = async (e) => {
        e.preventDefault();

        // Протоколи (Capabilities)
        const hardwareCaps = [];
        document.querySelectorAll('input[name="cap"]:checked').forEach(checkbox => {
            hardwareCaps.push(checkbox.value);
        });

        const rawType = typeSelect.value;
        const brand = document.getElementById('dev-brand').value;
        const name = document.getElementById('dev-name').value;

        // Отримуємо підтип з активної групи
        const activeGroup = document.querySelector(`.field-group[data-type="${rawType}"]`);
        const subtypeSelect = activeGroup ? activeGroup.querySelector('select') : null;
        const subType = subtypeSelect ? subtypeSelect.value : rawType;

        // Отримуємо живлення
        const powerSource = document.querySelector('input[name="power"]:checked')?.value || 'battery';

        // Категорії для сайдбару
        const categoryMapping = {
            'sensor': 'Клімат',
            'motion': 'Безпека',
            'power': 'Електрика',
            'camera': 'Камери',
            'hub': 'Керування'
        };

        const currentCategory = categoryMapping[rawType] || 'Керування';

        // Об'єкт пристрою
        const newDevice = {
            id: `dev_${Date.now().toString().slice(-6)}`,
            brand: brand,
            category: currentCategory,
            name: name,
            type: subType, // Використовуємо підтип як ключ для моделей в config.js
            subtype: subType,
            icon_file: "1.png",
            model_path: "", // Порожньо для автопідбору
            capabilities: hardwareCaps,
            features: {
                power: powerSource,
                requires_hub: !hardwareCaps.includes('wifi') && rawType !== 'hub' && rawType !== 'camera',
                is_master: rawType === 'hub'
            }
        };

        // Логіка для Хабів та Роутерів
        if (rawType === 'hub') {
            if (subType === 'router') {
                newDevice.features.serves_protocols = ['wifi'];
            } else {
                newDevice.features.serves_protocols = hardwareCaps.filter(c => c !== 'wifi');
            }
            newDevice.features.max_devices = 128;
        }

        // Макс. навантаження для Електрики
        if (rawType === 'power') {
            const loadInput = activeGroup ? activeGroup.querySelector('input[type="number"]') : null;
            if (loadInput && loadInput.value) {
                newDevice.features.max_load = loadInput.value + "W";
            }
        }

        try {
            const response = await fetch('/admin/add-device', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newDevice)
            });

            if (response.ok) {
                modal.classList.add('hidden');
                form.reset();
                window.location.reload();
            } else {
                const result = await response.json();
                alert("Помилка: " + (result.message || "Не вдалося зберегти"));
            }
        } catch (error) {
            console.error("Network Error:", error);
            alert("Помилка мережі при спробі зв'язатися з сервером.");
        }
    };
}