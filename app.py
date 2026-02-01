from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from flask_bcrypt import Bcrypt
import json
import os
from datetime import datetime

app = Flask(__name__)

# --- НАЛАШТУВАННЯ ---
app.config['SECRET_KEY'] = 'smart-home-secret-key-12345'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

DATA_DIR = os.path.join('static', 'data')


# --- МОДЕЛІ ---
class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(60), nullable=False)
    projects = db.relationship('Project', backref='author', lazy=True)


class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    data = db.Column(db.Text, nullable=False)
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


@app.route('/dashboard')
@login_required
def dashboard():
    # Завантажуємо проєкти користувача (спочатку нові)
    projects = Project.query.filter_by(user_id=current_user.id).order_by(Project.date_posted.desc()).all()
    return render_template('dashboard.html', projects=projects)


# --- API ПРОЄКТІВ ---

@app.route('/api/save_project', methods=['POST'])
@login_required
def save_project():
    try:
        req_data = request.json
        scene_data = req_data.get('scene')
        project_name = req_data.get('name') or f'Проєкт {datetime.now().strftime("%d.%m %H:%M")}'
        project_id = req_data.get('id')  # ID передається, якщо ми редагуємо існуючий

        json_str = json.dumps(scene_data, ensure_ascii=False)

        # Оновлення існуючого
        if project_id:
            project = Project.query.get(project_id)
            if project and project.author == current_user:
                project.data = json_str
                project.name = project_name
                project.date_posted = datetime.utcnow()  # Оновлюємо дату зміни
                db.session.commit()
                return jsonify({"status": "success", "message": "Проєкт оновлено!", "id": project.id})

        # Створення нового
        new_project = Project(name=project_name, data=json_str, author=current_user)
        db.session.add(new_project)
        db.session.commit()

        return jsonify({"status": "success", "message": "Проєкт створено!", "id": new_project.id})

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/delete_project/<int:project_id>', methods=['DELETE'])
@login_required
def delete_project(project_id):
    project = Project.query.get_or_404(project_id)
    if project.author != current_user:
        return jsonify({'status': 'error', 'message': 'Access denied'}), 403

    db.session.delete(project)
    db.session.commit()
    return jsonify({'status': 'success'})


@app.route('/api/projects', methods=['GET'])
@login_required
def get_user_projects():
    user_projects = Project.query.filter_by(user_id=current_user.id).order_by(Project.date_posted.desc()).all()
    output = [{"id": p.id, "name": p.name, "date": p.date_posted.strftime("%d.%m.%Y %H:%M")} for p in user_projects]
    return jsonify(output), 200


@app.route('/api/project/<int:project_id>', methods=['GET'])
@login_required
def load_project(project_id):
    project = Project.query.get_or_404(project_id)
    if project.author != current_user:
        return jsonify({"status": "error", "message": "Access denied"}), 403
    try:
        scene_data = json.loads(project.data)
        return jsonify({"status": "success", "id": project.id, "name": project.name, "scene": scene_data}), 200
    except json.JSONDecodeError:
        return jsonify({"status": "error", "message": "Corrupted data"}), 500


# --- АВТОРИЗАЦІЯ ---

@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('index'))

    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')

        if User.query.filter((User.email == email) | (User.username == username)).first():
            flash('Користувач з таким email або логіном вже існує!', 'danger')
            return redirect(url_for('register'))

        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        user = User(username=username, email=email, password=hashed_password)
        db.session.add(user)
        db.session.commit()

        flash('Акаунт створено! Увійдіть.', 'success')
        return redirect(url_for('login'))

    return render_template('register.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))  # Одразу в кабінет

    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        user = User.query.filter_by(email=email).first()

        if user and bcrypt.check_password_hash(user.password, password):
            login_user(user)
            flash(f'Вітаємо, {user.username}!', 'success')
            return redirect(url_for('dashboard'))  # В кабінет
        else:
            flash('Невірний email або пароль.', 'danger')

    return render_template('login.html')


@app.route('/logout')
def logout():
    logout_user()
    return redirect(url_for('index'))


# --- АДМІНКА ---

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
                except:
                    pass

        if not new_device.get('name') or not new_device.get('brand'):
            return jsonify({"status": "error", "message": "Неповні дані"}), 400

        data['library'].append(new_device)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)

        return jsonify({"status": "success", "message": f"Додано в {filename}"}), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)