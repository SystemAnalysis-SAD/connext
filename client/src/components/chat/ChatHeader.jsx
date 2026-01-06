import React from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { MoreVertical } from "lucide-react";

export default function ChatHeader({
  receiver,
  setActiveTab,
  isTyping,
  getStatusText,
}) {
  return (
    <div className="fixed z-10 w-full top-0 backdrop-blur-lg  border-b border-white/10 saturate-150">
      <div className="flex items-center justify-between px-4 py-4 md:pr-100">
        {/* Left: Back button (mobile only) */}
        <div className="flex items-center justify-between md:justify-start">
          <div className="md:hidden">
            <button
              onClick={() => setActiveTab("users")}
              className="pt-1 hover:bg-gray-800 rounded-full transition-colors mr-1"
            >
              <FiChevronLeft className="text-3xl font-extralight text-gray-300" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-semibold">
                {receiver?.first_name?.charAt(0)?.toUpperCase()}
              </div>
            </div>
            <div className="text-center md:text-left">
              <div className="flex items-center">
                <h2 className="font-bold text-sm text-white">
                  {receiver?.first_name}&nbsp;{receiver.last_name}
                </h2>
                <FiChevronRight className="translate-y-[1px] ml-2 text-sm text-white/30 " />
              </div>
              <div className="flex t gap-1">
                <p className="text-xs text-gray-400">@{receiver.username}</p>
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
