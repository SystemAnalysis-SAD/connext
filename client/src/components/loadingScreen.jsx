export default function LoadingScreen() {
  return (
    <div className="absolute w-full h-screen bg-[var(--black)] flex gap-3 flex-col justify-center items-center">
      <div className="__loading_logo__ ">
        <img
          src="/connext.png"
          alt="logo"
          width={90}
          className="rounded-3xl  md:w-[120px]"
        />
      </div>
    </div>
  );
}
