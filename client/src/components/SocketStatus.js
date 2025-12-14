import React from "react";
import { useSocket } from "../contexts/SocketContext";
import { Wifi, WifiOff, RefreshCw, AlertCircle } from "lucide-react";

const SocketStatus = () => {
  const { socketStatus, isConnecting, reconnect, getOnlineUsers } = useSocket();
  const onlineUsers = getOnlineUsers();

  const getStatusConfig = () => {
    switch (socketStatus) {
      case "connected":
        return {
          icon: <Wifi className="w-4 h-4 text-green-500" />,
          text: "Connected",
          color: "text-green-500",
          bg: "bg-green-500/10",
          showReconnect: false,
        };
      case "connecting":
      case "reconnecting":
        return {
          icon: <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />,
          text: isConnecting ? "Connecting..." : "Reconnecting...",
          color: "text-yellow-500",
          bg: "bg-yellow-500/10",
          showReconnect: false,
        };
      case "error":
      case "failed":
        return {
          icon: <AlertCircle className="w-4 h-4 text-red-500" />,
          text: "Connection Failed",
          color: "text-red-500",
          bg: "bg-red-500/10",
          showReconnect: true,
        };
      default:
        return {
          icon: <WifiOff className="w-4 h-4 text-gray-500" />,
          text: "Disconnected",
          color: "text-gray-500",
          bg: "bg-gray-500/10",
          showReconnect: true,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3">
      <div
        className={`px-3 py-2 rounded-lg flex items-center gap-2 ${config.bg} backdrop-blur-sm border border-gray-700`}
      >
        {config.icon}
        <span className={`text-sm font-medium ${config.color}`}>
          {config.text}
        </span>
        {onlineUsers.length > 0 && socketStatus === "connected" && (
          <span className="text-xs text-gray-400 ml-2">
            {onlineUsers.length} online
          </span>
        )}
      </div>

      {config.showReconnect && (
        <button
          onClick={reconnect}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Reconnect
        </button>
      )}
    </div>
  );
};

export default SocketStatus;
