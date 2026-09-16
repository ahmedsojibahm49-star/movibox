"use client";
import * as React from "react";
import { Clapperboard, RefreshCw } from "lucide-react";
import { MovieCard, CardSkeleton } from "@/components/cards/MovieCard";
import { ContentRow } from "@/components/rows/ContentRow";
import { Button, EmptyState } from "@/components/ui/primitives";
import { api } from "@/lib/api-client";
import { useStore } from "@/lib/store";
import type { CatalogType, SortKey, Title } from "@/lib/types";
import { cn, formatCount, libraryToTitle } from "@/lib/utils";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "RECOMMEND", label: "Recommended" },
  { key: "HOT", label: "Hot" },
  { key: "LATEST", label: "Latest" },
  { key: "POPULAR", label: "Popular" },
];

export function CatalogPage({
  type,
  title,
}: {
  type: CatalogType;
  title: string;
}) {
  const [sort, setSort] = React.useState<SortKey>("RECOMMEND");
  const [items, setItems] = React.useState<Title[]>([]);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(true);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [total, setTotal] = React.useState(0);
  const sentinelRef = React.useRef<HTMLDivElement>(null);
  const busyRef = React.useRef(false);
  const library = useStore((s) => s.library);
  const uploads = library.filter((t) => (t.sections ?? ["home"]).includes(type));

  // first load + on sort change
  React.useEffect(() => {
    let live = true;
    setLoading(true);
    setItems([]);
    setPage(1);
    setHasMore(true);
    setError(false);
    api
      .catalog(type, 1, sort)
      .then((d) => {
        if (!live) return;
        setItems(d.items);
        setHasMore(d.hasMore);
        setTotal(d.total);
      })
      .catch(() => live && setError(true))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [type, sort]);

  // infinite scroll
  React.useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting || busyRef.current || !hasMore || loading) return;
        busyRef.current = true;
        setLoadingMore(true);
        const next = page + 1;
        api
          .catalog(type, next, sort)
          .then((d) => {
            setItems((cur) => [...cur, ...d.items]);
            setTotal((cur) => cur + d.items.length);
            setHasMore(d.hasMore);
            setPage(next);
          })
          .catch(() => {})
          .finally(() => {
            busyRef.current = false;
            setLoadingMore(false);
          });
      },
      { rootMargin: "700px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [type, sort, page, hasMore, loading]);

  return (
    <div className="pt-20 pb-8">
      <div className="container-site">
        {/* header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
            {!loading && total > 0 && (
              <p className="mt-1 text-sm text-tm">{formatCount(total)} titles</p>
            )}
          </div>
          <div
            className="no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-full border border-line bg-card p-1"
            role="tablist"
            aria-label="Sort"
          >
            {SORTS.map((s) => (
              <button
                key={s.key}
                role="tab"
                aria-selected={sort === s.key}
                onClick={() => setSort(s.key)}
                className={cn(
                  "shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-all duration-200",
                  sort === s.key
                    ? "bg-gradient-to-br from-[#FFB300] via-accent to-[#FF4D00] text-white shadow"
                    : "text-ts hover:text-tp"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {uploads.length > 0 && (
          <div className="mb-4">
            <ContentRow label="Your Uploads" items={uploads.map(libraryToTitle)} />
          </div>
        )}

        {error ? (
          <EmptyState
            icon={<Clapperboard size={28} />}
            title="Something went wrong"
            hint="Please try again."
            action={
              <Button
                icon={<RefreshCw size={15} />}
                onClick={() => {
                  setPage(0);
                  setSort(sort);
                  // force re-run
                  setItems([]);
                  setHasMore(true);
                  setError(false);
                  setLoading(true);
                  api
                    .catalog(type, 1, sort)
                    .then((d) => {
                      setItems(d.items);
                      setHasMore(d.hasMore);
                      setPage(1);
                      setTotal(d.total);
                    })
                    .catch(() => setError(true))
                    .finally(() => setLoading(false));
                }}
              >
                Try again
              </Button>
            }
          />
        ) : loading ? (
          <div className="grid grid-cols-2 gap-x-3.5 gap-y-6 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
            {Array.from({ length: 14 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Clapperboard size={28} />}
            title="Nothing here yet"
            hint="Try a different sort."
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-3.5 gap-y-6 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
              {items.map((t, i) => (
                <MovieCard key={t.slug + (i % 7)} t={t} />
              ))}
              {loadingMore &&
                Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={"s" + i} />)}
            </div>
            <div ref={sentinelRef} className="h-10" />
            {!hasMore && (
              <p className="py-8 text-center text-sm text-tm">You've reached the end</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
