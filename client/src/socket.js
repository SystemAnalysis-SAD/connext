// socket.js - Your socket initialization file
import { io } from "socket.io-client";

// Create a SINGLE socket instance
export const socket = io("https://connext-aj4o.onrender.com", {
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  autoConnect: false, // We'll connect manually
});

socket.on("connect", () => {
  console.log("✅ Socket.IO connected:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log("❌ Socket.IO disconnected:", reason);
  if (reason === "io server disconnect") {
    // The server has forcibly disconnected the socket
    socket.connect(); // Try to reconnect
  }
});

socket.on("connect_error", (error) => {
  console.error("❌ Socket.IO connection error:", error.message);
});

socket.on("reconnect_attempt", (attempt) => {
  console.log(`🔄 Socket.IO reconnect attempt: ${attempt}`);
});

socket.on("reconnect", (attempt) => {
  console.log(`✅ Socket.IO reconnected after ${attempt} attempts`);
});
