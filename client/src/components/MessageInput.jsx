import React from "react";
import { ArrowUpRight, Send, Smile, Edit2, X } from "lucide-react";
import EmojiPicker from "emoji-picker-react";

export default function MessageInput({
  editingMessage,
  cancelEdit,
  showEmojiPicker,
  setShowEmojiPicker,
  emojiSheetOffset,
  handleTouchStartEmojiSheet,
  handleTouchMoveEmojiSheet,
  handleTouchEndEmojiSheet,
  textareaRef,
  text,
  handleTextChange,
  handleKeyPress,
  sendMessage,
}) {
  return (
    <div className="sticky bottom-0  bg-[var(--black)] p-4">
      <div className="w-full mx-auto ">
        {editingMessage && (
          <div className="mb-2 text-sm text-yellow-400 flex items-center gap-2">
            <Edit2 className="w-4 h-4" />
            <span>Editing message • </span>
            <button
              onClick={cancelEdit}
              className="text-yellow-300 hover:text-yellow-200 underline"
            >
              Cancel
            </button>
          </div>
        )}
        <div className="flex items-end gap-2 z-50 ">
          {showEmojiPicker && (
            <div
              className={`fixed w-full md:w-fit z-50 items-center rounded-t-2xl shadow-xl  ${
                window.innerWidth < 768
                  ? "inset-x-0 -bottom-0  flex-col transition-transform duration-300 h-fit block md:hidden"
                  : "bottom-20 right-0 md:right-20 w-80 h-96 hidden md:block"
              }`}
              style={
                window.innerWidth < 768
                  ? {
                      transform: `translateY(${emojiSheetOffset}px)`,
                      touchAction: "none",
                    }
                  : {}
              }
              onTouchStart={
                window.innerWidth < 768 ? handleTouchStartEmojiSheet : undefined
              }
              onTouchMove={
                window.innerWidth < 768 ? handleTouchMoveEmojiSheet : undefined
              }
              onTouchEnd={
                window.innerWidth < 768 ? handleTouchEndEmojiSheet : undefined
              }
            >
              {window.innerWidth < 768 && (
                <div className=" flex items-center justify-center">
                  <span className="w-15 h-1.5 bg-gray-600 rounded-full mt-2 mb-2  "></span>
                </div>
              )}
              <EmojiPicker
                className="fixed z-100 w-full md:hidden block  md:w-80"
                onEmojiClick={(emojiData) => {
                  textareaRef.current.value += emojiData.emoji;
                  textareaRef.current.focus();
                }}
                theme="dark"
                height={window.innerWidth < 768 ? 400 : 400}
                width="full"
              />

              <button className="absolute top-2 right-4 p-2 rounded-full hover:bg-gray-800">
                <X className="w-5 h-5 text-gray-300" />
              </button>
            </div>
          )}

          <div className="flex relative min-w-0 w-full">
            <textarea
              ref={textareaRef}
              className="w-full shadow-[inset_0_4px_6px_rgba(0,0,0,0.2)] overflow-hidden border border-white/3 bg-black/10 rounded-full px-4 py-3 pr-12 focus:outline-none focus:ring-1 focus:ring-blue-800/80 focus:border-transparent resize-none text-white placeholder-gray-500"
              value={text}
              onChange={handleTextChange}
              onKeyPress={handleKeyPress}
              placeholder={editingMessage ? "Edit your message..." : "Aa"}
              rows="1"
              style={{
                minHeight: "44px",
                maxHeight: "120px",
                lineHeight: "1.5",
              }}
            />
            <div className="hidden md:block">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="absolute right-3 top-6 transform -translate-y-1/2 p-1 hover:bg-gray-800 rounded-full transition-colors"
              >
                <Smile className="w-5 h-5 text-gray-300" />
              </button>
            </div>
          </div>

          <button
            className={`px-4 py-2.5 rounded-full transition-all duration-200 flex-shrink-0 absolute right-5 -translate-y-1 ${
              text.trim()
                ? "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                : "bg-gray-700 text-gray-500 cursor-not-allowed"
            }`}
            onClick={sendMessage}
            disabled={!text.trim()}
          >
            {editingMessage ? (
              <Edit2 className="w-5 h-5" />
            ) : (
              <ArrowUpRight className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
