import NavMobile from "../components/Navbar/Nav_mobile";
import SideBar from "../components/Navbar/SideBar";
import { useViewContext } from "../context/viewContext";
import Messages from "./messages";
import ProfilePage from "./profile/profile";

export default function Layout() {
  const { view } = useViewContext();

  return (
    <>
      <div className="flex w-full">
        <SideBar />
        <div className="h-screen flex flex-col flex-1">
          <div className="flex-1 relative overflow-hidden">
            <div
              className={`absolute inset-0 transition-opacity ${
                view === "profile" ? "hidden" : "block"
              }`}
            >
              <Messages />
            </div>
            <div
              className={`absolute inset-0 transition-opacity ${
                view === "profile" ? "block" : "hidden"
              }`}
            >
              <ProfilePage />
            </div>
          </div>
          <div
            className={`w-full flex items-center justify-center relative ${
              view === "chat" ? "z-0" : "z-50"
            }`}
          >
            <NavMobile />
          </div>
        </div>
      </div>
    </>
  );
}
