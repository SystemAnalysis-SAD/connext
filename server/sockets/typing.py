from extensions import socketio
from Utils.rooms import private_room
from flask_socketio import emit
from flask import Blueprint

typing_bp = Blueprint("typing", __name__)

@socketio.on("typing_start")
def handle_typing_start(data):
    sender = str(data.get("sender_id", ""))
    receiver = str(data.get("receiver_id", ""))
    
    if not all([sender, receiver]):
        return
    
    room = private_room(sender, receiver)
    emit("typing_start", {
        "sender_id": sender,
        "receiver_id": receiver
    }, room=room, namespace='/')

@socketio.on("typing_stop")
def handle_typing_stop(data):
    sender = str(data.get("sender_id", ""))
    receiver = str(data.get("receiver_id", ""))
    
    if not all([sender, receiver]):
        return
    
    room = private_room(sender, receiver)
    emit("typing_stop", {
        "sender_id": sender,
        "receiver_id": receiver
    }, room=room, namespace='/')