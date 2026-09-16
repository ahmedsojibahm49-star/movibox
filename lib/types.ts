// ---------- Core domain types (normalized from MovieBox API) ----------

export type SortKey = "RECOMMEND" | "HOT" | "LATEST" | "POPULAR";
export type CatalogType = "movies" | "series" | "anime";

/** A single title as it appears in lists / banners / search */
export interface Title {
  name: string;
  slug: string;
  subjectId: string;
  poster: string;
  rating?: string; // "8.2"
  year?: string | null; // "2026"
  badge?: string; // "HOT" | "NEW" | "Hindi" | ... (corner tag)
}

export interface HomeSection {
  label: string;
  items: Title[];
}

export interface HomeData {
  banner: Title[];
  sections: HomeSection[];
}

/** Detail endpoint normalized */
export interface Dub {
  subjectId: string;
  lanName: string; // "Hindi dub", "Original Audio", "Eng sub"
  lanCode: string; // "hi", "en", "ja"
  original: boolean;
  type: number; // 0 dub, 1 sub
  detailPath: string;
}

export interface Star {
  name: string;
  character?: string;
  avatar?: string;
}

export interface Season {
  se: number;
  maxEp: number;
  resolutions: { resolution: number; epNum: number }[];
}

export interface Trailer {
  url?: string;
  duration?: number;
}

export interface AccessStrategy {
  ruleType?: number;
  requiredVipLevel?: number;
  freeEpisodeCount?: number;
  previewSeconds?: number;
}

export interface Detail {
  subjectId: string;
  subjectType: number; // 1 movie, 2 series/tv, 8 animation (varies)
  title: string;
  description: string;
  releaseDate?: string; // "2013-09-28"
  duration?: number;
  genre: string; // "Anime,Action,Adventure"
  cover: string; // poster
  backdrop?: string; // stills
  country?: string;
  rating?: string;
  ratingCount?: number;
  subtitles?: string;
  corner?: string;
  detailPath: string;
  trailer: Trailer;
  stars: Star[];
  seasons: Season[];
  dubs: Dub[];
  access: AccessStrategy | null;
  hasResource: boolean;
}

/** Autocomplete suggestion — upstream may return title only (no slug) */
export interface Suggestion {
  title: string;
  slug?: string;
  subjectId?: string;
}

/**
 * Custom title added from the Admin dashboard.
 * The video can be any direct MP4 / M3U8 link — self-hosted, your own API,
 * or any public host. These play through the same player (HLS auto-detected).
 */
export interface LibraryTitle {
  id: string;
  slug: string; // "lib-<id>" — routed by /title and /watch like any other slug
  name: string;
  type: "movie" | "series";
  videoUrl: string; // direct MP4 or M3U8
  poster?: string;
  backdrop?: string;
  year?: string;
  genre?: string;
  language?: string;
  description?: string;
  episodeCount?: number; // optional; each listed episode plays the same video
  /** Where the title is published: "home" | "movies" | "series" | "anime" | "midnight" */
  sections?: string[];
  createdAt: number;
}

/** Stream endpoint normalized */
export interface StreamSource {
  quality: string; // "1080p"
  format: string; // "MP4" | "HLS"
  url: string;
  duration: number; // seconds
  size: string;
}

export interface StreamResult {
  hasResource: boolean;
  limited: boolean;
  sources: StreamSource[];
  hls: unknown[];
  dash: unknown[];
  freeEpisodes: number | null;
  note: string | null;
}

export interface Caption {
  // shape from /captions — passthrough (varies)
  [key: string]: unknown;
}
