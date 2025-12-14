import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import io from "socket.io-client";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within SocketProvider");
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [socketStatus, setSocketStatus] = useState("disconnected");
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastHeartbeat, setLastHeartbeat] = useState(Date.now());

  // Get current user from token
  const getCurrentUser = () => {
    const token = Cookies.get("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        return decoded.sub || decoded.identity || decoded.uid;
      } catch (error) {
        console.error("Error decoding token:", error);
      }
    }
    return null;
  };

  // Initialize socket connection
  const initializeSocket = useCallback(() => {
    const userId = getCurrentUser();
    if (!userId) {
      console.log("No user ID found, skipping socket initialization");
      return null;
    }

    setCurrentUserId(userId.toString());
    setIsConnecting(true);

    // Create socket connection
    const socketInstance = io("http://localhost:5000", {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
      forceNew: true,
      withCredentials: true,
    });

    // Connection events
    socketInstance.on("connect", () => {
      console.log("✅ Socket connected, SID:", socketInstance.id);
      setSocketStatus("connected");
      setIsConnecting(false);

      // Register user with the server
      socketInstance.emit("register", { user_id: userId.toString() });
    });

    socketInstance.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", reason);
      setSocketStatus("disconnected");
      setIsConnecting(false);

      // Clear online users on disconnect
      setOnlineUsers(new Set());
    });

    socketInstance.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error);
      setSocketStatus("error");
      setIsConnecting(false);
    });

    socketInstance.on("reconnect", (attemptNumber) => {
      console.log(`🔄 Socket reconnected (attempt ${attemptNumber})`);
      setSocketStatus("connected");

      // Re-register user after reconnection
      if (userId) {
        setTimeout(() => {
          socketInstance.emit("register", { user_id: userId.toString() });
        }, 100);
      }
    });

    socketInstance.on("reconnect_attempt", (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}`);
      setSocketStatus("reconnecting");
    });

    socketInstance.on("reconnect_failed", () => {
      console.error("❌ Socket reconnection failed");
      setSocketStatus("failed");
    });

    // Online/offline events
    socketInstance.on("user_online", (data) => {
      const onlineUserId = data.user_id.toString();
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        newSet.add(onlineUserId);
        return newSet;
      });
    });

    socketInstance.on("user_offline", (data) => {
      const offlineUserId = data.user_id.toString();
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(offlineUserId);
        return newSet;
      });
    });

    socketInstance.on("online_users_list", (data) => {
      const onlineList = data.online_users || [];
      setOnlineUsers(new Set(onlineList.map((id) => id.toString())));
    });

    // Token refresh events
    socketInstance.on("token_refreshed", (data) => {
      console.log("🔄 Token refreshed via socket");
      // Store new token if provided
      if (data.access_token) {
        Cookies.set("token", data.access_token, { expires: 1 });
      }
    });

    // Handle server heartbeat/ping
    socketInstance.on("heartbeat", () => {
      setLastHeartbeat(Date.now());
    });

    return socketInstance;
  }, []);

  // Cleanup socket
  const cleanupSocket = useCallback((socketInstance) => {
    if (socketInstance) {
      socketInstance.off("connect");
      socketInstance.off("disconnect");
      socketInstance.off("connect_error");
      socketInstance.off("reconnect");
      socketInstance.off("reconnect_attempt");
      socketInstance.off("reconnect_failed");
      socketInstance.off("user_online");
      socketInstance.off("user_offline");
      socketInstance.off("online_users_list");
      socketInstance.off("token_refreshed");
      socketInstance.off("heartbeat");
      socketInstance.disconnect();
    }
  }, []);

  // Initialize socket when component mounts or user changes
  useEffect(() => {
    const userId = getCurrentUser();
    if (!userId) {
      console.log("No user ID, skipping socket initialization");
      return;
    }

    const socketInstance = initializeSocket();
    setSocket(socketInstance);

    // Manual heartbeat check
    const heartbeatInterval = setInterval(() => {
      const timeSinceHeartbeat = Date.now() - lastHeartbeat;
      if (
        socketInstance &&
        socketInstance.connected &&
        timeSinceHeartbeat > 30000
      ) {
        console.log("⚠️ No heartbeat for 30s, checking connection...");
        socketInstance.emit("ping");
      }
    }, 10000);

    return () => {
      clearInterval(heartbeatInterval);
      cleanupSocket(socketInstance);
    };
  }, [initializeSocket, cleanupSocket, lastHeartbeat]);

  // Check if a user is online
  const isUserOnline = useCallback(
    (userId) => {
      if (!userId) return false;
      return onlineUsers.has(userId.toString());
    },
    [onlineUsers]
  );

  // Get all online users
  const getOnlineUsers = useCallback(() => {
    return Array.from(onlineUsers);
  }, [onlineUsers]);

  // Manually refresh online status
  const refreshOnlineStatus = useCallback(async () => {
    try {
      const response = await fetch("http://localhost:5000/online-users");
      const data = await response.json();
      setOnlineUsers(new Set(data.online_users.map((id) => id.toString())));
    } catch (error) {
      console.error("Failed to refresh online status:", error);
    }
  }, []);

  // Reconnect socket manually
  const reconnect = useCallback(() => {
    if (socket) {
      cleanupSocket(socket);
    }
    const newSocket = initializeSocket();
    setSocket(newSocket);
  }, [socket, initializeSocket, cleanupSocket]);

  // Join a private chat room
  const joinPrivateRoom = useCallback(
    (user1, user2) => {
      if (socket && socket.connected) {
        socket.emit("join_private", {
          user1: user1.toString(),
          user2: user2.toString(),
        });
      }
    },
    [socket]
  );

  // Leave a private chat room
  const leavePrivateRoom = useCallback(
    (user1, user2) => {
      if (socket && socket.connected) {
        socket.emit("leave_private", {
          user1: user1.toString(),
          user2: user2.toString(),
        });
      }
    },
    [socket]
  );

  // Send message
  const sendMessage = useCallback(
    ({ sender_id, receiver_id, content }) => {
      if (socket && socket.connected && content?.trim()) {
        socket.emit("send_message", {
          sender_id: sender_id.toString(),
          receiver_id: receiver_id.toString(),
          content: content.trim(),
        });
        return true;
      }
      return false;
    },
    [socket]
  );

  // Mark messages as seen
  const markAsSeen = useCallback(
    (sender_id, receiver_id) => {
      if (socket && socket.connected) {
        socket.emit("mark_as_seen", {
          sender_id: sender_id.toString(),
          receiver_id: receiver_id.toString(),
        });
      }
    },
    [socket]
  );

  // Typing indicators
  const startTyping = useCallback(
    (sender_id, receiver_id) => {
      if (socket && socket.connected) {
        socket.emit("typing_start", {
          sender_id: sender_id.toString(),
          receiver_id: receiver_id.toString(),
        });
      }
    },
    [socket]
  );

  const stopTyping = useCallback(
    (sender_id, receiver_id) => {
      if (socket && socket.connected) {
        socket.emit("typing_stop", {
          sender_id: sender_id.toString(),
          receiver_id: receiver_id.toString(),
        });
      }
    },
    [socket]
  );

  // Request manual token refresh
  const requestTokenRefresh = useCallback(() => {
    if (socket && socket.connected && currentUserId) {
      socket.emit("request_token_refresh", {
        user_id: currentUserId.toString(),
      });
    }
  }, [socket, currentUserId]);

  const value = {
    socket,
    socketStatus,
    isConnecting,
    isUserOnline,
    getOnlineUsers,
    onlineUsers,
    currentUserId,
    refreshOnlineStatus,
    reconnect,
    joinPrivateRoom,
    leavePrivateRoom,
    sendMessage,
    markAsSeen,
    startTyping,
    stopTyping,
    requestTokenRefresh,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};
