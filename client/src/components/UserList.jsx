import { useEffect, useState, useCallback, useRef } from "react";
import { FiSearch } from "react-icons/fi";
import { socket } from "../socket";
import api from "../api/api";
import { format } from "date-fns";
import { API_URL } from "../config/config";
import UserListVertical from "../components/userList_vertical";

export default function UserList({
  onSelectUser,
  currentUserId,
  setActiveTab,
  selectedUserId,
}) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [latestMessages, setLatestMessages] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const [typingUserId, setTypingUserId] = useState(null);

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);

  const typingTimeoutRef = useRef();

  /* ==================
     TYPING INDICATOR
     ================== */
  useEffect(() => {
    const handleTypingStart = (data) => {
      setTypingUserId(String(data.sender_id));

      clearTimeout(typingTimeoutRef.current);
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
     FETCH USERS + MESSAGES
     ========================= */
  const fetchUsersAndMessages = useCallback(async () => {
    if (!currentUserId) return;

    try {
      setLoadingUsers(true);
      setLoadingMessages(true);

      const usersRes = await api.get(`/users/${currentUserId}`);
      setUsers(usersRes.data || []);
      setLoadingUsers(false);

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
      setLoadingMessages(false);
    } catch (err) {
      console.error("❌ Failed to fetch users/messages:", err);
      setLoadingUsers(false);
      setLoadingMessages(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;

    const handleUserListUpdate = (data) => {
      if (data.type !== "new_message") return;

      const msg = data.message;
      const otherUserId =
        String(msg.sender_id) === String(currentUserId)
          ? String(msg.receiver_id)
          : String(msg.sender_id);

      setLatestMessages((prev) => ({
        ...prev,
        [otherUserId]: msg,
      }));

      if (String(msg.sender_id) !== String(currentUserId) && !msg.is_seen) {
        setUnreadCounts((prev) => ({
          ...prev,
          [otherUserId]: (prev[otherUserId] || 0) + 1,
        }));
      }
    };

    socket.on("user_list_update", handleUserListUpdate);

    return () => {
      socket.off("user_list_update", handleUserListUpdate);
    };
  }, [currentUserId]);

  /* =========================
     SOCKET EVENTS
     ========================= */
  useEffect(() => {
    if (!currentUserId) return;

    socket.emit("register");

    socket.on("new_message", (data) => {
      const senderId = String(data.sender_id);
      const receiverId = String(data.receiver_id);
      const otherUserId =
        senderId === String(currentUserId) ? receiverId : senderId;

      setLatestMessages((prev) => ({
        ...prev,
        [otherUserId]: data,
      }));

      if (senderId !== String(currentUserId) && !data.is_seen) {
        setUnreadCounts((prev) => ({
          ...prev,
          [otherUserId]: (prev[otherUserId] || 0) + 1,
        }));
      }
    });

    socket.on("messages_seen", (data) => {
      setLatestMessages((prev) => ({
        ...prev,
        [data.sender_id]: { ...prev[data.sender_id], is_seen: true },
      }));
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

    return () => socket.removeAllListeners();
  }, [currentUserId]);

  useEffect(() => {
    fetchUsersAndMessages();
  }, [fetchUsersAndMessages]);

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

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const aMsg = latestMessages[a.uid]?.date_sent;
    const bMsg = latestMessages[b.uid]?.date_sent;

    // If both have no messages, keep order
    if (!aMsg && !bMsg) return 0;

    // Users with messages come first
    if (!aMsg) return 1;
    if (!bMsg) return -1;

    // Newest message on top
    return new Date(bMsg) - new Date(aMsg);
  });

  /* =========================
     SKELETON COMPONENT
     ========================= */
  const MessageSkeleton = () => (
    <div className="mb-2 p-2 rounded-xl animate-pulse bg-white/5">
      <div className="flex gap-3">
        <div className="w-12 h-12 rounded-full bg-white/10" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-32 bg-white/10 rounded" />
          <div className="h-3 w-48 bg-white/10 rounded" />
        </div>
      </div>
    </div>
  );

  /* =========================
     RENDER
     ========================= */
  return (
    <div className="h-screen pb-15  w-full flex flex-col bg-[var(--black)] text-white">
      {/* Search */}
      <div className="px-3 py-4">
        <div className="relative">
          <FiSearch className="absolute left-3 top-2.5 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search user..."
            className="w-full text-sm bg-black/20 shadow-[inset_0_4px_6px_rgba(0,0,0,0.5)] rounded-full px-10 py-2 outline-none"
          />
        </div>
      </div>

      {/* Vertical Users */}
      <UserListVertical onSelectUser={handleSelectUser} />
      <h1 className="text-sm font-semibold mb-3 ml-3.5">Messages</h1>

      {/* Messages */}
      <div className="flex-1 scrollbar-none overflow-y-auto px-2 md:px-2 pb-20 ">
        {loadingMessages
          ? Array.from({ length: 6 }).map((_, i) => <MessageSkeleton key={i} />)
          : sortedUsers.map((user) => {
              const msg = latestMessages[user.uid];
              const unread = unreadCounts[user.uid] || 0;
              const online = onlineUsers.has(String(user.uid));

              return (
                <div
                  key={user.uid}
                  onClick={() => handleSelectUser(user)}
                  className={` mb-2 min-w-60 p-2 border border-white/3 cursor-pointer rounded-xl bg-gradient-to-l from-black/10 to-[var(--black)]  shadow-xl transform transition-all duration-300 hover:scale-102 hover:shadow-3xl active:scale-95 active:shadow-inner focus:scale-95 focus:shadow-inner ${
                    selectedUserId === user.uid ? "bg-gray-800" : ""
                  } `}
                >
                  <div className="flex gap-3">
                    <div className="relative">
                      <img
                        src={user.profile_picture_url}
                        alt="profile"
                        className="w-12 h-12 rounded-full"
                      />
                      <span
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ${
                          online ? "bg-green-500" : "bg-gray-500"
                        }`}
                      />
                      {unread > 0 && (
                        <span className="absolute -top-1 -right-1 bg-blue-500 text-xs w-5 h-5 rounded-full flex items-center justify-center">
                          {unread > 9 ? "9+" : unread}
                        </span>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex justify-between">
                        <h3>
                          {user.first_name} {user.last_name}
                        </h3>
                        {msg?.date_sent && (
                          <span className="text-[11px] text-gray-400 font-bold">
                            {format(new Date(msg.date_sent), "hh:mm a")}
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-400 truncate w-40">
                        {typingUserId === String(user.uid)
                          ? "is typing..."
                          : msg
                          ? msg.sender_id === currentUserId
                            ? `You: ${msg.content}`
                            : msg.content
                          : ""}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
}
