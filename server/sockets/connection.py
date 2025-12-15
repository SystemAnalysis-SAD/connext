from flask import request
from flask_socketio import disconnect, emit
from flask_jwt_extended import decode_token, create_access_token
from extensions import socketio
from services.online_users import online_manager
from datetime import datetime, timedelta
from Models.get_db_connection import get_db_connection
import threading
import time

# =========================
# SOCKET CONNECT
# =========================
@socketio.on("connect")
def handle_connect(auth):
    try:
        token = auth.get("token") if auth else None
        if not token:
            raise Exception("Missing token")

        decoded = decode_token(token)
        user_id = str(decoded["sub"])

        # Store user_id in this request
        request.environ["user_id"] = user_id

        # Register the user immediately
        existing_sid = online_manager.get_user_sid(user_id)
        if existing_sid and existing_sid != request.sid:
            online_manager.remove_user(user_id)
            stop_refresh_timer(user_id)

        online_manager.add_user(user_id, request.sid)
        schedule_token_refresh(user_id, request.sid)

        emit(
            "user_online",
            {"user_id": user_id, "timestamp": datetime.utcnow().isoformat()},
            broadcast=True,
            include_self=False,
        )

        emit(
            "online_users_list",
            {"online_users": online_manager.get_all_users()},
            room=request.sid,
        )

        print(f"✅ SOCKET CONNECTED & USER REGISTERED | user={user_id} | sid={request.sid}")

    except Exception as e:
        print(f"❌ SOCKET AUTH FAILED: {e}")
        disconnect()

@socketio.on("disconnect")
def handle_disconnect():
    uid = online_manager.remove_user_by_sid(request.sid)
    if uid:
        stop_refresh_timer(uid)
        emit("user_offline", {"user_id": uid}, broadcast=True)
        print(f"🔴 USER DISCONNECTED | user={uid}")

# =========================
# REGISTER USER (AFTER CONNECT)
# =========================
""" @socketio.on("register")
def handle_register(data=None):
    try:
        user_id = request.environ.get("user_id")
        if not user_id:
            raise Exception("Unauthenticated socket")

        existing_sid = online_manager.get_user_sid(user_id)
        if existing_sid and existing_sid != request.sid:
            online_manager.remove_user(user_id)
            stop_refresh_timer(user_id)

        online_manager.add_user(user_id, request.sid)
        schedule_token_refresh(user_id, request.sid)

        emit(
            "user_online",
            {"user_id": user_id, "timestamp": datetime.utcnow().isoformat()},
            broadcast=True,
            include_self=False,
        )

        emit(
            "online_users_list",
            {"online_users": online_manager.get_all_users()},
            room=request.sid,
        )

        print(f"✅ USER REGISTERED | user={user_id}")

    except Exception as e:
        print(f"❌ REGISTER ERROR: {e}")
        disconnect() """


# =========================
# DISCONNECT
# =========================



# =========================
# TOKEN REFRESH SYSTEM
# =========================
def refresh_worker(user_id, sid, stop_event):
    print(f"🔄 TOKEN REFRESH STARTED | user={user_id}")

    while not stop_event.is_set():
        time.sleep(900)

        if stop_event.is_set():
            break

        if online_manager.get_user_sid(user_id) != sid:
            break

        try:
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute(
                "SELECT uid, username FROM user_table WHERE uid = %s",
                (int(user_id),),
            )
            user = cur.fetchone()
            cur.close()
            conn.close()

            if not user:
                break

            new_token = create_access_token(
                identity=str(user["uid"]),
                additional_claims={
                    "uid": user["uid"],
                    "username": user["username"],
                },
                expires_delta=timedelta(minutes=30),
            )

            socketio.emit(
                "token_refreshed",
                {
                    "access_token": new_token,
                    "user_id": user["uid"],
                    "timestamp": datetime.utcnow().isoformat(),
                },
                room=sid,
            )

            print(f"✅ TOKEN REFRESHED | user={user_id}")

        except Exception as e:
            print(f"❌ REFRESH ERROR | user={user_id}: {e}")
            time.sleep(5)

    print(f"🛑 REFRESH STOPPED | user={user_id}")


def schedule_token_refresh(user_id, sid):
    stop_refresh_timer(user_id)

    stop_event = threading.Event()
    thread = threading.Thread(
        target=refresh_worker,
        args=(user_id, sid, stop_event),
        daemon=True,
    )
    thread.start()

    online_manager.refresh_timers[user_id] = {
        "thread": thread,
        "stop_event": stop_event,
        "sid": sid,
    }


def stop_refresh_timer(user_id):
    info = online_manager.refresh_timers.pop(user_id, None)
    if info:
        info["stop_event"].set()
