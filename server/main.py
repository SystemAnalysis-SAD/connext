

from flask import Flask
from flask_cors import CORS
from extensions import socketio, bcrypt, jwt
from Config.Config import Config

# ---------------- APP SETUP ----------------
app = Flask(__name__)
app.config.from_object(Config)

CORS(
    app,
    supports_credentials=True,
)

# ---------------- EXTENSIONS ----------------
jwt.init_app(app)
bcrypt.init_app(app)
socketio.init_app(app
                )

# ---------------- BLUEPRINTS ----------------
from Routes.auth import auth_bp
from Routes.message_routes1 import message_bp
from sockets.connection import connection_bp
from sockets.messaging import messaging_bp
from sockets.edit import edit_bp
from sockets.reactions import reactions_bp
from sockets.seen import seen_bp
from sockets.typing import typing_bp

#sockets
app.register_blueprint(connection_bp)
app.register_blueprint(messaging_bp)
app.register_blueprint(edit_bp)
app.register_blueprint(reactions_bp)
app.register_blueprint(seen_bp)
app.register_blueprint(typing_bp)

#rest
app.register_blueprint(auth_bp)
app.register_blueprint(message_bp)

