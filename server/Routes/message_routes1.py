from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database.db import get_db_connection
from Utils.rooms import private_room
from extensions import socketio
from services.online_users import online_manager
from flask_socketio import emit
from extensions import fernet

message_bp = Blueprint("message_bp", __name__)

#encrypt all messages
def decrypt_message(message: str) -> str:
    return fernet.decrypt(message.encode()).decode()

"""get all messages"""
@message_bp.route("/messages/<int:other_user_id>", methods=["GET"])
@jwt_required()
def get_messages(other_user_id):
    uid = get_jwt_identity()
    conn = get_db_connection()
    cur = conn.cursor()

    if other_user_id == None:
        return jsonify({ "error": "Receiver ID cannot be empty."})

    if int(uid) == None:
        return jsonify({ "error": "restricted"})

    cur.execute("""
        SELECT 
            m.*,
            r.message_id AS reply_message_id,
            r.content AS reply_content,
            r.sender_id AS reply_sender_id
        FROM messages m
        LEFT JOIN messages r
            ON m.reply_to_message_id = r.message_id
        WHERE (m.sender_id=%s AND m.receiver_id=%s)
        OR (m.sender_id=%s AND m.receiver_id=%s)
        ORDER BY m.date_sent ASC

    """, (uid, other_user_id, other_user_id, uid))

    data = cur.fetchall()
    cur.close()
    conn.close()

    messages = []
    for msg in data:
        msg["content"] = decrypt_message(msg["content"])

        if msg.get("reply_content"):
            msg["reply_content"] = decrypt_message(msg["reply_content"])

        messages.append(msg)


    return jsonify(messages), 200


@message_bp.route("/latest-messages", methods=["GET"])
@jwt_required()
def get_latest_messages():
    """Get the latest message from each conversation for current user"""
    try:
        current_user_id = get_jwt_identity()

        if current_user_id == None:
            return jsonify({ "error": "Unauthorize"})
        
        # Get a fresh database connection
        conn = get_db_connection()
        temp_cursor = conn.cursor()
        
        query = """
        WITH LatestMessages AS (
            SELECT 
                m.*,
                CASE 
                    WHEN m.sender_id = %s THEN m.receiver_id
                    ELSE m.sender_id
                END as other_user_id,
                ROW_NUMBER() OVER (
                    PARTITION BY 
                        CASE 
                            WHEN m.sender_id = %s THEN m.receiver_id
                            ELSE m.sender_id
                        END 
                    ORDER BY m.date_sent DESC
                ) as rn
            FROM messages m
            WHERE m.sender_id = %s OR m.receiver_id = %s
        )
        SELECT 
            lm.message_id,
            lm.sender_id,
            lm.receiver_id,
            lm.content,
            lm.is_seen,
            lm.date_sent,
            lm.other_user_id,
            u.first_name,
            u.last_name,
            u.username
        FROM LatestMessages lm
        LEFT JOIN user_table u ON u.uid = lm.other_user_id
        WHERE lm.rn = 1
        ORDER BY lm.date_sent DESC;
        """
        
        temp_cursor.execute(query, (current_user_id, current_user_id, current_user_id, current_user_id))
        messages = temp_cursor.fetchall()
        msg = []
        for message in messages:
            message["content"] = decrypt_message(message["content"])
            msg.append(message)
        temp_cursor.close()
        conn.close()

        
        
        return jsonify(messages)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    
@message_bp.route("/online-status/<int:user_id>", methods=["GET"])
def get_online_status(user_id):
    is_online = online_manager.is_online(str(user_id))
    return jsonify({"user_id": user_id, "is_online": is_online})

@message_bp.route("/online-users", methods=["GET"])
@jwt_required()
def get_online_users():
    return jsonify({"online_users": online_manager.get_all_users()})


@message_bp.route("/user-info/<int:user_id>", methods=["GET"])
@jwt_required()
def get_user_info(user_id):
    """Get basic user info for chat"""
    try:
        current_user_id = get_jwt_identity()
        
        # Prevent users from accessing other users' info arbitrarily
        # (You might want to implement friend/contact logic here)
        
        conn = get_db_connection()
        temp_cursor = conn.cursor()
        
        temp_cursor.execute(
            "SELECT uid, username, first_name, last_name FROM user_table WHERE uid = %s",
            (user_id,)
        )
        user = temp_cursor.fetchone()
        temp_cursor.close()
        conn.close()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        return jsonify(user)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

@message_bp.route("/mark-as-seen/<int:sender_id>", methods=["POST"])
@jwt_required()
def mark_as_seen(sender_id):
    """Mark messages from a specific sender as seen by current user"""
    try:
        current_user_id = get_jwt_identity()

        if current_user_id == None:
            return jsonify({ "error": "Unauthorize"})

        conn = get_db_connection()
        temp_cursor = conn.cursor()
        
        update_query = """
        UPDATE messages 
        SET is_seen = TRUE 
        WHERE sender_id = %s 
        AND receiver_id = %s 
        AND is_seen = FALSE
        RETURNING message_id, sender_id, receiver_id, content
        """
        
        temp_cursor.execute(update_query, (sender_id, current_user_id))
        updated = temp_cursor.fetchall()
        conn.commit()
        temp_cursor.close()
        conn.close()
        
        if updated:
            room_name = private_room(sender_id, current_user_id)
            emit("messages_seen", {
                "sender_id": sender_id,
                "receiver_id": current_user_id,
                "updated_count": len(updated)
            }, room=room_name, namespace='/')
        return jsonify({"success": True, "updated": len(updated)})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500