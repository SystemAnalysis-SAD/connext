

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
    origins=["https://connext-cn.vercel.app", "http://localhost:5173"]
)

# ---------------- EXTENSIONS ----------------
jwt.init_app(app)
bcrypt.init_app(app)
socketio.init_app(app)




# ---------------- BLUEPRINTS ----------------
from Routes.auth import auth_bp
from Routes.message_routes1 import message_bp

app.register_blueprint(auth_bp)
app.register_blueprint(message_bp)





