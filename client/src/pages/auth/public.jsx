import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../../api/api";
import LoadingScreen from "../../components/loadingScreen";

const Public = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    api
      .get("/auth/verify")
      .then(() => setAuthorized(true))
      .catch(() => setAuthorized(false))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingScreen />;

  if (authorized) {
    return <Navigate to="/me" replace />;
  }

  return children;
};

export default Public;
