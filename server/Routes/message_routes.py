from flask import Blueprint, request, jsonify, current_app
from database.db import fetch_all, get_db_connection
from flask_jwt_extended import jwt_required, get_jwt_identity, create_access_token, verify_jwt_in_request, get_jwt
from flask_socketio import join_room, emit, leave_room
import pytz
from datetime import datetime
from datetime import timedelta
import threading
import time
import atexit

message_bp = Blueprint("message_bp", __name__)


from flask_socketio import SocketIO
socketio = SocketIO(cors_allowed_origins="*", async_mode="eventlet")

# Global connection for Socket.IO - Use connection pool instead
def get_fresh_connection():
    """Get a fresh database connection for each operation"""
    return get_db_connection()

# Thread-safe online users tracking
class OnlineUsersManager:
    def __init__(self):
        self.online_users = {}  # user_id -> {"sid": sid, "last_seen": timestamp}
        self.refresh_timers = {}  # user_id -> timer info
        self.lock = threading.Lock()
    
    def add_user(self, user_id, sid):
        with self.lock:
            self.online_users[user_id] = {
                "sid": sid,
                "last_seen": datetime.utcnow().isoformat()
            }
    
    def remove_user(self, user_id):
        with self.lock:
            if user_id in self.online_users:
                del self.online_users[user_id]
    
    def remove_user_by_sid(self, sid):
        with self.lock:
            for user_id, data in list(self.online_users.items()):
                if data["sid"] == sid:
                    del self.online_users[user_id]
                    return user_id
        return None
    
    def get_user_sid(self, user_id):
        with self.lock:
            if user_id in self.online_users:
                return self.online_users[user_id]["sid"]
        return None
    
    def is_online(self, user_id):
        with self.lock:
            return user_id in self.online_users
    
    def get_all_users(self):
        with self.lock:
            return list(self.online_users.keys())
    
    def cleanup(self):
        with self.lock:
            # Stop all refresh timers
            for user_id in list(self.refresh_timers.keys()):
                self.stop_refresh_timer(user_id)
            self.online_users.clear()

# Global manager instance
online_manager = OnlineUsersManager()

# Cleanup on exit
def cleanup_on_exit():
    """Cleanup resources when application exits"""
    online_manager.cleanup()
    print("🧹 Cleaned up online users manager")

atexit.register(cleanup_on_exit)

def private_room(user1, user2):
    user1 = int(user1)
    user2 = int(user2)
    room_name = f"room_{min(user1, user2)}_{max(user1, user2)}"
    return room_name

@message_bp.route("/messages/<int:other_user_id>", methods=["GET"])
@jwt_required()
def get_messages(other_user_id):
    try:
        current_user_id = get_jwt_identity()
        
        # Get a fresh database connection
        conn = get_fresh_connection()
        temp_cursor = conn.cursor()
        
        query = """
        SELECT * FROM messages
        WHERE (sender_id = %s AND receiver_id = %s)
           OR (sender_id = %s AND receiver_id = %s)
        ORDER BY date_sent ASC;
        """
        
        temp_cursor.execute(query, (current_user_id, other_user_id, other_user_id, current_user_id))
        messages = temp_cursor.fetchall()
        temp_cursor.close()
        conn.close()
        
        return jsonify(messages)
        
    except Exception as e:
        print(f"❌ Error in get_messages: {e}")
        return jsonify({"error": str(e)}), 500


@message_bp.route("/latest-messages", methods=["GET"])
@jwt_required()
def get_latest_messages():
    """Get the latest message from each conversation for current user"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get a fresh database connection
        conn = get_fresh_connection()
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
        temp_cursor.close()
        conn.close()
        
        return jsonify(messages)
        
    except Exception as e:
        print(f"❌ Error in get_latest_messages: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@message_bp.route("/mark-as-seen/<int:sender_id>", methods=["POST"])
@jwt_required()
def mark_as_seen(sender_id):
    """Mark messages from a specific sender as seen by current user"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get a fresh database connection
        conn = get_fresh_connection()
        temp_cursor = conn.cursor()
        
        # Mark all unread messages from sender to current user as seen
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
            # Emit socket event that messages were seen
            room_name = private_room(sender_id, current_user_id)
            emit("messages_seen", {
                "sender_id": sender_id,
                "receiver_id": current_user_id,
                "updated_count": len(updated)
            }, room=room_name, namespace='/')
            print(f"✅ Messages marked as seen: {len(updated)} messages")
        
        return jsonify({"success": True, "updated": len(updated)})
        
    except Exception as e:
        print(f"❌ Error marking messages as seen: {e}")
        return jsonify({"error": str(e)}), 500

# Add this helper function to get user info
@message_bp.route("/user-info/<int:user_id>", methods=["GET"])
@jwt_required()
def get_user_info(user_id):
    """Get basic user info for chat"""
    try:
        current_user_id = get_jwt_identity()
        
        # Prevent users from accessing other users' info arbitrarily
        # (You might want to implement friend/contact logic here)
        
        conn = get_fresh_connection()
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
        print(f"❌ Error getting user info: {e}")
        return jsonify({"error": str(e)}), 500

# Update send_message to use authenticated user
@socketio.on("send_message")
def handle_send_message(data):
    try:
        # Get current user from JWT
        verify_jwt_in_request(optional=False)
        sender_id = str(get_jwt_identity())
        
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
        get_seconds = date_time.astimezone(pytz.timezone('Asia/Manila')).strftime("%H:%M %p %S")
        
        # Get fresh database connection
        conn = get_fresh_connection()
        temp_cursor = conn.cursor()
        
        temp_cursor.execute(
            """
            INSERT INTO messages (sender_id, receiver_id, content, is_seen, date_sent)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING message_id, sender_id, receiver_id, content, is_seen
            """,
            (int(sender_id), int(receiver_id), content, False, get_seconds)
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
                "date_sent": get_seconds,
            }
            
            print(f"✅ Message saved from {sender_id} to {receiver_id}: {content[:50]}...")
            
            # Emit to the room
            emit("new_message", message_dict, room=room, namespace='/')
            
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

from flask_socketio import disconnect
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, get_jwt

@socketio.on("connect")
@jwt_required()
def handle_connect():
    try:
        # Try to verify JWT from cookies or query parameters
        token = request.cookies.get('access_token_cookie')
        
        if not token:
            print(f"❌ No token provided for connection attempt")
            disconnect()
            return
        
        # Verify the token
        """ verify_jwt_in_request(optional=False, token=token) """
        current_user_id = get_jwt_identity()
        
        print(f"✅ CLIENT CONNECTED - User: {current_user_id}, SID: {request.sid}")
        
    except Exception as e:
        print(f"❌ Authentication failed for connection: {e}")
        disconnect()
        return

@socketio.on("register")
def handle_register(data):
    try:
        # Get user_id from JWT instead of from data
        verify_jwt_in_request(optional=False)
        user_id = str(get_jwt_identity())
        
        # Check if user is already registered with different SID
        existing_sid = online_manager.get_user_sid(user_id)
        if existing_sid and existing_sid != request.sid:
            print(f"⚠️ User {user_id} already connected with SID {existing_sid}, cleaning up old connection")
            # Clean up old connection
            online_manager.remove_user(user_id)
            stop_refresh_timer(user_id)
        
        # Register new connection
        online_manager.add_user(user_id, request.sid)
        
        # Schedule automatic token refresh
        schedule_token_refresh(user_id, request.sid)
        
        # Broadcast online status to ALL connected clients
        emit("user_online", {
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat()
        }, broadcast=True, namespace='/', include_self=False)
        
        print(f"✅ User {user_id} registered. SID: {request.sid}. Total online: {len(online_manager.get_all_users())}")
        
        # Send current online users to the newly connected user
        emit("online_users_list", {
            "online_users": online_manager.get_all_users()
        }, room=request.sid, namespace='/')
        
    except Exception as e:
        print(f"❌ Error in register: {e}")
        disconnect()

def stop_refresh_timer(user_id):
    """Stop refresh timer for a user"""
    if user_id in online_manager.refresh_timers:
        timer_info = online_manager.refresh_timers[user_id]
        if "stop_event" in timer_info and timer_info["stop_event"]:
            timer_info["stop_event"].set()  # Signal the thread to stop
            if "thread" in timer_info and timer_info["thread"].is_alive():
                timer_info["thread"].join(timeout=2.0)  # Wait for thread to finish
        del online_manager.refresh_timers[user_id]
        print(f"⏹️ Stopped refresh timer for user {user_id}")

def refresh_worker(user_id, sid, stop_event):
    """Background worker to refresh tokens"""
    print(f"🔄 Starting refresh worker for user {user_id}")
    
    while not stop_event.is_set():
        try:
            # Sleep before first refresh
            time.sleep(900)  # Check more frequently than token expiry
            
            if stop_event.is_set():
                print(f"🛑 Refresh worker stopping for user {user_id}")
                break
                
            # Check if user is still online
            current_sid = online_manager.get_user_sid(user_id)
            if not current_sid or current_sid != sid:
                print(f"🛑 User {user_id} no longer online or SID changed")
                break
            
            # Get fresh database connection
            conn = get_fresh_connection()
            temp_cursor = conn.cursor()
            
            # Get user info
            temp_cursor.execute(
                "SELECT uid, username FROM user_table WHERE uid = %s",
                (int(user_id),)
            )
            user = temp_cursor.fetchone()
            temp_cursor.close()
            conn.close()
            
            if not user:
                print(f"❌ User {user_id} not found for refresh")
                break
            
            # Create new access token (30 seconds expiry for testing)
            new_access_token = create_access_token(
                identity=str(user["uid"]),
                additional_claims={
                    "uid": user["uid"],
                    "username": user["username"]
                },
                expires_delta=timedelta(minutes=30)
            )
            
            # Emit token to the specific client
            socketio.emit("token_refreshed", {
                "access_token": new_access_token,
                "expires_in": 30,
                "user_id": user["uid"],
                "timestamp": datetime.utcnow().isoformat()
            }, room=sid, namespace='/')
            
            print(f"✅ Auto-refreshed token for user {user_id}")
            
        except Exception as e:
            print(f"❌ Error refreshing token for user {user_id}: {e}")
            time.sleep(5)  # Wait 5 seconds before retrying on error
    
    print(f"🛑 Refresh worker exiting for user {user_id}")

def schedule_token_refresh(user_id, sid):
    """Schedule automatic token refresh for an online user"""
    # Stop any existing timer for this user
    stop_refresh_timer(user_id)
    
    # Create stop event for this thread
    stop_event = threading.Event()
    
    # Create and start thread
    thread = threading.Thread(
        target=refresh_worker,
        args=(user_id, sid, stop_event),
        daemon=True,
        name=f"refresh_{user_id}"
    )
    thread.start()
    
    # Store thread and stop event
    online_manager.refresh_timers[user_id] = {
        "thread": thread,
        "stop_event": stop_event,
        "sid": sid,
        "started_at": datetime.utcnow().isoformat()
    }
    
    print(f"🔄 Started auto-refresh for user {user_id}")

@message_bp.route("/online-status/<int:user_id>", methods=["GET"])
def get_online_status(user_id):
    is_online = online_manager.is_online(str(user_id))
    return jsonify({"user_id": user_id, "is_online": is_online})

@message_bp.route("/online-users", methods=["GET"])
#@jwt_required()
def get_online_users():
    return jsonify({"online_users": online_manager.get_all_users()})

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



@socketio.on("disconnect")
def handle_disconnect():
    try:
        disconnected_user = online_manager.remove_user_by_sid(request.sid)
        
        if disconnected_user:
            # Stop refresh timer for disconnected user
            stop_refresh_timer(disconnected_user)
            
            print(f"❌ User {disconnected_user} disconnected. Remaining online: {len(online_manager.get_all_users())}")
            
            # Broadcast offline status to ALL connected clients
            emit("user_offline", {
                "user_id": disconnected_user,
                "timestamp": datetime.utcnow().isoformat()
            }, broadcast=True, namespace='/', include_self=False)
    except Exception as e:
        print(f"❌ Error in disconnect: {e}")
        import traceback
        traceback.print_exc()

@socketio.on("send_message")
def handle_send_message(data):
    try:
        sender = str(data.get("sender_id", ""))
        receiver = str(data.get("receiver_id", ""))
        content = data.get("content", "").strip()
        
        if not all([sender, receiver, content]):
            emit("error", {"message": "Missing required fields"}, room=request.sid)
            return
        
        if content == "":
            return
        
        room = private_room(sender, receiver)
        
        # Get time in Philippine timezone
        date_time = datetime.now()
        get_seconds = date_time.astimezone(pytz.timezone('Asia/Manila')).strftime("%H:%M %p %S")
        pht_ = date_time.astimezone(pytz.timezone('Asia/Manila')).strftime("%I:%M %p")
        

        
        # Get fresh database connection
        conn = get_fresh_connection()
        temp_cursor = conn.cursor()
        
        temp_cursor.execute(
            """
            INSERT INTO messages (sender_id, receiver_id, content, is_seen, date_sent)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING message_id, sender_id, receiver_id, content, is_seen
            """,
            (int(sender), int(receiver), content, False, get_seconds)  # Use string here
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
                "date_sent": get_seconds,  # Already a string
            }
            
            print(f"✅ Message saved from {sender} to {receiver}: {content[:50]}...")
            
            # Emit to the room
            emit("new_message", message_dict, room=room, namespace='/')
            
            # Also emit user list update for sidebar refresh
            emit("user_list_update", {
                "type": "new_message",
                "sender_id": sender,
                "receiver_id": receiver,
                "message": message_dict
            }, broadcast=True, namespace='/')
        
        temp_cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error sending message: {e}")
        import traceback
        traceback.print_exc()
        emit("message_error", {"error": str(e)}, room=request.sid)

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
        conn = get_fresh_connection()
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

@socketio.on("request_token_refresh")
def handle_request_token_refresh(data):
    """Handle manual token refresh requests from client"""
    user_id = str(data.get("user_id", ""))
    
    if not user_id:
        return
    
    sid = online_manager.get_user_sid(user_id)
    if not sid or sid != request.sid:
        print(f"⚠️ User {user_id} not online or SID mismatch for manual refresh")
        return
    
    try:
        print(f"🔄 Manual token refresh requested for user {user_id}")
        
        # Get fresh database connection
        conn = get_fresh_connection()
        temp_cursor = conn.cursor()
        
        # Get user data from database
        temp_cursor.execute(
            "SELECT uid, username FROM user_table WHERE uid = %s",
            (int(user_id),)
        )
        user = temp_cursor.fetchone()
        temp_cursor.close()
        conn.close()
        
        if user:
            # Create new access token
            new_access_token = create_access_token(
                identity=str(user["uid"]),
                additional_claims={
                    "uid": user["uid"],
                    "username": user["username"]
                },
                expires_delta=timedelta(minutes=30)
            )
            
            # Send new token via socket
            emit("token_refreshed", {
                "access_token": new_access_token,
                "expires_in": 30,
                "user_id": user["uid"],
                "timestamp": datetime.utcnow().isoformat()
            }, room=sid, namespace='/')
            
            print(f"✅ Sent manually refreshed token to user {user_id}")
        else:
            print(f"❌ User {user_id} not found for manual refresh")
            
    except Exception as e:
        print(f"❌ Manual token refresh failed: {e}")
        import traceback
        traceback.print_exc()


# Add these imports at the top of your Flask file
from flask import jsonify
import json

# Add these new Socket.IO event handlers after the existing ones
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
        conn = get_fresh_connection()
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

@socketio.on("add_reaction")

def handle_add_reaction(data):
    """Handle adding/updating reactions to messages"""
    try:
        message_id = data.get("message_id")
        sender_id = str(data.get("sender_id", ""))
        receiver_id = str(data.get("receiver_id", ""))
        reaction_type = data.get("reaction_type", "").lower()
        
        valid_reactions = ["like", "love", "haha", "wow", "sad", "angry"]
        
        if not all([message_id, sender_id, receiver_id, reaction_type]):
            emit("error", {"message": "Missing required fields"}, room=request.sid)
            return
        
        if reaction_type not in valid_reactions:
            emit("error", {"message": f"Invalid reaction type. Must be one of: {', '.join(valid_reactions)}"}, room=request.sid)
            return
        
        # Get fresh database connection
        conn = get_fresh_connection()
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
        
        conn = get_fresh_connection()
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