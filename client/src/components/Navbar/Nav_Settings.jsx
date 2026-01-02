import { useAuth } from "../../context/authContext";
import { FiMenu } from "react-icons/fi";
import {
  Bell,
  Search,
  Plus,
  MessageCircle,
  Home,
  User,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function NavSettings() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = async () => {
    await logout();
    if (!loading) {
      navigate("/login");
    }
  };

  return (
    <nav className="sticky top-0 z-50">
      <section className="__nav_settings__ w-full bg-gradient-to-b from-[var(--black)] to-black/2 backdrop-blur-2xl border-b border-white/5 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo Section */}
            <div className="flex items-center gap-3">
              <img src="/connext(1).png" alt="logo" className="h-6 w-auto" />
            </div>

            {/* Icons Menu */}
            <div className="flex items-center gap-2">
              {/* User Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-3 ml-2 p-1.5 rounded-xl hover:bg-white/10 transition-colors group"
                >
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--primary)] to-purple-600 flex items-center justify-center text-white font-semibold overflow-hidden">
                      {user?.first_name?.[0] || user?.username?.[0] || "U"}
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[var(--black)]"></div>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                </button>

                {/* Dropdown Menu */}
                {showDropdown && (
                  <>
                    <div
                      className="fixed right-0 mt-2 w-64 
bg-black/50 backdrop-blur-2l
border border-white/10 
rounded-2xl shadow-2xl overflow-hidden z-50"
                    >
                      <div className="p-4 border-b border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--primary)] to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
                            {user?.first_name?.[0] ||
                              user?.username?.[0] ||
                              "U"}
                          </div>
                          <div>
                            <div className="font-semibold">
                              {user?.first_name || user?.username || "User"}
                            </div>
                            <div className="text-sm text-gray-400">
                              {user?.email}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="py-2">
                        <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left">
                          <User className="w-4 h-4" />
                          <span>View Profile</span>
                        </button>
                        <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left">
                          <Settings className="w-4 h-4" />
                          <span>Settings</span>
                        </button>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          <span className="text-red-400">Log Out</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </nav>
  );
}
