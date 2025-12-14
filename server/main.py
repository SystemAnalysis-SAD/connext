from server import create_app, socketio
from flask_jwt_extended import JWTManager
from .Config.Config import Config

jwtmanager = JWTManager()

app = create_app()
jwtmanager.init_app(app)
app.config.from_object(Config)

socketio.app = app

if __name__ == "__main__":
    socketio.run(app, host='localhost', port=5000, debug=True)