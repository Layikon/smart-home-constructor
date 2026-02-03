// static/js/simulator/on_off.js

export class OnOffControl {
    constructor(deviceMesh) {
        this.mesh = deviceMesh;
    }

    // Метод для зміни стану
    setState(state) {
        this.mesh.userData.isOn = state;

        // Якщо пристрій вимкнено, можна відразу занулити симульовані дані
        if (!state && this.mesh.userData.simulatedData) {
            this.mesh.userData.simulatedData.status = "OFF";
        }

        console.log(`Пристрій ${this.mesh.userData.name} тепер ${state ? 'Увімкнено' : 'Вимкнено'}`);
        return state;
    }

    toggle() {
        const currentState = this.mesh.userData.isOn !== false; // true за замовчуванням
        return this.setState(!currentState);
    }
}