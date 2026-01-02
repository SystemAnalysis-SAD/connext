import { useState } from "react";
import {
  User,
  Mail,
  Calendar,
  MapPin,
  Link as LinkIcon,
  Edit2,
  Grid3x3,
  Bookmark,
  Tag,
  Heart,
  MessageCircle,
  Send,
  MoreVertical,
  Settings,
  Camera,
  Users,
  Image,
  Video,
  Music,
  Plus,
  CheckCircle,
} from "lucide-react";
import NavSettings from "../../components/Navbar/Nav_Settings";
import { useAuth } from "../../context/authContext";

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("posts");
  const [isFollowing, setIsFollowing] = useState(false);
  const { user } = useAuth();

  const tabs = [
    { id: "posts", label: "Posts", icon: Grid3x3 },
    { id: "reels", label: "Reels", icon: Video },
    { id: "saved", label: "Saved", icon: Bookmark },
  ];

  const stats = [
    { label: "Posts", value: "142" },
    { label: "Followers", value: "15.8K" },
    { label: "Following", value: "284" },
  ];

  return (
    <div className="min-h-screen bg-[var(--black)] text-white">
      <NavSettings />

      <div className="w-full mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="flex flex-row gap-8 mb-8">
          {/* Profile Image */}
          <div className="md:w-1/3 flex justify-center">
            <div className="relative">
              <div className="w-22 h-22 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 p-1">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-black">
                  <img
                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=John&background=000000"
                    alt="Profile"
                    className="w-20 object-cover"
                  />
                </div>
              </div>
              <button className="absolute bottom-2 right-2 w-10 h-10 bg-[var(--primary)] rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                <Camera className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Profile Info */}
          <div className="md:w-2/3 space-y-4">
            {/* Username & Actions */}
            <div className="flex items-center gap-4 mb-4">
              <h1 className="text-2xl font-bold">{user.username}</h1>
            </div>

            {/* Stats */}
            <div className="flex gap-8 mb-4">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-xl font-bold">{stat.value}</div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <h2 className="font-bold">John Doe</h2>
              <p className="text-gray-300">
                Digital Creator • Photographer • Tech Enthusiast
              </p>
              <p className="text-gray-400">
                Building the future one pixel at a time ✨
              </p>

              <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>San Francisco, CA</span>
                </div>
                <div className="flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" />
                  <a href="#" className="text-[var(--primary)] hover:underline">
                    johndoe.me
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Joined March 2023</span>
                </div>
              </div>

              {/* Followers Preview */}
              <div className="flex items-center gap-2 mt-4">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 border border-[var(--black)]"
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-400">
                  Followed by <span className="text-white">sarahjane</span>,{" "}
                  <span className="text-white">mikechen</span> + 15 others
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-white/10 mb-6">
          <div className="flex gap-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? "border-[var(--primary)] text-[var(--primary)]"
                      : "border-transparent text-gray-400 hover:text-white"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Create Post Button */}
        <button className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-br from-[var(--primary)] to-purple-600 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-2xl">
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
