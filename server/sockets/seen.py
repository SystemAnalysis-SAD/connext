from flask_socketio import emit
from flask import Blueprint
from extensions import socketio
from database.db import get_db_connection
from Utils.rooms import private_room

seen_bp = Blueprint("seen", __name__)

@socketio.on("mark_as_seen")
def handle_mark_as_seen(data):
    """Mark messages as seen when user opens chat"""
    sender_id = str(data.get("sender_id", ""))
    receiver_id = str(data.get("receiver_id", ""))
    
    print(f"👁️ Socket mark_as_seen: {sender_id} -> {receiver_id}")
    
    if not all([sender_id, receiver_id]):
        return
    
    try:
        # Get fresh database connection
        conn = get_db_connection()
        temp_cursor = conn.cursor()
        
        # Update messages
        temp_cursor.execute(
            """
            UPDATE messages 
            SET is_seen = TRUE 
            WHERE sender_id = %s 
            AND receiver_id = %s 
            AND is_seen = FALSE
            RETURNING message_id, sender_id, receiver_id, content, is_seen, date_sent
            """,
            (int(sender_id), int(receiver_id))
        )
        
        updated_messages = temp_cursor.fetchall()
        conn.commit()
        
        if updated_messages:
            room = private_room(sender_id, receiver_id)
            
            # Emit individual update for each message
            for msg in updated_messages:
                emit("message_seen_update", {
                    "message_id": msg["message_id"],
                    "sender_id": msg["sender_id"],
                    "receiver_id": msg["receiver_id"],
                    "is_seen": True
                }, room=room, namespace='/')
            
            # Also emit the general messages_seen event
            emit("messages_seen", {
                "sender_id": sender_id,
                "receiver_id": receiver_id,
                "updated_count": len(updated_messages)
            }, room=room, namespace='/')
            
            print(f"✅ SocketIO: Marked {len(updated_messages)} messages as seen from {sender_id} to {receiver_id}")
            
        temp_cursor.close()
        conn.close()
            
    except Exception as e:
        print(f"❌ Error marking messages as seen via socket: {e}")
        import traceback
        traceback.print_exc()


@socketio.on("mark_message_seen")
def mark_message_seen(data):
    message_id = data.get("message_id")
    viewer_id = data.get("viewer_id")

    if not message_id or not viewer_id:
        return

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        """
        UPDATE messages
        SET is_seen = TRUE
        WHERE message_id = %s AND receiver_id = %s
        RETURNING message_id, sender_id, receiver_id
        """,
        (message_id, viewer_id)
    )

    msg = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    if not msg:
        return

    room = private_room(msg["sender_id"], msg["receiver_id"])

    # ✅ FULL PAYLOAD
    emit(
        "message_seen_update",
        {
            "message_id": msg["message_id"],
            "sender_id": msg["sender_id"],
            "receiver_id": msg["receiver_id"],
            "is_seen": True,
        },
        room=room
    )
