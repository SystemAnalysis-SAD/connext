const Avatar = ({ firstName, className = "" }) => {
  return (
    <div
      className={`w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-semibold text-sm ${className}`}
    >
      {firstName.charAt(0).toUpperCase()}
    </div>
  );
};

export default Avatar;
