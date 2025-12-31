import React from "react";
import { FiChevronLeft } from "react-icons/fi";
import { MoreVertical } from "lucide-react";

export default function ChatHeader({
  receiver,
  setActiveTab,
  isTyping,
  getStatusText,
}) {
  return (
    <div className="fixed z-10 w-full top-0 backdrop-blur-lg bg-black/30 border-b border-gray-800">
      <div className="flex items-center justify-between px-4 py-4 md:pr-100">
        {/* Left: Back button (mobile only) */}
        <div className="flex items-center justify-between md:justify-start">
          <div className="md:hidden">
            <button
              onClick={() => setActiveTab("users")}
              className="pt-1 hover:bg-gray-800 rounded-full transition-colors mr-2"
            >
              <FiChevronLeft className="text-xl text-gray-300" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-semibold">
                {receiver?.first_name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[var(--black)]"></div>
            </div>
            <div className="text-center md:text-left">
              <h2 className="font-bold text-white">
                {receiver?.first_name}&nbsp;{receiver.last_name}
              </h2>
              <div className="flex items-center justify-center md:justify-start gap-1">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isTyping ? "bg-yellow-500 animate-pulse" : "bg-green-500"
                  }`}
                ></div>
                <p className="text-xs text-gray-400">{getStatusText()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Menu button */}
        <div className="flex items-center">
          <button className="p-2 hover:bg-gray-800 rounded-full transition-colors">
            <MoreVertical className="w-5 h-5 text-gray-300" />
          </button>
        </div>
      </div>
    </div>
  );
}
