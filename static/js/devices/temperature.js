// static/js/simulator/devices/temperature.js
import { BaseDevice } from './base_device.js';
// Імпортуємо універсальний модуль
import { OnOffControl } from '../on_off.js';

export class Temperature extends BaseDevice {
    constructor(mesh, scene) {
        super(mesh, scene);

        // Ініціалізуємо універсальний контролер
        this.onOffController = new OnOffControl(this.mesh);

        // --- НАЛАШТУВАННЯ ДАТЧИКА ---
        this.baseVal = 21 + Math.random() * 2;

        // Встановлюємо початковий стан в userData, якщо він не заданий
        if (this.mesh.userData.isOn === undefined) {
            this.mesh.userData.isOn = true;
        }

        if (!this.mesh.userData.manufacturer) {
            this.mesh.userData.manufacturer = "SmartHome Corp";
            this.mesh.userData.model = "Termo-X200";
        }
    }

    // Тепер використовуємо універсальний метод
    toggle() {
        return this.onOffController.toggle();
    }

    update(time) {
        // Перевіряємо стан через userData
        if (this.mesh.userData.isOn === false) {
            this.mesh.userData.simulatedData = {
                temp: "--.-",
                humidity: "--",
                status: "OFF",
                battery: "100%",
                isOn: false
            };
            // Скидаємо емісію (світіння), якщо пристрій вимкнено
            if (this.mesh.material && this.mesh.material.emissive) {
                this.mesh.material.emissive.setHex(0x000000);
            }
            return;
        }

        // --- ЛОГІКА СИМУЛЯЦІЇ (залишаємо як було) ---
        const t = this.baseVal + Math.sin(time * 0.1) * 0.5;
        const h = 45 + Math.cos(time * 0.1) * 2;

        // --- ЗАПИС ДАНИХ ДЛЯ ІНТЕРФЕЙСУ ---
        this.mesh.userData.simulatedData = {
            temp: t.toFixed(1),
            humidity: h.toFixed(0),
            status: "Active",
            isOn: true,
            lastUpdate: new Date().toLocaleTimeString()
        };

        if (t > 23 && this.mesh.material && this.mesh.material.emissive) {
             const intensity = (t - 23) / 10;
             this.mesh.material.emissive.setRGB(intensity, 0, 0);
        } else if (this.mesh.material && this.mesh.material.emissive) {
             this.mesh.material.emissive.setHex(0x000000);
        }
    }
}