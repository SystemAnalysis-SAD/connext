import eventlet
eventlet.monkey_patch()

from main import app, socketio

application = app

@app.route("/health", methods=["GET"])
def health():
    return {"status": "ok"}, 200

if __name__ == '__main__':
    print("🚀 Starting SocketIO server...")
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)

