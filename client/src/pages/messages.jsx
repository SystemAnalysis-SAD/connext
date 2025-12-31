import { useState } from "react";
import UserList from "../components/UserList";
import ChatWindow from "../components/ChatWindow";
import { FiMessageSquare, FiUsers } from "react-icons/fi";
import { useAuth } from "../context/authContext";

export default function Messages() {
  const { user } = useAuth();
  const [activeUser, setActiveUser] = useState(null);
  const [view, setView] = useState("users"); // "users" or "chat"
  const [messageView, setMessageView] = useState("users");

  const handleUserSelect = (user) => {
    setActiveUser(user);
    setView("chat");
  };

  const handleBackToUsers = () => {
    setView("users");
  };

  return (
    <div className="flex h-full bg-[var(--black)] text-gray-100">
      {/* User List */}
      <div
        className={`
          ${view === "users" ? "block" : "hidden"}
          md:block w-full md:w-96 md:border-r border-gray-700 bg-[var(--black)] overflow-hidden
        `}
      >
        <div className="px-4 pt-4 pb-1 flex items-center justify-between">
          <p className="text-3xl font-bold">
            con<span className="text-[var(--primary)]">next</span>
          </p>
          <img src="/connext(1).png" alt="logo" width={33} />
        </div>

        <UserList
          onSelectUser={handleUserSelect}
          currentUserId={user?.uid}
          receiver_id={activeUser}
          setActiveTab={setView}
        />
      </div>

      {/* Chat Window */}
      <div
        className={`
          ${view === "chat" ? "block" : "hidden"}
          md:block flex-1 flex flex-col
        `}
      >
        {activeUser ? (
          <ChatWindow
            sender_id={user?.uid}
            receiver={activeUser}
            setActiveTab={handleBackToUsers}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center mb-6">
              <FiMessageSquare className="text-4xl text-gray-500" />
            </div>
            <h2 className="text-2xl font-semibold mb-2 text-gray-100">
              Select a conversation
            </h2>
            <p className="text-gray-400 max-w-md">
              Choose a user from the list to start chatting.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
