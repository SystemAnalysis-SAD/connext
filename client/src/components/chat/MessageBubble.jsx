// MessageBubble.jsx
import { useRef, useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Edit2,
  Heart,
  MoreHorizontal,
  Reply,
  SmilePlus,
  X,
  Trash2,
} from "lucide-react";
import { FiArrowLeft } from "react-icons/fi";
import { reactionEmojis, getMessageReactions } from "../../utility/chatUtils";
import isMobile from "../../utility/IsMobile";

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
  handleTouchStart: propHandleTouchStart,
  handleTouchEnd: propHandleTouchEnd,
  handleTouchCancel: propHandleTouchCancel,
  toggleMenu,
  openReactionPicker,
  addReaction,
  handleReactionClick,
  setReplyingTo,
  setActiveMenu,
  setReactionDetails,
  setReactionPicker,
  handleDeleteMessage, // Add this prop if you have delete functionality
}) {
  const bubbleRef = useRef(null);
  const [isLongPress, setIsLongPress] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchStartY, setTouchStartY] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

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

  // Long press timer
  const longPressTimer = useRef(null);

  // Handle touch start for both swipe and long press
  const handleTouchStart = (e) => {
    if (!isMobile()) {
      if (propHandleTouchStart) propHandleTouchStart(msg.message_id);
      return;
    }

    const touch = e.touches[0];
    setTouchStartX(touch.clientX);
    setTouchStartY(touch.clientY);
    setTouchEndX(touch.clientX);
    setIsSwiping(true);

    longPressTimer.current = setTimeout(() => {
      setIsLongPress(true);
      setShowMobileMenu(true);
      handleTouchCancel(e);
    }, 500);
  };

  const MAX_SWIPE = 80;

  const handleTouchMove = (e) => {
    if (!isMobile() || isLongPress) return;

    const touch = e.touches[0];
    const rawOffset = touch.clientX - touchStartX;

    const clampedOffset = isSender
      ? Math.max(-MAX_SWIPE, Math.min(0, rawOffset)) // sender LEFT
      : Math.min(MAX_SWIPE, Math.max(0, rawOffset)); // receiver RIGHT

    setSwipeOffset(clampedOffset);

    // cancel long press if swiping
    if (Math.abs(clampedOffset) > 10 && longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  // Handle touch end
  const handleTouchEnd = (e) => {
    if (!isMobile()) {
      if (propHandleTouchEnd) propHandleTouchEnd();
      return;
    }

    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }

    setIsSwiping(false);

    // Check if it's a swipe (not a long press)
    if (!isLongPress && e.changedTouches && e.changedTouches[0]) {
      const touch = e.changedTouches[0];
      const swipeDistance = touch.clientX - touchStartX;
      const verticalDistance = Math.abs(touch.clientY - touchStartY);

      // Only trigger swipe if horizontal movement > 50px and vertical movement < 30px
      if (Math.abs(swipeDistance) > 50 && verticalDistance < 30) {
        // Swipe left on sender message or swipe right on receiver message triggers reply
        if (
          (isSender && swipeDistance < -50) ||
          (!isSender && swipeDistance > 50)
        ) {
          setReplyingTo(msg);
          textareaRef.current?.focus();
        }
      }

      // Reset swipe after animation
      setTimeout(() => setSwipeOffset(0), 200);
    }

    // Reset long press state
    setIsLongPress(false);
  };

  // Handle touch cancel
  const handleTouchCancel = (e) => {
    if (!isMobile()) {
      if (propHandleTouchCancel) propHandleTouchCancel();
      return;
    }

    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }

    setIsSwiping(false);
    setIsLongPress(false);

    // Animate back to position
    setTimeout(() => setSwipeOffset(0), 200);
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        showMobileMenu &&
        bubbleRef.current &&
        !bubbleRef.current.contains(e.target)
      ) {
        setShowMobileMenu(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showMobileMenu]);

  // Mobile menu component
  const MobileMenu = () => (
    <div
      className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-sm bg-opacity-50 flex items-end justify-center md:hidden`}
    >
      <div
        className="absolute inset-0"
        onClick={() => setShowMobileMenu(false)}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative w-full max-w-md bg-black/50 rounded-t-3xl p-4"
      >
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
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setShowMobileMenu(false)} className="p-2">
            <X className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-medium">Message Options</h3>
          <div className="w-10" /> {/* Spacer for alignment */}
        </div>

        <div className="space-y-2">
          <button
            onClick={() => {
              openReactionPicker(msg.message_id);
              setShowMobileMenu(false);
            }}
            className="w-full flex items-center gap-3 p-3 hover:bg-gray-800 rounded-xl transition-colors"
          >
            <SmilePlus className="w-5 h-5" />
            <span>Add Reaction</span>
          </button>

          <button
            onClick={() => {
              setReplyingTo(msg);
              setShowMobileMenu(false);
              textareaRef.current?.focus();
            }}
            className="w-full flex items-center gap-3 p-3 hover:bg-gray-800 rounded-xl transition-colors"
          >
            <Reply className="w-5 h-5" />
            <span>Reply</span>
          </button>

          {isSender && (
            <>
              <button
                onClick={() => {
                  handleEditMessage(msg);
                  setShowMobileMenu(false);
                }}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-800 rounded-xl transition-colors"
              >
                <Edit2 className="w-5 h-5" />
                <span>Edit</span>
              </button>

              {handleDeleteMessage && (
                <button
                  onClick={() => {
                    handleDeleteMessage(msg.message_id);
                    setShowMobileMenu(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 text-red-400 hover:bg-red-900 hover:bg-opacity-20 rounded-xl transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                  <span>Delete</span>
                </button>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );

  // Swipe indicator component
  const SwipeIndicator = () => (
    <div
      className={`absolute top-0 bottom-0 flex items-center justify-center w-16 ${
        isSender ? "left-full ml-2" : "right-full mr-2"
      } pointer-events-none`}
    >
      <div
        className={`flex items-center gap-2 text-blue-400 bg-gray-800 bg-opacity-80 px-3 py-2 rounded-full ${
          isSender ? "flex-row-reverse" : ""
        }`}
      >
        <Reply className="w-4 h-4" />
        <span className="text-xs font-medium">Reply</span>
      </div>
    </div>
  );

  return (
    <>
      <div
        ref={bubbleRef}
        key={msg.message_id}
        className={`flex flex-col w-full relative ${
          isSender ? "items-end " : "justify-start"
        }`}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? "none" : "transform 0.2s ease-out",
        }}
      >
        {/* Show swipe indicator during swipe */}
        {isSwiping && Math.abs(swipeOffset) > 20 && <SwipeIndicator />}

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
              <div className="px-2 py-1 min-h-fit max-h-21 min-w-0  max-w-[65%] md:max-w-[50%] overflow-hidden rounded-2xl bg-white/20 text-xs opacity-80">
                <p className="line-clamp-4">{msg.reply_content}</p>
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
                  <span className="w-full ">
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
              <div className="px-2 py-1 min-h-fit max-h-21 min-w-0 max-w-[65%] md:max-w-[50%] overflow-hidden rounded-2xl bg-white/20 text-xs opacity-80">
                <p className="line-clamp-4">{msg.reply.content}</p>
              </div>
            </div>
          )}
        </div>

        <div
          className={`w-fit  max-w-[90%] md:max-w-[70%] wrap-break-word ${
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
                className={`relative flex w-full group  ${
                  isSender ? "flex-row-reverse break-words " : "mr-auto"
                } `}
                onClick={(e) =>
                  isMobile() && handleMessageBubbleClick(msg.message_id, e)
                }
              >
                <p
                  className={`relative whitespace-pre-wrap px-4 py-2 break-words select-none active:scale-85 active:transition-all duration-300 ${
                    isSender
                      ? `bg-gradient-to-r max-w-[calc(100%-80px)] rounded-bl-3xl rounded-r-sm rounded-tl-3xl from-blue-600 to-blue-700 text-white ${
                          isFirstBubble
                            ? "rounded-br-sm rounded-l-3xl rounded-tr-3xl"
                            : isLastBubble
                            ? "rounded-tr-sm rounded-l-3xl rounded-br-3xl"
                            : ""
                        }`
                      : `bg-gray-600 max-w-[calc(100%-60px)] ml-10 rounded-br-3xl rounded-l-sm rounded-tr-3xl from-blue-600 to-blue-700 text-white ${
                          isFirstBubble
                            ? "rounded-bl-sm rounded-r-3xl rounded-tl-3xl"
                            : isLastBubble
                            ? "rounded-tl-sm rounded-r-3xl rounded-bl-3xl"
                            : ""
                        }`
                  } min-w-0`}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchCancel}
                >
                  {msg.content}
                </p>

                <div
                  ref={menuRef}
                  className={`relative  opacity-0 pointer-events-none
    group-hover:opacity-100 group-hover:pointer-events-auto
    transition-opacity duration-200
    ${isSender ? "-left-2 flex-row-reverse" : "-right-2"}
    hidden md:flex`}
                >
                  <button
                    onClick={() => openReactionPicker(msg.message_id)}
                    className="flex items-center text-sm text-gray-300 hover:bg-white/20 rounded-full px-3 py-0  transition-colors w-full"
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
                    className="flex items-center  text-sm text-gray-300 hover:bg-white/20 rounded-full px-3 transition-colors w-full"
                  >
                    <Reply className="w-4 h-4" />
                  </button>

                  {isSender && (
                    <button
                      onClick={() => handleEditMessage(msg)}
                      className="flex items-center text-sm text-gray-300 hover:bg-white/20 rounded-full px-3 transition-colors w-full"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
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
                  className={`absolute z-10 bg-gray-900 w-fit rounded-full px-2 shadow-xl border border-gray-700 flex items-center ${
                    isSender ? "right-0 -top-8" : "left-9 -top-8"
                  }`}
                >
                  {Object.entries(reactionEmojis).map(([type, emoji]) => (
                    <button
                      key={type}
                      onClick={() => addReaction(msg.message_id, type)}
                      className="w-8 h-8 md:w-10 md:h-10 md:text-[30px] cursor-pointer flex items-center  justify-center text-lg hover:scale-125 transition-transform duration-150 reaction-emoji-btn"
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

      {/* Mobile Menu */}
      <AnimatePresence>
        {showMobileMenu && isMobile() && <MobileMenu />}
      </AnimatePresence>
    </>
  );
}
