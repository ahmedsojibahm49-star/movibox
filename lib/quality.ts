// ---------------------------------------------------------------
// Title quality layer:
//  1. Junk filter — the upstream "1M pool" is heavily polluted with
//     music mixes, playlists, DJ sets, live concerts and pranks.
//     These are never real movie/series/anime titles.
//  2. Subject-type classifier — asks the API for each item's
//     subjectType (1 movie, 2 series, 8 anime, 6 music…) so the
//     Movies page shows only movies, Anime only anime, etc.
//
//  The type cache is PERSISTED to disk (data/type-cache.json) so the
//  catalog stays fast across restarts and grows the warmer it gets.
// ---------------------------------------------------------------

import * as fs from "fs";
import * as path from "path";

const API_URL = (process.env.MOVIEBOX_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

// Real movie/series titles never contain emoji or music keywords.
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2B00}-\u{2BFF}]/u;

const JUNK_RE =
  /\b(mix(es|ed|ing)?|playlist|play ?list|\bdj\b|dj\b|amapiano|riddim|afro ?beats?|songs?|album|lyrics?|remix|tik ?tok|greatest hits|top (10|20|50|100)|1 hour|hour (of|long)|full (album|movie|song)|video ?mix|party|non ?stop|onstage|concert|karaoke|medley|tribute|prank|viral|jedgeg|jedag|jodog|soca|bongo|opm|reggae|crunk|lovers? ?rock|chill(ing)? ?(mix|songs?|playlist)|love songs?|road trip|bollywood (songs?|mix)|nigeria (mix|songs?)|african (mix|songs?)|hits (20|best))\b/i;

export function isJunkTitle(name: string): boolean {
  if (!name) return true;
  if (EMOJI_RE.test(name)) return true;
  return JUNK_RE.test(name);
}

// ---------------- subjectType cache (memory + disk) ----------------

interface TypeEntry {
  type: number;
  at: number;
}

const CACHE_FILE = path.join(process.cwd(), "data", "type-cache.json");
const TYPE_TTL = 30 * 60 * 1000; // memory TTL
const DISK_TTL = 7 * 24 * 60 * 60 * 1000; // disk TTL (subjectType is stable)
const DISK_MAX = 60000; // keep the cache file bounded

const typeCache = new Map<string, TypeEntry>();
let disk: Record<string, TypeEntry> = {};
let diskLoaded = false;
let saveTimer: NodeJS.Timeout | null = null;

function loadDisk() {
  if (diskLoaded) return;
  diskLoaded = true;
  try {
    disk = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")) as Record<string, TypeEntry>;
  } catch {
    disk = {};
  }
}

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      let entries = Object.entries(disk);
      if (entries.length > DISK_MAX) {
        entries = entries
          .sort((a, b) => (b[1]?.at ?? 0) - (a[1]?.at ?? 0))
          .slice(0, DISK_MAX);
      }
      fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
      const tmp = CACHE_FILE + ".tmp";
      fs.writeFileSync(tmp, JSON.stringify(Object.fromEntries(entries)));
      fs.renameSync(tmp, CACHE_FILE);
    } catch {
      /* cache persistence is best-effort */
    }
  }, 5000);
}

/**
 * subjectType: 1 = movie, 2 = series/tv, 8 = anime/animation, 6 = music, others = misc.
 * Returns 0 when unknown (callers treat 0 as "not the wanted type").
 */
export async function getSubjectType(slug: string): Promise<number> {
  const now = Date.now();
  const hit = typeCache.get(slug);
  if (hit && now - hit.at < TYPE_TTL) return hit.type;

  loadDisk();
  const fromDisk = disk[slug];
  if (fromDisk && now - fromDisk.at < DISK_TTL) {
    typeCache.set(slug, fromDisk);
    return fromDisk.type;
  }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(API_URL + "/detail/" + encodeURIComponent(slug), {
      signal: ctrl.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error("status " + res.status);
    const d = (await res.json()) as any;
    const t = Number(d?.data?.subject?.subjectType ?? 0);
    const entry: TypeEntry = { type: t, at: now };
    typeCache.set(slug, entry);
    disk[slug] = entry;
    scheduleSave();
    return t;
  } catch {
    return 0;
  }
}

/** Classify a batch of items concurrently (default 12 at a time). */
export async function classifyTypes<T extends { slug: string }>(
  items: T[],
  concurrency = 12
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const queue = [...items];
  const workers = Array.from({ length: Math.min(concurrency, Math.max(1, queue.length)) }, async () => {
    for (;;) {
      const it = queue.shift();
      if (!it) break;
      out.set(it.slug, await getSubjectType(it.slug));
    }
  });
  await Promise.all(workers);
  return out;
}

/** How many slugs are already classified (memory + disk). */
export function classifiedCount(): number {
  loadDisk();
  return new Set([...typeCache.keys(), ...Object.keys(disk)]).size;
}
