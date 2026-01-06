import React, { useEffect, useState } from "react";
import { ArrowUpRight, Send, Smile, Edit2, X, Plus } from "lucide-react";
import EmojiPicker from "emoji-picker-react";

function MessageInputComponent({
  receiver,
  sender_id,
  replyingTo,
  setReplyingTo,
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
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="fixed w-full md:w-[calc(100%-26rem)] bottom-0 bg-[var(--black)] p-2">
      <div className="w-full mx-auto ">
        {replyingTo && (
          <div className="mb-2 px-3 py-2 rounded-xl bg-black/40 border-l-4 border-blue-500 flex justify-between items-center">
            <div className="overflow-hidden">
              <p className="text-xs text-blue-400 ">
                Replying to{" "}
                {replyingTo.sender_id === sender_id ? (
                  "yourself"
                ) : (
                  <span className="font-bold">
                    {receiver.first_name}&nbsp; {receiver.last_name}
                  </span>
                )}
              </p>
              <p className="text-sm text-gray-300 truncate max-w-[90%]">
                {replyingTo.content}
              </p>
            </div>

            <button
              onClick={() => setReplyingTo(null)}
              className="ml-2 text-gray-400 hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
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

        <div className="flex items-end gap-2 z-50">
          {showEmojiPicker && (
            <div
              className={`fixed w-full md:w-fit z-50 items-center rounded-t-2xl shadow-xl  ${
                width < 768
                  ? "inset-x-0 -bottom-0 flex-col transition-transform duration-300 h-fit block md:hidden"
                  : "bottom-20 right-0 md:left-100 w-80 h-96 hidden md:block"
              }`}
              style={
                width < 768
                  ? {
                      transform: `translateY(${emojiSheetOffset}px)`,
                      touchAction: "none",
                    }
                  : {}
              }
              onTouchStart={
                width < 768 ? handleTouchStartEmojiSheet : undefined
              }
              onTouchMove={width < 768 ? handleTouchMoveEmojiSheet : undefined}
              onTouchEnd={width < 768 ? handleTouchEndEmojiSheet : undefined}
            >
              {width < 768 && (
                <div className="flex items-center justify-center">
                  <span className="w-15 h-1.5 bg-gray-600 rounded-full mt-2 mb-2"></span>
                </div>
              )}
              <EmojiPicker
                className="fixed z-100 w-full md:hidden block md:w-80"
                onEmojiClick={(emojiData) => {
                  textareaRef.current.value += emojiData.emoji;
                  textareaRef.current.focus();
                }}
                theme="dark"
                height={400}
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
              className="w-full backdrop-blur-2xl shadow-[inset_0_4px_6px_rgba(0,0,0,0.5)] overflow-hidden border border-white/3 bg-black/20 rounded-3xl px-4 py-3 pr-15 pl-13 outline-none resize-none text-white placeholder-gray-500"
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
            <div>
              {width > 768 ? (
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="absolute -bottom-1 left-3 transform -translate-y-1/2 p-1 hover:bg-gray-800 rounded-full transition-colors"
                >
                  <Smile className="w-5 h-5 text-gray-300" />
                </button>
              ) : (
                <button className="absolute -bottom-1 bg-white left-3 transform -translate-y-1/2 p-1 hover:bg-gray-800 rounded-full transition-colors">
                  <Plus className="w-5 h-5 text-black" />
                </button>
              )}
            </div>
          </div>

          <button
            className={`px-4 py-2.5 rounded-full transition-all duration-200 flex-shrink-0 absolute right-3 -translate-y-1 ${
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

export default React.memo(MessageInputComponent, (prev, next) => {
  return (
    prev.text === next.text &&
    prev.editingMessage === next.editingMessage &&
    prev.replyingTo === next.replyingTo &&
    prev.showEmojiPicker === next.showEmojiPicker &&
    prev.emojiSheetOffset === next.emojiSheetOffset
  );
});
