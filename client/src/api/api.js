import axios from "axios";
import { API_URL } from "../config/config";

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

let isRefreshing = false;
let queue = [];

// Process queued requests after refresh
const resolveQueue = (error = null) => {
  queue.forEach(({ resolve, reject }) => {
    error ? reject(error) : resolve();
  });
  queue = [];
};

// Request logging (optional)
api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    if (!response) return Promise.reject(error);

    if (config.url === "/api/refresh") return Promise.reject(error);

    if (response.status === 401 && !config._retry) {
      config._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) =>
          queue.push({ resolve, reject })
        ).then(() => api(config));
      }

      isRefreshing = true;
      try {
        await api.post(
          "/api/refresh",
          {},
          {
            withCredentials: true,
            headers: {
              "X-CSRF-TOKEN": getCSRFToken("csrf_refresh_token"),
            },
          }
        );

        // Wait 50ms to let browser update cookies
        await new Promise((res) => setTimeout(res, 50));

        resolveQueue();
        return api(config);
      } catch (refreshError) {
        resolveQueue(refreshError);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Check authentication status
export const checkAuthStatus = async () => {
  try {
    const res = await api.get("/api/profile");
    return { authenticated: true, user: res.data };
  } catch {
    return { authenticated: false, user: null };
  }
};

export default api;
