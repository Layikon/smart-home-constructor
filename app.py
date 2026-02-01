from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from flask_bcrypt import Bcrypt
import json
import os
from datetime import datetime

app = Flask(__name__)

# --- НАЛАШТУВАННЯ БАЗИ ДАНИХ ТА БЕЗПЕКИ ---
app.config['SECRET_KEY'] = 'smart-home-secret-key-12345'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Ініціалізація розширень
db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

# Шлях до папки з JSON даними (для адмінки)
DATA_DIR = os.path.join('static', 'data')


# --- МОДЕЛІ БАЗИ ДАНИХ ---

class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(60), nullable=False)
    projects = db.relationship('Project', backref='author', lazy=True)


class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    data = db.Column(db.Text, nullable=False)  # JSON сцени
    date_posted = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


# --- ГОЛОВНІ МАРШРУТИ ---

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/editor')
def editor():
    return render_template('editor.html')


# --- МАРШРУТИ АВТОРИЗАЦІЇ ---

@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('index'))

    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')

        if User.query.filter_by(email=email).first():
            flash('Цей email вже зареєстровано!', 'danger')
            return redirect(url_for('register'))

        if User.query.filter_by(username=username).first():
            flash('Це ім’я користувача вже зайняте!', 'danger')
            return redirect(url_for('register'))

        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        user = User(username=username, email=email, password=hashed_password)

        db.session.add(user)
        db.session.commit()

        flash('Акаунт створено! Тепер можна увійти.', 'success')
        return redirect(url_for('login'))

    return render_template('register.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))

    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')

        user = User.query.filter_by(email=email).first()

        if user and bcrypt.check_password_hash(user.password, password):
            login_user(user)
            flash(f'Вітаємо, {user.username}!', 'success')
            return redirect(url_for('index'))
        else:
            flash('Помилка входу. Перевірте email та пароль.', 'danger')

    return render_template('login.html')


@app.route('/logout')
def logout():
    logout_user()
    flash('Ви вийшли з системи.', 'info')
    return redirect(url_for('index'))


# --- АДМІНКА (ДОДАВАННЯ ПРИСТРОЇВ) ---

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
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)