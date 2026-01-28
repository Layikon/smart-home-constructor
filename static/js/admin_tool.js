// static/js/admin_tool.js

export function initAdminTool() {
    const modal = document.getElementById('device-modal');
    const btn = document.getElementById('admin-add-device');
    const form = document.getElementById('device-form');

    // Відкриття модального вікна
    if (btn) btn.onclick = () => modal.classList.remove('hidden');

    // Логіка закриття
    window.addEventListener('click', (event) => {
        if (event.target === modal) modal.classList.add('hidden');
    });

    form.onsubmit = async (e) => {
        e.preventDefault();

        // 1. Збираємо Hardware Capabilities (Чекбокси)
        const hardwareCaps = [];
        document.querySelectorAll('input[name="cap"]:checked').forEach(checkbox => {
            hardwareCaps.push(checkbox.value);
        });

        // 2. Отримуємо значення з твоєї форми
        const rawType = document.getElementById('dev-type').value; // Отримуємо "sensor", "hub" і т.д.
        const brand = document.getElementById('dev-brand').value;
        const name = document.getElementById('dev-name').value;

        // Автододавання розширення для іконки
        let iconValue = document.getElementById('dev-icon').value.trim();
        if (iconValue && !iconValue.includes('.')) {
            iconValue += '.png';
        }

        // 3. Синхронізація з ui_manager.js
        // Перетворюємо "sensor" на "temp", щоб працювали іконки та категорії
        const typeMapping = {
            'sensor': 'temp',
            'power': 'power',
            'motion': 'motion',
            'camera': 'camera',
            'hub': 'hub'
        };

        const finalType = typeMapping[rawType] || rawType;

        // Автоматично визначаємо категорію
        const categoryMapping = {
            'temp': 'Клімат',
            'power': 'Електрика',
            'motion': 'Безпека',
            'camera': 'Камери',
            'hub': 'Керування'
        };

        // Карта 3D-моделей
        const modelMap = {
            'temp': 'temp_sensor.glb',
            'motion': 'motion_sensor.glb',
            'power': 'socket.glb',
            'camera': 'camera.glb',
            'hub': 'hub.glb'
        };

        // 4. Формуємо об'єкт пристрою
        const newDevice = {
            id: `${brand.toLowerCase().replace(/\s+/g, '_')}_${Date.now().toString().slice(-4)}`,
            brand: brand,
            category: categoryMapping[finalType] || 'Інше',
            name: name,
            type: finalType,
            icon_file: iconValue,
            model_path: modelMap[finalType] || "unified_sensor.glb",
            capabilities: hardwareCaps,
            features: {
                requires_hub: ['temp', 'motion'].includes(finalType)
            }
        };

        // Спеціальна логіка для ХАБІВ
        if (finalType === 'hub') {
            newDevice.features.is_master = true;
            newDevice.features.serves_protocols = hardwareCaps.filter(cap => cap !== 'wifi' && cap !== 'ethernet');
        }

        try {
            const response = await fetch('/admin/add-device', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newDevice)
            });

            if (response.ok) {
                console.log("Пристрій додано:", newDevice);
                modal.classList.add('hidden');
                form.reset();
                window.location.reload();
            } else {
                const errorData = await response.json();
                alert("Помилка: " + errorData.message);
            }
        } catch (error) {
            console.error("Помилка мережі:", error);
        }
    };
}