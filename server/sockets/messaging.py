from flask import request, jsonify, Blueprint
from flask_socketio import emit, join_room, leave_room
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, jwt_required
from extensions import socketio
from Utils.rooms import private_room
from database.db import get_db_connection
import pytz
from datetime import datetime

messaging_bp = Blueprint("messaging", __name__)

@socketio.on("send_message")
def handle_send_message(data):
    try:
        # Get current user from JWT
        #verify_jwt_in_request(optional=False)
        #sender_id = str(get_jwt_identity())
        sender_id = request.environ.get("user_id")
        
        # Get receiver and content from data
        receiver_id = str(data.get("receiver_id", ""))
        content = data.get("content", "").strip()
        
        if not all([receiver_id, content]):
            emit("error", {"message": "Missing required fields"}, room=request.sid)
            return
        
        if content == "":
            return
        
        room = private_room(sender_id, receiver_id)
        
        # Get time in Philippine timezone
        date_time = datetime.now()
        get_seconds = tz = pytz.timezone("Asia/Manila")

        date_sent = datetime.now(tz).isoformat()
        
        # Get fresh database connection
        conn = get_db_connection()
        temp_cursor = conn.cursor()
        
        temp_cursor.execute(
            """
            INSERT INTO messages (sender_id, receiver_id, content, is_seen, date_sent)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING message_id, sender_id, receiver_id, content, is_seen
            """,
            (int(sender_id), int(receiver_id), content, False, date_sent)
        )
        
        saved_message = temp_cursor.fetchone()
        conn.commit()
        
        if saved_message:
            # Convert to proper JSON-serializable format
            message_dict = {
                "message_id": saved_message["message_id"],
                "sender_id": saved_message["sender_id"],
                "receiver_id": saved_message["receiver_id"],
                "content": saved_message["content"],
                "is_seen": saved_message["is_seen"],
                "date_sent": date_sent,
            }
            
            print(f"✅ Message saved from {sender_id} to {receiver_id}: {content[:50]}...")
            
            # Emit to the room
            emit("new_message", message_dict, room=room)
            
            # Also emit user list update for sidebar refresh
            emit("user_list_update", {
                "type": "new_message",
                "sender_id": sender_id,
                "receiver_id": receiver_id,
                "message": message_dict
            }, broadcast=True, namespace='/')
        
        temp_cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error sending message: {e}")
        import traceback
        traceback.print_exc()
        emit("message_error", {"error": str(e)}, room=request.sid)
    except Exception as e:
        print(f"❌ Error marking messages as seen: {e}")
        return jsonify({"error": str(e)}), 500
    

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