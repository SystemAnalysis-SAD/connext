import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/auth/login";
import Register from "./pages/auth/register";
import Messages from "./pages/messages";
import LoadingScreen from "./components/loadingScreen";
import Layout from "./pages/layout";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoadingScreen />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/me" element={<Layout />} />
      </Routes>
    </Router>
  );
}

export default App;
