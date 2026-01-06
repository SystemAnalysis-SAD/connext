import { useEffect, useState } from "react";
import UserList from "../components/UserList";
import ChatWindow from "../components/chat/ChatWindow";
import { FiMessageSquare, FiUsers } from "react-icons/fi";
import { useAuth } from "../context/authContext";
import { useViewContext } from "../context/viewContext";

export default function Messages() {
  const { user } = useAuth();
  const [activeUser, setActiveUser] = useState(null);
  const { view, setView } = useViewContext(); // "users" or "chat"
  const [width, setWidth] = useState();

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleUserSelect = (user) => {
    setActiveUser(user);
    setView("chat");
  };

  const handleBackToUsers = () => {
    setView("messages");
  };

  return (
    <div className="flex h-full bg-[var(--black)] text-gray-100 overflow-hidden">
      {/* User List */}
      <div
        className={`
          ${view === "messages" ? "block" : "hidden"}
          md:block w-full md:max-w-85 md:min-w-85  md:border-r border-white/10 bg-[var(--black)] overflow-hidden
        `}
      >
        <div className="px-4 pt-4 pb-1 flex items-center justify-between ">
          {width < 768 ? (
            <p className="text-3xl font-bold">
              con<span className="text-[var(--primary)]">next</span>
            </p>
          ) : (
            <p className="text-2xl font-bold">{user?.username}</p>
          )}
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
            activeTab={view}
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
