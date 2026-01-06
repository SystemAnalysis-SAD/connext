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
import NavSettings from "../../components/Navigation/Nav_Settings";
import { useAuth } from "../../context/authContext";
import AvatarOption from "../../components/Avatar/AvatarOptions";

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("posts");
  const [isOpen, setIsOpen] = useState(false);
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

  const accountAge = () => {
    const accountCreated = new Date().toISOString(user?.date_created);
    const newDate = new Date(accountCreated);
    const date = new Date();
    const diffMS = date - newDate;
    const diffDays = Math.floor(diffMS / (1000 * 60 * 60 * 24));

    return `${diffDays}`;
  };

  return (
    <div className="min-h-screen bg-[var(--black)] text-white">
      <NavSettings />

      <div className="w-full ">
        {/* Profile Header */}
        <div className="flex flex-col gap-5 mb-8">
          {/* Profile Image */}
          <div className="w-full flex justify-center">
            <div className="relative w-full bg-black/20 h-30 rounded-b-xl">
              <div className="relative w-17 h-17 -bottom-20 pl-4">
                <div
                  onClick={() => setIsOpen((prev) => !prev)}
                  className="w-17 h-17 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 p-1 cursor-pointer"
                >
                  <div className="w-15 h-15 rounded-full overflow-hidden bg-black">
                    <img
                      src={user.profile_picture_url || "/default-avatar.png"}
                      alt="Profile"
                      className="w-15 h-15 object-cover"
                    />
                  </div>
                </div>

                {/* Render dropdown absolutely relative to avatar */}
                {isOpen && (
                  <div className="absolute top-full left-0 mt-2 z-50">
                    <AvatarOption />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Profile Info */}
          <div className="w-full space-y-2 mx-auto px-4 pb-8 pt-3">
            {/* Username & Actions */}
            <div className="flex items-center gap-4 mb-4">
              <h1 className="text-lg font-bold">
                {user?.first_name}&nbsp;{user?.last_name}
                <p className="font-normal text-sm">@{user?.username}</p>
              </h1>
            </div>

            {/* Stats */}
            <div className="flex gap-8 mb-4 w-full">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-sm font-bold">{stat.value}</div>
                  <div className="text-xs text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Bio */}
            <div className="space-y-8">
              <p className="text-gray-400">{user?.bio}</p>

              <div className="flex flex-wrap gap-3 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>San Francisco, CA</span>
                </div>
                <div className="flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" />
                  <a
                    href="_facebooklink"
                    className="text-[var(--primary)] hover:underline"
                  >
                    {user?.username}.me
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{accountAge()}</span>
                </div>
              </div>

              {/* Followers Preview */}
              <div className="flex items-center gap-2 mt-4 w-full">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
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
        <div className="border-b border-white/10 mb-6 mx-3">
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
