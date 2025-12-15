import axios from "axios";
import { API_URL } from "../config/config";
import { socket } from "../socket"; // Import your socket instance

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue = [];
let isSocketRefreshPending = false;
let socketRefreshPromise = null;

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// Store socket refresh promise for coordinated refresh
const createSocketRefreshPromise = () => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      console.log("⏰ Socket refresh timeout - falling back to HTTP");
      reject(new Error("Socket refresh timeout"));
    }, 3000); // Wait 3 seconds for socket refresh

    const handleSocketRefresh = (data) => {
      console.log("🔄 Socket token refresh received");
      clearTimeout(timeout);
      socket.off("token_refreshed", handleSocketRefresh);
      resolve(data);
    };

    socket.on("token_refreshed", handleSocketRefresh);
  });
};

// Request interceptor to log requests
api.interceptors.request.use(
  (config) => {
    // Skip logging for socket.io requests
    if (!config.url.includes("socket.io")) {
      console.log(`📤 [${config.method?.toUpperCase()}] ${config.url}`);
    }
    return config;
  },
  (error) => {
    console.error("❌ Request error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor with socket-based refresh fallback
api.interceptors.response.use(
  (response) => {
    if (!response.config.url.includes("socket.io")) {
      console.log(`✅ [${response.status}] ${response.config.url}`);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Skip logging for socket.io requests
    if (!originalRequest?.url?.includes("socket.io")) {
      console.log(
        `❌ Error [${error.response?.status}] ${originalRequest?.url}`
      );
      console.log("Error details:", error.response?.data);
    }

    // Skip refresh logic for the refresh endpoint itself
    if (originalRequest.url === "/api/refresh") {
      console.log("⚠️ HTTP Refresh endpoint failed, trying socket refresh...");

      // Try socket-based refresh as last resort
      try {
        const currentUserId = localStorage.getItem("currentUserId");
        if (currentUserId && socket.connected) {
          console.log("🔄 Requesting socket refresh...");
          socket.emit("request_token_refresh", { user_id: currentUserId });

          // Wait for socket response
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch (socketErr) {
        console.log("❌ Socket refresh also failed");
      }

      // Final fallback: redirect to login
      localStorage.removeItem("_u");
      localStorage.removeItem("currentUserId");
      if (window.location.pathname !== "/#/login") {
        window.location.href = "/#/login";
      }
      return Promise.reject(error);
    }

    // If 401 and not a retry attempt
    if (error.response?.status === 401 && !originalRequest._retry) {
      console.log("🔄 Token expired, attempting refresh...");

      // Check if this is a token expiration error
      const isTokenExpired =
        error.response?.data?.msg?.includes("expired") ||
        error.response?.data?.msg?.includes("Token");

      if (isTokenExpired && socket.connected) {
        console.log("🔄 Token expired, waiting for socket auto-refresh...");

        // Wait for socket auto-refresh (if enabled)
        try {
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              console.log("⏰ Socket refresh wait timeout");
              reject(new Error("Socket refresh timeout"));
            }, 3000); // Wait 3 seconds for socket refresh

            const handleSocketRefresh = () => {
              console.log("✅ Socket refresh detected, retrying request");
              clearTimeout(timeout);
              socket.off("token_refreshed", handleSocketRefresh);
              resolve();
            };

            socket.once("token_refreshed", handleSocketRefresh);
          });

          // Socket refresh happened, retry the request
          console.log(
            `🔄 Retrying after socket refresh: ${originalRequest.url}`
          );
          return api(originalRequest);
        } catch (waitError) {
          console.log("⏰ Socket refresh wait failed, falling back to HTTP");
          // Continue to HTTP refresh
        }
      }

      // If already refreshing, queue this request
      if (isRefreshing) {
        console.log("⏳ Already refreshing, queueing request");
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            console.log("🔄 Retrying queued request:", originalRequest.url);
            return api(originalRequest);
          })
          .catch((err) => {
            console.log("❌ Failed queued request:", err);
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        console.log("🔄 Calling HTTP /api/refresh...");
        const refreshResponse = await api.post("/api/refresh");
        console.log("✅ HTTP Refresh successful!");

        // Process all queued requests
        processQueue(null);

        // Retry the original request
        console.log(`🔄 Retrying original request: ${originalRequest.url}`);
        return api(originalRequest);
      } catch (refreshError) {
        console.log(
          "❌ HTTP Refresh failed:",
          refreshError.response?.status,
          refreshError.response?.data
        );

        // Process queue with error
        processQueue(refreshError, null);

        // Try one last socket refresh attempt
        try {
          const currentUserId = localStorage.getItem("currentUserId");
          if (currentUserId && socket.connected) {
            console.log("🔄 Last attempt: requesting socket refresh...");
            socket.emit("request_token_refresh", { user_id: currentUserId });

            // Wait a bit for socket response
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // Try the request one more time
            return api(originalRequest);
          }
        } catch (socketErr) {
          console.log("❌ Final socket attempt failed");
        }

        // Final fallback: clear data and redirect
        localStorage.removeItem("_u");
        localStorage.removeItem("currentUserId");
        if (window.location.pathname !== "/#/login") {
          console.log("🔀 Redirecting to login...");
          window.location.href = "/#/login";
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle 404 specifically for profile endpoint
    if (
      error.response?.status === 404 &&
      originalRequest.url === "/api/profile"
    ) {
      console.log("👤 Profile not found, checking auth state...");

      // Try to refresh token if it might be a token issue
      if (error.response?.data?.err === "User not found") {
        console.log(
          "🔄 User not found - might be token issue, trying refresh..."
        );

        // Clear auth data and redirect to login
        localStorage.removeItem("_u");
        localStorage.removeItem("currentUserId");
        window.location.href = "/#/login";
      }
    }

    return Promise.reject(error);
  }
);

// Export helper function to trigger manual refresh
export const triggerManualRefresh = async () => {
  try {
    console.log("🔄 Manual refresh triggered");
    const response = await api.post("/api/refresh");
    console.log("✅ Manual refresh successful");
    return response.data;
  } catch (error) {
    console.log("❌ Manual refresh failed:", error.response?.data);
    throw error;
  }
};

// Export helper to check auth status
export const checkAuthStatus = async () => {
  try {
    const response = await api.get("/api/profile");
    return { isAuthenticated: true, user: response.data };
  } catch (error) {
    return { isAuthenticated: false, error: error.response?.data };
  }
};

export default api;
