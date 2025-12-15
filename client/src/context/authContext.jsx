import axios from "axios";
import { API_URL } from "../config/config";
import { useState, useEffect, createContext, useContext } from "react";
import api from "../api/api";
import { connectSocket } from "../socket";
import Cookies from "js-cookie";
import LoadingScreen from "../components/loadingScreen";

const authContext = createContext();

// Custom hook to use auth context
export const useAuth = () => useContext(authContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Start as true for initial check
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("_u");

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        connectSocket(token); // auto-connect socket with JWT
      } catch (err) {
        console.error("Error parsing stored user:", err);
        localStorage.removeItem("_u");
        localStorage.removeItem("token");
      }
    }
  }, []); // runs once on mount

  // Helper: show a message temporarily
  const showMessage = (msg, duration = 3000) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), duration);
  };

  // Fetch user from cookie and verify with backend
  const fetchUserProfile = async () => {
    try {
      const res = await api.get(`${API_URL}/api/profile`);
    } catch (decodeError) {
      console.error("Error decoding cookie:", decodeError);
      setUser(null);
      Cookies.remove("_u"); // Remove invalid cookie
    }
  };

  // Check authentication on initial app load
  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      await fetchUserProfile();
      setLoading(false);
    };

    checkAuth();
  }, []); // Empty array = runs once on mount

  // Login function - updated to handle cookie immediately
  const login = async (loginData) => {
    setLoading(true);
    setMessage("");

    try {
      const response = await api.post(`${API_URL}/api/login`, loginData);

      const { token, user } = response.data;

      if (!token || !user) {
        throw new Error("Invalid login response");
      }

      localStorage.setItem("_u", JSON.stringify(user));
      localStorage.setItem("token", token);

      // ✅ Update state
      setUser(user);

      // ✅ CONNECT SOCKET WITH JWT
      connectSocket(localStorage.getItem("token"));
      await fetchUserProfile();

      showMessage("Login successful!");
    } catch (err) {
      showMessage(err?.response?.data?.err || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // Register function - unchanged
  const register = async (registerData) => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/register`,
        registerData,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.data.message?.includes("success")) {
        showMessage("Registered Successfully! Please login.");
      } else {
        showMessage(response?.data?.err);
      }
    } catch (err) {
      showMessage(err?.response?.data?.err);
    } finally {
      setLoading(false);
    }
  };

  // Add logout function
  const logout = async () => {
    setLoading(true);
    try {
      await api.post(`${API_URL}/api/logout`);
      Cookies.remove("_u");
      setUser(null);
      showMessage("Logged out successfully");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    message,
  };

  // Optional: Show loading state while checking auth
  if (loading) {
    return <LoadingScreen />;
  }

  return <authContext.Provider value={value}>{children}</authContext.Provider>;
};
