export const reactionEmojis = {
  like: "👍",
  love: "💗",
  haha: "😆",
  wow: "🤯",
  sad: "😢",
  angry: "💢",
  okay: "👌​",
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

export const getLastSeenMessage = (messages, sender_id) => {
  return [...messages]
    .filter((m) => m.sender_id === sender_id && m.is_seen)
    .pop();
};
