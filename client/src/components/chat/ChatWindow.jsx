import { useEffect, useState, useRef } from "react";
import { socket } from "../../socket";
import { reactionEmojis, getLastSeenMessage } from "../../utility/chatUtils";
import { Send, Edit2, Heart, MoreHorizontal, X } from "lucide-react";
import { API_URL } from "../../config/config";
import api from "../../api/api";
import MessageInput from "./MessageInput";
import TypingIndicator from "./TypingIndicator";
import ChatHeader from "./ChatHeader";
import { motion, AnimatePresence } from "motion/react";
import { FiArrowLeft } from "react-icons/fi";
import MessageBubble from "./MessageBubble";
import LoadingScreen from "../loadingScreen";
import ReactionDetailsModal from "./ReactionDetailsModal";

export default function ChatWindow({
  sender_id,
  receiver,
  activeTab,
  setActiveTab,
}) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [socketStatus, setSocketStatus] = useState(
    socket.connected ? "connected" : "disconnected"
  );
  const [reactionDetails, setReactionDetails] = useState(null);

  const [isTyping, setIsTyping] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null); // message_id for active 3-dot menu
  const [reactionPicker, setReactionPicker] = useState(null); // message_id for active reaction picker
  const [touchedMessage, setTouchedMessage] = useState(null); // For mobile touch handling
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const menuRef = useRef(null);
  const reactionPickerRef = useRef(null);
  const touchTimerRef = useRef(null);
  const [emojiSheetOffset, setEmojiSheetOffset] = useState(0);
  const startYRef = useRef(0);
  const [replyingTo, setReplyingTo] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleReactionClick = (message) => {
    setReactionDetails(message);
  };

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

  useEffect(() => {
    if (!receiver || !sender_id) return;

    // 🔴 When user goes BACK to messages tab → leave room
    if (activeTab === "messages") {
      socket.emit("leave_private", {
        user1: sender_id,
        user2: receiver.uid,
      });
    }

    // 🟢 When user enters chat tab → join room
    if (activeTab === "chat") {
      socket.emit("join_private", {
        user1: sender_id,
        user2: receiver.uid,
      });
    }
  }, [activeTab, receiver?.uid, sender_id]);

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

  useEffect(() => {
    if (!receiver || !messages.length) return;
    if (activeTab !== "chat") return; // only mark seen if user is in chat tab

    messages.forEach((msg) => {
      if (msg.sender_id === receiver.uid && !msg.is_seen && socket.connected) {
        socket.emit("mark_message_seen", {
          message_id: msg.message_id,
          viewer_id: sender_id,
        });
      }
    });
  }, [messages, receiver, sender_id, activeTab]);

  useEffect(() => {
    if (!receiver || !sender_id) return;

    const joinRoomSafely = () => {
      socket.emit(
        "join_private",
        {
          user1: sender_id,
          user2: receiver.uid,
        },
        () => {
          // 🔥 GUARANTEED ROOM JOINED
          socket.emit("mark_as_seen", {
            sender_id: receiver.uid,
            receiver_id: sender_id,
          });
        }
      );
    };

    const fetchAndJoin = async () => {
      setLoading(true);
      try {
        // ✅ WAIT for socket connection
        if (!socket.connected) {
          socket.once("connect", joinRoomSafely);
        } else {
          joinRoomSafely();
        }

        const res = await api.get(`${API_URL}/messages/${receiver.uid}`, {
          withCredentials: true,
        });

        const messagesData = res.data;
        setMessages(messagesData);

        const unreadMessages = messagesData.filter(
          (msg) => msg.sender_id == receiver.uid && !msg.is_seen
        );

        if (unreadMessages.length > 0) {
          socket.on("message_seen_update", ({ message_id }) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.message_id === message_id ? { ...msg, is_seen: true } : msg
              )
            );
          });
        }
      } catch (err) {
        console.error("Error in fetchAndJoin:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAndJoin();

    return () => {
      // ✅ DO NOT depend on socket.connected
      socket.emit("leave_private", {
        user1: sender_id,
        user2: receiver.uid,
      });
    };
  }, [receiver, sender_id]);

  useEffect(() => {
    if (!receiver || !sender_id) return;

    let roomJoined = false;

    const joinRoom = () => {
      const roomPayload = { user1: sender_id, user2: receiver.uid };
      socket.emit("join_private", roomPayload, () => {
        roomJoined = true;
      });
    };

    if (socket.connected) {
      joinRoom();
    } else {
      socket.once("connect", joinRoom);
    }

    // ----------------------------
    // Message Handlers
    // ----------------------------
    const handleNewMessage = (msg) => {
      if (
        (msg.sender_id == sender_id && msg.receiver_id == receiver.uid) ||
        (msg.sender_id == receiver.uid && msg.receiver_id == sender_id)
      ) {
        setMessages((prev) => [...prev, msg]);

        // Auto-mark as seen if it's from receiver
        if (
          msg.sender_id === receiver.uid &&
          activeTab === "chat" &&
          !msg.is_seen
        ) {
          socket.emit("mark_message_seen", {
            message_id: msg.message_id,
            viewer_id: sender_id,
          });
        }
      }
    };

    const handleMessageEdited = (data) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.message_id === data.message_id
            ? {
                ...msg,
                content: data.content,
                is_edited: true,
                edited_at: data.edited_at,
              }
            : msg
        )
      );
      setEditingMessage(null);
    };

    const handleReactionUpdated = (data) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.message_id === data.message_id
            ? { ...msg, reactions: data.reactions }
            : msg
        )
      );
      setActiveMenu(null);
      setReactionPicker(null);
      setTouchedMessage(null);
    };

    const handleMessageSeenUpdate = ({ message_id }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.message_id === message_id ? { ...msg, is_seen: true } : msg
        )
      );
    };

    socket.on("new_message", handleNewMessage);
    socket.on("message_edited", handleMessageEdited);
    socket.on("reaction_updated", handleReactionUpdated);
    socket.on("message_seen_update", handleMessageSeenUpdate);

    // ----------------------------
    // Leave room on cleanup
    // ----------------------------
    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("message_edited", handleMessageEdited);
      socket.off("reaction_updated", handleReactionUpdated);
      socket.off("message_seen_update", handleMessageSeenUpdate);

      if (roomJoined) {
        socket.emit("leave_private", { user1: sender_id, user2: receiver.uid });
      }
    };
  }, [receiver, sender_id, activeTab]);

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
      if (!text.trim() || !receiver) return;
      if (!socket.connected) {
        console.warn("Socket not connected yet");
        return;
      }

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
        reply_to_message_id: replyingTo?.message_id || null,
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
        setReplyingTo(null);
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

  // Get status text
  const getStatusText = () => {
    if (isTyping) {
      return "typing...";
    }
    return "Active now";
  };

  const lastSeenMessage = [...messages]
    .filter((m) => m.sender_id === sender_id && m.is_seen)
    .pop();

  if (loading) {
    return <LoadingScreen />;
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

      {/* Chat Messages - FIXED CONTAINER */}
      <div className="flex-1 pt-15 w-full overflow-y-auto bg-[var(--black)] px-2 sm:px-4 py-4">
        <div className="max-w-full mx-auto w-full">
          {/* Messages */}
          {messages.length === 0 && receiver ? (
            <div className="flex w-full h-full items-center justify-center flex-col pt-10 sm:pt-20 md:pt-60 overflow-hidden">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-900/30 to-purple-900/30 flex items-center justify-center">
                <Send className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-200 mb-2 text-center px-4">
                No messages yet
              </h3>
              <p className="text-gray-500 text-center text-sm sm:text-base px-4">
                Send your first message to start the conversation
              </p>
            </div>
          ) : (
            <div className="space-y-0.5 pt-25  md:pt-8 pb-16 md:pb-16 w-full">
              {messages.map((msg, index) => (
                <MessageBubble
                  key={msg.message_id}
                  msg={msg}
                  index={index}
                  messages={messages}
                  sender_id={sender_id}
                  receiver={receiver}
                  lastSeenMessage={lastSeenMessage}
                  touchedMessage={touchedMessage}
                  activeMenu={activeMenu}
                  reactionPicker={reactionPicker}
                  reactionDetails={reactionDetails}
                  setReactionDetails={setReactionDetails}
                  textareaRef={textareaRef}
                  menuRef={menuRef}
                  reactionPickerRef={reactionPickerRef}
                  handleEditMessage={handleEditMessage}
                  handleMessageBubbleClick={handleMessageBubbleClick}
                  handleTouchStart={handleTouchStart}
                  handleTouchEnd={handleTouchEnd}
                  handleTouchCancel={handleTouchCancel}
                  toggleMenu={toggleMenu}
                  openReactionPicker={openReactionPicker}
                  addReaction={addReaction}
                  handleReactionClick={handleReactionClick}
                  setReplyingTo={setReplyingTo}
                  setActiveMenu={setActiveMenu}
                  setReactionPicker={setReactionPicker}
                />
              ))}
              <ReactionDetailsModal
                reactionDetails={reactionDetails}
                setReactionDetails={setReactionDetails}
                sender_id={sender_id}
              />
            </div>
          )}

          {isTyping && <TypingIndicator receiver={receiver} />}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <MessageInput
        receiver={receiver}
        sender_id={sender_id}
        setReplyingTo={setReplyingTo}
        replyingTo={replyingTo}
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
