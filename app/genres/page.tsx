"use client";
import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Layers, ArrowLeft, ArrowRight } from "lucide-react";
import { MovieCard, CardSkeleton } from "@/components/cards/MovieCard";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { api } from "@/lib/api-client";
import type { HomeData } from "@/lib/types";

export default function GenresPage() {
  return (
    <Suspense fallback={<div className="pt-20" />}>
      <GenresContent />
    </Suspense>
  );
}

function GenresContent() {
  const sp = useSearchParams();
  const row = sp.get("row");
  const [data, setData] = React.useState<HomeData | null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    api
      .home()
      .then(setData)
      .catch(() => setError(true));
  }, []);

  const active = row ? data?.sections.find((s) => s.label === row) : null;

  return (
    <div className="pt-20 pb-8">
      <div className="container-site">
        {row ? (
          <>
            <Link
              href="/genres"
              className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-tm transition-colors hover:text-tp"
            >
              <ArrowLeft size={15} /> All genres
            </Link>
            <div className="mb-6 flex items-end justify-between">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{row}</h1>
                {active && (
                  <p className="mt-1 text-sm text-tm">{active.items.length} titles</p>
                )}
              </div>
            </div>
            {!data && !error && (
              <div className="grid grid-cols-2 gap-x-3.5 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {Array.from({ length: 12 }).map((_, i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            )}
            {error && (
              <EmptyState icon={<Layers size={28} />} title="Something went wrong" hint="Please try again." />
            )}
            {data && active && active.items.length === 0 && (
              <EmptyState icon={<Layers size={28} />} title="No titles in this genre yet" />
            )}
            {data && active && active.items.length > 0 && (
              <div className="grid grid-cols-2 gap-x-3.5 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
                {active.items.map((t) => (
                  <MovieCard key={t.slug} t={t} />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Genres</h1>
            <p className="mt-1 text-sm text-tm">Browse curated collections from the catalog</p>
            {error ? (
              <div className="mt-6">
                <EmptyState icon={<Layers size={28} />} title="Something went wrong" hint="Please try again." />
              </div>
            ) : !data ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-card" />
                ))}
              </div>
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.sections.map((s, i) => (
                  <Link
                    key={s.label}
                    href={"/genres?row=" + encodeURIComponent(s.label)}
                    className="group relative overflow-hidden rounded-card border border-line bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-line-strong hover:shadow-card"
                  >
                    <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-accent/15 to-transparent transition-transform duration-500 group-hover:scale-150" />
                    <p className="text-xs font-bold uppercase tracking-wider text-accent-hover">
                      Collection {String(i + 1).padStart(2, "0")}
                    </p>
                    <h2 className="mt-2 text-lg font-bold">{s.label}</h2>
                    <p className="mt-1 text-sm text-tm">{s.items.length} titles</p>
                    <div className="mt-4 flex items-center gap-1 text-[13px] font-semibold text-ts transition-colors group-hover:text-accent-hover">
                      Browse
                      <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                    </div>
                    {s.items[0]?.poster && (
                      <div className="pointer-events-none absolute bottom-0 right-0 flex h-24 w-[64px] translate-x-8 translate-y-6 -rotate-6 opacity-70 transition-all duration-300 group-hover:translate-x-1 group-hover:translate-y-3 group-hover:rotate-0 group-hover:opacity-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={s.items[0].poster}
                          alt=""
                          className="h-full w-full rounded-md object-cover shadow-card"
                          loading="lazy"
                        />
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
