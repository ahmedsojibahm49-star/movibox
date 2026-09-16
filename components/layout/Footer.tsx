import Link from "next/link";
import { Play } from "lucide-react";

function GithubMark() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.53-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11.1 11.1 0 0 1 5.78 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.24 2.76.12 3.05.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.25 5.67.41.35.77 1.05.77 2.12 0 1.53-.01 2.76-.01 3.14 0 .3.2.66.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-surface">
      <div className="container-site grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-gradient-to-br from-[#FFB300] via-accent to-[#FF4D00]">
              <Play size={13} className="text-white fill-white" strokeWidth={0} />
            </span>
            <span className="text-lg font-extrabold tracking-tight">
              STREAM<span className="text-accent">BOX</span>
            </span>
          </div>
          <p className="max-w-xs text-sm leading-6 text-tm">
            A premium movie and series streaming experience built as a college project.
            Metadata and streams are served by the open-source MovieBox API.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-tm">Browse</h4>
          <ul className="grid grid-cols-2 gap-2 text-sm text-ts">
            {[
              ["Home", "/"],
              ["Movies", "/movies"],
              ["Series", "/series"],
              ["Anime", "/anime"],
              ["Midnight", "/midnight"],
              ["Top 10", "/top10"],
              ["Genres", "/genres"],
              ["Watchlist", "/watchlist"],
            ].map(([l, h]) => (
              <li key={h}>
                <Link href={h} className="transition-colors hover:text-tp">
                  {l}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-tm">Project</h4>
          <ul className="space-y-2 text-sm text-ts">
            <li>
              <a
                href="https://github.com/deswalumesh80-sys/Moviebox-API"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 transition-colors hover:text-tp"
              >
                <GithubMark /> MovieBox API (MIT)
              </a>
            </li>
            <li className="text-tm">Next.js · TypeScript · Tailwind CSS</li>
            <li className="text-tm">hls.js · Zustand · Lucide icons</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-5">
        <p className="container-site text-xs text-tm">
          © 2026 StreamBox — College project for academic purposes. Not for commercial use.
        </p>
      </div>
    </footer>
  );
}
