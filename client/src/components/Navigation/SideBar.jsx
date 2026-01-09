import {
  RiMessage3Line,
  RiHome3Line,
  RiSettings3Line,
  RiSearch2Line,
  RiHeart3Line,
} from "react-icons/ri";
import { useAuth } from "../../context/authContext";

export default function SideBar() {
  const { user } = useAuth();
  return (
    <div className="max-w-64 px-3 w-18  pt-10  hidden md:block bg-[var(--black)] border-1 border-r-white/10 border-transparent">
      <div className="flex flex-col justify-between h-[calc(100%-18px)]">
        <section>
          <span className="w-full flex items-center justify-center">
            <img
              src="/connext(1).png"
              alt="profile"
              className="w-6 brightness-0 invert"
            />
          </span>
          <section className="flex flex-col gap-2 items-center pt-13">
            <span>
              <RiHome3Line className="text-5xl text-white p-3 cursor-pointer hover:bg-black/30 transition-all duration-300 rounded-lg" />
            </span>
            <span>
              <RiSearch2Line className="text-5xl text-white p-3 cursor-pointer hover:bg-black/30 transition-all duration-300 rounded-lg" />
            </span>
            <span>
              <RiMessage3Line className="text-5xl text-white p-3 cursor-pointer hover:bg-black/30 transition-all duration-300 rounded-lg" />
            </span>

            <span>
              <RiHeart3Line className="text-5xl text-white p-3 cursor-pointer hover:bg-black/30 transition-all duration-300 rounded-lg" />
            </span>

            <span className="rounded-lg hover:bg-black/30 transition-all duration-300 p-3 cursor-pointer">
              <img
                src={user.profile_picture_url}
                alt="pf"
                className="w-6 rounded-full  "
              />
            </span>
          </section>
        </section>

        <span>
          <RiSettings3Line className="text-5xl text-white p-3 cursor-pointer hover:bg-black/30 transition-all duration-300 rounded-lg" />
        </span>
      </div>
    </div>
  );
}
