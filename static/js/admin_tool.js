// static/js/admin_tool.js

export function initAdminTool() {
    const modal = document.getElementById('device-modal');
    const btn = document.getElementById('admin-add-device');
    const form = document.getElementById('device-form');
    const typeSelect = document.getElementById('dev-type');

    if (!modal || !form) {
        console.warn("Admin tool elements not found in DOM");
        return;
    }

    // 1. Відкриття модального вікна
    if (btn) {
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation(); // Зупиняємо розповсюдження події
            modal.classList.remove('hidden');
            updateVisibleFields();
        };
    }

    // 2. Логіка закриття (X, кнопка "Скасувати" та клік поза межами вікна)
    const closeElements = ['close-modal', 'close-modal-x'];
    closeElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.onclick = (e) => {
                e.preventDefault();
                modal.classList.add('hidden');
            };
        }
    });

    // Закриття при кліку на темний фон
    modal.onclick = (event) => {
        if (event.target === modal) {
            modal.classList.add('hidden');
        }
    };

    // 3. Перемикання полів залежно від класу (sensor, power, motion, hub, camera)
    function updateVisibleFields() {
        if (!typeSelect) return;
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
        form.querySelectorAll('input[name="cap"]:checked').forEach(checkbox => {
            hardwareCaps.push(checkbox.value);
        });

        const rawType = typeSelect.value;
        const brand = document.getElementById('dev-brand').value;
        const name = document.getElementById('dev-name').value;

        // Шукаємо активну групу полів за data-type
        const activeGroup = form.querySelector(`.field-group[data-type="${rawType}"]`);
        const subtypeSelect = activeGroup ? activeGroup.querySelector('select') : null;
        const subType = subtypeSelect ? subtypeSelect.value : rawType;

        // Отримуємо значення живлення (radio button)
        const powerSource = form.querySelector('input[name="power"]:checked')?.value || 'battery';

        // Категорії для сайдбару
        const categoryMapping = {
            'sensor': 'Клімат',
            'motion': 'Безпека',
            'power': 'Електрика',
            'camera': 'Камери',
            'hub': 'Керування'
        };

        const currentCategory = categoryMapping[rawType] || 'Керування';

        // Об'єкт пристрою для бази
        const newDevice = {
            id: `dev_${Date.now().toString().slice(-6)}`,
            brand: brand,
            category: currentCategory,
            name: name,
            type: subType, // Тип для мапінгу 3D моделей у config.js
            subtype: subType,
            icon_file: "1.png",
            model_path: "", // Порожньо, щоб спрацювали DefaultModels
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

        // Макс. навантаження для Електрики (якщо є поле)
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
                window.location.reload(); // Перезавантаження для оновлення списків
            } else {
                const result = await response.json();
                alert("Помилка: " + (result.message || "Не вдалося зберегти пристрій"));
            }
        } catch (error) {
            console.error("Network Error:", error);
            alert("Помилка мережі. Перевірте з'єднання з сервером.");
        }
    };
}