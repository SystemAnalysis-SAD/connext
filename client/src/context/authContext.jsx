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

  /* =========================
     INITIAL AUTH CHECK
  ========================= */
  useEffect(() => {
    const storedUser = localStorage.getItem("_u");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("_u");
        localStorage.removeItem("token");
      }
    }
    setLoading(false);
  }, []);

  /* =========================
     SOCKET LIFECYCLE
  ========================= */
  useEffect(() => {
    if (user) {
      const token = localStorage.getItem("token");
      if (token) connectSocket(token);
    } else {
      disconnectSocket();
    }
  }, [user]);

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
    setMessage("");

    try {
      const res = await api.post(`${API_URL}/api/login`, loginData);
      const { token, user } = res.data;

      if (!token || !user) throw new Error("Invalid login response");

      localStorage.setItem("token", token);
      localStorage.setItem("_u", JSON.stringify(user));

      setUser(user); // 🔥 triggers socket connect
      showMessage("Login successful!");
    } catch (err) {
      showMessage(err?.response?.data?.err || "Login failed");
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
      {loading && <LoadingScreen />}
      {children}
    </authContext.Provider>
  );
};
