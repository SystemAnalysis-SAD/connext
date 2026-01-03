import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/authContext";
import {
  FiUser,
  FiLock,
  FiMail,
  FiArrowRight,
  FiEye,
  FiEyeOff,
} from "react-icons/fi";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { Link } from "react-router-dom";
import { CgDanger } from "react-icons/cg";
import FormFooter from "../../components/FormFooter";

export default function Register() {
  const [userData, setUserData] = useState({
    first_name: "",
    last_name: "",
    gender: "",
    username: "",
    password: "",
    confirm_password: "",
  });
  const [currPassword, setShowCurrPassword] = useState(false);
  const [confPassword, setShowConfirmPassword] = useState(false);
  const { register, loading, message } = useAuth();
  const passwordInputRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await register(userData);
  };

  const renderGenderSelection = () => {
    const genderOptions = ["Male", "Female", "bbb"];
    return (
      <div className="flex gap-4 mt-2">
        {genderOptions.map((option) => (
          <label
            key={option}
            className={`flex items-center gap-2 mt-3 py-1 px-3 rounded-md w-full border-2 cursor-pointer transition-all duration-200 ${
              userData.gender === option
                ? "bg-[var(--primary)] text-white border-none shadow-[inset_0_4px_6px_rgba(0,0,0,0.6)] " // SELECTED
                : "bg-transparent text-white border-white/2 shadow-xl shadow-black/30 hover:border-[var(--primary)]/60" // NOT SELECTED
            }`}
          >
            <span className="text-sm">{option}</span>
            <input
              type="radio"
              name="gender"
              value={option}
              checked={userData.gender === option}
              onChange={handleChange}
              className="sr-only"
            />
          </label>
        ))}
      </div>
    );
  };

  return (
    <div className="__register__ min-h-screen bg-white flex flex-col">
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
            <h1 className="text-5xl text-slate-200 abode">Register</h1>
            <p className="text-slate-500 mt-2 text-sm md:text-base">
              Create your Connext account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex justify-between w-full gap-6 ">
              <label
                htmlFor="first_name"
                className="absolute -translate-y-3 text-[10px]"
              >
                <span className="text-white ">First name </span>
                <span className="text-[var(--primary)]">*</span>
              </label>
              <div className="relative w-full">
                <input
                  name="first_name"
                  type="text"
                  value={userData.first_name}
                  onChange={handleChange}
                  required
                  className="w-full mt-2 pl-2 pr-3 py-3 text-white text-sm md:text-base border-b-2 border-[var(--secondary)]/40 shadow-[inset_0_4px_6px_rgba(0,0,0,0.5)]  rounded-lg focus:outline-none transition placeholder:text-slate-600"
                  placeholder="John"
                />
              </div>
              <div className="relative w-full">
                <label
                  htmlFor="last_name"
                  className="absolute -translate-y-3 text-[10px]"
                >
                  <span className="text-white ">Last name </span>
                  <span className="text-[var(--primary)]">*</span>
                </label>
                <input
                  name="last_name"
                  type="text"
                  value={userData.last_name}
                  onChange={handleChange}
                  required
                  className="w-full pl-2 pr-3 mt-2 py-3 text-white text-sm md:text-base border-b-2 border-[var(--secondary)]/40 shadow-[inset_0_4px_6px_rgba(0,0,0,0.5)]  rounded-lg focus:outline-none transition placeholder:text-slate-600"
                  placeholder="Doe"
                />
              </div>
            </div>
            {/* Username */}
            <div className="space-y-1">
              <div className="relative">
                <label
                  htmlFor="username"
                  className="absolute -translate-y-3 text-[10px]"
                >
                  <span className="text-white ">Username </span>
                  <span className="text-[var(--primary)]">*</span>
                </label>
                <div className="absolute translate-y-5 left-0 pl-3 flex items-center pointer-events-none">
                  <FiUser className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  name="username"
                  type="text"
                  value={userData.username}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 mt-2 pr-3 py-3 text-white text-sm md:text-base border-b-2 border-[var(--secondary)]/40 shadow-[inset_0_4px_6px_rgba(0,0,0,0.5)]  rounded-lg focus:outline-none transition placeholder:text-slate-600"
                  placeholder="ex. john_doe"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-8">
              <div className="relative">
                <label
                  htmlFor="password"
                  className="absolute -translate-y-3 text-[10px]"
                >
                  <span className="text-white ">Password </span>
                  <span className="text-[var(--primary)]">*</span>
                </label>
                <div className="absolute translate-y-5 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  ref={passwordInputRef}
                  name="password"
                  type={!currPassword ? "password" : "text"}
                  value={userData.password}
                  onChange={handleChange}
                  required
                  className="w-full mt-2 pl-10 pr-8 py-3 text-white text-sm md:text-base border-b-2 border-[var(--secondary)]/40 shadow-[inset_0_4px_6px_rgba(0,0,0,0.5)]  rounded-lg focus:outline-none transition placeholder:text-slate-600"
                  placeholder="********"
                />
                <div
                  onClick={() => setShowCurrPassword(!currPassword)}
                  className="absolute right-0 -translate-x-2 -translate-y-7 text-slate-500 cursor-pointer"
                >
                  {currPassword ? <FiEye /> : <FiEyeOff />}
                </div>
              </div>
              <div className="relative">
                <label
                  htmlFor="confirm_password"
                  className="absolute -translate-y-3 text-[10px]"
                >
                  <span className="text-white ">Confirm password </span>
                  <span className="text-[var(--primary)]">*</span>
                </label>
                <div className="absolute translate-y-5 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  ref={passwordInputRef}
                  name="confirm_password"
                  type={!confPassword ? "password" : "text"}
                  value={userData.confirm_password}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 mt-2 pr-8 py-3 text-white text-sm md:text-base   shadow-[inset_0_4px_6px_rgba(0,0,0,0.5)]  rounded-lg border-b-2 border-[var(--secondary)]/40  focus:outline-none transition placeholder:text-slate-600"
                  placeholder="********"
                />
                <div
                  onClick={() => setShowConfirmPassword(!confPassword)}
                  className="absolute right-0 -translate-x-2 -translate-y-7 text-slate-500 cursor-pointer"
                >
                  {confPassword ? <FiEye /> : <FiEyeOff />}
                </div>
                <span className=" relative flex items-center gap-1 mt-3">
                  <CgDanger height={10} className="text-yellow-600" />
                  <p className="text-[10px] text-slate-400 ">
                    Use at least 8 characters with letters, numbers and symbols
                  </p>
                </span>
              </div>

              <section className="__gender__">
                <label
                  htmlFor="gender"
                  className="absolute -translate-y-3 text-[10px]"
                >
                  <span className="text-white ">Gender </span>
                  <span className="text-[var(--primary)]">*</span>
                </label>

                {renderGenderSelection()}
              </section>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={
                loading || Object.values(userData).some((value) => !value)
              }
              className="w-full text-sm md:text-base flex items-center justify-center gap-2 py-3.5 px-4 bg-[var(--primary)] hover:bg-[var(--primary)]/80 text-white font-medium rounded-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-slate-600 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <>
                  <AiOutlineLoading3Quarters className="w-4 h-4 animate-spin" />
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <FiArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>

            {/* Message */}
            {message && (
              <div
                className={`p-4 rounded-lg text-sm ${
                  message.toLowerCase().includes("password") ||
                  message.toLowerCase().includes("username")
                    ? "bg-red-50 text-red-600 border border-red-100"
                    : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                }`}
              >
                {message}
              </div>
            )}

            {/* Footer Link */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-[var(--black)] text-slate-500 text-xs md:text-base">
                  Already have an account?
                </span>
              </div>
            </div>

            <Link
              to="/login"
              className="w-full bg-gradient-to-l from-black/10 to-black/20 text-sm md:text-base flex items-center justify-center gap-2 py-3.5 px-4 border-2 border-white/2 shadow-xl shadow-black/30 hover:border-white/6 text-white font-medium rounded-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-white/6 focus:border-transparent group"
            >
              <FiArrowRight className="w-4 h-4 text-white rotate-180" />
              <span>Sign in to existing account</span>
            </Link>

            <FormFooter />
          </form>
        </div>
      </div>
    </div>
  );
}
