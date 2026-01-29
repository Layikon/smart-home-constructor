from flask import Flask, render_template, request, jsonify
import json
import os

app = Flask(__name__)

DATA_DIR = os.path.join('static', 'data')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/editor')
def editor():
    return render_template('editor.html')

@app.route('/admin/add-device', methods=['POST'])
def add_device():
    try:
        new_device = request.json
        category = new_device.get('category')

        file_mapping = {
            'Клімат': 'climate_devices.json',
            'Безпека': 'security_devices.json',
            'Електрика': 'electricity_devices.json',
            'Камери': 'cameras.json',
            'Керування': 'hubs.json'
        }

        filename = file_mapping.get(category, 'devices.json')
        filepath = os.path.join(DATA_DIR, filename)

        os.makedirs(DATA_DIR, exist_ok=True)

        data = {"library": []}
        if os.path.exists(filepath) and os.path.getsize(filepath) > 0:
            with open(filepath, 'r', encoding='utf-8') as f:
                try:
                    data = json.load(f)
                except json.JSONDecodeError:
                    pass

        if not new_device.get('name') or not new_device.get('brand'):
            return jsonify({"status": "error", "message": "Неповні дані пристрою"}), 400

        data['library'].append(new_device)

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)

        return jsonify({
            "status": "success",
            "message": f"Пристрій додано у файл {filename}"
        }), 200

    except Exception as e:
        print(f"Server Error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)