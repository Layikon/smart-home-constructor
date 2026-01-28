// static/js/admin_tool.js

export function initAdminTool() {
    const modal = document.getElementById('device-modal');
    const btn = document.getElementById('admin-add-device');
    const form = document.getElementById('device-form');

    // Відкриття модального вікна
    if (btn) btn.onclick = () => modal.classList.remove('hidden');

    // Логіка закриття вже є в самому шаблоні (inline script),
    // але для надійності можна залишити обробку кліку поза вікном
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

        // 2. Отримуємо основні значення
        const type = document.getElementById('dev-type').value;
        const brand = document.getElementById('dev-brand').value;
        const name = document.getElementById('dev-name').value;

        // Автододавання розширення для іконки
        let iconValue = document.getElementById('dev-icon').value.trim();
        if (iconValue && !iconValue.includes('.')) {
            iconValue += '.png';
        }

        // Карта моделей (використовуємо існуючі у вашій папці static/models/)
        const modelMap = {
            'sensor': 'temp_sensor.glb',
            'motion': 'motion_sensor.glb',
            'power': 'socket.glb',
            'camera': 'camera.glb',
            'hub': 'hub.glb'
        };

        // 3. Формуємо об'єкт пристрою (Технічний паспорт)
        const newDevice = {
            id: `${brand.toLowerCase().replace(/\s+/g, '_')}_${Date.now().toString().slice(-4)}`,
            brand: brand,
            name: name,
            type: type,
            icon_file: iconValue,
            model_path: modelMap[type] || "unified_sensor.glb",
            capabilities: hardwareCaps, // Масив протоколів, які пристрій має "на борту"
            features: {
                requires_hub: (type === 'sensor' || type === 'motion') // Авто-позначка для логіки
            }
        };

        // 4. Спеціальна логіка для ХАБІВ
        // Якщо це хаб, додаємо список протоколів, які він підтримує як "майстер"
        if (type === 'hub') {
            newDevice.features.is_master = true;
            // Для простоти зараз хаб "роздає" ті ж протоколи, що вибрані в Hardware,
            // крім Wi-Fi (бо Wi-Fi він зазвичай отримує, а не роздає)
            newDevice.features.serves_protocols = hardwareCaps.filter(cap => cap !== 'wifi' && cap !== 'ethernet');
        }

        try {
            const response = await fetch('/admin/add-device', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newDevice)
            });

            if (response.ok) {
                console.log("Пристрій успішно додано в базу:", newDevice);
                modal.classList.add('hidden');
                form.reset();
                // Перезавантажуємо сторінку, щоб оновити список пристроїв у шторці
                window.location.reload();
            } else {
                const errorData = await response.json();
                alert("Помилка сервера: " + errorData.message);
            }
        } catch (error) {
            console.error("Помилка мережі:", error);
            alert("Не вдалося зв'язатися з сервером Flask.");
        }
    };
}