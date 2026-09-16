"use client";
import * as React from "react";
import Link from "next/link";
import { TrendingUp, Trophy } from "lucide-react";
import { api } from "@/lib/api-client";
import { CardSkeleton } from "@/components/cards/MovieCard";
import { cn } from "@/lib/utils";
import type { Title } from "@/lib/types";

type Pooled = Title & { kind: "Movie" | "Series" | "Anime" };

interface Ranked extends Pooled {
  rank: number;
}

export default function Top10Page() {
  const [list, setList] = React.useState<Ranked[] | null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let live = true;
    Promise.all([
      api.catalog("movies", 1, "POPULAR"),
      api.catalog("series", 1, "POPULAR"),
      api.catalog("anime", 1, "POPULAR"),
    ])
      .then(([m, s, a]) => {
        if (!live) return;
        const pick = (items: Title[], kind: Pooled["kind"]): Pooled[] => items.slice(0, 6).map((t) => ({ ...t, kind }));
        const pool: Pooled[] = [...pick(m.items, "Movie"), ...pick(s.items, "Series"), ...pick(a.items, "Anime")];
        // interleave types for variety, keep popularity order inside each type
        const out: Pooled[] = [];
        for (let i = 0; i < 10 && out.length < 10; i++) {
          for (const t of pool) {
            if (!out.includes(t) && out.length < 10) out.push(t);
          }
        }
        setList(out.slice(0, 10).map((t, i) => ({ ...t, rank: i + 1 })));
      })
      .catch(() => live && setError(true));
    return () => {
      live = false;
    };
  }, []);

  return (
    <div className="pb-16">
      {/* hero band */}
      <div className="relative overflow-hidden border-b border-line">
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />
        <div className="container-site relative flex flex-col justify-end gap-3 pb-10 pt-28 sm:pt-32">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-accent-hover">
            <TrendingUp size={13} /> Ranked by popularity today
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Top 10 <span className="text-accent">Right Now</span>
          </h1>
          <p className="max-w-xl text-[15px] text-ts">
            The ten most-watched movies, series and anime across the whole catalog — refreshed from
            live popularity.
          </p>
        </div>
      </div>

      <div className="container-site mt-10">
        {error ? (
          <p className="py-16 text-center text-sm text-tm">Couldn’t load the ranking — please try again.</p>
        ) : !list ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="skeleton h-16 w-14 rounded-lg" />
                <div className="skeleton h-20 w-14 rounded-md" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-1/3" />
                  <div className="skeleton h-3 w-1/5" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ol className="space-y-3">
            {list.map((t) => (
              <li key={t.slug + t.rank}>
                <Link
                  href={"/title/" + t.slug}
                  className="group flex items-center gap-3 rounded-card border border-line bg-card/60 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:bg-card sm:gap-5 sm:p-4"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "w-12 shrink-0 select-none text-center text-5xl font-black leading-none tracking-tighter sm:w-16 sm:text-7xl",
                      "text-transparent [-webkit-text-stroke:1.5px_rgba(255,255,255,0.28)] transition-colors",
                      t.rank <= 3 && "[-webkit-text-stroke:1.5px_rgba(255,122,26,0.75)] group-hover:[-webkit-text-stroke:1.5px_rgba(255,122,26,1)]"
                    )}
                  >
                    {t.rank}
                  </span>
                  <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-md bg-white/5 sm:h-24 sm:w-16">
                    {t.poster ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.poster} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-tm">
                        <Trophy size={18} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold sm:text-lg">{t.name}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-tm">
                      <span className="rounded-badge bg-white/10 px-2 py-0.5 font-semibold text-ts">{t.kind}</span>
                      {t.year && <span>{t.year}</span>}
                      {t.badge && (
                        <span className="rounded-badge bg-accent/20 px-2 py-0.5 font-bold text-accent-hover">{t.badge}</span>
                      )}
                    </div>
                  </div>
                  <span className="hidden shrink-0 text-sm font-semibold text-tm transition-all group-hover:translate-x-0.5 group-hover:text-tp sm:block">
                    View →
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
