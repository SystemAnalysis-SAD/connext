import { useEffect, useState, useRef } from "react";
import { socket } from "../socket";
import { reactionEmojis, getLastSeenMessage } from "../utility/chatUtils";
import {
  Send,
  CheckCheck,
  Check,
  Edit2,
  Heart,
  MoreHorizontal,
} from "lucide-react";
import { API_URL } from "../config/config";
import api from "../api/api";
import MessageInput from "./MessageInput";
import TypingIndicator from "./TypingIndicator";
import ChatHeader from "./ChatHeader";

export default function ChatWindow({ sender_id, receiver, setActiveTab }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [socketStatus, setSocketStatus] = useState(
    socket.connected ? "connected" : "disconnected"
  );
  const [isTyping, setIsTyping] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null); // message_id for active 3-dot menu
  const [reactionPicker, setReactionPicker] = useState(null); // message_id for active reaction picker
  const [touchedMessage, setTouchedMessage] = useState(null); // For mobile touch handling
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const seenTimeoutRef = useRef(null);
  const menuRef = useRef(null);
  const reactionPickerRef = useRef(null);
  const touchTimerRef = useRef(null);
  const [emojiSheetOffset, setEmojiSheetOffset] = useState(0);
  const startYRef = useRef(0);

  useEffect(() => {
    const handleResize = () => {
      // Close emoji picker on resize
      setShowEmojiPicker(false);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleTouchStartEmojiSheet = (e) => {
    startYRef.current = e.touches[0].clientY;
  };

  const handleTouchMoveEmojiSheet = (e) => {
    const deltaY = e.touches[0].clientY - startYRef.current;
    if (deltaY > 0) {
      setEmojiSheetOffset(deltaY);
    }
  };

  const handleTouchEndEmojiSheet = () => {
    if (emojiSheetOffset > 100) {
      // Close if dragged down more than 100px
      setShowEmojiPicker(false);
    }
    setEmojiSheetOffset(0);
  };

  // Reaction emoji mapping

  useEffect(() => {
    const handleConnect = () => setSocketStatus("connected");
    const handleDisconnect = () => setSocketStatus("disconnected");

    if (socket.connected) {
      setSocketStatus("connected");
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, []);

  // Fetch existing messages
  useEffect(() => {
    if (!receiver || !sender_id) return;

    const fetchAndJoin = async () => {
      try {
        socket.emit("join_private", {
          user1: sender_id,
          user2: receiver.uid,
        });

        const res = await api.get(`${API_URL}/messages/${receiver.uid}`, {
          withCredentials: true,
        });

        const messagesData = res.data;
        setMessages(messagesData);

        const unreadMessages = messagesData.filter(
          (msg) => msg.sender_id == receiver.uid && !msg.is_seen
        );

        if (unreadMessages.length > 0) {
          socket.emit("mark_as_seen", {
            sender_id: receiver.uid,
            receiver_id: sender_id,
          });

          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.sender_id == receiver.uid && !msg.is_seen) {
                return { ...msg, is_seen: true };
              }
              return msg;
            })
          );
        }
      } catch (err) {
        console.error("Error in fetchAndJoin:", err);
      }
    };

    fetchAndJoin();

    return () => {
      if (receiver && socket.connected) {
        socket.emit("leave_private", {
          user1: sender_id,
          user2: receiver.uid,
        });
      }
    };
  }, [receiver, sender_id]);

  // Listen for real-time messages including edits and reactions
  useEffect(() => {
    const handleNewMessage = (msg) => {
      if (
        (msg.sender_id == sender_id && msg.receiver_id == receiver?.uid) ||
        (msg.sender_id == receiver?.uid && msg.receiver_id == sender_id)
      ) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    const handleMessageEdited = (data) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.message_id === data.message_id) {
            return {
              ...msg,
              content: data.content,
              is_edited: true,
              edited_at: data.edited_at,
            };
          }
          return msg;
        })
      );
      setEditingMessage(null);
    };

    const handleReactionUpdated = (data) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.message_id === data.message_id) {
            return {
              ...msg,
              reactions: data.reactions,
            };
          }
          return msg;
        })
      );
      // Close both menu and reaction picker after reaction
      setActiveMenu(null);
      setReactionPicker(null);
      setTouchedMessage(null);
    };

    socket.on("new_message", handleNewMessage);
    socket.on("message_edited", handleMessageEdited);
    socket.on("reaction_updated", handleReactionUpdated);

    const handleMessagesSeen = (data) => {
      if (data.sender_id == receiver?.uid && data.receiver_id == sender_id) {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.sender_id == sender_id && !msg.is_seen) {
              return { ...msg, is_seen: true };
            }
            return msg;
          })
        );
      }
    };

    socket.on("messages_seen", handleMessagesSeen);

    const handleMessageSeenUpdate = (data) => {
      if (
        (data.sender_id == sender_id && data.receiver_id == receiver?.uid) ||
        (data.sender_id == receiver?.uid && data.receiver_id == sender_id)
      ) {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.message_id === data.message_id) {
              return { ...msg, is_seen: data.is_seen };
            }
            return msg;
          })
        );
      }
    };

    socket.on("message_seen_update", handleMessageSeenUpdate);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("message_edited", handleMessageEdited);
      socket.off("reaction_updated", handleReactionUpdated);
      socket.off("messages_seen", handleMessagesSeen);
      socket.off("message_seen_update", handleMessageSeenUpdate);
      if (seenTimeoutRef.current) {
        clearTimeout(seenTimeoutRef.current);
      }
    };
  }, [receiver, sender_id]);

  // Typing indicators
  useEffect(() => {
    const handleTypingStart = (data) => {
      if (data.sender_id == receiver?.uid) {
        setIsTyping(true);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
        }, 1000);
      }
    };

    const handleTypingStop = (data) => {
      if (data.sender_id == receiver?.uid) {
        setIsTyping(false);
      }
    };

    socket.on("typing_start", handleTypingStart);
    socket.on("typing_stop", handleTypingStop);

    return () => {
      socket.off("typing_start", handleTypingStart);
      socket.off("typing_stop", handleTypingStop);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [receiver?.uid]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
    }
  }, [text]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close menu if clicking outside
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenu(null);
      }

      // Close reaction picker if clicking outside
      if (
        reactionPickerRef.current &&
        !reactionPickerRef.current.contains(event.target) &&
        !event.target.closest(".reaction-emoji-btn")
      ) {
        setReactionPicker(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const getUserReaction = (message, senderId) => {
    if (!message.reactions) return null;
    try {
      const reactions =
        typeof message.reactions === "string"
          ? JSON.parse(message.reactions)
          : message.reactions;
      for (const [type, users] of Object.entries(reactions)) {
        if (users.includes(senderId.toString())) return type;
      }
      return null;
    } catch (err) {
      console.error("Error parsing reactions:", err);
      return null;
    }
  };

  const getMessageReactions = (message, senderId) => {
    if (!message.reactions) return [];
    try {
      const reactions =
        typeof message.reactions === "string"
          ? JSON.parse(message.reactions)
          : message.reactions;
      return Object.entries(reactions)
        .filter(([type, users]) => Array.isArray(users) && users.length > 0)
        .map(([type, users]) => ({
          type,
          count: users.length,
          emoji: reactionEmojis[type],
          hasReacted: users.includes(senderId.toString()),
        }));
    } catch (err) {
      console.error("Error parsing reactions:", err);
      return [];
    }
  };

  // Clean up touch timer on unmount
  useEffect(() => {
    return () => {
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
      }
    };
  }, []);

  // Handle typing indicator
  const handleTyping = () => {
    if (!receiver || !socket.connected) return;

    socket.emit("typing_start", {
      sender_id: sender_id,
      receiver_id: receiver.uid,
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing_stop", {
        sender_id: sender_id,
        receiver_id: receiver.uid,
      });
    }, 2000);
  };

  // Send message or update existing message
  const sendMessage = async () => {
    if (editingMessage) {
      if (!text.trim() || !receiver || socketStatus !== "connected") return;

      const editPayload = {
        message_id: editingMessage.message_id,
        sender_id: sender_id,
        receiver_id: receiver.uid,
        new_content: text,
      };

      try {
        socket.emit("edit_message", editPayload);
        setText("");
        setEditingMessage(null);
        if (textareaRef.current) {
          textareaRef.current.style.height = "44px";
        }
      } catch (err) {
        console.error("Failed to edit message:", err);
      }
    } else {
      if (!text.trim() || !receiver || socketStatus !== "connected") return;

      const msgPayload = {
        sender_id,
        receiver_id: receiver.uid,
        content: text,
      };

      try {
        socket.emit("send_message", msgPayload);
        socket.emit("typing_stop", {
          sender_id: sender_id,
          receiver_id: receiver.uid,
        });

        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        setText("");
        if (textareaRef.current) {
          textareaRef.current.style.height = "44px";
        }
      } catch (err) {
        console.error("Failed to send message:", err);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    } else {
      handleTyping();
    }
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    handleTyping();
  };

  // Edit message handler
  const handleEditMessage = (message) => {
    setEditingMessage(message);
    setText(message.content);
    setActiveMenu(null);
    setReactionPicker(null);
    setTouchedMessage(null);
    textareaRef.current?.focus();
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingMessage(null);
    setText("");
  };

  // Add reaction to message
  const addReaction = (messageId, reactionType) => {
    if (!receiver || !socket.connected) return;

    socket.emit("add_reaction", {
      message_id: messageId,
      sender_id: sender_id,
      receiver_id: receiver.uid,
      reaction_type: reactionType,
    });

    // Close both menus after reaction
    setActiveMenu(null);
    setReactionPicker(null);
    setTouchedMessage(null);
  };

  // Toggle 3-dot menu
  const toggleMenu = (messageId, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    if (activeMenu === messageId) {
      setActiveMenu(null);
      setTouchedMessage(null);
    } else {
      setActiveMenu(messageId);
      setReactionPicker(null);
      setTouchedMessage(messageId);
    }
  };

  // Open reaction picker from menu
  const openReactionPicker = (messageId) => {
    setReactionPicker(messageId);
    setActiveMenu(null);
    setTouchedMessage(null);
  };

  // Handle mobile touch events
  const handleTouchStart = (messageId) => {
    touchTimerRef.current = setTimeout(() => {
      // Long press detected - show menu
      toggleMenu(messageId);
    }, 500); // 500ms for long press
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
    }
  };

  const handleTouchCancel = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
    }
  };

  // Handle click on message bubble (for mobile tap)
  const handleMessageBubbleClick = (messageId, e) => {
    // Only handle on mobile
    if (window.innerWidth < 768) {
      e.stopPropagation();
      toggleMenu(messageId, e);
    }
  };

  // Check if device is mobile
  const isMobile = () => {
    return window.innerWidth < 768;
  };

  // Get the user's reaction for a message

  // Get all reactions for a message with counts

  // Get status text
  const getStatusText = () => {
    if (isTyping) {
      return "typing...";
    }
    return "Active now";
  };

  const lastSeenMessage = getLastSeenMessage(messages, sender_id);

  if (!receiver) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[var(--black)]">
        <div className="w-24 h-24 mb-6 rounded-full bg-gradient-to-r from-blue-900/30 to-purple-900/30 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
            <Send className="w-8 h-8 text-white" />
          </div>
        </div>
        <h3 className="text-2xl font-semibold text-gray-100 mb-2">
          Your Messages
        </h3>
        <p className="text-gray-400">Select a conversation to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <ChatHeader
        receiver={receiver}
        setActiveTab={setActiveTab}
        isTyping={isTyping}
        getStatusText={getStatusText}
      />

      {/* Chat Messages */}
      <div className="flex-1  overflow-y-auto bg-[var(--black)] p-4">
        <div className="w-full mx-auto h-auto">
          {/* Messages */}
          {messages.length === 0 ? (
            <div className=" flex items-center justfy-center flex-col pt-60 overflow-hidden">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-900/30 to-purple-900/30 flex items-center justify-center">
                <Send className="w-10 h-10 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-200 mb-2">
                No messages yet
              </h3>
              <p className="text-gray-500">
                Send your first message to start the conversation
              </p>
            </div>
          ) : (
            <div className="space-y-0 pt-20">
              {messages.map((msg, index) => {
                const isSender = msg.sender_id == sender_id;
                const isLastMessage = index === messages.length - 1;
                const isLastSeenMessage =
                  lastSeenMessage &&
                  msg.message_id === lastSeenMessage.message_id;

                // Determine if this is the last message in a consecutive block from the same sender
                const isLastInBlock =
                  index === messages.length - 1 ||
                  messages[index + 1].sender_id !== msg.sender_id;

                const userReaction = getUserReaction(msg, msg.sender_id);
                const messageReactions = getMessageReactions(
                  msg,
                  msg.sender_id
                );
                const totalReactions = messageReactions.reduce(
                  (sum, r) => sum + r.count,
                  0
                );

                const isTouched = touchedMessage === msg.message_id;

                return (
                  <div
                    key={msg.message_id}
                    className={`group flex ${
                      isSender ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`relative max-w-[50%] md:max-w-[50%] ${
                        isSender
                          ? "mr-2 items-end justify-end flex flex-col"
                          : "ml-2 flex flex-col"
                      }`}
                    >
                      {/* Message bubble */}
                      <div className="relative">
                        <span
                          className={`text-xs ${
                            isSender ? "text-blue-300" : "text-gray-500"
                          }`}
                        >
                          {msg.is_edited && (
                            <span
                              className={`italic ${
                                isSender
                                  ? "flex items-end justify-end "
                                  : "ml-10"
                              }`}
                            >
                              (edited)
                            </span>
                          )}
                        </span>
                        <div
                          className={`rounded-3xl relative w-fit px-4 py-2 flex ${
                            isSender
                              ? "bg-gradient-to-r from-blue-600 to-blue-700 relative text-white rounded-br-sm"
                              : "bg-gray-600 text-gray-100 rounded-bl-sm ml-10"
                          }`}
                          onClick={(e) =>
                            isMobile() &&
                            handleMessageBubbleClick(msg.message_id, e)
                          }
                          onTouchStart={() =>
                            isMobile() && handleTouchStart(msg.message_id)
                          }
                          onTouchEnd={handleTouchEnd}
                          onTouchCancel={handleTouchCancel}
                        >
                          <p className="whitespace-pre-wrap break-all text-wrap">
                            {msg.content}
                          </p>
                        </div>

                        {isTouched ||
                          (window.innerWidth >= 700 && (
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
                          ))}

                        {activeMenu === msg.message_id && (
                          <div
                            ref={menuRef}
                            className={`absolute top-0 z-9 bg-gray-800 rounded-lg shadow-xl border border-gray-700 min-w-32 ${
                              isSender
                                ? "left-0 -translate-x-full mr-2"
                                : "right-0 translate-x-full ml-2"
                            }`}
                          >
                            {" "}
                            {/* Only show edit option for sender's own messages */}{" "}
                            {isSender && (
                              <button
                                onClick={() => handleEditMessage(msg)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-t-lg transition-colors"
                              >
                                {" "}
                                <Edit2 className="w-4 h-4" /> Edit{" "}
                              </button>
                            )}{" "}
                            {/* Show react option for all messages */}{" "}
                            <button
                              onClick={() => openReactionPicker(msg.message_id)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-b-lg transition-colors"
                            >
                              {" "}
                              <Heart className="w-4 h-4" /> React{" "}
                            </button>{" "}
                          </div>
                        )}

                        {reactionPicker === msg.message_id && (
                          <div
                            ref={reactionPickerRef}
                            className={` absolute z-10 bg-gray-800 rounded-full px-2 shadow-xl border border-gray-700 flex items-center ${
                              isSender
                                ? "translate-y-0 right-0 mt-2 md: md:-translate-y-0 md:-top-8"
                                : " translate-x-0 -top-10"
                            }`}
                          >
                            {" "}
                            {Object.entries(reactionEmojis).map(
                              ([type, emoji]) => (
                                <button
                                  key={type}
                                  onClick={() =>
                                    addReaction(msg.message_id, type)
                                  }
                                  className="w-8 h-8 flex items-center justify-center text-lg hover:scale-125 transition-transform duration-150 reaction-emoji-btn"
                                  title={
                                    type.charAt(0).toUpperCase() + type.slice(1)
                                  }
                                >
                                  {" "}
                                  {emoji}{" "}
                                </button>
                              )
                            )}{" "}
                          </div>
                        )}

                        {!isSender && isLastInBlock && (
                          <div className="absolute w-8 h-8  bottom-0">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                              {receiver.first_name.charAt(0).toUpperCase()}
                            </div>
                          </div>
                        )}
                      </div>
                      <div
                        className={`flex flex-row-reverse w-full justify-between gap-2 mt-1 ${
                          isSender ? "justify-between" : "justify-start"
                        }`}
                      >
                        {totalReactions > 0 && (
                          <div
                            className={`-translate-y-2.5 bg-gray-600 items-center py-0 rounded-full border-[var(--black)] border-2 text-[13px] pb-0.5 px-1 z-9 text-md ${
                              isSender ? "order-2 relative" : "order-1 relative"
                            }`}
                          >
                            {messageReactions
                              .slice(0, 2)
                              .map((reaction, idx) => (
                                <span key={idx}>{reaction.emoji}</span>
                              ))}
                            {totalReactions > 3 && (
                              <span className="text-gray-300 ml-1">
                                +{totalReactions - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {isSender && isLastMessage && msg.is_seen && (
                        <div className="flex items-center gap-1">
                          {" "}
                          <CheckCheck className="w-3 h-3 text-blue-400" />{" "}
                          {isLastSeenMessage && (
                            <span className="text-xs text-blue-400">
                              {" "}
                              Seen{" "}
                            </span>
                          )}{" "}
                        </div>
                      )}{" "}
                      {/* Single check for last message sent but not seen */}{" "}
                      {isSender && isLastMessage && !msg.is_seen && (
                        <Check className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {isTyping && <TypingIndicator receiver={receiver} />}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <MessageInput
        editingMessage={editingMessage}
        cancelEdit={cancelEdit}
        showEmojiPicker={showEmojiPicker}
        setShowEmojiPicker={setShowEmojiPicker}
        emojiSheetOffset={emojiSheetOffset}
        handleTouchStartEmojiSheet={handleTouchStartEmojiSheet}
        handleTouchMoveEmojiSheet={handleTouchMoveEmojiSheet}
        handleTouchEndEmojiSheet={handleTouchEndEmojiSheet}
        textareaRef={textareaRef}
        text={text}
        handleTextChange={handleTextChange}
        handleKeyPress={handleKeyPress}
        sendMessage={sendMessage}
      />
    </div>
  );
}
