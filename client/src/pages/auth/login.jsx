import { useState } from "react";
import { HiOutlineXCircle } from "react-icons/hi";
import { useAuth } from "../../context/authContext";
import {
  FiUser,
  FiLock,
  FiLogIn,
  FiGlobe,
  FiArrowRight,
  FiEye,
  FiEyeOff,
  FiX,
} from "react-icons/fi";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { Link, useNavigate } from "react-router-dom";
import FormFooter from "../../components/FormFooter";

export default function Login() {
  const navigate = useNavigate();
  const [data, setData] = useState({
    username: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading, message } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setData((userData) => ({ ...userData, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(data);
    if (success) {
      navigate("/me"); // only navigate on success
    }
  };

  return (
    <div className="__login__    min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <header className="relative w-full flex items-end justify-end">
            <img
              src="/connext.png"
              alt="logo"
              width={130}
              height={100}
              className="rounded-full"
            />
          </header>

          <div className="text-start mb-10">
            <h1 className="text-5xl text-slate-200 abode">Login</h1>
            <p className="text-slate-500 mt-2 text-sm md:text-base">
              Sign in to your Connext account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiUser className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  name="username"
                  type="text"
                  value={data.username}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-3 py-3 text-white text-sm md:text-base shadow-[inset_0_4px_6px_rgba(0,0,0,0.1)]  border-b-2 border-[var(--secondary)]/40 rounded-xl focus:outline-none  transition placeholder:text-slate-600 "
                  placeholder="Username"
                />
              </div>
            </div>

            <div>
              <div className="space-y-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    name="password"
                    type={!showPassword ? "password" : "text"}
                    value={data.password}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-8 py-3 text-white text-sm md:text-base shadow-[inset_0_4px_6px_rgba(0,0,0,0.1)] border-b-2 border-[var(--secondary)]/40 rounded-xl  focus:outline-none  transition placeholder:text-slate-600"
                    placeholder="Password"
                  />
                  <div
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 -translate-x-2 -translate-y-7 text-slate-500"
                  >
                    {showPassword ? <FiEye /> : <FiEyeOff />}
                  </div>
                </div>
              </div>

              <div className="flex justify-end items-end pt-2">
                <a
                  href="#"
                  className="text-slate-500 hover:text-slate-700 transition text-xs md:text-base"
                >
                  Forgot password?
                </a>
              </div>
              {message && (
                <div
                  className={`absolute rounded-lg text-xs -translate-y-4
                    text-red-400 flex gap-1 items-center
                `}
                >
                  <HiOutlineXCircle className="translate-y-[1px]" />
                  {message}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={
                loading || Object.values(data).some((values) => !values)
              }
              className="w-full text-sm cursor-pointer md:text-base flex items-center justify-center gap-2 py-3.5 px-4 bg-[var(--primary)] hover:bg-[var(--primary)]/80 text-white font-medium rounded-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-slate-600  focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <>
                  <AiOutlineLoading3Quarters className="w-4 h-4 animate-spin" />
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <FiArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-[var(--black)] text-slate-500 text-xs md:text-base">
                  New Here?
                </span>
              </div>
            </div>

            <Link
              to="/register"
              className="w-full text-sm md:text-base flex items-center justify-center gap-2 py-3.5 px-4 border-2 border-white/2 shadow-xl hover:border-white/6 text-white font-medium rounded-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-white/6 focus:border-transparent group"
            >
              <FiUser className="w-4 h-4 text-white " />
              <span>Create new account</span>
            </Link>

            <FormFooter />
          </form>
        </div>
      </div>
    </div>
  );
}
