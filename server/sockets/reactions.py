from flask import request, Blueprint
from extensions import socketio
from flask_socketio import emit
from Models.get_db_connection import get_db_connection
from Utils.rooms import private_room
import json

reactions_bp = Blueprint("reactions", __name__)

@socketio.on("add_reaction")
def handle_add_reaction(data):
    """Handle adding/updating reactions to messages"""
    try:
        message_id = data.get("message_id")
        sender_id = str(data.get("sender_id", ""))
        receiver_id = str(data.get("receiver_id", ""))
        reaction_type = data.get("reaction_type", "").lower()
        
        valid_reactions = ["like", "love", "haha", "wow", "sad", "angry", "okay"]
        
        if not all([message_id, sender_id, receiver_id, reaction_type]):
            emit("error", {"message": "Missing required fields"}, room=request.sid)
            return
        
        if reaction_type not in valid_reactions:
            emit("error", {"message": f"Invalid reaction type. Must be one of: {', '.join(valid_reactions)}"}, room=request.sid)
            return
        
        # Get fresh database connection
        conn = get_db_connection()
        temp_cursor = conn.cursor()
        
        # Get current reactions
        temp_cursor.execute(
            """
            SELECT reactions, sender_id, receiver_id 
            FROM messages 
            WHERE message_id = %s
            """,
            (int(message_id),)
        )
        message = temp_cursor.fetchone()
        
        if not message:
            emit("error", {"message": "Message not found"}, room=request.sid)
            temp_cursor.close()
            conn.close()
            return
        
        # Parse current reactions or initialize empty dict
        current_reactions = message["reactions"] or {}
        if isinstance(current_reactions, str):
            current_reactions = json.loads(current_reactions)
        
        # Check if user already has a reaction on this message
        user_reaction = None
        for r_type, users in current_reactions.items():
            if str(sender_id) in users:
                user_reaction = r_type
                # Remove user from previous reaction
                users.remove(str(sender_id))
                # If no users left for this reaction, remove the key
                if not users:
                    del current_reactions[r_type]
                break
        
        # If user clicked the same reaction, remove it (toggle off)
        if user_reaction == reaction_type:
            # Reaction already removed above
            pass
        else:
            # Add user to new reaction
            if reaction_type not in current_reactions:
                current_reactions[reaction_type] = []
            
            if str(sender_id) not in current_reactions[reaction_type]:
                current_reactions[reaction_type].append(str(sender_id))
        
        # Update the database
        temp_cursor.execute(
            """
            UPDATE messages 
            SET reactions = %s
            WHERE message_id = %s
            RETURNING message_id, reactions, sender_id, receiver_id
            """,
            (json.dumps(current_reactions), int(message_id))
        )
        
        updated_message = temp_cursor.fetchone()
        conn.commit()
        
        if updated_message:
            room = private_room(sender_id, receiver_id)
            
            # Emit the reaction update to the room
            emit("reaction_updated", {
                "message_id": updated_message["message_id"],
                "reactions": current_reactions,
                "sender_id": updated_message["sender_id"],
                "receiver_id": updated_message["receiver_id"],
                "updated_by": sender_id,
                "reaction_type": reaction_type if user_reaction != reaction_type else None  # None means removed
            }, room=room, namespace='/')
            
            print(f"✅ Reaction {reaction_type} added/updated by {sender_id} on message {message_id}")
        
        temp_cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error adding reaction: {e}")
        import traceback
        traceback.print_exc()
        emit("message_error", {"error": str(e)}, room=request.sid)

@socketio.on("get_reactions")
def handle_get_reactions(data):
    """Get detailed reactions for a message"""
    try:
        message_id = data.get("message_id")
        
        if not message_id:
            emit("error", {"message": "Message ID required"}, room=request.sid)
            return
        
        conn = get_db_connection()
        temp_cursor = conn.cursor()
        
        temp_cursor.execute(
            """
            SELECT reactions FROM messages WHERE message_id = %s
            """,
            (int(message_id),)
        )
        
        message = temp_cursor.fetchone()
        temp_cursor.close()
        conn.close()
        
        if message:
            reactions = message["reactions"] or {}
            if isinstance(reactions, str):
                reactions = json.loads(reactions)
            
            emit("reactions_data", {
                "message_id": message_id,
                "reactions": reactions
            }, room=request.sid, namespace='/')
        
    except Exception as e:
        print(f"❌ Error getting reactions: {e}")
        emit("message_error", {"error": str(e)}, room=request.sid)