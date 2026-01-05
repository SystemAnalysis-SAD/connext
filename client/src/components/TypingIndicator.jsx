import React from "react";

export default function TypingIndicator({ receiver }) {
  return (
    <div className="flex justify-start pl-2 bottom-20 sticky z-10 ">
      <div className=" pr-2 bottom-20   sticky mt-auto">
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-semibold">
          {receiver.first_name.charAt(0).toUpperCase()}
        </div>
      </div>
      <div className="max-w-[70%]">
        <div className="bg-gray-600 rounded-3xl rounded-bl-sm px-4 py-3">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            <div
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: "0.1s" }}
            ></div>
            <div
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: "0.2s" }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
