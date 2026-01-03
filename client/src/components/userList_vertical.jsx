import { useEffect, useState } from "react";
import api from "../api/api";

export default function UserListVertical({ onSelectUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        const all_users = await api.get("connext_users");
        setUsers(all_users.data);
      } catch (err) {
        console.error("Cannot fetch: ", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllUsers();
  }, []);

  return (
    <div className="flex items-center ml-3 mb-5 pr-7 gap-4 w-full overflow-x-auto scrollbar-none">
      {loading
        ? Array.from({ length: 8 }).map((_, i) => (
            <section
              key={i}
              className="flex flex-col items-center justify-center gap-2 animate-pulse"
            >
              <div className="w-16 h-16 rounded-full bg-white/10" />
              <div className="h-3 w-14 rounded bg-white/10" />
            </section>
          ))
        : users.map((u) => (
            <section
              key={u?.uid}
              className="flex flex-col items-center justify-center text-center gap-1 cursor-pointer"
              onClick={() => onSelectUser(u)}
            >
              <img
                src={u.profile_picture_url}
                alt="profile"
                className="w-16 h-16 rounded-full"
              />
              <p className="text-xs w-16 truncate whitespace-nowrap">
                {u.first_name}&nbsp;{u.last_name}
              </p>
            </section>
          ))}
    </div>
  );
}
