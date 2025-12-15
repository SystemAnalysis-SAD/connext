from gevent import monkey
monkey.patch_all()

from main import app, socketio

application = app

if __name__ == '__main__':
    print("🚀 Starting SocketIO server...")
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)

