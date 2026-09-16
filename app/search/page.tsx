"use client";
import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { SearchX, Search } from "lucide-react";
import { MovieCard, CardSkeleton } from "@/components/cards/MovieCard";
import { EmptyState } from "@/components/ui/primitives";
import { api } from "@/lib/api-client";
import { useStore } from "@/lib/store";
import { libraryToTitle } from "@/lib/utils";
import type { Title } from "@/lib/types";

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="pt-24" />}>
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
  const sp = useSearchParams();
  const q = (sp.get("q") || "").trim();
  const library = useStore((s) => s.library);
  const [items, setItems] = React.useState<Title[]>([]);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [total, setTotal] = React.useState(0);
  const sentinelRef = React.useRef<HTMLDivElement>(null);
  const busyRef = React.useRef(false);

  // custom (admin-added) titles match first
  const libHits = React.useMemo(() => {
    const kw = q.toLowerCase();
    if (!kw) return [] as Title[];
    return library.filter((t) => t.name.toLowerCase().includes(kw)).map(libraryToTitle);
  }, [q, library]);

  const merged = React.useMemo(() => {
    const seen = new Set<string>();
    return [...libHits, ...items].filter((t) => {
      if (seen.has(t.slug)) return false;
      seen.add(t.slug);
      return true;
    });
  }, [libHits, items]);

  React.useEffect(() => {
    if (!q) return;
    let live = true;
    setLoading(true);
    setItems([]);
    setPage(1);
    api
      .search(q, 1)
      .then((d) => {
        if (!live) return;
        setItems(d.items);
        setHasMore(d.hasMore);
        setTotal(d.total);
      })
      .catch(() => {})
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [q]);

  React.useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !q) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting || busyRef.current || !hasMore || loading) return;
        busyRef.current = true;
        setLoadingMore(true);
        const next = page + 1;
        api
          .search(q, next)
          .then((d) => {
            setItems((cur) => [...cur, ...d.items]);
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
  }, [q, page, hasMore, loading]);

  if (!q) {
    return (
      <div className="pt-24">
        <EmptyState
          icon={<Search size={28} />}
          title="Search StreamBox"
          hint="Use the search bar to find movies, series and anime."
        />
      </div>
    );
  }

  return (
    <div className="pt-20 pb-8">
      <div className="container-site">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          Results for “{q}”
        </h1>
        {!loading && total + libHits.length > 0 && (
          <p className="mt-1 text-sm text-tm">{total + libHits.length > 999 ? "999+" : total + libHits.length} results</p>
        )}

        {loading ? (
          <div className="mt-8 grid grid-cols-2 gap-x-3.5 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
            {Array.from({ length: 12 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : merged.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={<SearchX size={28} />}
              title="No movies found."
              hint="Try another search."
              action={
                <Link
                  href="/movies"
                  className="inline-flex h-11 items-center rounded-btn bg-gradient-to-br from-[#FFB300] via-accent to-[#FF4D00] px-5 text-sm font-semibold text-white"
                >
                  Browse movies
                </Link>
              }
            />
          </div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-2 gap-x-3.5 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
              {merged.map((t, i) => (
                <MovieCard key={t.slug + (i % 7)} t={t} />
              ))}
              {loadingMore &&
                Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={"s" + i} />)}
            </div>
            <div ref={sentinelRef} className="h-10" />
          </>
        )}
      </div>
    </div>
  );
}
