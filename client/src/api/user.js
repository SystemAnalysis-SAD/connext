import api from "./api";

export const UpdateAvatar = async (avatar_url) => {
  try {
    const res = await api.post(
      "/user/avatar",
      { avatar_url },
      { withCredentials: true } // <-- only this is enough
    );
    return res.data;
  } catch (err) {
    console.error("Failed to update avatar:", err.response?.data || err);
    throw err;
  }
};
