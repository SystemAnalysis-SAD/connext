import NavMobile from "../components/Navbar/Nav_mobile";
import { useViewContext } from "../context/viewContext";
import Messages from "./messages";
import ProfilePage from "./profile/profile";
import ProfileSettings from "./profile/profile";
import Profile from "./profile/profile";

export default function Layout() {
  const { view } = useViewContext();

  return (
    <div className="h-screen flex flex-col">
      {/* Main Views */}
      <div className="flex-1 relative">
        {["messages", "chat"].includes(view) && <Messages />}
        {view === "profile" && <ProfilePage />}
      </div>

      {/* Mobile Navbar */}
      <div
        className={`w-full flex items-center justify-center relative  ${
          view === "chat" ? "z-0" : "z-50"
        }`}
      >
        <NavMobile />
      </div>
    </div>
  );
}
