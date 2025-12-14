from flask import Flask
from flask_socketio import SocketIO
from flask_cors import CORS
from flask_bcrypt import Bcrypt

socketio = SocketIO(cors_allowed_origins="*", async_mode="eventlet")
bcrypt = Bcrypt()


def create_app():
    app = Flask(__name__)
    CORS(app, supports_credentials=True)
    
    socketio.init_app(app)
    bcrypt.init_app(app)

    #import blueprints and register
    from .Routes.auth import auth_bp
    from .Routes.message_routes import message_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(message_bp)


    return app
