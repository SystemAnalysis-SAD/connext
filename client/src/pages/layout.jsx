import NavMobile from "../components/Navbar/Nav_mobile";
import { useViewContext } from "../context/viewContext";
import Messages from "./messages";

export default function Layout() {
  const { view, setView } = useViewContext();

  return (
    <div>
      <Messages />
      <div className="w-full flex items-center justify-center">
        <NavMobile />
      </div>
    </div>
  );
}
