"use client";
import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ChevronLeft, Share2, Star, Clock } from "lucide-react";
import { Player } from "@/components/player/Player";
import { api } from "@/lib/api-client";
import { useStore } from "@/lib/store";
import type { Detail } from "@/lib/types";
import { Skeleton } from "@/components/ui/primitives";
import { cn, isLibrarySlug, libraryToDetail } from "@/lib/utils";

export default function WatchPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const sp = useSearchParams();
  const se = Math.max(1, parseInt(sp.get("se") || "1", 10) || 1);
  const ep = Math.max(1, parseInt(sp.get("ep") || "1", 10) || 1);

  const [d, setD] = React.useState<Detail | null>(null);
  const [error, setError] = React.useState(false);
  const toast = useStore((s) => s.toast);
  const lib = useStore((s) => (isLibrarySlug(params.slug) ? s.libraryBySlug(params.slug) : undefined));

  React.useEffect(() => {
    // Admin-added (self-hosted) title — no MovieBox API involved
    if (isLibrarySlug(params.slug)) {
      if (lib) setD(libraryToDetail(lib));
      else setError(true);
      return;
    }
    let live = true;
    api
      .detail(params.slug)
      .then((x) => live && setD(x))
      .catch(() => live && setError(true));
    return () => {
      live = false;
    };
  }, [params.slug, lib]);

  const isSeries = !!d && d.seasons.length > 0;
  const curSeason = d?.seasons.find((s) => s.se === se) || d?.seasons[0];
  const maxEp = curSeason?.maxEp || 0;
  const hasNext = isSeries && ep < maxEp;

  const goEp = (nse: number, nep: number) => {
    router.push(`/watch/${params.slug}?se=${nse}&ep=${nep}`);
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast("success", "Link copied to clipboard");
    } catch {
      toast("error", "Could not copy link");
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 pt-40 text-center">
        <p className="text-lg font-semibold">This title could not be found.</p>
        <button onClick={() => router.push("/")} className="text-sm font-semibold text-accent-hover hover:underline">
          Back to home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16">
      {/* compact top bar */}
      <div
        className="fixed inset-x-0 top-0 z-40 flex min-h-14 items-center gap-2 border-b border-line bg-base/90 px-4 backdrop-blur-md sm:px-6"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ts transition-colors hover:bg-white/10 hover:text-tp"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={() => router.push("/title/" + params.slug)}
          className="inline-flex items-center gap-1 text-sm font-semibold text-ts transition-colors hover:text-tp"
        >
          Details
        </button>
        {d && (
          <p className="ml-2 truncate text-sm font-bold text-tp">
            {d.title}
            {isSeries && (
              <span className="ml-2 font-medium text-tm">
                S{se} · E{ep}
              </span>
            )}
          </p>
        )}
        <button
          onClick={share}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-ts transition-colors hover:bg-white/10 hover:text-tp"
        >
          <Share2 size={14} /> Share
        </button>
      </div>

      <div className="mx-auto max-w-5xl px-3 pt-[calc(3.5rem+12px+env(safe-area-inset-top))] sm:px-6">
        {d ? (
          <Player
            title={d.title}
            poster={d.cover}
            subjectId={d.subjectId}
            slug={d.detailPath}
            se={isSeries ? se : 1}
            ep={isSeries ? ep : 1}
            isSeries={isSeries}
            maxEp={maxEp}
            hasNext={hasNext}
            onNext={() => goEp(se, ep + 1)}
            directUrl={isLibrarySlug(params.slug) ? lib?.videoUrl : undefined}
          />
        ) : (
          <div className="skeleton aspect-video w-full rounded-card" />
        )}
      </div>

      {/* below player */}
      <div className="container-site mt-8">
        {d && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">{d.title}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-ts">
                  {(d.releaseDate || "").slice(0, 4) && <span>{d.releaseDate!.slice(0, 4)}</span>}
                  {d.rating && Number(d.rating) > 0 && (
                    <span className="inline-flex items-center gap-1 text-warning">
                      <Star size={13} className="fill-warning" strokeWidth={0} />
                      {d.rating}
                    </span>
                  )}
                  {d.country && <span>{d.country}</span>}
                  {d.genre && <span className="text-tm">{(d.genre || "").split(",").slice(0, 2).join(" · ")}</span>}
                </div>
              </div>
              {isSeries && curSeason && (
                <p className="shrink-0 text-sm font-semibold text-tm">
                  Season {curSeason.se} · Episode {ep} <span className="text-tm/60">/ {maxEp}</span>
                </p>
              )}
            </div>

            {d.description && (
              <p className="mt-4 max-w-3xl text-[14px] leading-relaxed text-ts">{d.description}</p>
            )}

            {/* episode grid (wraps — every episode visible) */}
            {isSeries && curSeason && maxEp > 1 && (
              <section className="mt-8">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-tm">
                    Episodes · Season {curSeason.se}
                  </h2>
                  <p className="text-xs font-semibold text-tm">
                    Episode {ep} of {maxEp}
                  </p>
                </div>
                <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12">
                  {Array.from({ length: maxEp }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      onClick={() => goEp(se, n)}
                      className={cn(
                        "flex h-11 items-center justify-center rounded-btn border text-sm font-bold transition-all duration-200",
                        n === ep
                          ? "border-transparent bg-gradient-to-br from-[#FFB300] via-accent to-[#FF4D00] text-white shadow-[0_2px_12px_rgba(255,122,26,0.35)]"
                          : "border-line bg-card text-ts hover:-translate-y-0.5 hover:border-line-strong hover:text-tp"
                      )}
                      aria-label={"Episode " + n}
                      aria-current={n === ep}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* season switcher */}
            {isSeries && d.seasons.length > 1 && (
              <section className="mt-8">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-tm">Seasons</h2>
                <div className="flex flex-wrap gap-2">
                  {d.seasons.map((s) => (
                    <button
                      key={s.se}
                      onClick={() => goEp(s.se, 1)}
                      className={cn(
                        "rounded-full border px-4 py-2 text-[13px] font-semibold transition-all",
                        s.se === se
                          ? "border-transparent bg-gradient-to-br from-[#FFB300] via-accent to-[#FF4D00] text-white"
                          : "border-line bg-card text-ts hover:border-line-strong hover:text-tp"
                      )}
                    >
                      Season {s.se} · {s.maxEp} eps
                    </button>
                  ))}
                </div>
              </section>
            )}

            <div className="mt-10 flex items-center gap-2 border-t border-line pt-6 text-xs text-tm">
              <Clock size={13} />
              Playback progress is saved automatically — pick up where you left off anytime.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
