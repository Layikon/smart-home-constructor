from flask import Flask, render_template, request, jsonify
import json
import os

app = Flask(__name__)

# Шлях до файлу бази даних пристроїв
DEVICES_FILE = os.path.join('static', 'data', 'devices.json')


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/editor')
def editor():
    return render_template('editor.html')


# --- ОНОВЛЕНИЙ МАРШРУТ ДЛЯ АДМІНКИ ---
@app.route('/admin/add-device', methods=['POST'])
def add_device():
    try:
        new_device = request.json  # Отримуємо дані від JS (уже з capabilities)

        # Перевірка наявності папки (якщо раптом видалили)
        os.makedirs(os.path.dirname(DEVICES_FILE), exist_ok=True)

        # 1. Читаємо існуючий файл
        if os.path.exists(DEVICES_FILE):
            with open(DEVICES_FILE, 'r', encoding='utf-8') as f:
                try:
                    data = json.load(f)
                except json.JSONDecodeError:
                    # Якщо файл пошкоджений або порожній
                    data = {"library": []}
        else:
            data = {"library": []}

        # 2. Базова валідація даних перед записом
        # Переконуємось, що ми не запишемо порожній пристрій
        if not new_device.get('name') or not new_device.get('brand'):
            return jsonify({"status": "error", "message": "Неповні дані пристрою"}), 400

        # 3. Додаємо новий пристрій
        # Тепер new_device містить capabilities: ["zigbee", "matter"] тощо
        data['library'].append(new_device)

        # 4. Записуємо оновлені дані назад у файл
        # ensure_ascii=False важливо для збереження кирилиці (назви брендів/типів)
        with open(DEVICES_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        return jsonify({"status": "success", "message": f"Пристрій {new_device['name']} додано у базу!"}), 200

    except Exception as e:
        print(f"Server Error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


if __name__ == '__main__':
    # Включаємо debug, щоб сервер перезавантажувався при зміні коду
    app.run(debug=True, port=5000)