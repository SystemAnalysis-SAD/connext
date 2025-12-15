from flask import request, Blueprint
from extensions import socketio
from flask_socketio import emit
from Models.get_db_connection import get_db_connection
from datetime import datetime
import pytz
from Utils.rooms import private_room

edit_bp = Blueprint("edit", __name__)

@socketio.on("edit_message")
def handle_edit_message(data):
    """Handle message editing"""
    try:
        message_id = data.get("message_id")
        sender_id = str(data.get("sender_id", ""))
        receiver_id = str(data.get("receiver_id", ""))
        new_content = data.get("new_content", "").strip()
        
        if not all([message_id, sender_id, receiver_id, new_content]):
            emit("error", {"message": "Missing required fields"}, room=request.sid)
            return
        
        # Get time in Philippine timezone
        edited_at = datetime.now().astimezone(pytz.timezone('Asia/Manila')).strftime("%H:%M %p %S")
        
        # Get fresh database connection
        conn = get_db_connection()
        temp_cursor = conn.cursor()
        
        # Check if the message exists and user is the sender
        temp_cursor.execute(
            """
            SELECT message_id, sender_id, content 
            FROM messages 
            WHERE message_id = %s AND sender_id = %s
            """,
            (int(message_id), int(sender_id))
        )
        message = temp_cursor.fetchone()
        
        if not message:
            emit("error", {"message": "Message not found or unauthorized"}, room=request.sid)
            temp_cursor.close()
            conn.close()
            return
        
        # Update the message
        temp_cursor.execute(
            """
            UPDATE messages 
            SET content = %s, is_edited = TRUE, edited_at = %s
            WHERE message_id = %s
            RETURNING message_id, sender_id, receiver_id, content, is_edited, edited_at
            """,
            (new_content, edited_at, int(message_id))
        )
        
        updated_message = temp_cursor.fetchone()
        conn.commit()
        
        if updated_message:
            # Convert to proper JSON-serializable format
            message_dict = dict(updated_message)
            message_dict["edited_at"] = edited_at
            
            room = private_room(sender_id, receiver_id)
            
            # Emit the edited message to the room
            emit("message_edited", {
                "message_id": message_dict["message_id"],
                "sender_id": message_dict["sender_id"],
                "receiver_id": message_dict["receiver_id"],
                "content": message_dict["content"],
                "is_edited": message_dict["is_edited"],
                "edited_at": message_dict["edited_at"]
            }, room=room, namespace='/')
            
            print(f"✅ Message {message_id} edited by {sender_id}")
        
        temp_cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error editing message: {e}")
        import traceback
        traceback.print_exc()
        emit("message_error", {"error": str(e)}, room=request.sid)