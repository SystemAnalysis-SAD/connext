import axios from "axios";
import { API_URL } from "../config/config";
import { useState, useEffect, createContext, useContext } from "react";
import api from "../api/api";
import { connectSocket, disconnectSocket } from "../socket";
import LoadingScreen from "../components/loadingScreen";

const authContext = createContext();
export const useAuth = () => useContext(authContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  /* =========================
     INITIAL AUTH CHECK
  ========================= */
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/api/profile", { withCredentials: true });
        setUser(res.data);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  /* =========================
     SOCKET LIFECYCLE
  ========================= */
  useEffect(() => {
    if (user && !loading) {
      connectSocket();
    } else {
      disconnectSocket();
    }
  }, [user, loading]);

  /* =========================
     HELPERS
  ========================= */
  const showMessage = (msg, duration = 3000) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), duration);
  };

  /* =========================
     LOGIN
  ========================= */
  const login = async (loginData) => {
    setLoading(true);
    try {
      await api.post(`${API_URL}/api/login`, loginData, {
        withCredentials: true,
      });
      // Fetch user profile after login
      const profileRes = await api.get(`${API_URL}/api/profile`, {
        withCredentials: true,
      });
      setUser(profileRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     REGISTER
  ========================= */
  const register = async (registerData) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/register`, registerData, {
        headers: { "Content-Type": "application/json" },
      });

      if (res.data?.message?.includes("success")) {
        showMessage("Registered successfully. Please login.");
      } else {
        showMessage(res.data?.err || "Registration failed");
      }
    } catch (err) {
      showMessage(err?.response?.data?.err || "Registration error");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     LOGOUT
  ========================= */
  const logout = async () => {
    setLoading(true);
    try {
      await api.post(`${API_URL}/api/logout`);
    } catch (_) {}

    localStorage.removeItem("token");
    localStorage.removeItem("_u");
    setUser(null); // 🔥 triggers socket disconnect
    showMessage("Logged out successfully");
    setLoading(false);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    message,
  };

  return (
    <authContext.Provider value={value}>
      {loading ? <LoadingScreen /> : children}
    </authContext.Provider>
  );
};
