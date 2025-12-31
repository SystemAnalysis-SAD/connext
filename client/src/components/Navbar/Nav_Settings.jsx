import { useAuth } from "../../context/authContext";
import { FiMenu } from "react-icons/fi";

export default function NavSettings() {
  const { user } = useAuth();
  return (
    <nav>
      <section className="__nav_settings__ w-full ">
        <img src="/connext(1).png" alt="logo" />
        <h1>{user.username}</h1>
        <menu>FiMenu</menu>
      </section>
    </nav>
  );
}
