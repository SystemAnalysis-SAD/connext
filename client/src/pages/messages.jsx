import { useState } from "react";
import UserList from "../components/UserList";
import ChatWindow from "../components/ChatWindow";
import { FiMessageSquare, FiUsers } from "react-icons/fi";
import { useAuth } from "../context/authContext";
import { useViewContext } from "../context/viewContext";

export default function Messages() {
  const [activeUser, setActiveUser] = useState(null);
  const { view, setView } = useViewContext();
  const { user } = useAuth();

  const handleUserSelect = (user) => {
    setActiveUser(user);
    setView("chat");
  };

  const handleBackToUsers = () => {
    setView("users");
  };

  return (
    <div className="flex h-screen bg-[var(--black)] text-gray-100 ">
      {/* User List - Always visible on desktop, conditional on mobile */}
      <div
        className={`
        ${view === "users" ? "block" : "hidden"}
        md:block w-full md:w-90 md:border-r border-gray-700 bg-[var(--black)] overflow-hidden 
      `}
      >
        <div className="px-4 pt-4 pb-1 ">
          <div className="flex items-center justify-between ">
            <section className="text-3xl font-bold flex items-center justify-between gap-2 w-full">
              <p className="sifonn">
                con<span className="text-[var(--primary)]">next</span>
              </p>

              <img
                src="/connext(1).png"
                alt="logo"
                width={33}
                className="relative translate-y-1"
              />
            </section>
            {view === "chat" && (
              <button
                onClick={handleBackToUsers}
                className="md:hidden p-2 hover:bg-gray-800 rounded-full"
              >
                <FiUsers className="text-gray-400" />
              </button>
            )}
          </div>
        </div>
        <UserList
          onSelectUser={handleUserSelect}
          currentUserId={user?.uid}
          receiver_id={activeUser}
          setActiveTab={setView}
        />
      </div>

      {/* Chat Window - Always visible on desktop, conditional on mobile */}
      <div
        className={`
        ${view === "chat" ? "block" : "hidden"}
        md:block flex-1 flex flex-col 
        
      `}
      >
        {activeUser ? (
          <>
            <ChatWindow
              sender_id={user?.uid}
              receiver={activeUser}
              onBack={handleBackToUsers}
              setActiveTab={handleBackToUsers}
            />
          </>
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
