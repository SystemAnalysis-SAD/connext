import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/auth/login";
import Register from "./pages/auth/register";
import Messages from "./pages/messages";
import LoadingScreen from "./components/loadingScreen";
import Layout from "./pages/layout";
import Protected from "./pages/auth/protected";
import Public from "./pages/auth/public";
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoadingScreen />} />
        <Route
          path="/login"
          element={
            <Public>
              <Login />
            </Public>
          }
        />
        <Route path="/register" element={<Register />} />
        <Route
          path="/me"
          element={
            <Protected>
              <Layout />
            </Protected>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
