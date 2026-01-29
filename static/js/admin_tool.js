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

        // 2. Отримуємо значення з форми
        const rawType = document.getElementById('dev-type').value;
        const brand = document.getElementById('dev-brand').value;
        const name = document.getElementById('dev-name').value;

        // Універсальна логіка: шукаємо активне (не приховане) поле підтипу (temp, hum, leak, switch тощо)
        const activeGroup = document.querySelector(`.field-group:not(.hidden)`);
        const subtypeSelect = activeGroup ? activeGroup.querySelector('select') : null;
        const subType = subtypeSelect ? subtypeSelect.value : rawType;

        // Автододавання розширення для іконки
        let iconValue = document.getElementById('dev-icon').value.trim();
        if (iconValue && !iconValue.includes('.')) {
            iconValue += '.png';
        }

        // 3. Синхронізація з фіксованою структурою ui_manager.js
        const typeMapping = {
            'sensor': subType,
            'power': (subType === 'plug' || subType === 'wall') ? 'power' : subType, // Розетки групуємо в 'power'
            'motion': 'motion',
            'camera': 'camera',
            'hub': 'hub'
        };

        const finalType = typeMapping[rawType] || rawType;

        // Автоматичний розподіл по твоїх 5 основних категоріях
        const categoryMapping = {
            // Клімат
            'temp': 'Клімат', 'hum': 'Клімат', 'air': 'Клімат', 'press': 'Клімат',
            // Безпека
            'motion': 'Безпека', 'door': 'Безпека', 'leak': 'Безпека', 'smoke': 'Безпека', 'gas': 'Безпека',
            // Електрика
            'power': 'Електрика', 'switch': 'Електрика', 'relay': 'Електрика', 'light': 'Електрика',
            // Камери
            'camera': 'Камери',
            // Керування
            'hub': 'Керування'
        };

        // Карта 3D-моделей (використовуємо наявні або дефолтну)
        const modelMap = {
            'temp': 'temp_sensor.glb',
            'hum': 'hum_sensor.glb',
            'motion': 'motion_sensor.glb',
            'power': 'socket.glb',
            'switch': 'socket.glb',
            'relay': 'socket.glb',
            'camera': 'camera.glb',
            'hub': 'hub.glb'
        };

        // 4. Формуємо об'єкт пристрою для бази даних
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
                // Всі ці пристрої потребують хаба для роботи в екосистемі
                requires_hub: ['temp', 'hum', 'air', 'press', 'motion', 'door', 'leak', 'smoke', 'gas', 'switch', 'relay', 'light'].includes(finalType)
            }
        };

        // Спеціальна логіка для ХАБІВ (вони самі є майстрами)
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
                console.log("Пристрій успішно розподілено:", newDevice);
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