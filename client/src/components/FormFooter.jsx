export default function FormFooter() {
  return (
    <div className="text-center pt-4">
      <p className="text-xs text-slate-400">
        By creating an account, you agree to Connext's{" "}
        <a href="#" className="text-slate-500 hover:text-slate-700 underline">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="#" className="text-slate-500 hover:text-slate-700 underline">
          Privacy Policy
        </a>
      </p>
    </div>
  );
}
