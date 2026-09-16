// Server-side MovieBox API client with in-memory TTL cache.
import type {
  Title,
  Suggestion,
  HomeData,
  Detail,
  StreamResult,
  CatalogType,
  SortKey,
} from "./types";
import { isJunkTitle, classifyTypes } from "./quality";

const API_URL = (process.env.MOVIEBOX_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

interface CacheEntry {
  data: unknown;
  at: number;
}
const cache = new Map<string, CacheEntry>();

async function rawFetch(path: string, ttlMs: number): Promise<any> {
  const key = "mb:" + path;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.data;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  let res: Response;
  try {
    res = await fetch(API_URL + path, { signal: ctrl.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new Error("MovieBox API error: " + res.status);
  const data = await res.json();
  if (ttlMs > 0) cache.set(key, { data, at: Date.now() });
  return data;
}

// MovieBox API list items: { name, poster_url, slug, subject_id, badge, rating, year? }
function toTitle(sub: any): Title | null {
  if (!sub || !sub.name || !sub.slug) return null;
  const rating = sub.rating != null && sub.rating !== "" ? String(sub.rating) : undefined;
  return {
    name: sub.name,
    slug: sub.slug,
    subjectId: String(sub.subject_id ?? ""),
    poster: sub.poster_url ?? "",
    rating: rating && Number(rating) > 0 ? rating : undefined,
    year: sub.year ? String(sub.year) : null,
    badge: sub.badge || undefined,
  };
}

export async function getHome(): Promise<HomeData> {
  const d = await rawFetch("/home", 15 * 60 * 1000);
  const sections: HomeData["sections"] = [];
  let banner: Title[] = [];
  for (const s of d.sections ?? []) {
    const items = (s.items ?? [])
      .map(toTitle)
      .filter((t: Title | null): t is Title => !!t && !!t.poster);
    if (s.section === "Banner") {
      banner = items;
    } else if (items.length) {
      sections.push({ label: s.section, items });
    }
  }
  return { banner, sections };
}

const TYPE_ENDPOINT: Record<CatalogType, string> = {
  movies: "/movies",
  series: "/tv-series",
  anime: "/animation",
};

// How many cards one catalog page carries.
const CATALOG_PAGE_SIZE = 48;

// Pool pages are safe to cache briefly (they are stable lists).
const JUNK_TTL = 10 * 60 * 1000;

// Remember where infinite scroll left off in the raw upstream pool,
// per type+sort, so consecutive pages never re-fetch (or duplicate) pages.
const poolCursor: Record<CatalogType, Partial<Record<SortKey, number>>> = {
  movies: {},
  series: {},
  anime: {},
};

/**
 * Catalog = the FULL upstream pool, unfiltered (exactly what MovieBox shows —
 * every title in the pool, mixed types included), paged with infinite scroll.
 * Page size 48 = two upstream (24-item) pages, so every scroll chunk is fast
 * and the shelf keeps growing until the pool is exhausted (~1M titles).
 */
export async function getCatalog(
  type: CatalogType,
  page: number,
  sort: SortKey
): Promise<{ page: number; total: number; items: Title[]; hasMore: boolean }> {
  const items: Title[] = [];
  const seen = new Set<string>();
  const push = (t: Title | null) => {
    if (t && !seen.has(t.slug)) {
      seen.add(t.slug);
      items.push(t);
    }
  };

  let upstreamPage = page === 1 ? 1 : poolCursor[type][sort] ?? 1;
  let nearEnd = false;
  let fetched = 0;

  while (items.length < CATALOG_PAGE_SIZE && fetched < 4) {
    const d = await rawFetch(
      TYPE_ENDPOINT[type] + `?page=${upstreamPage}&sort=${sort}`,
      JUNK_TTL
    ).catch(() => null);
    fetched++;
    const rawItems: any[] = d?.items ?? [];
    if (rawItems.length === 0) {
      nearEnd = true; // pool genuinely exhausted
      break;
    }
    for (const raw of rawItems) {
      if (items.length >= CATALOG_PAGE_SIZE) break;
      push(toTitle(raw));
    }
    upstreamPage++;
  }
  poolCursor[type][sort] = upstreamPage;

  const out = items.slice(0, CATALOG_PAGE_SIZE);
  return {
    page,
    total: out.length,
    items: out,
    hasMore: !nearEnd,
  };
}

export async function getSearch(
  q: string,
  page: number
): Promise<{ query: string; total: number; items: Title[]; hasMore: boolean }> {
  const d = await rawFetch(`/search?q=${encodeURIComponent(q)}&page=${page}`, 5 * 60 * 1000);
  const items = (d.items ?? [])
    .map(toTitle)
    .filter((t: Title | null): t is Title => !!t && !!t.poster && !isJunkTitle(t.name));
  const total = d.total ?? items.length;
  return { query: q, total, items, hasMore: items.length === 20 };
}

// ---------------- Midnight (18+ mature content) ----------------

/**
 * Assembles the Midnight shelf from upstream searches.
 * "picks"  → 18+ movies & series  (searches: 18+, adult)
 * "anime"  → 18+ anime only        (search: hentai, verified subjectType 8)
 */
export async function getMidnight(): Promise<{ picks: Title[]; anime: Title[] }> {
  // Mature content only exists via search — fan out across several queries
  // AND several pages each, so the shelf stays full (hundreds of titles).
  const MIDNIGHT_TTL = 30 * 60 * 1000;
  const pickQueries: Array<[string, number]> = [
    ["18+", 3],
    ["adult", 3],
    ["x-rated", 2],
    ["erotic", 2],
    ["nude", 2],
  ];
  const animeQueries: Array<[string, number]> = [
    ["hentai", 3],
    ["18+ anime", 2],
  ];
  const fetchPages = (q: string, pages: number) =>
    Promise.all(
      Array.from({ length: pages }, (_, i) =>
        rawFetch(`/search?q=${encodeURIComponent(q)}&page=${i + 1}`, MIDNIGHT_TTL).catch(() => null)
      )
    );
  const [mainResults, animeResults] = await Promise.all([
    Promise.all(pickQueries.map(([q, n]) => fetchPages(q, n))),
    Promise.all(animeQueries.map(([q, n]) => fetchPages(q, n))),
  ]);

  const toT = (d: any): Title[] =>
    ((d?.items ?? []) as any[])
      .map(toTitle)
      .filter((t: Title | null): t is Title => !!t && !!t.poster && !isJunkTitle(t.name));

  const mainSeen = new Set<string>();
  const main: Title[] = [];
  for (const pages of mainResults)
    for (const d of pages)
      for (const t of toT(d))
        if (!mainSeen.has(t.slug)) {
          mainSeen.add(t.slug);
          main.push(t);
        }
  const animeSeen = new Set<string>();
  const animeRaw: Title[] = [];
  for (const pages of animeResults)
    for (const d of pages)
      for (const t of toT(d))
        if (!animeSeen.has(t.slug)) {
          animeSeen.add(t.slug);
          animeRaw.push(t);
        }

  const [mainTypes, animeTypes] = await Promise.all([
    classifyTypes(main, 10),
    classifyTypes(animeRaw, 10),
  ]);

  // Upstream classifies adult anime as type 1/2 (not 8) — so for the
  // "Mature Anime" shelf we keep everything that's a real title
  // (movie/series) and drop music/other (type 6 etc).
  const isReal = (types: Map<string, number>, t: Title) => [1, 2].includes(types.get(t.slug) ?? -1);
  const picks = main.filter((t) => isReal(mainTypes, t)).slice(0, 72);
  const anime = animeRaw.filter((t) => isReal(animeTypes, t)).slice(0, 36);

  return { picks, anime };
}

export async function getSuggest(q: string): Promise<Suggestion[]> {
  const d = await rawFetch(`/search/suggest?q=${encodeURIComponent(q)}`, 2 * 60 * 1000);
  return (d.suggestions ?? [])
    .map((s: any) => ({
      title: String(s.title ?? ""),
      slug: s.slug || undefined,
      subjectId: s.subject_id != null ? String(s.subject_id) : undefined,
    }))
    .filter((s: Suggestion) => s.title);
}

// ---------- Detail normalization ----------

export async function getDetail(slug: string): Promise<Detail> {
  const d = await rawFetch(`/detail/${encodeURIComponent(slug)}`, 30 * 60 * 1000);
  const data = d?.data ?? {};
  const sub = data.subject ?? {};
  return {
    subjectId: String(sub.subjectId ?? ""),
    subjectType: sub.subjectType ?? 0,
    title: sub.title ?? "",
    description: sub.description ?? "",
    releaseDate: sub.releaseDate ?? undefined,
    duration: sub.duration ?? 0,
    genre: sub.genre ?? "",
    cover: sub.cover?.url ?? "",
    backdrop: sub.stills?.url ?? undefined,
    country: sub.countryName ?? undefined,
    rating: sub.imdbRatingValue != null ? String(sub.imdbRatingValue) : undefined,
    ratingCount: sub.imdbRatingCount ?? 0,
    subtitles: sub.subtitles ?? undefined,
    corner: sub.corner ?? undefined,
    detailPath: sub.detailPath ?? slug,
    trailer: {
      url: sub.trailer?.videoAddress?.url,
      duration: sub.trailer?.videoAddress?.duration,
    },
    stars: (data.stars ?? []).map((s: any) => ({
      name: s.name,
      character: s.character,
      avatar: s.avatarUrl,
    })),
    seasons: (data.resource?.seasons ?? []).map((s: any) => ({
      se: s.se,
      maxEp: s.maxEp,
      resolutions: s.resolutions ?? [],
    })),
    dubs: (sub.dubs ?? []).map((x: any) => ({
      subjectId: String(x.subjectId ?? ""),
      lanName: x.lanName ?? "",
      lanCode: x.lanCode ?? "",
      original: !!x.original,
      type: x.type ?? 0,
      detailPath: x.detailPath ?? "",
    })),
    access: data.accessStrategy ?? null,
    hasResource: !!sub.hasResource,
  };
}

export async function getStream(
  subjectId: string,
  detailPath: string,
  se: number,
  ep: number
): Promise<StreamResult> {
  // NO cache — signed URLs expire
  const d = await rawFetch(
    `/api/stream/${subjectId}?detail_path=${encodeURIComponent(detailPath)}&se=${se}&ep=${ep}`,
    0
  );
  return {
    hasResource: !!d.has_resource,
    limited: !!d.limited,
    sources: (d.sources ?? [])
      .filter((s: any) => s.url)
      .map((s: any) => ({
        quality: s.resolution ?? "",
        format: s.format ?? "MP4",
        url: s.url,
        duration: Number(s.duration ?? 0),
        size: String(s.size ?? ""),
      })),
    hls: d.hls ?? [],
    dash: d.dash ?? [],
    freeEpisodes: d.free_episodes ?? null,
    note: d.note ?? null,
  };
}

export async function getCaptions(
  subjectId: string,
  detailPath: string,
  se: number,
  ep: number
): Promise<unknown[]> {
  const d = await rawFetch(
    `/api/stream/${subjectId}/captions?detail_path=${encodeURIComponent(detailPath)}&se=${se}&ep=${ep}`,
    60 * 60 * 1000
  );
  return d.captions ?? [];
}

export function apiHealthCheck(): { url: string } {
  return { url: API_URL };
}
