"use client";
import * as React from "react";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * Global client error boundary — replaces Next's raw "Application error" screen
 * with a friendly card + retry. Any uncaught error in the app tree lands here.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  React.useEffect(() => {
    console.error("StreamBox global error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-base px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-card">
        <AlertTriangle size={28} className="text-warning" />
      </div>
      <div>
        <h1 className="text-xl font-bold text-tp">Something went wrong</h1>
        <p className="mt-1 max-w-sm text-sm text-ts">
          An unexpected error happened. Try again — if it keeps happening, go back home and re-open the page.
        </p>
      </div>
      {error?.digest && (
        <p className="rounded-full border border-line bg-card px-3 py-1 font-mono text-[11px] text-tm">
          ref: {error.digest}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-btn bg-gradient-to-br from-[#FFB300] via-accent to-[#FF4D00] px-5 py-2.5 text-sm font-bold text-white shadow-[0_2px_14px_rgba(255,122,26,0.35)] transition-all hover:brightness-110"
        >
          <RotateCcw size={15} /> Try again
        </button>
        <button
          onClick={() => router.push("/")}
          className="inline-flex items-center gap-2 rounded-btn border border-line bg-card px-5 py-2.5 text-sm font-semibold text-tp transition-colors hover:bg-white/5"
        >
          <Home size={15} /> Go home
        </button>
      </div>
    </div>
  );
}
