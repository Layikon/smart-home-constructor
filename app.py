from flask import Flask, render_template, request, jsonify
import json
import os

app = Flask(__name__)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/editor')
def editor():
    return render_template('editor.html')


# --- НОВИЙ МАРШРУТ ДЛЯ АДМІНКИ ---
@app.route('/admin/add-device', methods=['POST'])
def add_device():
    try:
        new_device = request.json  # Отримуємо дані від JS
        file_path = os.path.join('static', 'data', 'devices.json')

        # 1. Читаємо існуючий файл
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        else:
            data = {"library": []}

        # 2. Додаємо новий пристрій у список
        data['library'].append(new_device)

        # 3. Записуємо оновлені дані назад у файл
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        return jsonify({"status": "success", "message": "Пристрій додано!"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)