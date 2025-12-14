import axios from "axios";
import { API_URL } from "../config/config";
import { useState, useEffect, createContext, useContext } from "react";
import api from "../api/api";
import Cookies from "js-cookie";
import LoadingScreen from "../components/loadingScreen";

const authContext = createContext();

// Custom hook to use auth context
export const useAuth = () => useContext(authContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Start as true for initial check
  const [message, setMessage] = useState("");

  // Helper: show a message temporarily
  const showMessage = (msg, duration = 3000) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), duration);
  };

  // Fetch user from cookie and verify with backend
  const fetchUserProfile = async () => {
    try {
      const cookie = Cookies.get("_u");
      console.log(cookie);
      if (!cookie) {
        setUser(null);
        return;
      }

      const parsed = JSON.parse(decodeURIComponent(cookie));
      setUser(parsed.uid);

      localStorage.setItem("token", Cookies.get("token"));
    } catch (err) {
      console.error(err);
      setUser(null);
      Cookies.remove("_u");
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

      if (response.data.message) {
        showMessage("Login successful!");
        // Force check the cookie immediately after login
        const cookie = Cookies.get("_u");
        if (cookie) {
          try {
            const decode = decodeURIComponent(decodeURIComponent(cookie));
            const parse = JSON.parse(decode);
            setUser(parse?.uid);
            console.log(parse?.uid);
            await fetchUserProfile(); // Fallback to API call
          } catch (err) {
            console.error("Error parsing cookie after login:", err);
          }
        }
      }
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
      const response = await api.post(`${API_URL}/api/register`, registerData, {
        headers: { "Content-Type": "application/json" },
      });

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
