"use client";
import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Play, Plus, Check, Info, ChevronLeft, ChevronRight, Star } from "lucide-react";
import type { Title } from "@/lib/types";
import { api } from "@/lib/api-client";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const ROTATE_MS = 7000;

interface SlideMeta {
  desc: string;
  genre: string;
  year: string;
  rating: string;
  isSeries: boolean;
  seasons: number;
  backdrop?: string;
  corner?: string;
}

export function HeroCarousel({ banner }: { banner: Title[] }) {
  const router = useRouter();
  const [idx, setIdx] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const [meta, setMeta] = React.useState<Record<string, SlideMeta>>({});
  const inWL = useStore((s) => s.watchlist.some((w) => w.slug === banner[idx]?.slug));
  const toggleWL = useStore((s) => s.toggleWatchlist);

  const n = banner.length;
  const item = banner[idx];

  // auto rotate
  React.useEffect(() => {
    if (paused || n <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % n), ROTATE_MS);
    return () => clearInterval(t);
  }, [paused, n]);

  React.useEffect(() => setExpanded(false), [idx]);

  // load details (backdrop + description) for active + next slides
  React.useEffect(() => {
    if (!item) return;
    const toLoad = [item, banner[(idx + 1) % n]].filter((x, i, a) => a.indexOf(x) === i);
    let live = true;
    toLoad.forEach((b) => {
      if (meta[b.slug]) return;
      api
        .detail(b.slug)
        .then((d) => {
          if (!live) return;
          setMeta((cur) => ({
            ...cur,
            [b.slug]: {
              desc: d.description || "",
              genre: (d.genre || "").split(",").map((g) => g.trim()).filter(Boolean).slice(0, 3).join(" · "),
              year: (d.releaseDate || "").slice(0, 4),
              rating: d.rating || "",
              isSeries: d.subjectType === 2 || (d.seasons || []).length > 0,
              seasons: d.seasons?.length ?? 0,
              backdrop: d.backdrop,
              corner: d.corner,
            },
          }));
        })
        .catch(() => {});
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, n]);

  if (!item) return null;
  const m = meta[item.slug];
  const metaBits: string[] = [];
  if (m?.year || item.year) metaBits.push((m?.year || item.year)!);
  if (m?.rating && Number(m.rating) > 0) metaBits.push("rating");
  if (m?.isSeries && m.seasons > 0) metaBits.push(m.seasons + (m.seasons === 1 ? " Season" : " Seasons"));
  else if (m?.genre) metaBits.push(m.genre);
  else if (item.badge) metaBits.push(item.badge);

  const go = (i: number) => setIdx(((i % n) + n) % n);

  return (
    <section
      className="relative h-[72vh] min-h-[500px] w-full overflow-hidden sm:h-[78vh] lg:h-[86vh]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="Featured"
    >
      {/* ---------- background layers ---------- */}
      {banner.slice(0, 4).map((b, i) => {
        const bm = meta[b.slug];
        const active = i === idx;
        return (
          <div
            key={b.slug}
            className={cn("absolute inset-0 transition-opacity duration-1000", active ? "opacity-100" : "opacity-0")}
            aria-hidden={!active}
          >
            {bm?.backdrop ? (
              <>
                <Image
                  src={bm.backdrop}
                  alt=""
                  fill
                  priority={i === 0}
                  className={cn("object-cover brightness-[0.42] saturate-[1.1]", active && "animate-ken-burns")}
                  sizes="100vw"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-base via-base/70 to-base/10" />
              </>
            ) : (
              b.poster && (
                <>
                  <Image
                    src={b.poster}
                    alt=""
                    fill
                    priority={i === 0}
                    className={cn("scale-150 object-cover blur-2xl brightness-[0.34] saturate-150", active && "animate-ken-burns")}
                    sizes="100vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-base via-base/80 to-base/30" />
                </>
              )
            )}
          </div>
        );
      })}
      {/* bottom melt into page */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-base via-base/70 to-transparent sm:h-40" />
      {/* subtle accent glow */}
      <div className="pointer-events-none absolute -left-40 top-1/3 h-[420px] w-[420px] rounded-full bg-accent/10 blur-[140px]" />

      {/* ---------- content ---------- */}
      <div className="container-site relative flex h-full items-end pb-20 sm:items-center sm:pb-0">
        <div className="flex w-full max-w-3xl items-end gap-8 sm:items-center sm:gap-12">
          <div key={item.slug} className="min-w-0 flex-1 animate-fade-up">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-accent-hover">Featured</span>
              <span className="h-px w-8 bg-gradient-to-r from-accent to-transparent" />
              {m?.corner && (
                <span className="rounded-badge bg-gradient-to-br from-[#FFB300] to-[#FF4D00] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  {m.corner}
                </span>
              )}
            </div>

            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)] sm:text-6xl">
              {item.name}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[14px] text-ts">
              {(m?.year || item.year) && (
                <span className="font-semibold text-tp/90">{(m?.year || item.year)}</span>
              )}
              {m?.rating && Number(m.rating) > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[12.5px] font-bold text-warning">
                  <Star size={12} className="fill-warning" strokeWidth={0} />
                  {m.rating}
                </span>
              )}
              {(m?.year || item.year) && (m?.rating && Number(m.rating) > 0) && <span className="text-tm/60">•</span>}
              {m?.isSeries && m.seasons > 0 && (
                <span>{m.seasons} Season{m.seasons > 1 ? "s" : ""}</span>
              )}
              {m?.genre && <span className="text-tm">{m.genre}</span>}
            </div>

            {m?.desc && (
              <p
                className={cn(
                  "mt-4 max-w-xl text-[15px] leading-relaxed text-ts",
                  !expanded && "line-clamp-3"
                )}
              >
                {m.desc}
                {m.desc.length > 160 && (
                  <button
                    onClick={() => setExpanded((v) => !v)}
                    className="ml-1 font-semibold text-accent-hover hover:underline"
                  >
                    {expanded ? "Less" : "More"}
                  </button>
                )}
              </p>
            )}

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                onClick={() => router.push("/watch/" + item.slug)}
                className="inline-flex h-[52px] items-center gap-2.5 rounded-btn bg-gradient-to-br from-[#FFB300] via-accent to-[#FF4D00] px-7 text-[15px] font-bold text-white shadow-[0_6px_28px_rgba(255,122,26,0.4)] transition-all hover:brightness-110 hover:shadow-[0_8px_36px_rgba(255,122,26,0.55)] active:scale-[0.98]"
              >
                <Play size={18} className="fill-white" strokeWidth={0} />
                Watch Now
              </button>
              <button
                onClick={() => router.push("/title/" + item.slug)}
                className="inline-flex h-[52px] items-center gap-2 rounded-btn border border-white/15 bg-white/10 px-6 text-[15px] font-semibold text-tp backdrop-blur-md transition-all hover:bg-white/20"
              >
                <Info size={18} />
                Details
              </button>
              <button
                onClick={() => toggleWL(item)}
                aria-label={inWL ? "Remove from watchlist" : "Add to watchlist"}
                className={cn(
                  "inline-flex h-[52px] w-[52px] items-center justify-center rounded-full border transition-all active:scale-95",
                  inWL
                    ? "border-success/50 bg-success/15 text-success"
                    : "border-white/20 bg-black/40 text-tp backdrop-blur hover:bg-white/15"
                )}
              >
                {inWL ? <Check size={20} strokeWidth={2.5} /> : <Plus size={20} />}
              </button>
            </div>
          </div>

          {/* poster */}
          <div className="relative hidden h-[360px] w-[240px] shrink-0 sm:block sm:h-[420px] sm:w-[280px] lg:h-[460px] lg:w-[307px]">
            <div className="absolute -inset-6 rounded-[24px] bg-accent/15 blur-3xl" />
            <Image
              src={item.poster}
              alt={item.name}
              fill
              priority={idx === 0}
              sizes="307px"
              className="relative rounded-2xl border border-white/15 object-cover shadow-[0_30px_90px_rgba(0,0,0,0.85)]"
            />
            {m?.corner && (
              <span className="absolute left-3 top-3 rounded-badge bg-gradient-to-br from-[#FFB300] to-[#FF4D00] px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-lg">
                {m.corner}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* arrows */}
      {n > 1 && (
        <>
          <button
            onClick={() => go(idx - 1)}
            aria-label="Previous slide"
            className="absolute left-4 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-tp backdrop-blur-md transition-all hover:scale-105 hover:bg-black/70 md:flex"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={() => go(idx + 1)}
            aria-label="Next slide"
            className="absolute right-4 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-tp backdrop-blur-md transition-all hover:scale-105 hover:bg-black/70 md:flex"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      {/* indicators */}
      <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 sm:bottom-8">
        {banner.map((b, i) => (
          <button
            key={b.slug}
            onClick={() => go(i)}
            aria-label={"Slide " + (i + 1)}
            className={cn(
              "h-1.5 rounded-full transition-all duration-500",
              i === idx
                ? "w-10 bg-gradient-to-r from-[#FFB300] to-[#FF4D00] shadow-[0_0_12px_rgba(255,122,26,0.6)]"
                : "w-3.5 bg-white/25 hover:bg-white/45"
            )}
          />
        ))}
      </div>
    </section>
  );
}
