// MessageBubble.jsx
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Edit2,
  Heart,
  MoreHorizontal,
  Reply,
  SmilePlus,
  X,
} from "lucide-react";
import { FiArrowLeft } from "react-icons/fi";
import { reactionEmojis, getMessageReactions } from "../../utility/chatUtils";
import isMobile from "../../utility/IsMobile";
import { useMemo } from "react";

export default function MessageBubble({
  msg,
  index,
  messages,
  sender_id,
  receiver,
  lastSeenMessage,
  touchedMessage,
  activeMenu,
  reactionPicker,
  reactionDetails,
  textareaRef,
  menuRef,
  reactionPickerRef,
  handleEditMessage,
  handleMessageBubbleClick,
  handleTouchStart,
  handleTouchEnd,
  handleTouchCancel,
  toggleMenu,
  openReactionPicker,
  addReaction,
  handleReactionClick,
  setReplyingTo,
  setActiveMenu,
  setReactionDetails,
  setReactionPicker,
}) {
  const isSender = msg.sender_id == sender_id;
  const isLastMessage = index === messages.length - 1;
  const isLastSeenMessage =
    lastSeenMessage && msg.message_id === lastSeenMessage.message_id;

  const isLastInBlock =
    index === messages.length - 1 ||
    messages[index + 1].sender_id !== msg.sender_id;

  const messageReactions = useMemo(
    () => getMessageReactions(msg, msg.sender_id),
    [msg.reactions, msg.sender_id]
  );
  const totalReactions = useMemo(
    () => messageReactions.reduce((sum, r) => sum + r.count, 0),
    [messageReactions]
  );

  const isFirstBubble =
    index === 0 || messages[index - 1].sender_id !== msg.sender_id;
  const isLastBubble =
    index === messages.length - 1 ||
    messages[index + 1].sender_id !== msg.sender_id;

  const isTouched = touchedMessage === msg.message_id;

  return (
    <>
      <div
        key={msg.message_id}
        className={`flex flex-col w-full relative ${
          isSender ? "items-end " : "justify-start"
        }`}
      >
        <div className="pr-2">
          {msg.reply_message_id && (
            <div
              className={`flex flex-col ${
                isSender
                  ? "items-end border-r-2 border-white/20 pr-2 my-1"
                  : "items-start ml-12 border-l-2 border-white/20 pl-2 my-1"
              }`}
            >
              <span className="text-[11px] font-extralight">
                {msg && (
                  <span>
                    {isSender
                      ? msg.reply_sender_id === sender_id
                        ? "You replied to yourself"
                        : `You replied to ${receiver.first_name} ${receiver.last_name}`
                      : msg.reply_sender_id === msg.sender_id
                      ? `${receiver.first_name} ${receiver.last_name} replied to himself`
                      : `${receiver.first_name} ${receiver.last_name} replied to you`}
                  </span>
                )}
              </span>
              <div className="px-2 py-1 rounded-full bg-white/20 text-xs opacity-80">
                <p className="truncate">{msg.reply_content}</p>
              </div>
            </div>
          )}
        </div>

        <div className="pr-2">
          {msg.reply && (
            <div
              className={`flex flex-col ${
                isSender
                  ? "items-end border-r-2 border-white/20 pr-2 my-1"
                  : "items-start ml-12 border-l-2 border-white/20 pl-2 my-1"
              }`}
            >
              <span className="text-[11px] font-extralight">
                {msg.reply && (
                  <span>
                    {isSender
                      ? msg.reply_sender_id === sender_id
                        ? "You replied to yourself"
                        : `You replied to ${receiver.first_name} ${receiver.last_name}`
                      : msg.reply_sender_id === msg.sender_id
                      ? `${receiver.first_name} ${receiver.last_name} replied to himself`
                      : `${receiver.first_name} ${receiver.last_name} replied to you`}
                  </span>
                )}
              </span>
              <div className="px-2 py-1 rounded-full bg-white/20 text-xs opacity-80">
                <p className="truncate">{msg.reply.content}</p>
              </div>
            </div>
          )}
        </div>

        <div
          className={`w-fit  max-w-[90%] md:max-w-[50%] wrap-break-word ${
            isSender
              ? "mr-2 items-end justify-end flex flex-col w-full"
              : "ml-2 flex flex-col w-full"
          }`}
        >
          <div className="w-full relative">
            <span
              className={`text-xs ${
                isSender ? "text-blue-300" : "text-gray-500"
              }`}
            >
              {msg.is_edited && (
                <span
                  className={`italic ${
                    isSender ? "flex items-end justify-end " : "ml-10"
                  }`}
                >
                  (edited)
                </span>
              )}
            </span>

            <div className="flex justify-start items-center">
              {!isSender && isLastInBlock && (
                <div className="absolute w-8 h-8">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                    {receiver.first_name.charAt(0).toUpperCase()}
                  </div>
                </div>
              )}
              <div
                className={`relative flex w-full ${
                  isSender ? "flex-row-reverse break-words " : "mr-auto"
                } `}
                onClick={(e) =>
                  isMobile() && handleMessageBubbleClick(msg.message_id, e)
                }
                onTouchStart={() =>
                  isMobile() && handleTouchStart(msg.message_id)
                }
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
              >
                <p
                  className={`relative whitespace-pre-wrap px-4 py-2 break-words  ${
                    isSender
                      ? `bg-gradient-to-r max-w-[calc(100%-80px)] rounded-bl-3xl rounded-r-md rounded-tl-3xl from-blue-600 to-blue-700 text-white ${
                          isFirstBubble
                            ? "rounded-br-md rounded-l-3xl rounded-tr-3xl"
                            : isLastBubble
                            ? "rounded-tr-md rounded-l-3xl rounded-br-3xl"
                            : ""
                        }`
                      : `bg-gray-600 max-w-[calc(100%-60px)] ml-10 rounded-br-3xl rounded-l-md rounded-tr-3xl from-blue-600 to-blue-700 text-white ${
                          isFirstBubble
                            ? "rounded-bl-md rounded-r-3xl rounded-tl-3xl"
                            : isLastBubble
                            ? "rounded-tl-md rounded-r-3xl rounded-bl-3xl"
                            : ""
                        }`
                  } min-w-0`}
                >
                  {msg.content}
                </p>

                {isTouched && window.innerWidth > 768 && (
                  <button
                    onClick={(e) => toggleMenu(msg.message_id, e)}
                    className={`absolute top-1/2 -translate-y-1/2 transition-opacity duration-200 ${
                      isSender ? "-left-10" : "-right-10"
                    } ${
                      isMobile()
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    <MoreHorizontal className="w-5 h-5 text-gray-400 hover:text-gray-300" />
                  </button>
                )}

                {activeMenu === msg.message_id && (
                  <div
                    ref={menuRef}
                    className={`relative flex items-center justify-center w-fit ${
                      isSender
                        ? "-left-2 flex-row-reverse gap-3"
                        : "-right-2  gap-2 "
                    }   `}
                  >
                    <button
                      onClick={() => openReactionPicker(msg.message_id)}
                      className="flex items-center text-sm text-gray-300 hover:bg-gray-700 transition-colors w-full"
                    >
                      <SmilePlus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setReplyingTo(msg);
                        setActiveMenu(null);
                        setReactionPicker(null);
                        textareaRef.current?.focus();
                      }}
                      className="flex items-center  text-sm text-gray-300 hover:bg-gray-700 rounded-b-lg transition-colors w-full"
                    >
                      <Reply className="w-4 h-4" />
                    </button>

                    {isSender && (
                      <button
                        onClick={() => handleEditMessage(msg)}
                        className="flex items-center text-sm text-gray-300 hover:bg-gray-700 rounded-t-lg transition-colors w-full"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {reactionPicker === msg.message_id && (
                <motion.div
                  key={`reaction-${msg.message_id}`}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  ref={reactionPickerRef}
                  className={`absolute z-10 bg-gray-800 w-fit rounded-full px-2 shadow-xl border border-gray-700 flex items-center ${
                    isSender ? "right-0 -top-8" : "left- -top-8"
                  }`}
                >
                  {Object.entries(reactionEmojis).map(([type, emoji]) => (
                    <button
                      key={type}
                      onClick={() => addReaction(msg.message_id, type)}
                      className="w-8 h-8 flex items-center justify-center text-lg hover:scale-125 transition-transform duration-150 reaction-emoji-btn"
                      title={type.charAt(0).toUpperCase() + type.slice(1)}
                    >
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div
            onClick={() => handleReactionClick(msg)}
            className={`flex ${
              isSender ? "justify-end" : "justify-start ml-10"
            } -mt-2 mb-2`}
          >
            {totalReactions > 0 && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  handleReactionClick(msg);
                }}
                className={`bg-gray-600 cursor-pointer items-center py-0 rounded-full border-[var(--black)] border-2 text-[13px] pb-0.5 px-1 z-0 ${
                  isSender ? "ml-auto" : "mr-auto"
                }`}
              >
                {messageReactions
                  .slice(0, 2)
                  .filter((reaction, index) => reaction.count > 0)
                  .map((reaction, idx) => (
                    <span key={idx}>{reaction.emoji}</span>
                  ))}
                {totalReactions > 2 && (
                  <span className="text-gray-300 ml-1">
                    +{totalReactions - 2}
                  </span>
                )}
              </div>
            )}
          </div>

          {isSender && isLastMessage && msg.is_seen && (
            <div className="flex items-center gap-1 justify-end">
              {isLastMessage &&
                msg.message_id === lastSeenMessage?.message_id && (
                  <span className="text-xs text-blue-400">Seen</span>
                )}
            </div>
          )}

          {isSender && isLastMessage && !msg.is_seen && (
            <div className="flex items-center gap-1 justify-end">
              <span className="text-xs text-gray-400">sent</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
