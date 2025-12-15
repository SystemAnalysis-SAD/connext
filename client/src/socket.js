// socket.js
import { io } from "socket.io-client";
import { API_URL } from "./config/config";

// SINGLE socket instance
export const socket = io(API_URL, {
  autoConnect: false, // manual connect
  transports: ["websocket"], // IMPORTANT for Render/Vercel
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  timeout: 20000,
});

/**
 * CONNECT SOCKET WITH JWT
 */
export const connectSocket = (accessToken) => {
  if (!accessToken) {
    console.warn("⚠️ No token provided for socket connection");
    return;
  }

  // Attach JWT BEFORE connecting
  socket.auth = { token: accessToken };

  if (!socket.connected) {
    socket.connect();
  }
};

/**
 * DISCONNECT SOCKET
 */
export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

/* ===========================
   SOCKET EVENTS
=========================== */

socket.on("connect", () => {
  console.log("✅ Socket connected:", socket.id);

  // Register AFTER successful connection
  socket.emit("register");
});

socket.on("disconnect", (reason) => {
  console.log("❌ Socket disconnected:", reason);
});

socket.on("connect_error", (err) => {
  console.error("❌ Socket connection error:", err.message);
});

socket.on("reconnect_attempt", (attempt) => {
  console.log(`🔄 Reconnect attempt #${attempt}`);
});

socket.on("reconnect", () => {
  console.log("✅ Socket reconnected");
});
