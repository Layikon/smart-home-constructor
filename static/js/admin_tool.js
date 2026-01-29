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

        // 1. Збираємо Hardware Capabilities (Протоколи)
        // Саме цей масив буде визначати, що вміє хаб (Zigbee, Matter, Thread тощо)
        const hardwareCaps = [];
        document.querySelectorAll('input[name="cap"]:checked').forEach(checkbox => {
            hardwareCaps.push(checkbox.value);
        });

        // 2. Отримуємо значення з форми
        const rawType = document.getElementById('dev-type').value;
        const brand = document.getElementById('dev-brand').value;
        const name = document.getElementById('dev-name').value;

        // Шукаємо активне поле підтипу
        const activeGroup = document.querySelector(`.field-group:not(.hidden)`);
        const subtypeSelect = activeGroup ? activeGroup.querySelector('select') : null;
        const subType = subtypeSelect ? subtypeSelect.value : rawType;

        // Логіка для навантаження (тільки для Електрики)
        const maxLoadInput = activeGroup ? activeGroup.querySelector('input[type="number"]') : null;
        const maxLoadValue = maxLoadInput ? maxLoadInput.value : null;

        // Логіка для живлення (Батарейка / USB / 220V)
        // Для хаба це теж важливо (зазвичай це USB або 220V)
        const powerSource = document.querySelector('input[name="power"]:checked')?.value || 'usb';

        // 3. Синхронізація типів
        const typeMapping = {
            'sensor': subType,
            'power': subType,
            'motion': subType,
            'camera': 'camera',
            'hub': 'hub' // Хаб завжди лишається хабом
        };

        const finalType = typeMapping[rawType] || rawType;

        // Автоматичний розподіл категорій
        const categoryMapping = {
            // Клімат
            'temp/hum': 'Клімат', 'temp': 'Клімат', 'hum': 'Клімат', 'air': 'Клімат', 'press': 'Клімат',
            // Безпека
            'motion': 'Безпека', 'door': 'Безпека', 'leak': 'Безпека', 'smoke': 'Безпека', 'gas': 'Безпека',
            // Електрика
            'power': 'Електрика', 'socket': 'Електрика', 'switch': 'Електрика', 'relay': 'Електрика', 'light': 'Електрика',
            // Інше
            'camera': 'Камери',
            'hub': 'Керування'
        };

        const currentCategory = categoryMapping[finalType] || 'Інше';

        // Карта 3D-моделей
        const modelMap = {
            'temp/hum': 'temp_sensor.glb',
            'motion': 'motion_sensor.glb',
            'door': 'motion_sensor.glb',
            'leak': 'motion_sensor.glb',
            'smoke': 'motion_sensor.glb',
            'gas': 'motion_sensor.glb',
            'power': 'socket.glb',
            'socket': 'socket.glb',
            'switch': 'socket.glb',
            'relay': 'socket.glb',
            'light': 'socket.glb',
            'camera': 'camera.glb',
            'hub': 'hub.glb'
        };

        // 4. Формуємо об'єкт пристрою для бази даних
        const newDevice = {
            id: `dev_${Date.now().toString().slice(-6)}`,
            brand: brand,
            category: currentCategory,
            name: name,
            type: finalType,
            subtype: subType,
            icon_file: "1.png",
            model_path: modelMap[finalType] || "unified_sensor.glb",
            capabilities: hardwareCaps, // Тут лежать протоколи хаба
            features: {
                power: powerSource,
                // Хаб не потребує хаба (він сам хаб), решта потребують
                requires_hub: finalType !== 'hub' && finalType !== 'camera' && finalType !== 'wifi_socket'
            }
        };

        // Додаємо макс. навантаження (для Електрики)
        if (maxLoadValue) {
            newDevice.max_load = maxLoadValue + "W";
        }

        // --- СПЕЦІАЛЬНА ЛОГІКА ДЛЯ ХАБІВ ---
        if (finalType === 'hub') {
            // 1. Позначаємо, що цей пристрій керує іншими
            newDevice.features.is_master = true;

            // 2. Визначаємо протоколи, які він "роздає" (Zigbee, Thread, BLE)
            // Виключаємо WiFi/Ethernet, бо це канали зв'язку з інтернетом, а не з датчиками
            newDevice.features.serves_protocols = hardwareCaps.filter(cap =>
                cap !== 'wifi' && cap !== 'ethernet'
            );

            // 3. (Опціонально) Максимальна кількість пристроїв, якщо знадобиться
            newDevice.features.max_devices = 128;
        }

        try {
            const response = await fetch('/admin/add-device', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newDevice)
            });

            if (response.ok) {
                console.log("Пристрій збережено в базу:", newDevice);
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