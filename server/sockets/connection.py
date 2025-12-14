from flask import request, Blueprint
from flask_socketio import disconnect, emit
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, create_access_token, jwt_required
from extensions import socketio
from services.online_users import online_manager
from datetime import datetime
import threading
import time
from datetime import timedelta
from Models.get_db_connection import get_db_connection

connection_bp = Blueprint("connection", __name__)

@socketio.on("connect")
@jwt_required()
def handle_connect():
    try:
        # Verify the token
        #verify_jwt_in_request(optional=False)
        current_user_id = get_jwt_identity()
        
        print(f"✅ CLIENT CONNECTED - User: {current_user_id}, SID: {request.sid}")
        
    except Exception as e:
        print(f"❌ Authentication failed for connection: {e}")
        disconnect()
        return
    
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
            conn = get_db_connection()
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

@socketio.on("disconnect")
def disconnect_handler():
    uid = online_manager.remove_user_by_sid(request.sid)
    if uid:
        emit("user_offline", {"user_id": uid}, broadcast=True)


