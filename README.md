# StreamBox

**Premium movie & series streaming web app** — college project.
Built with Next.js 14 (App Router) + TypeScript + Tailwind CSS, powered by the free open-source **MovieBox API** (MIT).

![stack](https://img.shields.io/badge/Next.js-14-black) ![ts](https://img.shields.io/badge/TypeScript-5-blue) ![tailwind](https://img.shields.io/badge/Tailwind-3.4-38bdf8)

---

## Features

- **Home** — cinematic rotating hero (backdrop art, auto-rotate 7s, pause on hover, indicators, arrows), continue-watching row, **My Collection row (your admin-added videos)**, 21 live content rows from the API (Trending, Hot, Nollywood, Epic Fantasy, Sitcom, Teen Romance…)
- **Browse** — Movies / Series / Anime catalogs with sort (Recommended, Hot, Latest, Popular) + **infinite scroll (48 cards/page, keeps loading)**. **Junk-free by design**: the server classifies every title via the upstream `subjectType` (disk-persisted cache + background pre-warm) so music mixes / DJ playlists / clips never appear. Curated type-pure collections lead each page; the pool continues behind it. (Honest note: the upstream catalog is one big 1M mixed pool — *pure* anime/movies exist in the hundreds, so the Anime/Movies shelves are curated-first; Series is deeply pure and grows as you scroll.)
- **Midnight** (`/midnight`) — **18+ mature shelf, gated by a user setting**: hidden by default — no nav link, and a gate screen on the page. The user enables **"Show Midnight (18+) content"** in Profile → Settings (or right from the gate), after which Midnight appears in the top nav + mobile bottom tabs and the shelf loads: moonlit purple hero with 18+ badge, admin uploads (Fresh Uploads), **Mature Picks** (~72) + **Mature Anime** (~36) — ~100+ mature titles
- **Top 10** (`/top10`) — Netflix-style numbered ranking of the 10 most popular titles across movies, series and anime
- **Genres** — dynamic collection directory + per-collection grid
- **Search** — global overlay (`/`, `⌘K` / `Ctrl+K`) with 300ms debounced suggestions, matched-text highlight, keyboard navigation, recent searches (2-column + clear), “Popular right now” chips + full results page — **also searches your custom library**
- **Detail page** — backdrop hero, poster, meta, description, **back button** (returns to the page you came from), **language switcher (Original audio + Hindi / English / Bangla dubs + sub versions — other languages are hidden)**, seasons + episode list with per-episode progress, cast, **trailer player** (play/pause, **−10s / +10s seek**, drag-to-seek progress bar, mute, keyboard `Space`/`←`/`→`/`M`, mobile double-tap left/right = ∓/±15s), related titles
- **Advanced video player** —
  - 360p / 480p / 1080p quality selection (API-dependent) with automatic quality fallback on failure
  - play/pause, seek bar with buffered range + hover time preview, ±10s, volume + mute (slider expands on hover), playback speed 0.5×–2×, restart
  - Picture-in-Picture, fullscreen (double-click too), auto-hiding controls (3s)
  - full keyboard shortcuts: `Space/K` play · `←/→` 5s · `Shift+←/→` 30s · `J/L` 10s · `↑/↓` volume · `M` mute · `F` fullscreen · `P` PiP · `.` `,` speed · `0-9` 10% jumps
  - mobile: tap = play/pause, double-tap left/right = ∓/±15s seek
  - **back button** in the top bar (returns to the page you came from)
  - source failures retry **silently** (no toast spam) — the speed-change toast is the only one left
  - progress auto-saved every 5s → **Continue Watching** with resume-at-timestamp
  - "Up Next" overlay with 10s countdown for series (autoplay next episode setting)
  - designed states: loading, buffering, source failure (auto next quality), VIP-only, all-failed error card, ended
- **Custom video library (Admin)** — add your own movies/series with a **direct MP4 or M3U8 (HLS) URL** from any host or your own API. Each title instantly appears on Home, Search, its own detail page and the full player (HLS auto-detected via hls.js). Edit, delete, and **export/import the whole library as JSON**. **Publish to any section**: tick Home / Movies / Series / Anime / Midnight (at least one required) and a **"Your Uploads" row** appears on exactly those pages (your item also shows in Midnight's Fresh Uploads). Poster preview while you type the URL.
- **Watchlist** — add/remove from anywhere (hero, card, detail), sorting, remove with hover
- **Auth** — signup/login (email + "Google" demo), inline validation, password strength, session persistence
- **Profile** — overview stats (watchlist, watched, in-progress, hours), watchlist, history (resume, clear), settings (autoplay next, **Show Midnight (18+) content** toggle, **clear all data, delete account**), inline **name editing**
- **Admin** — **Content (custom video library)**, dashboard stats, users table, **API health monitor** (pings all 8 endpoint groups with latency)
- **Performance** — production build, sharp image optimization, lazy rows (IntersectionObserver), skeleton loaders, 15-min API caching, 87–115 kB first-load JS
- **App-style mobile UI + PWA** — iPhone/Android "add to Home Screen" turns it into a **full-screen native-feel app**: custom orange icon + splash, **bottom tab bar** (Home · Movies · Anime · Midnight · Profile), notched-screen safe-area insets, offline app-shell via service worker, and a **Capacitor Android project** (`streambox/android/`) that builds a real APK (see *Mobile App* section)
- **Responsive** — 360px mobile (2 cards/row) → 1920px desktop (6–8 cards/row), mobile bottom-nav + tablet drawer, safe touch targets, zero horizontal scroll at 390px

## Architecture

```
Browser ──► Next.js (production server, port 3000)
              │  /api/* proxy routes (cache, normalization)
              ▼
         MovieBox API (self-hosted FastAPI, port 8000)  ──►  moviebox.ph content
Browser ──► video CDN (MP4/HLS) directly          (metadata + stream links)
Browser ◄─► Supabase-ready auth layer (demo mode: localStorage; see lib/store.ts)
```

- All content calls go **server-side** through Next.js API routes (central cache + normalization layer in `lib/moviebox-server.ts`)
- Video files are fetched **directly by the browser** from the stream CDN (MP4 via native `<video>`, HLS via hls.js if a source provides `.m3u8`)
- Stream URLs are signed & temporary → `/api/stream` is never cached
- **Custom library videos** bypass the MovieBox API entirely — the player takes a `directUrl` prop (any MP4/HLS), so self-hosted or own-API streams play through the same player
- User data (watchlist/history/auth/**custom library**) — demo mode persists to localStorage; the store shape maps 1:1 to the Supabase schema in the PRD (see `StreamBox-PRD.md` §5) so you can plug in Supabase without UI changes

## Getting Started

### 1. MovieBox API (content + streams)

```bash
cd moviebox-api                      # active fork (deswalumesh80-sys/Moviebox-API)
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
# Swagger docs → http://localhost:8000/docs
```

### 2. StreamBox (this app)

```bash
cd streambox
npm install
cp .env.local.example .env.local     # set MOVIEBOX_API_URL (default http://127.0.0.1:8000)

# development
npm run dev                          # http://localhost:3000

# production
npm run build && npm start           # http://localhost:3000
```

## Mobile App (PWA + Android APK)

StreamBox is a **full mobile app experience**, not just a website. It ships as a
Progressive Web App (PWA) *and* as a native Android project (Capacitor).

### A. Install as an app on any phone (PWA — works on iPhone + Android, no APK needed)

1. Open `http://localhost:3000` (or your deployed URL) in **Safari / Chrome**.
2. **iPhone**: Share button (⎙) → **Add to Home Screen** → Add.
   **Android (Chrome)**: ⋮ menu → **Add to Home Screen / Install app** → Install.
3. It opens **full-screen like a native app** (no browser bar), with its own
   orange StreamBox icon, splash, and the bottom tab bar (Home · Movies · Anime ·
   Midnight · Profile). Works offline for the app shell.

> This is the recommended way for a **college demo on an iPhone** — iOS only runs
> `.ipa` files (not APKs) and those need a paid Apple developer account + Xcode on
> a Mac. The PWA gives the identical app-like result on iPhone and Android.

### B. Build a real Android APK (Capacitor)

Everything is already scaffolded in `streambox/android/` (icons + splash replaced
with the StreamBox brand, `usesCleartextTraffic` enabled for local dev URLs).

**Requirements:** [Android Studio](https://developer.android.com/studio) (bundles
the Android SDK + JDK 17 + Gradle — you don't install anything else).

```bash
cd streambox
npm install

# 1) Keep the web server running (the app is a WebView pointed at it):
npm run dev                        # or: npm run build && npm start

# 2) Point the app at the running server (edit capacitor.config.ts → server.url):
#    • Android EMULATOR  → "http://10.0.2.2:3000"   (10.0.2.2 = your computer)
#    • Real PHONE        → "http://YOUR-PC-LAN-IP:3000"  (same Wi-Fi as the PC)
#    • Deployed (best)   → "https://your-streambox.vercel.app"
npx cap sync android               # regenerate native config after URL changes

# 3) Open in Android Studio and build the APK:
npx cap open android
```

Then in Android Studio: **Build ▸ Build App Bundle(s) / APK(s) ▸ Build APK(s)**.
The file lands at `streambox/android/app/build/outputs/apk/debug/app-debug.apk` —
copy it to any Android phone and install (enable "Install unknown apps").

> **Why a WebView to a server?** StreamBox's data comes from server-side `/api/*`
> routes (which proxy the MovieBox API), so the app must talk to a live server —
> it can't be a fully static bundle. For the final project, deploy StreamBox to
> Vercel/Railway once, put that `https://` URL in `capacitor.config.ts`, rebuild,
> and the APK works anywhere with internet.

## Project Structure

```
streambox/
├── app/                  # routes: /, /movies, /series, /anime, /genres, /search,
│   ├── midnight/         #   /midnight (late-night shelf), /top10 (ranking)
│   ├── title/[slug]/     #   /title/[slug] (MovieBox + custom library), /watch/[slug],
│   ├── watch/[slug]/     #   /watchlist, /profile, /login, /signup, /admin, not-found
│   └── api/              # proxy routes: home, catalog, search, suggest, detail, stream, captions
├── components/
│   ├── layout/           # Header (scroll-aware, mobile drawer), Footer
│   ├── home/             # HeroCarousel
│   ├── cards/            # MovieCard (hover actions), WideCard (continue watching), skeletons
│   ├── rows/             # ContentRow (arrows, edge fades, lazy mount)
│   ├── browse/           # CatalogPage (sort + infinite scroll)
│   ├── search/           # SearchOverlay (⌘K, debounce, keyboard nav)
│   ├── detail/           # DetailClient (language switcher, episodes, cast, trailer modal)
│   ├── player/           # Player (all controls, quality fallback, up-next)
│   ├── auth/             # AuthShell
│   └── ui/               # Button, Badge, Modal, Toasts, Skeleton, EmptyState
├── lib/
│   ├── moviebox-server.ts  # server-side API client + TTL cache + normalization
│   ├── api-client.ts       # browser-side client
│   ├── store.ts            # zustand store: auth (demo), watchlist, history, toasts
│   ├── ui-store.ts         # search overlay state
│   ├── types.ts            # shared domain types
│   └── utils.ts
└── docs/screenshots/     # verified UI screenshots
```

## Notes

- **Video playback & the CDN**: MovieBox's video CDN sits behind Cloudflare bot protection. It is served to **normal residential browsers** (your PC/phone) but can block **server / datacenter / sandbox IPs** — that's why a video may show as unavailable inside a hosted preview yet **play fine on your own machine at `localhost:3000`**. The player already mitigates this with `no-referrer`, automatic retry across every source/quality, and a diagnostic error card that tells you the exact reason (expired link → Retry, or CDN block → works locally). Your **custom library videos** (admin-added) are hosted on *your* URL, so they always play regardless of the MovieBox CDN.
- **Content availability** depends on the upstream MovieBox catalog at runtime; the UI handles empty/unavailable/VIP states gracefully (no dead UI).
- **Quality**: upstream currently serves up to 1080p MP4 for most titles; the quality menu is dynamic — only what the API returns is offered.
- **Scope**: academic/college project. Content is provided by the open-source MovieBox API (MIT) for personal/educational use — not for commercial distribution. The player is provider-agnostic (`lib/player` engines), so licensed sources can replace the adapter for any production use.
- StreamBox credits the MovieBox API in the footer (MIT attribution).
# movibox
