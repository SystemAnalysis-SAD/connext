import { createContext, useContext, useState, useEffect } from "react";
import api, { checkAuthStatus } from "../api/api";
import { connectSocket, disconnectSocket } from "../socket";
import LoadingScreen from "../components/loadingScreen";
import { redirect } from "react-router-dom";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true); // initial loading
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      const status = await checkAuthStatus();
      if (status.authenticated) setUser(status.user);
      setBooting(false);
    };
    restoreSession();
  }, []);

  // Socket lifecycle
  useEffect(() => {
    if (user) connectSocket();
    else disconnectSocket();
  }, [user]);

  // Helpers
  const showMessage = (msg, duration = 3000) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), duration);
  };

  // Login
  const login = async (credentials) => {
    setLoading(true);
    try {
      await api.post("/api/login", credentials);
      const profile = await api.get("/api/profile");
      setUser(profile.data);
      return true; // login succeeded
    } catch (err) {
      showMessage(err.response.data.err || "Invalid credentials");
      return false; // login failed
    } finally {
      setLoading(false);
    }
  };

  // Register
  const register = async (data) => {
    setLoading(true);
    try {
      const res = await api.post("/api/register", data);
      showMessage(res.data?.message || "Registration successful");
    } catch (err) {
      showMessage(err?.response?.data?.err || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    setLoading(true);
    try {
      await api.post("/api/logout");
    } catch (_) {}
    setUser(null);
    setLoading(false);
  };

  const value = { user, setUser, login, register, logout, loading, message };

  if (booting) return <LoadingScreen />;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
