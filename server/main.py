# server/main.py - FIXED VERSION
from flask import Flask
from flask_cors import CORS
from Utils.hash_password import bcrypt
from flask_jwt_extended import JWTManager
from Routes.message_routes import socketio
from Config.Config import Config
from Models.get_db_connection import get_db_connection

# 1. Create extensions FIRST (without app)

jwtmanager = JWTManager()

# 2. Create the Flask app
app = Flask(__name__)

# 3. Configure the app BEFORE initializing extensions
app.config.from_object(Config)

# 4. Initialize extensions WITH the app
CORS(app, supports_credentials=True)
socketio.init_app(app)
bcrypt.init_app(app)
jwtmanager.init_app(app)
bcrypt.init_app(app)

# 5. IMPORT BLUEPRINTS HERE (AFTER app is created)
# This prevents circular imports
from Routes.auth import auth_bp
from Routes.message_routes import message_bp

# 6. Register blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(message_bp)

# 7. Set socketio.app if needed (some patterns require this)
socketio.app = app

if __name__ == "__main__":
    socketio.run(app, host='localhost', port=5000, debug=True)
else:
    # This helps gunicorn find the app
    application = app