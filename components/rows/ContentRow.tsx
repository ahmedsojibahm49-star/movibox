"use client";
import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronRight as ArrowRight, RefreshCw } from "lucide-react";
import { MovieCard, CardSkeleton } from "@/components/cards/MovieCard";
import { Button } from "@/components/ui/primitives";
import { cn, slugify } from "@/lib/utils";
import type { Title } from "@/lib/types";

/**
 * Horizontal scrolling content row with edge arrows + lazy mounting.
 * `seeAllHref` → where "See all" points (usually a genre/category page).
 */
export function ContentRow({
  label,
  items,
  loading,
  error,
  onRetry,
  seeAllHref,
  children,
  hideLabel,
}: {
  label: React.ReactNode;
  items?: Title[];
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  seeAllHref?: string;
  children?: React.ReactNode; // custom card renderer (e.g. wide cards)
  hideLabel?: boolean;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [canL, setCanL] = React.useState(false);
  const [canR, setCanR] = React.useState(true);
  const [visible, setVisible] = React.useState(false);

  // lazy mount when near viewport
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && setVisible(true),
      { rootMargin: "500px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const upd = () => {
      setCanL(el.scrollLeft > 10);
      setCanR(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
    };
    upd();
    el.addEventListener("scroll", upd, { passive: true });
    window.addEventListener("resize", upd);
    return () => {
      el.removeEventListener("scroll", upd);
      window.removeEventListener("resize", upd);
    };
  }, [items, visible, loading]);

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <section className="relative py-4" aria-label={typeof label === "string" ? label : undefined}>
      {!hideLabel && (
        <div className="container-site mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight sm:text-xl">{label}</h2>
          {seeAllHref && (
            <Link
              href={seeAllHref}
              className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-tm transition-colors hover:text-accent-hover"
            >
              See all
              <ArrowRight size={14} />
            </Link>
          )}
        </div>
      )}

      {error ? (
        <div className="container-site flex items-center gap-4 rounded-card border border-line bg-card/50 py-8">
          <p className="text-sm text-ts">Couldn't load this row. The content service may be busy.</p>
          {onRetry && (
            <Button size="sm" variant="secondary" icon={<RefreshCw size={14} />} onClick={onRetry}>
              Retry
            </Button>
          )}
        </div>
      ) : (
        <div className="relative">
          {/* edge fades */}
          {canL && <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-base to-transparent" />}
          {canR && <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-base to-transparent" />}

          {/* arrows (desktop) */}
          {canL && (
            <button
              onClick={() => scroll(-1)}
              aria-label="Scroll left"
              className="absolute left-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-base/80 text-tp opacity-0 backdrop-blur transition-all hover:bg-base focus:opacity-100 group-hover:opacity-100 [section:hover_&]:opacity-100 md:flex"
            >
              <ChevronLeft size={22} />
            </button>
          )}
          {canR && (
            <button
              onClick={() => scroll(1)}
              aria-label="Scroll right"
              className="absolute right-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-base/85 text-tp shadow-modal backdrop-blur transition-all hover:border-line-strong hover:bg-base sm:right-3 sm:h-11 sm:w-11"
            >
              <ChevronRight size={20} />
            </button>
          )}

          <div ref={ref} className="no-scrollbar container-site flex gap-3.5 overflow-x-auto scroll-px-4 sm:scroll-px-6 lg:scroll-px-10 xl:scroll-px-14">
            {loading || !visible
              ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
              : children ??
                items?.map((t) => <MovieCard key={t.slug + t.subjectId} t={t} />)}
          </div>
        </div>
      )}
    </section>
  );
}

export function rowHref(label: string): string {
  return "/genres?row=" + encodeURIComponent(label);
}
