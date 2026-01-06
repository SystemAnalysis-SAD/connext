export default function LoadingScreen() {
  return (
    <div className="w-full md:w-[calc(100%-24rem)] h-screen absolute bg-[var(--black)] flex flex-col items-center justify-center">
      <span className="w-10 h-10 border-b border-blue-500 animate-spin rounded-full"></span>
      <span className="text-white">connexting...</span>
    </div>
  );
}
