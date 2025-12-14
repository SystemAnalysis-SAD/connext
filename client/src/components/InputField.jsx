import { memo } from "react";
import { FiUser, FiLock } from "react-icons/fi";

const InputField = memo(
  ({ icon, type, name, value, onChange, placeholder }) => {
    return (
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {icon}
        </div>
        <input
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          required
          className="w-full pl-10 pr-8 py-3 text-white text-sm md:text-base border-b-2 border-[var(--secondary)]/40 rounded-sm focus:outline-none transition placeholder:text-slate-600"
          placeholder={placeholder}
        />
      </div>
    );
  }
);

export default InputField;
