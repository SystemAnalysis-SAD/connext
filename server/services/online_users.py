import threading
from datetime import datetime

class OnlineUsersManager:
    def __init__(self):
        self.online_users = {}
        self.refresh_timers = {}
        self.lock = threading.Lock()

    def add_user(self, user_id, sid):
        with self.lock:
            self.online_users[user_id] = {
                "sid": sid,
                "last_seen": datetime.utcnow().isoformat()
            }

    def remove_user(self, user_id):
        with self.lock:
            self.online_users.pop(user_id, None)

    def remove_user_by_sid(self, sid):
        with self.lock:
            for uid, data in list(self.online_users.items()):
                if data["sid"] == sid:
                    del self.online_users[uid]
                    return uid
        return None

    def get_user_sid(self, user_id):
        return self.online_users.get(user_id, {}).get("sid")

    def is_online(self, user_id):
        return user_id in self.online_users

    def get_all_users(self):
        return list(self.online_users.keys())
    

online_manager = OnlineUsersManager()
