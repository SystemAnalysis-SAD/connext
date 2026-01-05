export const reactionEmojis = {
  like: "👍", // IG-style like
  love: "💗", // hype / love
  haha: "😆", // stronger laugh
  wow: "🤯", // mind blown
  sad: "😢", // soft sad
  angry: "💢", // modern “dead” / annoyed
};

export const getUserReaction = (message, senderId) => {
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

export const getMessageReactions = (message, senderId) => {
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

export const getLastSeenMessage = (messages, senderId) => {
  const ourMessages = messages.filter((msg) => msg.sender_id == senderId);
  const seenMessages = ourMessages.filter((msg) => msg.is_seen);
  return seenMessages.length > 0 ? seenMessages[seenMessages.length - 1] : null;
};
