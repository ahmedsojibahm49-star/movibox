"use client";
import * as React from "react";
import Link from "next/link";
import { Moon, Film, Sparkles, AlertTriangle, Upload } from "lucide-react";
import { MovieCard, CardSkeleton } from "@/components/cards/MovieCard";
import { ContentRow } from "@/components/rows/ContentRow";
import { api } from "@/lib/api-client";
import { useStore } from "@/lib/store";
import { libraryToTitle } from "@/lib/utils";
import type { Title } from "@/lib/types";

function Grid({ items, loading }: { items: Title[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-x-3.5 gap-y-6 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <CardSkeleton key={i} fluid />
        ))}
      </div>
    );
  }
  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-tm">Nothing here right now — the catalog may be busy.</p>;
  }
  return (
    <div className="grid grid-cols-3 gap-x-3.5 gap-y-6 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
      {items.map((t) => (
        <MovieCard key={t.slug} t={t} fluid />
      ))}
    </div>
  );
}

export default function MidnightPage() {
  const [data, setData] = React.useState<{ picks: Title[]; anime: Title[] } | null>(null);
  const library = useStore((s) => s.library);
  const mature = useStore((s) => s.mature);
  const setMature = useStore((s) => s.setMature);
  const uploads = library.filter((t) => (t.sections ?? ["home"]).includes("midnight"));

  React.useEffect(() => {
    if (!mature) return;
    let live = true;
    api
      .midnight()
      .then((d) => live && setData(d))
      .catch(() => live && setData({ picks: [], anime: [] }));
    return () => {
      live = false;
    };
  }, [mature]);

  // 18+ gate — the shelf only loads after the user enables it in Settings
  if (!mature) {
    return (
      <div className="container-site flex flex-col items-center pt-40 pb-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-fuchsia-400/10 text-fuchsia-300">
          <Moon size={30} />
        </div>
        <h1 className="mt-6 text-2xl font-extrabold tracking-tight sm:text-3xl">
          This shelf is hidden
        </h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ts">
          Midnight contains 18+ mature movies, series and anime. Turn on{" "}
          <span className="font-semibold text-tp">Show Midnight (18+) content</span> in your
          settings to browse it here.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => setMature(true)}
            className="rounded-btn bg-gradient-to-br from-[#FFB300] via-accent to-[#FF4D00] px-5 py-2.5 text-sm font-bold text-white transition-all hover:brightness-110"
          >
            Enable 18+ content
          </button>
          <Link
            href="/profile?tab=settings"
            className="rounded-btn border border-line bg-card px-5 py-2.5 text-sm font-semibold text-ts transition-colors hover:text-tp"
          >
            Open Settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-16">
      {/* midnight hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#160A1E] via-[#1A0F2B] to-base" />
        <div className="absolute -top-24 left-1/2 h-72 w-[640px] -translate-x-1/2 rounded-full bg-fuchsia-500/10 blur-3xl" />
        {/* moon */}
        <div className="absolute right-[10%] top-12 h-16 w-16 rounded-full bg-gradient-to-br from-slate-100 to-slate-400 opacity-90 shadow-[0_0_70px_rgba(226,232,240,0.4)] sm:h-24 sm:w-24" />
        <div className="absolute right-[16%] top-[96px] hidden h-2 w-2 rounded-full bg-white/40 sm:block" />
        <div className="absolute right-[8%] top-[130px] hidden h-1.5 w-1.5 rounded-full bg-white/30 sm:block" />
        <div className="absolute right-[20%] top-[40px] hidden h-1.5 w-1.5 rounded-full bg-white/40 sm:block" />

        <div className="container-site relative flex min-h-[340px] flex-col justify-end pb-10 pt-28 sm:min-h-[400px]">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-fuchsia-300">
            <Moon size={13} /> After-dark shelf
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
              Midn<span className="text-fuchsia-300">i</span>ght
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-danger/40 bg-danger/10 px-3 py-1 text-xs font-bold text-danger">
              <AlertTriangle size={12} /> 18+ Mature Only
            </span>
          </div>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ts">
            The shelf we keep for grown-ups — mature-rated movies, series and anime. You must be of
            legal age to browse this section.
          </p>
        </div>
      </div>

      <div className="mt-6">
        {/* admin-published uploads */}
        {uploads.length > 0 && (
          <div className="mb-6">
            <h2 className="container-site mb-3 flex items-center gap-2.5 text-lg font-bold tracking-tight sm:text-xl">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-fuchsia-400/15 text-fuchsia-300">
                <Upload size={16} />
              </span>
              Fresh Uploads
            </h2>
            <ContentRow label="Fresh Uploads" items={uploads.map(libraryToTitle)} hideLabel />
          </div>
        )}

        <section className="container-site mb-10">
          <h2 className="mb-4 flex items-center gap-2.5 text-lg font-bold tracking-tight sm:text-xl">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-fuchsia-400/15 text-fuchsia-300">
              <Film size={16} />
            </span>
            Mature Picks
            <span className="text-xs font-semibold text-tm">Movies & Series</span>
          </h2>
          <Grid items={data?.picks ?? []} loading={!data} />
        </section>

        <section className="container-site">
          <h2 className="mb-4 flex items-center gap-2.5 text-lg font-bold tracking-tight sm:text-xl">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-400/15 text-indigo-300">
              <Sparkles size={16} />
            </span>
            Mature Anime
          </h2>
          <Grid items={data?.anime ?? []} loading={!data} />
        </section>
      </div>
    </div>
  );
}
