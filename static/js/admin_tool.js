// static/js/admin_tool.js

export function initAdminTool() {
    const modal = document.getElementById('device-modal');
    const btn = document.getElementById('admin-add-device');
    const closeBtn = document.getElementById('close-modal');
    const form = document.getElementById('device-form');

    // Відкриття та закриття модального вікна
    if (btn) btn.onclick = () => modal.classList.remove('hidden');
    if (closeBtn) closeBtn.onclick = () => modal.classList.add('hidden');

    // Закриття при кліку поза вікном (сіра зона)
    window.onclick = (event) => {
        if (event.target == modal) modal.classList.add('hidden');
    };

    form.onsubmit = async (e) => {
        e.preventDefault();

        const type = document.getElementById('dev-type').value;

        // --- ЛОГІКА АВТОДОДАВАННЯ РОЗШИРЕННЯ ---
        let iconValue = document.getElementById('dev-icon').value.trim();

        // Якщо користувач ввів просто "10", робимо "10.png"
        // Якщо вже є крапка (напр. "10.jpg"), залишаємо як є
        if (iconValue && !iconValue.includes('.')) {
            iconValue += '.png';
        }

        const modelMap = {
            'temp': 'temp_sensor.glb',
            'hum': 'hum_sensor.glb',
            'motion': 'motion_sensor.glb',
            'power': 'socket.glb',
            'camera': 'camera.glb'
        };

        const brand = document.getElementById('dev-brand').value;
        const name = document.getElementById('dev-name').value;

        const newDevice = {
            id: `${brand.toLowerCase().replace(/\s+/g, '_')}_${type}_${Date.now().toString().slice(-4)}`,
            brand: brand,
            category: document.getElementById('dev-category').value,
            name: name,
            type: type,
            icon_file: iconValue, // Тепер тут завжди буде файл із розширенням
            model_path: modelMap[type] || "default_sensor.glb",
            protocol: document.getElementById('dev-protocol').value,
            color: "0xffffff",
            features: {}
        };

        try {
            const response = await fetch('/admin/add-device', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newDevice)
            });

            if (response.ok) {
                console.log("Дані збережено в JSON з іконкою: " + iconValue);
                modal.classList.add('hidden');
                form.reset();
                window.location.reload();
            } else {
                const errorData = await response.json();
                alert("Помилка: " + errorData.message);
            }
        } catch (error) {
            console.error("Помилка мережі або сервера:", error);
            alert("Не вдалося з'єднатися з сервером.");
        }
    };
}