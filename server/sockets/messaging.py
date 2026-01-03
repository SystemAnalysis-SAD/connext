from flask import request, jsonify, Blueprint
from flask_socketio import emit, join_room, leave_room
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, jwt_required
from extensions import socketio
from Utils.rooms import private_room
from database.db import get_db_connection
import pytz
from datetime import datetime
from extensions import fernet

messaging_bp = Blueprint("messaging", __name__)

def encrypt_msg(message: str) -> str:
    return fernet.encrypt(message.encode()).decode()

def decrypt_message(message: str) -> str:
    return fernet.decrypt(message.encode()).decode()

@socketio.on("send_message")
def handle_send_message(data):
    try:
        sender_id = request.environ.get("user_id")

        receiver_id = str(data.get("receiver_id", ""))
        content = data.get("content", "")
        reply_to = data.get("reply_to_message_id")  # 👈 NEW
        reply_to = int(reply_to) if reply_to is not None else None

        if not all([receiver_id, content]):
            emit("error", {"message": "Missing required fields"}, room=request.sid)
            return

        if len(content) > 200:
            emit("error", {"message": "Too many characters"}, room=request.sid)
            return

        encrypted_msg = encrypt_msg(content)

        room = private_room(sender_id, receiver_id)
        tz = pytz.timezone("Asia/Manila")
        date_sent = datetime.now(tz).isoformat()

        conn = get_db_connection()
        cur = conn.cursor()

        # 🔥 Insert message with reply
        cur.execute(
            """
            INSERT INTO messages (
                sender_id,
                receiver_id,
                content,
                reply_to_message_id,
                is_seen,
                date_sent
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (int(sender_id), int(receiver_id), encrypted_msg, reply_to, False, date_sent)
        )

        saved_message = cur.fetchone()
        conn.commit()

        # 🔁 Fetch replied message (if any)
        reply_data = None
        if reply_to:
            cur.execute(
                """
                SELECT message_id, sender_id, content
                FROM messages
                WHERE message_id = %s
                """,
                (reply_to,)
            )
            reply_row = cur.fetchone()
            if reply_row:
                reply_data = {
                    "message_id": reply_row["message_id"],
                    "sender_id": reply_row["sender_id"],
                    "content": decrypt_message(reply_row["content"])
                }

        cur.close()
        conn.close()

        # ✅ Prepare socket payload
        message_dict = {
            "message_id": saved_message["message_id"],
            "sender_id": saved_message["sender_id"],
            "receiver_id": saved_message["receiver_id"],
            "content": decrypt_message(saved_message["content"]),
            "is_seen": saved_message["is_seen"],
            "date_sent": date_sent,
            "reply_to_message_id": reply_to,
            "reply": reply_data  # 👈 NEW
        }

        print(f"✅ Message saved from {sender_id} to {receiver_id}")

        emit("new_message", message_dict, room=room)

        emit(
            "user_list_update",
            {
                "type": "new_message",
                "sender_id": sender_id,
                "receiver_id": receiver_id,
                "message": message_dict
            },
            broadcast=True,
            namespace='/'
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        emit("message_error", {"error": str(e)}, room=request.sid)

    

@socketio.on("join_private")
def handle_join(data):
    user1 = str(data["user1"])
    user2 = str(data["user2"])
    room = private_room(user1, user2)
    
    join_room(room)
    print(f"👥 User {user1} joined room {room} with {user2}")
    emit("joined_room", {"room": room})

@socketio.on("leave_private")
def handle_leave(data):
    user1 = str(data.get("user1", ""))
    user2 = str(data.get("user2", ""))
    
    if not all([user1, user2]):
        return
    
    room = private_room(user1, user2)
    leave_room(room)
    print(f"👋 User {user1} left room {room} with {user2}")