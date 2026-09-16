"use client";
import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Play,
  Plus,
  Check,
  Star,
  Globe,
  Calendar,
  Clock,
  Landmark,
  Users,
  Volume2,
  ChevronLeft,
  ArrowRight,
  Clapperboard,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { useStore } from "@/lib/store";
import { TrailerPlayer } from "@/components/player/TrailerPlayer";
import type { Detail, CatalogType, Title } from "@/lib/types";
import { Button, Modal, Skeleton } from "@/components/ui/primitives";
import { ContentRow } from "@/components/rows/ContentRow";
import { cn, formatCount, formatDate, isLibrarySlug, libraryToDetail } from "@/lib/utils";

/** Only these languages appear in the dub/sub switcher (plus Original audio). */
const DUB_KEEP_CODES = new Set(["hi", "en", "bn"]);
const DUB_KEEP_RE = /hindi|english|bangla|bengali/i;

function useDetail(slug: string) {
  const [d, setD] = React.useState<Detail | null>(null);
  const [error, setError] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const lib = useStore((s) => (isLibrarySlug(slug) ? s.libraryBySlug(slug) : undefined));
  const load = React.useCallback(() => {
    setLoading(true);
    setError(false);
    // Admin-added (self-hosted) title — served from the local library
    if (isLibrarySlug(slug)) {
      if (lib) {
        setD(libraryToDetail(lib));
        setLoading(false);
      } else {
        setError(true);
        setLoading(false);
      }
      return;
    }
    api
      .detail(slug)
      .then(setD)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug, lib]);
  React.useEffect(() => {
    setD(null);
    load();
  }, [load]);
  return { d, error, loading, reload: load };
}

export function DetailClient({ slug }: { slug: string }) {
  const router = useRouter();
  const { d, error, loading, reload } = useDetail(slug);
  const [season, setSeason] = React.useState(0);
  const [related, setRelated] = React.useState<Title[] | null>(null);
  const [trailerOpen, setTrailerOpen] = React.useState(false);

  const inWL = useStore((s) => s.watchlist.some((w) => w.slug === slug));
  const toggleWL = useStore((s) => s.toggleWatchlist);
  const history = useStore((s) => s.history);

  // related titles by type
  React.useEffect(() => {
    if (!d) return;
    const type: CatalogType = d.subjectType === 2 ? "series" : d.subjectType === 8 ? "anime" : "movies";
    let live = true;
    api
      .catalog(type, 1, "LATEST")
      .then((r) => live && setRelated(r.items.filter((x) => x.slug !== d.detailPath).slice(0, 12)))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [d]);

  // reset season when dub/subject changes
  React.useEffect(() => setSeason(0), [d?.subjectId]);

  const progress = history.find((h) => h.slug === slug);
  const pct = progress && progress.duration ? Math.round((progress.progress / progress.duration) * 100) : 0;

  if (loading) return <DetailSkeleton />;
  if (error || !d) {
    return (
      <div className="flex flex-col items-center gap-4 pt-40 text-center">
        <p className="text-lg font-semibold">This title could not be found.</p>
        <p className="text-sm text-tm">It may have been removed from the catalog.</p>
        <Button variant="secondary" icon={<ChevronLeft size={15} />} onClick={() => router.push("/")}>
          Back to home
        </Button>
      </div>
    );
  }

  const isSeries = d.seasons.length > 0;
  const curSeason = d.seasons[season];
  // Language switcher shows only what matters: Original audio, Hindi, English
  // and Bangla (when available). Everything else is hidden.
  const dubs = d.dubs.filter(
    (x) =>
      x.original ||
      DUB_KEEP_CODES.has((x.lanCode || "").toLowerCase()) ||
      DUB_KEEP_RE.test(x.lanName || "")
  );
  const genres = (d.genre || "").split(",").map((g) => g.trim()).filter(Boolean);
  const year = (d.releaseDate || "").slice(0, 4);
  const toTitle = (x: { name: string; slug: string; subjectId: string; poster?: string }) =>
    ({
      name: x.name,
      slug: x.slug,
      subjectId: x.subjectId,
      poster: x.poster || d.cover,
    }) as Title;

  return (
    <div>
      {/* -------- backdrop zone -------- */}
      <div className="relative min-h-[62vh] w-full overflow-hidden">
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          className="absolute left-4 top-20 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-black/50 text-ts backdrop-blur-md transition-all hover:border-line-strong hover:text-tp sm:left-6"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="absolute inset-0">
          {(d.backdrop || d.cover) && (
            <Image
              src={d.backdrop || d.cover}
              alt=""
              fill
              priority
              className={cn(
                "object-cover",
                !d.backdrop && "scale-150 blur-2xl brightness-[0.3]"
              )}
              sizes="100vw"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-base/95 via-base/60 to-base/20" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-base to-transparent" />
        </div>

        <div className="container-site relative flex min-h-[62vh] flex-col justify-end pb-10 pt-28 sm:flex-row sm:items-end sm:gap-10">
          {/* poster */}
          <div className="relative mb-6 h-[240px] w-[160px] shrink-0 sm:mb-0 sm:h-[300px] sm:w-[200px] lg:h-[340px] lg:w-[227px]">
            <Image
              src={d.cover}
              alt={d.title}
              fill
              priority
              sizes="227px"
              className="rounded-card border border-line object-cover shadow-modal"
            />
            {d.corner && (
              <span className="absolute left-2 top-2 rounded-badge bg-gradient-to-br from-[#FFB300] to-[#FF4D00] px-2 py-0.5 text-[11px] font-bold text-white shadow">
                {d.corner}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1 animate-fade-up">
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              {d.title}
            </h1>

            {/* meta */}
            <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm text-ts">
              {year && <span>{year}</span>}
              {d.rating && Number(d.rating) > 0 && (
                <span className="inline-flex items-center gap-1 text-warning">
                  <Star size={14} className="fill-warning" strokeWidth={0} />
                  {d.rating}
                  {d.ratingCount ? <span className="text-tm">({formatCount(d.ratingCount)})</span> : null}
                </span>
              )}
              {isSeries && (
                <span>
                  {d.seasons.length} Season{d.seasons.length > 1 ? "s" : ""} ·{" "}
                  {d.seasons.reduce((a, s) => a + s.maxEp, 0)} Episodes
                </span>
              )}
              {(d.duration || 0) > 0 && (
                <span>
                  {Math.floor(d.duration! / 60)}m {d.duration! % 60}s
                </span>
              )}
              {genres.slice(0, 3).map((g) => (
                <span key={g} className="hidden sm:inline">
                  {g}
                </span>
              ))}
            </div>

            {/* description */}
            {d.description && (
              <p className="mt-4 line-clamp-4 max-w-2xl text-[14.5px] leading-relaxed text-ts">
                {d.description}
              </p>
            )}

            {/* CTAs */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                icon={<Play size={17} className="fill-white" strokeWidth={0} />}
                onClick={() =>
                  router.push(
                    "/watch/" + d.detailPath + (isSeries && curSeason ? `?se=${curSeason.se}&ep=1` : "")
                  )
                }
              >
                {progress && pct > 1 && pct < 90 ? `Resume · ${pct}%` : isSeries ? "Watch S1 E1" : "Watch Now"}
              </Button>
              {d.trailer.url && (
                <Button
                  variant="secondary"
                  size="lg"
                  icon={<Clapperboard size={17} />}
                  onClick={() => setTrailerOpen(true)}
                >
                  Trailer
                </Button>
              )}
              <Button
                variant="secondary"
                size="lg"
                icon={inWL ? <Check size={17} /> : <Plus size={18} />}
                onClick={() =>
                  toggleWL({
                    name: d.title,
                    slug: d.detailPath,
                    subjectId: d.subjectId,
                    poster: d.cover,
                  })
                }
              >
                {inWL ? "In Watchlist" : "Watchlist"}
              </Button>
              {progress && pct >= 90 && (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-success">
                  <Check size={15} strokeWidth={3} /> Watched
                </span>
              )}
            </div>

            {/* language / dub switcher */}
            {dubs.length > 1 && (
              <div className="mt-7">
                <p className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-tm">
                  <Volume2 size={13} /> Language
                </p>
                <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                  {dubs.map((du) => {
                    const isCur = du.detailPath === d.detailPath;
                    return (
                      <button
                        key={du.detailPath}
                        onClick={() => !isCur && router.push("/title/" + du.detailPath)}
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-all duration-200",
                          isCur
                            ? "border-transparent bg-gradient-to-br from-[#FFB300] via-accent to-[#FF4D00] text-white shadow-[0_2px_12px_rgba(255,122,26,0.35)]"
                            : "border-line bg-white/5 text-ts hover:border-line-strong hover:text-tp"
                        )}
                      >
                        <Globe size={13} />
                        {du.lanName}
                        {du.original && <span className="text-[10px] opacity-70">(Original)</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* -------- info band -------- */}
      <div className="border-y border-line bg-surface/60">
        <div className="container-site grid gap-x-8 gap-y-5 py-8 sm:grid-cols-2 lg:grid-cols-4">
          <InfoItem icon={<Calendar size={15} />} label="Release date" value={d.releaseDate ? formatDate(d.releaseDate) : "—"} />
          <InfoItem
            icon={<Landmark size={15} />}
            label="Country"
            value={d.country || "—"}
          />
          <InfoItem
            icon={<Clock size={15} />}
            label="Genres"
            value={genres.length ? genres.join(", ") : "—"}
          />
          <InfoItem
            icon={<Globe size={15} />}
            label="Audio / Subtitles"
            value={
              dubs.length
                ? dubs.map((x) => x.lanName).slice(0, 3).join(" · ") +
                  (dubs.length > 3 ? " +" + (dubs.length - 3) : "")
                : "—"
            }
          />
        </div>
      </div>

      <div className="container-site">
        {/* -------- episodes -------- */}
        {isSeries && (
          <section className="py-10" aria-label="Episodes">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold tracking-tight">Episodes</h2>
              <div className="no-scrollbar flex max-w-full gap-1.5 overflow-x-auto sm:flex-wrap" role="tablist" aria-label="Seasons">
                {d.seasons.map((s, i) => (
                  <button
                    key={s.se}
                    role="tab"
                    aria-selected={season === i}
                    onClick={() => setSeason(i)}
                    className={cn(
                      "rounded-full px-4 py-1.5 text-[13px] font-semibold transition-all",
                      season === i
                        ? "bg-gradient-to-br from-[#FFB300] via-accent to-[#FF4D00] text-white"
                        : "bg-white/5 text-ts hover:bg-white/10 hover:text-tp"
                    )}
                  >
                    Season {s.se}
                  </button>
                ))}
              </div>
            </div>
            {curSeason && (
              <div className="grid gap-2.5">
                {Array.from({ length: curSeason.maxEp }, (_, i) => i + 1).map((ep) => {
                  const watched = history.find(
                    (h) => h.slug === d.detailPath && h.se === curSeason.se && h.ep === ep
                  );
                  const wpct =
                    watched && watched.duration
                      ? Math.round((watched.progress / watched.duration) * 100)
                      : 0;
                  return (
                    <button
                      key={ep}
                      onClick={() => router.push(`/watch/${d.detailPath}?se=${curSeason.se}&ep=${ep}`)}
                      className="group flex w-full items-center gap-4 rounded-card border border-line bg-card/60 p-3 text-left transition-all duration-200 hover:border-line-strong hover:bg-card"
                    >
                      <span className="w-8 shrink-0 text-center text-sm font-bold text-tm">
                        {ep}
                      </span>
                      <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-black">
                        <Image
                          src={d.backdrop || d.cover}
                          alt=""
                          fill
                          sizes="112px"
                          className="object-cover opacity-80 transition-transform duration-300 group-hover:scale-110"
                          loading="lazy"
                        />
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-black opacity-0 transition-opacity group-hover:opacity-100">
                            <Play size={13} className="ml-0.5 fill-black" strokeWidth={0} />
                          </span>
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {curSeason.se === 1 && ep === 1 && !d.description ? "Episode 1" : `Episode ${ep}`}
                        </p>
                        {wpct > 0 ? (
                          <p className="mt-0.5 text-xs text-tm">{wpct >= 90 ? "Watched" : wpct + "% watched"}</p>
                        ) : (
                          <p className="mt-0.5 text-xs text-tm">
                            {curSeason.resolutions[0] ? curSeason.resolutions[curSeason.resolutions.length - 1].resolution + "p" : ""}
                          </p>
                        )}
                      </div>
                      {wpct > 0 && wpct < 90 && (
                        <div className="h-[3px] w-24 shrink-0 overflow-hidden rounded-full bg-white/10 sm:w-32">
                          <div
                            className="h-full bg-gradient-to-r from-[#FFB300] to-[#FF4D00]"
                            style={{ width: wpct + "%" }}
                          />
                        </div>
                      )}
                      {wpct >= 90 && (
                        <Check size={16} className="shrink-0 text-success" strokeWidth={2.5} />
                      )}
                      <ArrowRight size={16} className="shrink-0 text-tm transition-transform group-hover:translate-x-0.5 group-hover:text-tp" />
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* -------- cast -------- */}
        {d.stars.length > 0 && (
          <section className="py-8" aria-label="Cast">
            <h2 className="mb-5 flex items-center gap-2 text-xl font-bold tracking-tight">
              <Users size={19} className="text-tm" /> Cast
            </h2>
            <div className="no-scrollbar flex gap-4 overflow-x-auto pb-1">
              {d.stars.slice(0, 14).map((s, i) => (
                <div key={i} className="w-[92px] shrink-0 text-center">
                  <div className="relative mx-auto h-[76px] w-[76px] overflow-hidden rounded-full border border-line">
                    {s.avatar ? (
                      <Image
                        src={s.avatar}
                        alt={s.name}
                        fill
                        sizes="76px"
                        className="object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-white/5 text-sm font-bold text-tm">
                        {s.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <p className="mt-2 truncate text-[12.5px] font-semibold">{s.name}</p>
                  {s.character && <p className="truncate text-[11px] text-tm">{s.character}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* -------- related -------- */}
      {related && related.length > 0 && (
        <ContentRow
          label={
            (d.subjectType === 2 ? "More Series" : d.subjectType === 8 ? "More Anime" : "More Movies")
          }
          items={related}
        />
      )}
      <div className="h-4" />

      {/* -------- trailer modal -------- */}
      <Modal open={trailerOpen} onClose={() => setTrailerOpen(false)} size="video" hideClose>
        <div className="relative w-full bg-black">
          {trailerOpen && d.trailer.url ? (
            <TrailerPlayer key={d.trailer.url} src={d.trailer.url} poster={d.backdrop || d.cover} title={d.title} />
          ) : (
            <div className="flex aspect-video items-center justify-center text-sm text-tm">Trailer unavailable</div>
          )}
          <button
            onClick={() => setTrailerOpen(false)}
            aria-label="Close trailer"
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-ts backdrop-blur transition-colors hover:text-tp"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-3.5">
          <p className="truncate text-xs text-tm">
            Tip: tap the video to play/pause · double-tap left/right to jump 15s · keys: Space, ←/→, M
          </p>
        </div>
      </Modal>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-accent-hover">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-tm">{label}</p>
        <p className="mt-0.5 truncate text-sm font-medium text-tp" title={value}>
          {value}
        </p>
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="relative min-h-[62vh]">
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-base" />
      <div className="container-site relative flex min-h-[62vh] flex-col justify-end pb-10 pt-28 sm:flex-row sm:items-end sm:gap-10">
        <Skeleton className="mb-6 h-[240px] w-[160px] shrink-0 rounded-card sm:mb-0 sm:h-[300px] sm:w-[200px]" />
        <div className="flex-1">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="mt-4 h-4 w-1/2" />
          <Skeleton className="mt-5 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-2/3" />
          <div className="mt-7 flex gap-3">
            <Skeleton className="h-12 w-36" />
            <Skeleton className="h-12 w-36" />
          </div>
        </div>
      </div>
    </div>
  );
}
