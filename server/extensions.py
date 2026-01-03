from flask_socketio import SocketIO
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
from cryptography.fernet import Fernet
from Config.Config import Config

from flask_wtf.csrf import CSRFProtect

""" from flask_talisman import Talisman """

# Initialize extensions
fernet = Fernet(Config.MESSAGE_SECRET_KEY)
socketio = SocketIO(cors_allowed_origins="*",
                async_mode='eventlet')  
bcrypt = Bcrypt()
jwt = JWTManager()

csrf = CSRFProtect()
""" talisman = Talisman() """
