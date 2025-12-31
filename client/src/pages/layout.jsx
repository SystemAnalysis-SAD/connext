import NavMobile from "../components/Navbar/Nav_mobile";
import { useViewContext } from "../context/viewContext";
import Messages from "./messages";
import Profile from "./profile/profile";

export default function Layout() {
  const { view } = useViewContext(); // controls main app view: "messages" or "profile"

  return (
    <div className="h-screen flex flex-col">
      {/* Main Views */}
      <div className="flex-1 relative">
        {view === "messages" && <Messages />}
        {view === "profile" && <Profile />}
      </div>

      {/* Mobile Navbar */}
      <div className="w-full flex items-center justify-center relative z-50">
        <NavMobile />
      </div>
    </div>
  );
}
