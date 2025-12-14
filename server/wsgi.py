import eventlet
eventlet.monkey_patch()

from main import app, socketio



if __name__ == '__main__':
    print("🚀 Starting SocketIO server...")
    socketio.run(app, host='localhost', port=5000, debug=True)