import eventlet
eventlet.monkey_patch()

import logging
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from extensions import socketio, bcrypt
from Config.Config import Config


# ---------------- LOGGING ----------------
logging.basicConfig(level=logging.DEBUG)

# ---------------- APP SETUP ----------------
app = Flask(__name__)
app.config.from_object(Config)

CORS(
    app,
    supports_credentials=True,
    origins=[
        "https://connext-cn.vercel.app",
        "http://localhost:5173",
    ],
)

# ---------------- EXTENSIONS ----------------
jwt = JWTManager(app)
bcrypt.init_app(app)
socketio.init_app(app, 
                cors_allowed_origins="*",
                async_mode='eventlet',
                logger=True,
                engineio_logger=True)

# ---------------- BLUEPRINTS ----------------
from Routes.auth import auth_bp
from Routes.message_routes import message_bp

app.register_blueprint(auth_bp)
app.register_blueprint(message_bp)

# ---------------- HEALTH CHECK ----------------
@app.route("/")
def health_check():
    return {"status": "ok", "service": "chat-api"}

# ---------------- ENTRY POINT ----------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000, debug=True)
