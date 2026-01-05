from flask_socketio import SocketIO
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
from cryptography.fernet import Fernet
from Config.Config import Config

# Initialize extensions
fernet = Fernet(Config.MESSAGE_SECRET_KEY)
socketio = SocketIO(cors_allowed_origins="*",
                async_mode='eventlet')  
bcrypt = Bcrypt()
jwt = JWTManager()

