// static/js/simulator/devices/on_off.js

export class OnOffLogic {
    constructor(device) {
        this.device = device;
        this.isOn = true; // За замовчуванням пристрій увімкнено
    }

    // Метод для перемикання (викликається при кліку)
    toggle() {
        this.isOn = !this.isOn;
        return this.isOn;
    }

    // Повертає статус для запису в дані
    getStatus() {
        return {
            isOn: this.isOn,
            powerStatus: this.isOn ? "ON" : "OFF"
        };
    }
}