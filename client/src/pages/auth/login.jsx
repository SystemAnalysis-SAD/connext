import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/authContext";

export default function Login() {
  const iframeRef = useRef();
  const { setUser } = useAuth(); // make sure you can set the user in context
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [data, setData] = useState({ username: "", password: "" });

  // Listen for iframe messages
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.success) {
        setMessage("Login successful!");
        setUser(true); // fetch profile if needed
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [setUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("username", data.username);
      formData.append("password", data.password);

      // Send login to iframe
      await fetch("https://connext-aj4o.onrender.com/login-iframe", {
        method: "POST",
        body: formData,
        credentials: "include", // very important for cookies
      });
    } catch (err) {
      console.error(err);
      setMessage("Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="__login__ min-h-screen flex flex-col items-center justify-center">
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="username"
          value={data.username}
          onChange={handleChange}
          placeholder="Username"
          required
        />
        <input
          type="password"
          name="password"
          value={data.password}
          onChange={handleChange}
          placeholder="Password"
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      {message && <p>{message}</p>}

      {/* Hidden iframe to set cookies for iOS */}
      <iframe
        ref={iframeRef}
        src="https://connext-aj4o.onrender.com/login-iframe"
        style={{ display: "none" }}
        title="login-iframe"
      />
    </div>
  );
}
