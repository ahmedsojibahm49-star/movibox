import Link from "next/link";
import { Film, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
      <p
        className="text-[88px] font-extrabold leading-none tracking-tight sm:text-[120px]"
        style={{
          background: "linear-gradient(135deg,#FFB300 0%,#FF7A1A 55%,#FF4D00 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        404
      </p>
      <h1 className="text-xl font-bold sm:text-2xl">This page doesn't exist.</h1>
      <p className="max-w-sm text-sm text-tm">
        The link may be broken, or the page may have been moved.
      </p>
      <div className="mt-2 flex gap-3">
        <Link
          href="/"
          className="inline-flex h-11 items-center gap-2 rounded-btn bg-gradient-to-br from-[#FFB300] via-accent to-[#FF4D00] px-5 text-sm font-semibold text-white"
        >
          <Home size={15} /> Go home
        </Link>
        <Link
          href="/movies"
          className="inline-flex h-11 items-center gap-2 rounded-btn border border-line px-5 text-sm font-semibold text-tp hover:bg-white/5"
        >
          <Film size={15} /> Browse movies
        </Link>
      </div>
    </div>
  );
}
