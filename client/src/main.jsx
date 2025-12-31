import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./context/authContext.jsx";
import { ViewContextProvider } from "./context/viewContext.jsx";

// FIRST PUSH JAN 1, 2026 IN THE PHILIPPINES:)
createRoot(document.getElementById("root")).render(
  <ViewContextProvider>
    <AuthProvider>
      <App />
    </AuthProvider>
  </ViewContextProvider>
);
