"use client";
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Play, Plus, Check, Star, X } from "lucide-react";
import type { Title } from "@/lib/types";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * Poster card.
 * Desktop: hover overlay with Play / Watchlist actions.
 * Mobile: tap → detail (no hover).
 */
export function MovieCard({ t, wide, fluid }: { t: Title; wide?: boolean; fluid?: boolean }) {
  const router = useRouter();
  const inWL = useStore((s) => s.watchlist.some((w) => w.slug === t.slug));
  const toggleWL = useStore((s) => s.toggleWatchlist);
  const [imgOk, setImgOk] = React.useState(true);

  const open = () => router.push("/title/" + t.slug);

  return (
    <div
      className={cn(
        "group relative cursor-pointer",
        fluid ? "w-full" : "shrink-0 " + (wide ? "w-[260px] sm:w-[300px]" : "w-[148px] sm:w-[158px] md:w-[172px] lg:w-[188px]")
      )}
      onClick={open}
      role="link"
      aria-label={t.name}
      onKeyDown={(e) => e.key === "Enter" && open()}
      tabIndex={0}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-card border border-line bg-card transition-all duration-300 ease-out",
          "group-hover:-translate-y-1 group-hover:border-line-strong group-hover:shadow-card"
        )}
      >
        {/* poster */}
        <div className={cn("relative w-full", wide ? "aspect-video" : "aspect-[2/3]")}>
          {imgOk && t.poster ? (
            <Image
              src={t.poster}
              alt={t.name}
              fill
              sizes={wide ? "300px" : "200px"}
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => setImgOk(false)}
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-white/5 to-transparent">
              <Play size={28} className="text-tm" strokeWidth={1.5} />
            </div>
          )}
          {/* bottom gradient */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/85 to-transparent" />

          {/* badges */}
          <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
            {t.badge && (
              <span className="rounded-badge bg-gradient-to-br from-[#FFB300] to-[#FF4D00] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
                {t.badge}
              </span>
            )}
            {inWL && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-success" title="In watchlist">
                <Check size={12} strokeWidth={3} />
              </span>
            )}
          </div>

          {/* hover overlay (desktop) */}
          <div className="absolute inset-x-0 bottom-0 flex translate-y-2 items-center gap-2 p-2.5 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 max-lg:hidden">
            <button
              onClick={(e) => {
                e.stopPropagation();
                open();
              }}
              aria-label={"Play " + t.name}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-110"
            >
              <Play size={16} className="ml-0.5 fill-black" strokeWidth={0} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleWL(t);
              }}
              aria-label={inWL ? "Remove from watchlist" : "Add to watchlist"}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full border transition-all hover:scale-110",
                inWL
                  ? "border-success/60 bg-success/20 text-success"
                  : "border-line-strong bg-black/50 text-tp hover:bg-black/70"
              )}
            >
              {inWL ? <Check size={15} strokeWidth={2.5} /> : <Plus size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* info */}
      <div className="mt-2 px-0.5">
        <p className="truncate text-[13.5px] font-semibold text-tp/95">{t.name}</p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-tm">
          {t.year && <span>{t.year}</span>}
          {t.rating && Number(t.rating) > 0 && (
            <span className="inline-flex items-center gap-1">
              <Star size={11} className="fill-warning text-warning" strokeWidth={0} />
              {t.rating}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/** Continue-watching card (16:9 with progress) */
export function WideCard({
  t,
  progress,
  duration,
  onRemove,
  label,
}: {
  t: Title;
  progress: number;
  duration: number;
  onRemove?: () => void;
  label?: string;
}) {
  const router = useRouter();
  const pct = duration > 0 ? Math.min(99, Math.round((progress / duration) * 100)) : 0;
  const [imgOk, setImgOk] = React.useState(true);
  return (
    <div
      className="group relative w-[260px] shrink-0 cursor-pointer sm:w-[300px]"
      onClick={() => router.push("/watch/" + t.slug)}
      role="link"
      aria-label={"Resume " + t.name}
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && router.push("/watch/" + t.slug)}
    >
      <div className="relative overflow-hidden rounded-card border border-line bg-card transition-all duration-300 group-hover:border-line-strong group-hover:shadow-card">
        <div className="relative aspect-video">
          {imgOk && t.poster ? (
            <Image
              src={t.poster}
              alt={t.name}
              fill
              sizes="300px"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => setImgOk(false)}
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-white/5 to-transparent">
              <Play size={28} className="text-tm" strokeWidth={1.5} />
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          {/* center play on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-black shadow-modal">
              <Play size={20} className="ml-0.5 fill-black" strokeWidth={0} />
            </span>
          </div>
          {onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              aria-label="Remove from continue watching"
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-ts opacity-0 transition-opacity hover:text-tp group-hover:opacity-100"
            >
              <X size={13} strokeWidth={3} />
            </button>
          )}
          {/* progress */}
          <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/15">
            <div
              className="h-full bg-gradient-to-r from-[#FFB300] to-[#FF4D00]"
              style={{ width: pct + "%" }}
            />
          </div>
        </div>
      </div>
      <div className="mt-2 px-0.5">
        <p className="truncate text-[13.5px] font-semibold text-tp/95">{t.name}</p>
        <p className="mt-0.5 text-xs text-tm">{label ? label + " · " : ""}{pct}% watched</p>
      </div>
    </div>
  );
}

export function CardSkeleton({ wide, fluid }: { wide?: boolean; fluid?: boolean }) {
  return (
    <div className={cn(fluid ? "w-full" : "shrink-0 " + (wide ? "w-[260px] sm:w-[300px]" : "w-[148px] sm:w-[158px] md:w-[172px] lg:w-[188px]"))}>
      <div className={cn("skeleton", wide ? "aspect-video" : "aspect-[2/3]")} />
      <div className="skeleton mt-2 h-3.5 w-4/5" />
      <div className="skeleton mt-1.5 h-3 w-2/5" />
    </div>
  );
}
