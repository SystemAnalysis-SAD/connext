import { useEffect, useState, useRef, useCallback } from "react";
import { FiUser, FiCheck, FiCheckCircle } from "react-icons/fi";
import io from "socket.io-client";
import api from "../api/api";
import { format } from "date-fns";
import Cookies from "js-cookie";

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
  const socketRef = useRef(null);

  const getAuthToken = () => {
    return Cookies.get("token");
  };

  // Fetch users and latest messages
  // Update the fetchUsersAndMessages function to be simpler
  const fetchUsersAndMessages = useCallback(async () => {
    if (!currentUserId) return;

    try {
      // Fetch users
      const usersRes = await api.get(`/users`);
      const userList = usersRes.data || [];
      setUsers(userList);

      // Fetch latest messages
      const token = getAuthToken();
      if (token) {
        try {
          const messagesRes = await axios.get(
            "http://localhost:5000/latest-messages",
            {
              withCredentials: true,
            }
          );

          const latestMessagesObj = {};
          const unreadCountsObj = {};

          (messagesRes.data || []).forEach((item) => {
            if (item.other_user_id) {
              const otherUserId = item.other_user_id;
              latestMessagesObj[otherUserId] = {
                content: item.content,
                date_sent: item.date_sent,
                sender_id: item.sender_id,
                is_seen: item.is_seen,
                message_id: item.message_id,
              };

              // Count unread messages
              if (
                parseInt(item.sender_id) !== parseInt(currentUserId) &&
                !item.is_seen
              ) {
                unreadCountsObj[otherUserId] =
                  (unreadCountsObj[otherUserId] || 0) + 1;
              }
            }
          });

          setLatestMessages(latestMessagesObj);
          setUnreadCounts(unreadCountsObj);
        } catch (err) {
          console.error("Failed to fetch latest messages:", err);
        }
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  }, [currentUserId]);

  // Update the Socket.IO useEffect - remove fetchUsersAndMessages from dependencies
  useEffect(() => {
    if (!currentUserId) return;

    const initializeSocket = () => {
      socketRef.current = io("http://localhost:5000", {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socketRef.current.on("connect", () => {
        console.log("✅ Socket connected, registering user:", currentUserId);
        socketRef.current.emit("register", { user_id: currentUserId });
      });

      // Handle new messages - IMPROVED VERSION
      socketRef.current.on("new_message", (data) => {
        console.log("📨 New message received:", data);
        const senderId = data.sender_id.toString();
        const receiverId = data.receiver_id.toString();
        const isCurrentUser = currentUserId.toString() === senderId;

        // Determine the other user ID
        const otherUserId = isCurrentUser ? receiverId : senderId;

        // Always update the latest message
        setLatestMessages((prev) => ({
          ...prev,
          [otherUserId]: {
            content: data.content,
            date_sent: data.date_sent,
            sender_id: senderId,
            is_seen: data.is_seen,
            message_id: data.message_id,
            timestamp: data.timestamp,
          },
        }));

        // If message is from someone else and not seen, increment unread count
        if (!isCurrentUser && !data.is_seen) {
          setUnreadCounts((prev) => ({
            ...prev,
            [otherUserId]: (prev[otherUserId] || 0) + 1,
          }));
        }

        // Also fetch fresh data to ensure consistency
        fetchUsersAndMessages();
      });

      // Handle user list updates
      socketRef.current.on("user_list_update", (data) => {
        console.log("🔄 User list update received");
        // Refresh the user list and messages
        fetchUsersAndMessages();
      });

      // Handle when messages are marked as seen
      socketRef.current.on("messages_seen", (data) => {
        console.log("👁️ Messages seen:", data);
        const senderId = data.sender_id.toString();
        const receiverId = data.receiver_id.toString();

        if (receiverId === currentUserId.toString()) {
          // Someone saw our messages (we're the sender)
          setLatestMessages((prev) => {
            const updated = { ...prev };
            if (updated[senderId]) {
              updated[senderId] = {
                ...updated[senderId],
                is_seen: true,
              };
            }
            return updated;
          });
        }
      });

      // Handle message seen updates
      socketRef.current.on("message_seen_update", (data) => {
        console.log("📝 Message seen update:", data);
        const userId = data.sender_id.toString();

        setLatestMessages((prev) => {
          const updated = { ...prev };
          if (updated[userId]) {
            updated[userId] = {
              ...updated[userId],
              is_seen: true,
            };
          }
          return updated;
        });
      });

      // Online/offline status
      socketRef.current.on("user_online", (data) => {
        const userId = data.user_id.toString();
        setOnlineUsers((prev) => new Set([...prev, userId]));

        // Update user's online status in users array
        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user.uid.toString() === userId ? { ...user, is_online: true } : user
          )
        );
      });

      socketRef.current.on("user_offline", (data) => {
        const userId = data.user_id.toString();
        setOnlineUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });

        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user.uid.toString() === userId
              ? { ...user, is_online: false }
              : user
          )
        );
      });
    };

    initializeSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [currentUserId]); // Remove fetchUsersAndMessages from dependencies

  // Add a separate useEffect to fetch initial data
  useEffect(() => {
    if (currentUserId) {
      fetchUsersAndMessages();
    }
  }, [currentUserId, fetchUsersAndMessages]);

  // Update the handleSelectUser function
  const handleSelectUser = async (user) => {
    console.log("👤 Selecting user:", user.uid);
    onSelectUser(user);
    setActiveTab("chat");

    // Join the private room
    if (socketRef.current && socketRef.current.connected) {
      const roomData = {
        user1: currentUserId,
        user2: user.uid,
      };

      socketRef.current.emit("join_private", roomData);

      // Mark messages as seen
      socketRef.current.emit("mark_as_seen", {
        sender_id: user.uid,
        receiver_id: currentUserId,
      });
    }

    // Reset unread count for this user
    setUnreadCounts((prev) => {
      const newCounts = { ...prev };
      delete newCounts[user.uid];
      return newCounts;
    });
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    try {
      let date;
      if (typeof timestamp === "string") {
        // Handle time string like "02:30 PM"
        if (timestamp.includes(":")) {
          const now = new Date();
          const [time, period] = timestamp.split(" ");
          const [hours, minutes] = time.split(":");
          date = new Date();
          date.setHours(
            period === "PM" ? parseInt(hours) + 12 : parseInt(hours),
            parseInt(minutes),
            0
          );
        } else {
          date = new Date(timestamp);
        }
      } else {
        date = new Date(timestamp);
      }

      if (isNaN(date.getTime())) return "";

      const now = new Date();
      const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

      if (diffInDays === 0) {
        return format(date, "h:mm a");
      } else if (diffInDays < 7) {
        return format(date, "EEE");
      } else {
        return format(date, "MMM d");
      }
    } catch (e) {
      console.error("Error formatting time:", e, timestamp);
      return "";
    }
  };

  // Also fetch when component mounts
  useEffect(() => {
    fetchUsersAndMessages();

    // Set up interval to refresh online status
    const intervalId = setInterval(() => {
      api
        .get("/online-users")
        .then((res) => {
          const onlineUserIds = new Set(res.data.online_users || []);
          setOnlineUsers(onlineUserIds);
        })
        .catch((err) => console.error("Failed to refresh online status:", err));
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(intervalId);
  }, [fetchUsersAndMessages]);

  const filteredUsers = users.filter(
    (user) =>
      user.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(search.toLowerCase()) ||
      user.username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-screen w-full flex flex-col bg-gray-900 text-white">
      <div className="p-4 border-b border-gray-800 bg-gray-900">
        <div className="flex items-center justify-between mb-2">
          <div className="relative flex-1 mr-2">
            <input
              type="text"
              placeholder="Search user..."
              className="w-full bg-gray-800 text-white rounded-full px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <FiUser className="absolute left-3 top-3 text-gray-500" size={16} />
          </div>
        </div>
      </div>

      <div className="overflow-auto flex-1">
        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <FiUser className="mx-auto mb-3" size={32} />
            <p>No users found</p>
          </div>
        ) : (
          filteredUsers.map((user) => {
            const latestMessage = latestMessages[user.uid];
            const unreadCount = unreadCounts[user.uid] || 0;
            const isSelected = selectedUserId === user.uid;
            const isOnline = onlineUsers.has(user.uid.toString());

            return (
              <div
                key={user.uid}
                className={`p-4 hover:bg-gray-800 border-b border-gray-800 cursor-pointer transition-colors duration-200 ${
                  isSelected ? "bg-gray-800" : "bg-gray-900"
                } ${unreadCount > 0 ? "border-l-4 border-l-blue-500" : ""}`}
                onClick={() => handleSelectUser(user)}
              >
                <div className="flex items-center gap-3">
                  <div className="relative  border-2 rounded-full border-b-[var(--primary)] border-[var(--secondary)]">
                    <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                      <span className="font-semibold  text-lg">
                        {user.first_name?.charAt(0)}
                      </span>
                    </div>

                    <div
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-900 ${
                        isOnline ? "bg-green-500" : "bg-gray-500"
                      }`}
                    />

                    {unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">
                          {user.first_name} {user.last_name}
                        </h3>
                        {isOnline && (
                          <span className="text-xs text-green-500 font-medium bg-green-500/10 px-2 py-0.5 rounded-full">
                            Online
                          </span>
                        )}
                      </div>
                      {latestMessage?.date_sent && (
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {formatTime(latestMessage.date_sent)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 min-w-0">
                        {latestMessage ? (
                          <>
                            {parseInt(latestMessage.sender_id) ===
                              parseInt(currentUserId) && (
                              <div className="flex-shrink-0">
                                {latestMessage.is_seen ? (
                                  <FiCheckCircle
                                    className="text-blue-500"
                                    size={12}
                                  />
                                ) : (
                                  <FiCheck
                                    className="text-gray-500"
                                    size={12}
                                  />
                                )}
                              </div>
                            )}
                            <p className="text-sm text-gray-400 truncate">
                              {parseInt(latestMessage.sender_id) ===
                              parseInt(currentUserId)
                                ? `You: ${latestMessage.content}`
                                : latestMessage.content}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-gray-400 truncate italic">
                            @{user.username}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
