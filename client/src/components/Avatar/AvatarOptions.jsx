import { useAuth } from "../../context/authContext";
import UploadAvatar from "./AvatarUpload";

export default function AvatarOption() {
  const { user } = useAuth();
  return (
    <div className="p-4 w-fit bg-black/50">
      <UploadAvatar uid={user.uid} />
    </div>
  );
}
