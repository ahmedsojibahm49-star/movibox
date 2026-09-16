export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export function formatDuration(sec: number): string {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

export function formatRuntime(min?: number): string {
  if (!min || min <= 0) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m ? m + "m" : ""}`.trim();
}

export function formatDate(d?: string): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return d;
  }
}

export function formatCount(n?: number): string {
  if (n == null) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function titleFromSlug(slug: string): string {
  return slug.replace(/-[a-z0-9]{10,}$/, "").replace(/-/g, " ");
}

// ---------- Custom library helpers (admin-added titles) ----------
import type { Title, Detail, LibraryTitle } from "./types";

export const isLibrarySlug = (slug: string) => slug.startsWith("lib-");

/** Map a library title into the generic list shape (rows, search, watchlist) */
export function libraryToTitle(t: LibraryTitle): Title {
  return {
    name: t.name,
    slug: t.slug,
    subjectId: t.id,
    poster: t.poster || "",
    year: t.year || undefined,
    badge: "Mine",
  };
}

/** Build a full Detail object so /title and /watch reuse all existing UI */
export function libraryToDetail(t: LibraryTitle): Detail {
  const maxEp = t.type === "series" ? Math.max(1, t.episodeCount || 1) : 0;
  return {
    subjectId: t.id,
    subjectType: t.type === "series" ? 2 : 1,
    title: t.name,
    description: t.description || "",
    releaseDate: t.year ? t.year + "-01-01" : undefined,
    duration: 0,
    genre: t.genre || "",
    cover: t.poster || "",
    backdrop: t.backdrop || undefined,
    country: t.language || undefined,
    rating: undefined,
    detailPath: t.slug,
    trailer: {},
    stars: [],
    seasons: maxEp > 0 ? [{ se: 1, maxEp, resolutions: [] }] : [],
    dubs: t.language ? [{ subjectId: t.id, lanName: t.language, lanCode: "", original: true, type: 0, detailPath: t.slug }] : [],
    access: null,
    hasResource: true,
  };
}
