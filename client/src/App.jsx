import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/auth/login";
import Register from "./pages/auth/register";
import Messages from "./pages/messages";
import { useAuth } from "./context/authContext";
import LoadingScreen from "./components/loadingScreen";

function App() {
  const { user } = useAuth();
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoadingScreen />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/messages" element={<Messages id={user} />} />
      </Routes>
    </Router>
  );
}

export default App;
