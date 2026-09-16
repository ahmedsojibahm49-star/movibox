"use client";
import * as React from "react";
import Link from "next/link";
import { ListVideo, X, Clock, ArrowRight } from "lucide-react";
import { MovieCard, WideCard } from "@/components/cards/MovieCard";
import { EmptyState } from "@/components/ui/primitives";
import { useStore, continueWatching } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function WatchlistPage() {
  const user = useStore((s) => s.user);
  const watchlist = useStore((s) => s.watchlist);
  const remove = useStore((s) => s.removeWatchlist);
  const history = useStore((s) => s.history);
  const removeHistory = useStore((s) => s.removeHistory);

  const [sort, setSort] = React.useState<"added" | "az">("added");
  const sorted = React.useMemo(() => {
    const arr = [...watchlist];
    if (sort === "az") arr.sort((a, b) => a.name.localeCompare(b.name));
    return arr;
  }, [watchlist, sort]);

  const cw = continueWatching(history);

  return (
    <div className="pt-20 pb-10">
      <div className="container-site">
        {!user ? (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-accent">
              <ListVideo size={28} strokeWidth={1.5} />
            </span>
            <h1 className="text-xl font-bold">Sign in to save your watchlist</h1>
            <p className="max-w-sm text-sm text-tm">
              Add movies and series to your list and find them here later — on this device or after signing in.
            </p>
            <div className="mt-2 flex gap-3">
              <Link
                href="/login"
                className="inline-flex h-11 items-center rounded-btn bg-gradient-to-br from-[#FFB300] via-accent to-[#FF4D00] px-5 text-sm font-semibold text-white"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="inline-flex h-11 items-center rounded-btn border border-line px-5 text-sm font-semibold text-tp hover:bg-white/5"
              >
                Create account
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">My Watchlist</h1>
                <p className="mt-1 text-sm text-tm">{watchlist.length} titles</p>
              </div>
              <div className="flex gap-1.5 rounded-full border border-line bg-card p-1">
                {(
                  [
                    ["added", "Recently added"],
                    ["az", "A – Z"],
                  ] as const
                ).map(([k, l]) => (
                  <button
                    key={k}
                    onClick={() => setSort(k)}
                    className={cn(
                      "rounded-full px-4 py-1.5 text-[13px] font-semibold transition-all",
                      sort === k
                        ? "bg-gradient-to-br from-[#FFB300] via-accent to-[#FF4D00] text-white"
                        : "text-ts hover:text-tp"
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {cw.length > 0 && (
              <section className="mb-10">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-tm">
                  <Clock size={14} /> Continue watching
                </h2>
                <div className="no-scrollbar flex gap-3.5 overflow-x-auto pb-2">
                  {cw.slice(0, 10).map((e) => (
                    <WideCard
                      key={e.slug + (e.se || 0) + "-" + (e.ep || 0)}
                      t={{ name: e.name, slug: e.slug, subjectId: e.subjectId, poster: e.poster }}
                      progress={e.progress}
                      duration={e.duration}
                      label={e.se && e.ep ? `S${e.se} · E${e.ep}` : undefined}
                      onRemove={() => removeHistory(e.slug, e.se, e.ep)}
                    />
                  ))}
                </div>
              </section>
            )}

            {watchlist.length === 0 ? (
              <EmptyState
                icon={<ListVideo size={28} />}
                title="Your watchlist is empty"
                hint="Browse the catalog and tap the + button on any title to save it here."
                action={
                  <Link
                    href="/movies"
                    className="inline-flex h-11 items-center gap-2 rounded-btn bg-gradient-to-br from-[#FFB300] via-accent to-[#FF4D00] px-5 text-sm font-semibold text-white"
                  >
                    Browse movies <ArrowRight size={15} />
                  </Link>
                }
              />
            ) : (
              <div className="grid grid-cols-2 gap-x-3.5 gap-y-6 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
                {sorted.map((t) => (
                  <div key={t.slug} className="group/wl relative">
                    <MovieCard t={t} />
                    <button
                      onClick={() => remove(t.slug)}
                      aria-label={"Remove " + t.name}
                      className="absolute -right-1.5 -top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-line bg-raised text-tm opacity-0 shadow-card transition-all hover:text-danger focus:opacity-100 group-hover/wl:opacity-100"
                    >
                      <X size={13} strokeWidth={3} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
