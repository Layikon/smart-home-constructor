// static/js/simulator/devices/temperature.js
import { BaseDevice } from './base_device.js';

export class Temperature extends BaseDevice {
    constructor(mesh, scene) {
        super(mesh, scene);

        // --- НАЛАШТУВАННЯ ДАТЧИКА ---
        this.baseVal = 21 + Math.random() * 2; // Унікальна базова температура
        this.isOn = true; // За замовчуванням увімкнений

        // Метадані для відображення у правому меню
        // Ми записуємо їх у userData, щоб Dashboard міг їх прочитати
        if (!this.mesh.userData.manufacturer) {
            this.mesh.userData.manufacturer = "SmartHome Corp";
            this.mesh.userData.model = "Termo-X200";
        }
    }

    // Метод для вмикання/вимикання (викликається з інтерфейсу)
    toggle() {
        this.isOn = !this.isOn;
        return this.isOn;
    }

    update(time) {
        // Якщо пристрій вимкнено - він не оновлює дані або показує "0"
        if (!this.isOn) {
            this.mesh.userData.simulatedData = {
                temp: "--.-",
                humidity: "--",
                status: "OFF",
                battery: "100%"
            };
            return;
        }

        // --- ЛОГІКА СИМУЛЯЦІЇ ---
        // Плавна зміна температури (синусоїда)
        const t = this.baseVal + Math.sin(time * 0.1) * 0.5;

        // Плавна зміна вологості
        const h = 45 + Math.cos(time * 0.1) * 2;

        // --- ЗАПИС ДАНИХ ДЛЯ ІНТЕРФЕЙСУ ---
        this.mesh.userData.simulatedData = {
            temp: t.toFixed(1),    // Температура (напр. 22.1)
            humidity: h.toFixed(0), // Вологість (напр. 46)
            status: "Active",       // Текстовий статус
            isOn: true,             // Для перемикачів в UI
            lastUpdate: new Date().toLocaleTimeString() // Час оновлення
        };

        // Додатково: змінюємо колір трохи, якщо температура висока (візуальний ефект)
        // (Це опціонально, можна прибрати якщо не подобається)
        if (t > 23 && this.mesh.material && this.mesh.material.emissive) {
             // Легке червоне світіння при нагріванні
             const intensity = (t - 23) / 10;
             this.mesh.material.emissive.setRGB(intensity, 0, 0);
        } else if (this.mesh.material && this.mesh.material.emissive) {
             this.mesh.material.emissive.setHex(0x000000);
        }
    }
}