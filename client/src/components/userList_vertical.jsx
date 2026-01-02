import { useEffect, useState } from "react";
import api from "../api/api";
import { useViewContext } from "../context/viewContext";

export default function UserListVertical({ onSelectUser }) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        const all_users = await api.get("connext_users");
        setUsers(all_users.data);
      } catch (err) {
        console.error("Cannot fetch: ", err);
      }
    };

    fetchAllUsers();
  }, []);

  return (
    <div className="flex items-center ml-3 mb-5 gap-4 w-full overflow-x-auto scrollbar-none ">
      {users.map((u) => (
        <section
          key={u?.uid}
          className="flex flex-col items-center justify-center text-center gap-1"
          onClick={() => onSelectUser(u)}
        >
          <div className="w-16 h-16 rounded-full bg-[var(--black)] border-1 border-white/10 flex items-center justify-center">
            {u.first_name?.[0]}
          </div>
          <p className="text-xs text-wrap truncate whitespace-break-spaces w-16">
            {u.first_name}&nbsp;{u.last_name}
          </p>
        </section>
      ))}
    </div>
  );
}
