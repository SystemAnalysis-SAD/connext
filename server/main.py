

from flask import Flask
from flask_cors import CORS
from extensions import socketio, bcrypt, jwt
from Config.Config import Config
#from extensions import talisman

# ---------------- APP SETUP ----------------
app = Flask(__name__)
app.config.from_object(Config)

CORS(
    app,
    supports_credentials=True,
    origins=["https://connext-cn.vercel.app", "http://localhost:5173"]
)

# ---------------- EXTENSIONS ----------------
jwt.init_app(app)
bcrypt.init_app(app)
socketio.init_app(app)
#talisman.init_app(app)


# ---------------- BLUEPRINTS ----------------
from Routes.auth import auth_bp
from Routes.message_routes1 import message_bp
#rest
app.register_blueprint(auth_bp)
app.register_blueprint(message_bp)


import sockets.connection
import sockets.connection
import sockets.messaging
import sockets.edit
import sockets.reactions
import sockets.seen
import sockets.typing

#sockets
""" app.register_blueprint(connection_bp)
app.register_blueprint(messaging_bp)
app.register_blueprint(edit_bp)
app.register_blueprint(reactions_bp)
app.register_blueprint(seen_bp)
app.register_blueprint(typing_bp) """



