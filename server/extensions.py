from flask_socketio import SocketIO
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
""" from flask_talisman import Talisman """

# Initialize extensions
socketio = SocketIO(cors_allowed_origins="*",
                async_mode='eventlet')  
bcrypt = Bcrypt()
jwt = JWTManager()
""" talisman = Talisman() """
