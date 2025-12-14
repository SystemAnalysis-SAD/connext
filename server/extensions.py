from flask_socketio import SocketIO
from flask_bcrypt import Bcrypt

# Initialize extensions
socketio = SocketIO()  # Remove cors_allowed_origins from here
bcrypt = Bcrypt()
