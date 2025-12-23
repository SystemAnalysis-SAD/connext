import { useEffect, useState, useCallback, useRef } from "react";
import { FiUser, FiCheck, FiCheckCircle } from "react-icons/fi";
import { CheckCheck, Check } from "lucide-react";
import { socket } from "../socket";
import api from "../api/api";
import { format } from "date-fns";
import { API_URL } from "../config/config";

export default function UserList({
  onSelectUser,
  currentUserId,
  setActiveTab,
  selectedUserId,
  receiver_id,
}) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [latestMessages, setLatestMessages] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const [typingUserId, setTypingUserId] = useState(null);

  const typingTimeoutRef = useRef();

  /* ==================
     TYPING INDICATOR
     ==================*/
  useEffect(() => {
    const handleTypingStart = (data) => {
      setTypingUserId(String(data.sender_id));

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        setTypingUserId(null);
      }, 1200);
    };

    const handleTypingStop = (data) => {
      if (String(data.sender_id) === typingUserId) {
        setTypingUserId(null);
      }
    };

    socket.on("typing_start", handleTypingStart);
    socket.on("typing_stop", handleTypingStop);

    return () => {
      socket.off("typing_start", handleTypingStart);
      socket.off("typing_stop", handleTypingStop);
      clearTimeout(typingTimeoutRef.current);
    };
  }, [typingUserId]);

  /* =========================
     FETCH USERS + LATEST MSGS
     ========================= */
  const fetchUsersAndMessages = useCallback(async () => {
    if (!currentUserId) return;

    try {
      const usersRes = await api.get(`/users/${currentUserId}`);
      setUsers(usersRes.data || []);

      const messagesRes = await api.get(`${API_URL}/latest-messages`, {
        withCredentials: true,
      });

      const latest = {};
      const unread = {};

      (messagesRes.data || []).forEach((m) => {
        const otherId = m.other_user_id;
        if (!otherId) return;

        latest[otherId] = {
          content: m.content,
          date_sent: m.date_sent,
          sender_id: m.sender_id,
          is_seen: m.is_seen,
          message_id: m.message_id,
        };

        if (String(m.sender_id) !== String(currentUserId) && !m.is_seen) {
          unread[otherId] = (unread[otherId] || 0) + 1;
        }
      });

      setLatestMessages(latest);
      setUnreadCounts(unread);
    } catch (err) {
      console.error("❌ Failed to fetch users/messages:", err);
    }
  }, [currentUserId]);

  /* =========================
     SOCKET EVENTS (ONCE)
     ========================= */
  useEffect(() => {
    if (!currentUserId) return;

    const onConnect = () => {
      socket.emit("register");
    };

    socket.on("connect", onConnect);

    socket.on("new_message", (data) => {
      const senderId = String(data.sender_id);
      const receiverId = String(data.receiver_id);
      const otherUserId =
        senderId === String(currentUserId) ? receiverId : senderId;

      setLatestMessages((prev) => ({
        ...prev,
        [otherUserId]: {
          content: data.content,
          date_sent: data.date_sent,
          sender_id: data.sender_id,
          is_seen: data.is_seen,
          message_id: data.message_id,
        },
      }));

      if (senderId !== String(currentUserId) && !data.is_seen) {
        setUnreadCounts((prev) => ({
          ...prev,
          [otherUserId]: (prev[otherUserId] || 0) + 1,
        }));
      }
    });

    socket.on("messages_seen", (data) => {
      const senderId = String(data.sender_id);
      setLatestMessages((prev) => {
        if (!prev[senderId]) return prev;
        return {
          ...prev,
          [senderId]: { ...prev[senderId], is_seen: true },
        };
      });
    });

    socket.on("user_online", ({ user_id }) => {
      setOnlineUsers((prev) => new Set([...prev, String(user_id)]));
    });

    socket.on("user_offline", ({ user_id }) => {
      setOnlineUsers((prev) => {
        const s = new Set(prev);
        s.delete(String(user_id));
        return s;
      });
    });

    return () => {
      socket.off("connect", onConnect);
      socket.off("new_message");
      socket.off("messages_seen");
      socket.off("user_online");
      socket.off("user_offline");
    };
  }, [currentUserId]);

  /* =========================
     INITIAL LOAD
     ========================= */
  useEffect(() => {
    fetchUsersAndMessages();
  }, [fetchUsersAndMessages]);

  /* =========================
     SELECT USER
     ========================= */
  const handleSelectUser = (user) => {
    onSelectUser(user);
    setActiveTab("chat");

    socket.emit("join_private", {
      user1: currentUserId,
      user2: user.uid,
    });

    setUnreadCounts((prev) => {
      const copy = { ...prev };
      delete copy[user.uid];
      return copy;
    });
  };

  const filteredUsers = users.filter(
    (u) =>
      u.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.last_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.username?.toLowerCase().includes(search.toLowerCase())
  );

  /* =========================
     RENDER
     ========================= */
  return (
    <div className="h-screen w-full flex flex-col bg-[var(--black)] text-white">
      <div className="p-4 border-b border-gray-800">
        <div className="relative">
          <FiUser className="absolute left-3 top-3 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search user..."
            className="w-full bg-black/50 rounded-full px-10 py-2"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {filteredUsers.map((user) => {
          const msg = latestMessages[user.uid];
          const unread = unreadCounts[user.uid] || 0;
          const online = onlineUsers.has(String(user.uid));

          return (
            <div
              key={user.uid}
              onClick={() => handleSelectUser(user)}
              className={`mb-2 mx-4 p-2 border-2 border-black/20 shadow-md bg-black/50 cursor-pointer rounded-xl ${
                selectedUserId === user.uid ? "bg-gray-800" : ""
              }`}
            >
              <div className="flex gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-[var(--primary)] flex items-center justify-center">
                    {user.first_name?.[0]}
                  </div>
                  <span
                    className={`absolute border-1 border-[var(--black)] bottom-0 right-0 w-3 h-3 rounded-full ${
                      online ? "bg-green-500" : "bg-gray-500"
                    }`}
                  />
                  {unread > 0 && (
                    <span className="absolute -top-1 -right-1 bg-blue-500 text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex justify-between">
                    <h3
                      className={`${
                        !msg?.is_seen ? "font-medium" : "font-normal"
                      }`}
                    >
                      {user.first_name} {user.last_name}
                    </h3>
                    {msg?.date_sent && (
                      <span className="text-xs text-gray-400">
                        {msg?.date_sent &&
                          format(new Date(msg?.date_sent), "hh:mm a")}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-sm text-gray-400">
                    <span
                      className={`truncate max-w-30 md:max-w-40 ${
                        !msg?.is_seen && msg?.sender_id !== currentUserId
                          ? "font-medium text-white"
                          : "font-normal"
                      }`}
                    >
                      {typingUserId === String(user.uid)
                        ? "is typing..."
                        : msg
                        ? msg?.sender_id === currentUserId
                          ? `You: ${msg?.content}`
                          : msg?.content
                        : ""}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
