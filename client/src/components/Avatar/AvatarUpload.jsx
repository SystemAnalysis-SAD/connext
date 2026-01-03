import { useState } from "react";
import { supabase } from "../../supabase/client";
import { UpdateAvatar } from "../../api/user";
import { useAuth } from "../../context/authContext";

export default function UploadAvatar({ uid }) {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  const handleChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    setLoading(true);

    try {
      const path = `${uid}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("Avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("Avatars")
        .getPublicUrl(path);

      // POST to Flask and wait
      const updated = await UpdateAvatar(publicUrlData.publicUrl);

      // Optionally update user context
      setUser((prev) => ({
        ...prev,
        profile_picture_url: updated.profile_picture_url,
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      {preview && (
        <img
          src={preview}
          alt="preview"
          className="w-24 h-24 rounded-full mb-2 object-cover"
        />
      )}
      <input type="file" accept="image/*" onChange={handleChange} />
      {loading && <p className="text-sm text-gray-400">Uploading...</p>}
    </div>
  );
}
