# 🎬 STREAMBOX — Complete Product & Design Specification (v3.0)

**Premium Movie & Series Streaming Web App — College Project**
*This document is the single source of truth. A developer should be able to rebuild the entire product — pixel behavior, interactions and data flow — from this file alone.*

---

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [System Architecture](#3-system-architecture)
4. [Data Source — MovieBox API](#4-data-source--moviebox-api)
5. [Design System (the "look")](#5-design-system)
6. [Component Library (exact specs)](#6-component-library)
7. [Page-by-Page Specification](#7-page-by-page-specification)
8. [Video Player — Full Spec](#8-video-player--full-spec)
9. [State Management & Persistence](#9-state-management--persistence)
10. [Midnight (18+) Gating Flow](#10-midnight-18-gating-flow)
11. [Admin Dashboard Spec](#11-admin-dashboard-spec)
12. [PWA + Android APK](#12-pwa--android-apk)
13. [Responsive Design Matrix](#13-responsive-design-matrix)
14. [Error / Empty / Loading States](#14-error--empty--loading-states)
15. [Performance Budget](#15-performance-budget)
16. [Route Map](#16-route-map)
17. [Environment & Run Instructions](#17-environment--run-instructions)
18. [File Structure](#18-file-structure)

---

# 1. Project Overview

## 1.1 What it is
StreamBox is a **Netflix-style streaming web app** (dark, cinematic, mobile-app feel) that:

- Browses **movies, series and anime** from the open-source **MovieBox API** (self-hosted on `:8000`).
- Plays **trailers and full episodes** (MP4 via `<video>`, HLS via `hls.js`) in a custom advanced player.
- Lets an **admin publish their own videos** (MP4 / M3U8 from any host) to **any section** (Home / Movies / Series / Anime / Midnight).
- Works as a **PWA** (install to home screen like a native app) and ships a **Capacitor Android project** that builds a real APK.
- Gates **18+ content ("Midnight")** behind a user setting — hidden by default.

## 1.2 Non-negotiable product rules
1. **Every feature must work** — no static/mock screens.
2. **Fully responsive** — 360 px phone → 1920 px desktop, zero horizontal scroll at 390 px.
3. **App-style mobile UI** — bottom tab bar, safe-area insets, immersive watch page.
4. **Never break**: API down / video unavailable / empty lists all have designed UI states.
5. **Honest content reality**: the upstream catalog is one big 1M mixed pool; the site serves it **unfiltered** (exactly like MovieBox) with fast infinite scroll (48/page). Music mixes may appear in the pool — that is upstream data, not a UI bug.

## 1.3 Success criteria
- Open `http://localhost:3000` → hero + rows visible < 2 s on a laptop.
- Scroll any catalog page forever → content keeps loading until the pool ends.
- Tap a title → detail page with poster, meta, dub switcher, episodes, trailer player.
- Tap Watch → player plays (on a normal browser; CDN blocks datacenter/sandbox IPs).
- Add a video in `/admin` → it appears on the chosen sections immediately (client-side, persisted in localStorage).
- iPhone Safari → Share → Add to Home Screen → opens full-screen app with orange icon.

---

# 2. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 14 (App Router, TypeScript)** | SSR + API routes in one deploy |
| Language | **TypeScript strict** | no implicit any |
| Styling | **Tailwind CSS 3.4** + design tokens in `tailwind.config.ts` | one source of truth for the look |
| Icons | **lucide-react** (outline, 1.5–2 stroke) | consistent line icons |
| State | **zustand** + `persist` (localStorage) | tiny, no boilerplate |
| Video | native `<video>` (MP4) + **hls.js** (M3U8) | provider-agnostic |
| Images | **next/image** + **sharp** (production optimization) | poster optimization |
| Fonts | **Inter** (next/font, self-hosted at build) | one clean grotesk |
| Mobile shell | **PWA** (manifest + service worker) + **Capacitor 7 (Android)** | app experience without native code |
| Content API | **MovieBox API fork** (FastAPI, `:8000`) | free MIT content + streams |

Node ≥ 18, Python ≥ 3.10.

---

# 3. System Architecture

```
┌────────────────────────────────────────────────────────────┐
│  Browser (Next.js 14, :3000)                               │
│  ┌────────────┐  ┌──────────────────┐  ┌────────────────  │
│  │ Pages/Rows │  │ API routes /api/*│  │ zustand store  │  │
│  └─────┬──────┘  └────────┬─────────┘  └───────┬────────┘  │
└────────┼──────────────────┼────────────────────┼───────────┘
         │ fetch /api/*     │                    │ localStorage
         ▼                  ▼                    │
   same-origin         ┌────────────────────┐    │
   (no CORS pain)      │ proxy + normalize  │    │
                       │ 15-min in-mem cache│    │
                       └────────┬───────────┘    │
                                ▼                │
                       MovieBox API :8000        │
                       (FastAPI fork, self-host) │
                                │                │
                                ▼                │
                       upstream h5-api (CDN)     │
                                │                │
                                ▼                │
                       video CDN (Cloudflare) ◄── direct <video src>
```

**Golden rules**
1. The browser **never** talks to the upstream CDN host directly for data — only Next API routes do (CORS + hotlink rules).
2. **Video files** load directly in `<video>` with `referrerPolicy="no-referrer"` (CDN hotlink protection); the trailer CDN is the most reliable.
3. **API responses** are normalized once in `lib/moviebox-server.ts` → the UI only knows our `Title`/`Detail`/`StreamResult` types (`lib/types.ts`).
4. **Caching**: `/home` 15 min, pool pages 10 min, search 5 min, detail 30 min, stream URLs **never** (signed, expire).
5. **subjectType cache** (`data/type-cache.json`, disk-persisted, 7-day TTL) — used only by Midnight filtering and never blocks the main catalog.

## 3.1 Next.js API routes (proxy layer)

| Route | Upstream | Returns | Cache |
|---|---|---|---|
| `GET /api/home` | `/home` | `{ banner: Title[], sections: {label, items[]}[] }` | 15 min |
| `GET /api/catalog?type=movies\|series\|anime&page=&sort=` | `/movies` `/tv-series` `/animation` | `{ page, total, items: Title[], hasMore }` — **full pool, unfiltered, 48/page** | 10 min/page |
| `GET /api/search?q=&page=` | `/search` | junk-name-filtered results | 5 min |
| `GET /api/detail/[slug]` | `/detail/{slug}` | normalized `Detail` (camelCase, dubs, seasons, trailer) | 30 min |
| `GET /api/midnight` | searches `18+`, `adult`, `x-rated`, `erotic`, `nude` (×pages) + `hentai`, `18+ anime` | `{ picks: Title[72], anime: Title[36] }` — 18+ shelf | 30 min |
| `GET /api/stream/[subjectId]?detail_path=&se=&ep=` | `/api/stream/...` | `{ hasResource, limited, sources[], hls[], note }` | **none** |
| `GET /api/captions/[subjectId]...` | `/api/stream/.../captions` | captions[] | 60 min |
| `GET /api/suggest?q=` | `/search/suggest` | `{title, slug?}[]` | 2 min |

`Title = { name, slug, subjectId, poster, rating?, year?, badge? }`
`Detail = { subjectId, subjectType, title, description, releaseDate, duration, genre, cover, backdrop?, country?, rating?, ratingCount, subtitles?, trailer{url?,duration?}, stars[], seasons[{se,maxEp,resolutions[]}], dubs[{subjectId,lanName,lanCode,original,detailPath}], hasResource }`

---

# 4. Data Source — MovieBox API

- Active fork: `deswalumesh80-sys/Moviebox-API` (v2.1.5), runs `main:app` on `:8000`.
- `requirements.txt`: `fastapi`, `uvicorn[standard]`, `httpx`.
- Endpoints: `/home`, `/movies`, `/tv-series`, `/animation`, `/search`, `/search/suggest`, `/detail/{slug}`, `/api/stream/{id}`, `/api/stream/{id}/captions`.
- **Pool reality** (measured): each category endpoint is the **same ~1M mixed pool** (movies + series + anime + tons of music). `subjectType` (via `/detail`) = 1 movie, 2 series, 8 anime, 6 music.
- Video CDN sits behind Cloudflare → **datacenter/sandbox IPs get 426/429; residential browsers/localhost play fine.** This is documented behavior, not a bug.

## Run (VSCode, two terminals)
```bash
# Terminal 1 — content API
cd moviebox-api
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000

# Terminal 2 — app
cd streambox
npm install
cp .env.local.example .env.local     # MOVIEBOX_API_URL=http://127.0.0.1:8000
npm run dev                          # http://localhost:3000
# production: npm run build && npm start
```

---

# 5. Design System

> The "look" in one sentence: **near-black cinematic canvas, warm orange gradient accent, one clean grotesk font, soft rounded cards, glassy overlays, generous spacing.**

## 5.1 Color tokens (Tailwind `theme.extend.colors`)

| Token | Value | Where it is used |
|---|---|---|
| `base` | `#050505` | page background (near-black, not pure black) |
| `surface` | `#0B0B0D` | header/drawer surfaces |
| `card` | `#101014` | cards, inputs, chips |
| `raised` | `#17171C` | modals, dropdown menus |
| `line` | `rgba(255,255,255,0.08)` | 1 px borders (default) |
| `line-strong` | `rgba(255,255,255,0.16)` | borders on hover/active |
| `tp` (text primary) | `#FAFAFA` | titles, primary text |
| `ts` (text secondary) | `#A1A1AA` | descriptions, nav inactive, meta labels |
| `tm` (text muted) | `#6B6B76` | years, hints, disabled (NEVER for body copy) |
| `accent` | `#FF7A1A` | primary brand orange (text/icons) |
| `accent-hover` | `#FF9440` | hover state of accent text |
| `accent-press` | `#F05E00` | pressed state |
| `danger` | `#F4514E` | delete, 18+ badge, errors |
| `success` | `#2ECC71` | watchlist check, toasts |
| `warning` | `#F5B301` | star ratings |

**The brand gradient (THE button color):**
```
linear-gradient(135deg, #FFB300 0%, #FF7A1A 55%, #FF4D00 100%)
```
Used on: primary buttons, logo tile, active sort chip, active hero indicator, active bottom-tab pill background (`accent/15`), episode-number chip.

## 5.2 Contrast rules (accessibility by design)
- Body text is **always `tp` or `ts`** on `base/card` → contrast ≥ 7:1 (tp) / ≥ 4.6:1 (ts).
- `tm` is only for **non-essential metadata** (year, count, "See all" arrows) — never for copy the user must read.
- Accent text (`#FF7A1A`) is only used on **large/bold elements** (logo BOX, active tab label, section eyebrows) — it fails small-text contrast, so it is never used for body copy.
- White text on the gradient button: white on `#FF7A1A` ≈ 3.1:1 — allowed only for **bold ≥ 14 px button labels** (large-text rule); button font is always `font-semibold/bold`.
- Focus: every interactive element gets `focus:outline-none focus-visible:ring-2 ring-accent/60` (or visible border change).
- Dark scrim over images: `bg-gradient-to-t from-black/85 via-black/30 to-transparent` (rows) and hero: `from-base via-base/60 to-transparent` bottom + `from-black/60` left — guarantees text-on-image contrast.

## 5.3 Typography (Inter)
| Role | Size / weight | Usage |
|---|---|---|
| Display hero title | `text-4xl sm:text-6xl` extrabold, tracking-tight | Home hero |
| Page H1 | `text-2xl sm:text-3xl` extrabold | Catalogs, Midnight |
| Section H2 | `text-lg sm:text-xl` bold | Row labels, detail sections |
| Card title | `text-[13.5px]` semibold, truncate 1 line | MovieCard |
| Body | `text-sm` / `text-[15px]` | descriptions (leading-relaxed) |
| Meta | `text-xs` | year · rating · seasons |
| Eyebrow | `text-[11px]` bold uppercase tracking-[0.22em] | "FEATURED", "AFTER-DARK SHELF" |
| Button | `text-sm` semibold | all buttons |
| Bottom-tab label | `text-[10px]` semibold | app nav |

## 5.4 Spacing / radius / elevation / motion
- **Container**: `.container-site` = `mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10 xl:px-14`.
- **Card grid gap**: `gap-x-3.5 gap-y-6` (mobile 2 cols → 3 → 4 → 5 → 6 → 7).
- **Row card gap**: `gap-3.5`.
- **Radius**: card `rounded-card` (12 px), button `rounded-btn` (10 px), chip/badge `rounded-full`/`rounded-badge` (6 px), icon button `rounded-full`.
- **Elevation**: cards `border line` + on hover `border-line-strong` + `shadow-card` (0 8px 30px rgba(0,0,0,.5)); modals `shadow-modal` (0 24px 80px rgba(0,0,0,.7)); primary button glow `shadow-[0_4px_20px_rgba(255,122,26,0.35)]`.
- **Motion**: 200 ms color/opacity, 300 ms transforms; hover card `translate-y-[-4px]` + poster `scale-105`; page fade-in 200 ms; skeleton shimmer 2 s linear infinite.

## 5.5 Iconography
lucide-react only, stroke 2 (1.5 for decorative), sizes 14/16/18/20/22. Never filled icons except Play (fill-black on white circle) and Star (fill-warning).

---

# 6. Component Library

## 6.1 Buttons (`components/ui/primitives.tsx`)
Anatomy: `inline-flex items-center justify-center gap-2 font-semibold transition-all focus-visible:ring-2 ring-accent/60 disabled:opacity-50`.

| Variant | Classes | Use |
|---|---|---|
| **primary** | `bg-gradient-to-br from-[#FFB300] via-accent to-[#FF4D00] text-white shadow-[0_4px_20px_rgba(255,122,26,0.35)] hover:brightness-110 active:brightness-95` | Watch Now, Add to catalog, Sign in, Enable 18+ |
| **secondary** | `border border-line bg-card text-tp hover:border-line-strong hover:bg-white/10` | Trailer, Open Settings, Cancel |
| **danger** | `border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20` | Delete account |
| **ghost** | `text-ts hover:text-tp hover:bg-white/5` | inline links |
| **icon-only** | `h-10 w-10 rounded-full text-ts hover:bg-white/10 hover:text-tp` | header search, close, arrows |

Sizes: `sm` = `h-9 px-3.5 text-sm`, `md` = `h-11 px-5 text-sm`, `lg` = `h-12 px-6 text-[15px]`. Icon slot renders 16 px before label.

**Primary button anatomy (the most-repeated element in the product):**
gradient tile + white bold label + optional leading icon (Play = filled white triangle) + soft orange glow shadow + 1 px darker on press.

## 6.2 Chips / Tabs (sort bar, dub switcher, publish-to)
`rounded-full border border-line bg-card px-3.5 py-1.5 text-[13px] font-semibold text-ts hover:text-tp hover:border-line-strong`
**Active state**: `bg-gradient-to-br from-[#FFB300] via-accent to-[#FF4D00] text-white border-transparent shadow-[0_2px_12px_rgba(255,122,26,0.35)]`
Checked (publish-to in admin): `border-accent/50 bg-accent/10 text-accent-hover` + leading `Check` 14 px.

## 6.3 Badges
- Top-left poster badge (e.g. `ENGLISH`, `MINE`): `rounded-badge bg-gradient-to-br from-[#FFB300] to-[#FF4D00] px-1.5 py-0.5 text-[10px] font-bold uppercase text-white`.
- 18+ badge: `rounded-full border border-danger/40 bg-danger/10 px-3 py-1 text-xs font-bold text-danger` + `AlertTriangle` 12 px.
- Watchlist check on poster: `h-5 w-5 rounded-full bg-black/70 text-success` + `Check` 12.

## 6.4 Inputs / Field
`w-full rounded-btn border border-line bg-card px-3.5 py-2.5 text-sm text-tp placeholder:text-tm focus:border-line-strong focus:outline-none` + optional leading icon (16 px, `text-tm`) and trailing slot (eye toggle). Error state: `border-danger/60` + message row `text-[13px] text-danger` with `role=alert`.

## 6.5 Switch (settings)
`relative h-7 w-12 rounded-full` — off: `bg-white/15`, on: `bg-gradient-to-r from-[#FFB300] to-[#FF4D00]`; knob `h-6 w-6 rounded-full bg-white shadow` translates `left-0.5 → left-[22px]` (200 ms). `role=switch` + `aria-checked`.

## 6.6 MovieCard (`components/cards/MovieCard.tsx`)
- Root: `role=link`, cursor-pointer, `w-[148px] sm:w-[158px] md:w-[172px] lg:w-[188px]` in rows · **`fluid` prop → `w-full` in grids** (Midnight uses fluid).
- Poster box: `aspect-[2/3] rounded-card border line bg-card overflow-hidden`; poster `next/image fill object-cover` with `onError → fallback` (centered `Play` 28 `text-tm` on `bg-gradient-to-b from-white/5`).
- Bottom gradient: `absolute inset-x-0 bottom-0 h-2/5 from-black/85`.
- Hover (desktop only, `max-lg:hidden`): card `-translate-y-1`, poster `scale-105`, overlay slides up: two 36 px circles — white `Play` (→ detail) + outline `Plus`/`Check` (watchlist toggle; active = `border-success/60 bg-success/20 text-success`).
- Info: title `text-[13.5px] font-semibold truncate`, then `year · ★rating` (Star 11 filled `warning`) `text-xs text-tm`.
- Skeleton twin: same box, `.skeleton` shimmer.

## 6.7 ContentRow (`components/rows/ContentRow.tsx`) — THE row
- `section` (py-4) → header: `h2` (label) + `See all →` link (`text-[13px] text-tm hover:text-accent-hover`, optional `seeAllHref`).
- **Scroller**: `no-scrollbar container-site flex gap-3.5 overflow-x-auto` with `scroll-px-4…14` — **`ref` lives on THIS scroller** (arrows depend on it).
- **Edge arrows — ALWAYS visible** (the "side buttons" requirement):
  - left: `absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 sm:h-11 w-11 rounded-full border border-line bg-base/85 backdrop-blur text-tp shadow-modal hover:border-line-strong hover:bg-base` + `ChevronLeft` 20.
  - right: same with `right-2 sm:right-3` + `ChevronRight`.
  - Visibility: `canL = scrollLeft > 10`, `canR = scrollLeft + clientWidth < scrollWidth - 10`; recompute on scroll/resize/data change.
  - Scroll action: `scrollBy({left: ±clientWidth*0.85, behavior:'smooth'})`.
- **Edge fades**: when scrollable on a side, a 40 px gradient `from-base to-transparent` sits behind the arrow (`pointer-events-none z-10`).
- **Lazy mount**: IntersectionObserver (`rootMargin 500px`) — before first view renders 6 skeletons.
- Error state: centered card "Couldn't load this row." + Retry button (secondary sm).

## 6.8 Header (`components/layout/Header.tsx`)
- `fixed top-0 inset-x-0 z-50`, h-16 content row + `pt-[env(safe-area-inset-top)]` (notch).
- **Transparent on home at top** (`bg-gradient-to-b from-black/80 to-transparent`); **solid on scroll or any other page** (`bg-base/90 backdrop-blur-md border-b border-line`).
- Logo: 32 px gradient tile (rounded-[9px], white Play fill) + `STREAM` white + `BOX` accent, `text-[19px] font-extrabold tracking-tight`.
- Desktop nav (`lg:flex`): links `px-3 py-2 text-sm`, active = `text-tp` + 2 px gradient underline `bg-accent` at bottom; **Midnight link only when `mature` setting ON**.
- Right cluster: search icon (opens overlay), watchlist icon + count bubble (`bg-accent` white 10 px), avatar menu (gradient initial circle + ChevronDown; dropdown = raised card w-56: name/email, Profile, Watchlist, Sign out `text-danger`) or gradient **Sign in** button (hidden on xs).
- Tablet drawer (md–lg): hamburger → right drawer w-[290px] `bg-surface` with nav links (active = `bg-white/10 text-tp` + accent icon) + Watchlist (count chip) + account footer.
- **Hidden entirely on `/watch/*`** (immersive page).

## 6.9 BottomTabBar (`components/nav/BottomTabBar.tsx`) — mobile app nav
- `fixed bottom-0 inset-x-0 z-40 md:hidden border-t border-line bg-base/95 backdrop-blur-lg`, `padding-bottom: env(safe-area-inset-bottom)` (home indicator).
- Tabs (equal grid, max-w-lg centered): **Home** (`Home`), **Movies** (`Film`), **Anime** (`Tv`), **Midnight** (`Moon`) — *Midnight only when mature ON* —, **Profile** (`User`).
- Tab: icon 19 in a `h-7 w-12 rounded-full` pill; inactive `text-tm`; active `text-accent` + pill `bg-accent/15` + icon stroke 2.4; label `text-[10px] semibold`.
- Hidden on `/watch/*` (immersive).

## 6.10 Modal
`fixed inset-0 z-[70]` → backdrop `bg-black/70 backdrop-blur-sm` (click closes, `animate-fade-in`) → panel `raised rounded-card border line shadow-modal animate-scale-in`, sizes: `md` w-[440px], `lg` w-[640px], `video` w-[880px]. Close: `X` circle top-right (or `hideClose` for player modals). Esc closes. Body scroll locked.

## 6.11 Toasts
Top-right (mobile: top-center) stack, **max 3**, each `raised rounded-btn border line shadow-modal px-4 py-3 flex gap-2.5` with icon (success=Check success, error=AlertTriangle danger, info=Info ts) + `text-sm` message. **Auto-dismiss 3.2 s** (no manual close needed). Slides in from right, fades out.

## 6.12 SearchOverlay
Full-screen `z-[80]` sheet: backdrop blur + centered top sheet (`rounded-b-card bg-surface border-line`). 48 px input row (Search icon left, `X` right, autofocus, `⌘K` hint chip right). 300 ms debounce → suggestions list (matched substring **highlighted** `text-accent-hover`), recent searches (2-col chips + Clear), "Popular right now" chips, full results CTA. Keyboard: ↑↓ navigate, Enter open, Esc close.

---

# 7. Page-by-Page Specification

## 7.0 Global
- `<html>` Inter variable; `<body class="min-h-screen pb-[calc(3.6rem+env(safe-area-inset-bottom))] md:pb-0">` (bottom-bar clearance).
- Every page: `Header` → `main` → `Footer` (logo + tagline + "Content by MovieBox API (MIT)" + year) → `BottomTabBar` → `Toasts` → `SearchOverlay` → `SWRegister`.
- 404: centered `404` display + "This page drifted into the midnight." + Home button (primary).

## 7.1 Home `/`
1. **Hero carousel** (full-bleed, `min-h-[420px] sm:min-h-[520px]`): backdrop `next/image` cover + double scrim (bottom + left); content bottom-left in `container-site`: eyebrow `FEATURED` (accent, tracking wide, 24 px gradient dash), title (display), meta row (`year · ★rating · N Seasons · genres`), description (2-line clamp, `text-ts`), actions: **Watch Now** (primary lg + Play) + **Details** (secondary lg + Info) + circular **Plus** icon (watchlist). Rotates every 7 s (pause on hover); indicators = 24 px pills, active = gradient stretched; arrows = circle icons.
2. **My Collection** row — admin-published library items (badge `MINE`), hidden when empty.
3. **Continue Watching** row (history w/ progress) — WideCard: `aspect-video`, poster, 3 px gradient progress bar at bottom, resume label, `X` remove on hover. Hidden when empty.
4. **Home rows** — every `/api/home` section rendered as a ContentRow (`seeAllHref=/genres?row=<label>`).

## 7.2 Catalogs `/movies` `/series` `/anime` (shared `CatalogPage`)
- Header: H1 + `{cumulative} titles` (`text-sm text-tm`) — count **grows as you scroll**.
- Sort chips (right): Recommended / Hot / Latest / Popular — active = gradient chip.
- **Your Uploads** row: `library.filter(t => (t.sections ?? ["home"]).includes(type))` as a ContentRow (label hidden, header above), shown above grid when non-empty.
- **Grid**: `grid-cols-2 sm:3 md:4 lg:5 xl:6 2xl:7`, MovieCards (fixed width fit at 2 cols; cards keep aspect).
- **Infinite scroll**: sentinel `div h-10` + IntersectionObserver (`rootMargin 700px`); page size **48** (server = 2 upstream pages); appends + increments total; `hasMore` from server; busy-lock; loading shows 12 skeletons below the grid.
- Server serves the **full upstream pool unfiltered** (`/movies|/tv-series|/animation?page=&sort=`), 10-min cache, per-type+sort cursor so pages never repeat.

## 7.3 Midnight `/midnight` — 18+ shelf (gated)
**Gate (mature OFF — default):** centered screen: 64 px rounded-2xl `fuchsia-400/10` tile with `Moon` (fuchsia-300), H1 "This shelf is hidden", copy "Midnight contains 18+ mature movies, series and anime. Turn on **Show Midnight (18+) content** in your settings…", buttons: **Enable 18+ content** (primary → `setMature(true)`, unlocks immediately) + **Open Settings** (secondary → `/profile?tab=settings`). No data is fetched while gated.

**Unlocked:** purple theme —
1. Hero `relative overflow-hidden`: gradient `from-[#160A1E] via-[#1A0F2B] to-base`, fuchsia glow blob (`w-[640px] blur-3xl bg-fuchsia-500/10`), CSS **moon** (slate-100→400 gradient circle + glow) top-right + tiny stars; eyebrow `AFTER-DARK SHELF` (Moon 13, fuchsia-300), H1 "Midn**i**ght" (i in fuchsia-300) + **18+ Mature Only** badge (danger pill), copy line.
2. **Fresh Uploads** — admin uploads with `sections` containing `midnight` (ContentRow, MINE badge).
3. **Mature Picks** (`Film` icon, "Movies & Series") — `/api/midnight.picks` (≈72) in a fluid 3/4/5/6-col grid.
4. **Mature Anime** (`Sparkles` icon, indigo) — `/api/midnight.anime` (≈36) fluid grid.

## 7.4 Top 10 `/top10`
Netflix-style ranked list: 10 rows, each = giant outlined rank number (64–96 px, `text-transparent` + `-webkit-text-stroke: 2px line-strong`, accent for #1) + 200 px wide card + title/meta + genres; hover raises the card.

## 7.5 Genres `/genres`
Collection directory: card per home section (icon tile + label + count + sample poster fan) → `/genres?row=<label>` full grid of that section's items (48+, same infinite pattern).

## 7.6 Search
Overlay (§6.12) + `/search?q=` results grid (2–7 cols) with query echo + count; searches upstream **and** the local admin library (name contains).

## 7.7 Detail `/title/[slug]`
- **Back button** (top-left over backdrop): 40 px circle `bg-black/40 backdrop-blur border-line` + `ChevronLeft` → `router.back()`, `z-20 top-20 left-4` (mobile)/`top-24 left-10` (desktop).
- Layout: backdrop hero (scrim to base) → content `container-site grid lg:grid-cols-[280px_1fr] gap-8 -mt-24`:
  - Poster 280 px (`aspect-2/3` card) + below (mobile): meta.
  - Right: H1 (display sm), meta row (`year · ★rating (count) · N Seasons · M Episodes · genres`), description (`text-ts leading-relaxed`), actions: **Watch S1 E1** (primary + Play) / **Trailer** (secondary + Clapperboard, only when `trailer.url`) / **Watchlist** (secondary + Plus/Check).
  - **Language switcher** (chips): shows ONLY **Original Audio** (base) + **Hindi / English / Bangla dubs** + **sub versions in those languages** (all other languages hidden). Active chip = gradient; chip icon `Globe` 14; `(Original)` suffix on the base.
- **Info band** (4 cols, border-y line): Release Date (Calendar) · Country (Landmark) · Genres (Clock) · Audio/Subtitles (Globe) — values `text-sm text-tp`, labels eyebrow.
- **Episodes**: `h2 Episodes` + season chip (gradient, right) for >1 season; episode rows: number (w-8 text-tm) + 120 px still + `Episode N` + `resolution` + right `ChevronRight`; watched = accent number; in-progress = 3 px progress bar on still; click → `/watch/[slug]?season=&ep=`.
- **Cast**: avatar row (48 px circles, name + character, horizontal scroll).
- **Related**: ContentRow of same-genre titles.
- Library slugs (`lib-*`) resolve locally: no seasons — single "Watch" action using `directUrl`.

## 7.8 Watch `/watch/[slug]?season=&ep=` — immersive
- Global header **hidden**; compact top bar: `fixed top-0 z-40 min-h-14 bg-base/90 backdrop-blur border-b line`, `pt-[env(safe-area-inset-top)]`: back chevron (`router.back()`), **Details** (→ detail), title (`truncate text-sm bold`) + `S1 · E1` (`text-tm`), right: **Share** (`Share2` 14, Web Share API / clipboard).
- Player centered `max-w-5xl` (§8). Below: title block (H1, meta, description), **EPISODES · SEASON 1** chip row (gradient active, wraps), "progress auto-saved" hint.
- Bottom tab bar hidden; body padding accounts for the bar height.

## 7.9 Watchlist `/watchlist`
Header + count; 2–7 col grid of MovieCards; empty state: `ListVideo` tile + "Your watchlist is empty" + CTA to browse; sort (Recent / A-Z).

## 7.10 Profile `/profile?tab=` (sign-in required)
Tabs (icons 15, active = `text-tp` + 2 px accent underline): **Overview** (4 stat cards: Watchlist / Watched / In progress / Hours — `text-2xl font-extrabold tabular-nums`; continue-watching list), **Watchlist**, **History** (rows w/ progress, Resume, per-row delete, Clear all), **Settings**:
1. **Autoplay next episode** (switch) — toast on change.
2. **Show Midnight (18+) content** (switch) — "Reveals the Midnight shelf in the navigation and unlocks the 18+ section." — toast "Midnight (18+) enabled/disabled".
3. **Clear all data** (secondary + Trash2) → confirm modal.
4. **Delete account** (danger + AlertTriangle) → confirm modal.
5. Storage info card (localStorage demo note).
Inline name edit (pencil → input → save).

## 7.11 Auth `/login` `/signup`
Centered 440 px card on scrim: logo, H1, Field inputs (Name / Email / Password / Confirm for signup), password strength meter (3 bars weak/good/strong + label), errors `role=alert` inline, primary full-width button ("Create account" / "Sign in"), Google demo button (secondary + G glyph), footer link to the other page. Validation: name required, email regex, password ≥ 6, confirm match.

## 7.12 Admin `/admin`
Tabs: **Content** (default) · **Stats** · **Users** · **API health**.
- **Content**: left = form card (title*, direct URL* (MP4/M3U8), poster URL (live 96 px preview while typing), description, year, genres chips multi, rating), **"Publish to" section chips** (Home / Movies / Series / Anime / Midnight (18+)) — at least one required (toast on violation); buttons: **Add to catalog** (primary) / in edit mode **Save changes**. Right = library list (poster 56 px, title, section chips (`text-[10px]` accent pills), Edit / Delete icons) + **Import JSON** / **Export JSON** (whole library incl. sections).
- **Stats**: cards (titles, watchlist entries, users, API uptime).
- **Users**: demo table (name, email, provider, joined).
- **API health**: pings each endpoint group, latency ms + OK/FAIL pills.

---

# 8. Video Player — Full Spec

## 8.1 Engines
- MP4 → native `<video>` (`referrerPolicy no-referrer`, `playsInline`, `preload=auto`).
- M3U8 → **hls.js** (auto-level, `startLevel -1`); fallback to native HLS (Safari).
- Source failure → **silent** automatic retry of next source/quality (NO toast; only the final error card shows).
- `directUrl` (admin library): MP4 native / M3U8 hls.js, no API.

## 8.2 Layout (desktop)
`max-w-5xl` 16:9 black rounded-card border line, overflow-hidden.
- Top overlay (visible 3 s / on hover): left = title + `S1·E1`; right = quality pill (`360p/480p/1080p`, gradient active).
- Center: big Play circle (paused) / spinner (buffering).
- **Control bar** (bottom gradient): seek bar (4 px track `white/20`, played = gradient, thumb 12 px white on hover; **click + drag to seek**; hover time tooltip) → row: Play/Pause · Prev-episode (series) · Next-10s (`RotateCw` + "10") · volume (icon + 72 px slider on hover) · `0:00 / 0:00` (11 px tabular) → right: settings (quality + speed) · speed chip (`1×`, cycles 0.5–2) · restart (`RotateCcw`) · PiP (`PictureInPicture2`) · fullscreen (`Maximize`/`Minimize`).

## 8.3 Trailer player (`components/player/TrailerPlayer.tsx`)
Same DNA, lighter: video (click = play/pause; double-tap left/right = ∓/±15 s mobile) + bottom bar: Play/Pause · **−10 s** (`RotateCcw` + "10") · **+10 s** (`RotateCw` + "10") · mute · `t / dur` · restart (desktop); drag-to-seek bar; **auto-hide controls 2.8 s** while playing (any mouse move pokes them back); center Play circle when paused; top scrim with "{title} — Trailer". Keyboard while open: `Space/K` play, `←/→` 10 s, `M` mute. Footer tip row under the video: "tap to play/pause · double-tap left/right ±15s · keys: Space, ←/→, M".

## 8.4 Main player interactions
- Click video = play/pause; double-tap left/right = ∓/±15 s (mobile); double-click = fullscreen (desktop).
- Keyboard: `Space/K` · `←/→` 5 s · `Shift+←/→` 30 s · `J/L` 10 s · `↑/↓` volume · `M` · `F` · `P` PiP · `,`/`.` speed · `0–9` 10 % jumps.
- Progress saved every 5 s → store.history → Continue Watching.
- Up Next overlay (series): last 3 s → right panel next-ep preview, 10 s countdown ring, skip/cancel; honors Autoplay setting.
- **States**: loading (spinner + poster dim), buffering (small spinner top-center), error (icon `WifiOff` + "This video is currently unavailable." + reason line (hotlink/CDN note) + **Retry** primary), VIP/limited (Lock + message), ended (replay circle).

## 8.5 Quality
Dynamic from `sources[]` (API-dependent); menu lists what exists; auto-fallback on failure; user choice remembered per title (session).

---

# 9. State Management & Persistence

`zustand` store `useStore`, persist key **`streambox-store`** (localStorage), partialized:

```ts
{ user, users, watchlist, history, recentSearches, autoplayNext, mature, library }
```

- `user/users` — demo auth (hashed pw, never real crypto).
- `watchlist: Title[]` — toggle from hero/card/detail; count bubble in header.
- `history: WatchEntry[]` — `{slug, season, ep, progress, duration, updatedAt}` → continue watching.
- `recentSearches` (max 6), `autoplayNext` (default true), **`mature` (default false — 18+ gate)**.
- `library: LibraryTitle[]` — admin content: `{id, slug:"lib-<id>", name, url, poster?, description?, year?, genres[], rating?, sections: string[] ("home"|"movies"|"series"|"anime"|"midnight"), createdAt}`.
- `ui-store` (non-persisted): `searchOpen`, modal states.
- Toasts: in-store, **max 3**, auto-dismiss **3.2 s**.

---

# 10. Midnight (18+) Gating Flow

1. Default OFF → no "Midnight" in header nav, no Midnight tab in bottom bar, `/midnight` renders the gate (§7.3), no API fetch.
2. Enable via **Profile → Settings → "Show Midnight (18+) content"** OR the gate's **Enable 18+ content** button → `mature=true` persisted.
3. ON → nav links appear, shelf loads (picks ≈72 + anime ≈36 from multi-query upstream searches, type-verified), admin uploads with `midnight` section appear in Fresh Uploads.
4. Deep link `/profile?tab=settings` works (from gate's "Open Settings").

---

# 11. Admin Dashboard Spec

- **Publish-to chips** are the core feature: a video can live in any subset of {Home, Movies, Series, Anime, Midnight}; validation ≥ 1; chips show `Check` when active.
- Poster **live preview** (96 px rounded card, fallback play icon) updates while typing the poster URL.
- Library items: slug `lib-<id>`; `/title/lib-…` and `/watch/lib-…` resolve locally; player uses `directUrl` (MP4 native, M3U8 hls.js) → **always plays** (your own host).
- Surfaces: Home "My Collection" row + **Your Uploads** row on each catalog + Midnight Fresh Uploads + search + detail + watch.
- **Export JSON** downloads the full library; **Import JSON** merges (dedupe by slug) — sections included.

---

# 12. PWA + Android APK

## 12.1 PWA (works on iPhone AND Android — the "app" on a phone)
- `app/manifest.ts`: name "StreamBox — Movies & Series", `display: standalone`, `theme_color/background_color #050505`, `orientation portrait-primary`, icons: `/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (any + maskable).
- `app/icon.svg` — orange gradient rounded tile + white play triangle (favicon).
- `public/apple-touch-icon.png` (180 px) + layout meta: `appleWebApp {capable, statusBarStyle: black-translucent, title}` + `formatDetection.telephone:false`.
- Viewport: `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover` (app feel, no zoom).
- `public/sw.js` service worker (`streambox-v1`): shell pages precached; `/_next/static/*` + `/icons/*` cache-first; navigations network-first → cache fallback; `/api/*` never intercepted. Registered in production only (`SWRegister`).
- **Safe areas**: header `pt-[env(safe-area-inset-top)]`, bottom bar `padding-bottom: env(safe-area-inset-bottom)` — notch + home indicator handled.
- Install: iPhone Safari → Share → **Add to Home Screen**; Android Chrome → ⋮ → **Install app**. Opens full-screen, orange icon, no browser bar.

## 12.2 Android APK (Capacitor 7)
- `capacitor.config.ts`: `appId com.streambox.app`, `appName StreamBox`, **`server.url = "http://10.0.2.2:3000"` + `cleartext: true`** (the app is a WebView pointed at the live Next.js server — required because the app has `/api/*` routes).
  - Emulator → `10.0.2.2:3000`; real phone → PC's LAN IP; production → deployed `https://` URL.
- `android/` project fully scaffolded: brand launcher icons (all densities, adaptive orange bg `#FF7A1A` + white triangle), dark splash (icon centered on `#050505`), `usesCleartextTraffic=true`, `app_name = StreamBox`.
- Build: `npm run app:sync` (or `npx cap sync android`) → **Android Studio** → Build ▸ Build APK(s) → `android/app/build/outputs/apk/debug/app-debug.apk` → install on any Android phone.
- npm scripts: `app:build`, `app:sync`, `app:open`.

---

# 13. Responsive Design Matrix

| Breakpoint | Cards/row | Nav | Notes |
|---|---|---|---|
| 360–480 (mobile) | 2 | bottom tab bar (4–5), header = logo + search (+ avatar) | row arrows 36 px, hero buttons full-width stack, detail single column (poster 200 px) |
| 480–768 | 3 | bottom tab bar + hamburger drawer | |
| 768–1024 | 4–5 | hamburger drawer | |
| 1024–1440 | 5–6 | top nav full | |
| 1440–1920 | 6–7 | top nav full | container max 1600 px |

Hard rules: **no horizontal scroll at any width** (390 px audited = 0 px overflow); all touch targets ≥ 40 px; safe-area insets applied; row arrows always visible; bottom bar never covers content (body padding).

---

# 14. Error / Empty / Loading States

| Situation | UI |
|---|---|
| Any row failing | row-level card + **Retry** (rest of page unaffected) |
| Catalog first load | 12–18 CardSkeletons (shimmer) |
| Catalog page N | 12 skeletons appended below grid |
| Detail missing | centered `Film` tile + "Title not found" + Home button |
| Trailer missing | button hidden |
| Video blocked/failed | designed error card (§8.4) with Retry + honest CDN note |
| Empty watchlist/history/uploads | icon tile + one-liner + CTA |
| Midnight gated | gate screen (§7.3) |
| API health (admin) | per-endpoint latency + OK/FAIL pills |
| Offline (PWA) | cached shell loads; live data shows retry states |

---

# 15. Performance Budget

- First-load JS 90–120 kB (prod, measured per route in `next build` output).
- Rows lazy-mount (IntersectionObserver 500 px); posters `loading=lazy` + sharp; `next/image` `sizes` per card width.
- Server caches: home 15 min, pool 10 min, detail 30 min, stream 0 (signed).
- Catalog page = 2 upstream fetches (no per-item classification on the hot path) → p1 ≈ 2 s cold.
- `data/type-cache.json` disk cache (7-day TTL, 60k cap) keeps Midnight filtering instant after first pass.

---

# 16. Route Map

| Route | Purpose |
|---|---|
| `/` | Home (hero + rows) |
| `/movies` `/series` `/anime` | Catalogs (infinite, full pool, uploads row) |
| `/midnight` | 18+ shelf (gated) |
| `/top10` | Ranked 10 |
| `/genres` `/genres?row=` | Collection directory + per-collection grid |
| `/search?q=` | Full search results |
| `/title/[slug]` | Detail (API slugs + `lib-*`) |
| `/watch/[slug]?season=&ep=` | Immersive player |
| `/watchlist` | Watchlist |
| `/profile?tab=` | Overview/Watchlist/History/Settings |
| `/login` `/signup` | Auth |
| `/admin` | Content/Stats/Users/API health |
| `/manifest.webmanifest`, `/sw.js`, `/icons/*` | PWA assets |
| `/api/*` | proxy routes (§3.1) |

---

# 17. Environment & Run Instructions

`.env.local` (from `.env.local.example`):
```
MOVIEBOX_API_URL=http://127.0.0.1:8000   # self-hosted MovieBox API
```

Run = §4 (two terminals). Production: `npm run build && npm start` (both apps). APK = §12.2.

---

# 18. File Structure

```
streambox/
├─ app/                    # App Router pages + API routes
│  ├─ layout.tsx           # metadata (PWA), Header/Footer/BottomTabBar/Toasts/SW
│  ├─ manifest.ts          # web app manifest
│  ├─ page.tsx             # home
│  ├─ movies|series|anime/ # CatalogPage (type prop)
│  ├─ midnight/page.tsx    # gate + shelf
│  ├─ top10/ genres/ search/ watchlist/
│  ├─ title/[slug]/page.tsx
│  ├─ watch/[slug]/page.tsx
│  ├─ profile/ login/ signup/ admin/
│  └─ api/{home,catalog,search,detail,midnight,stream,captions,suggest}/route.ts
├─ components/
│  ├─ layout/{Header,Footer}.tsx
│  ├─ nav/BottomTabBar.tsx
│  ├─ hero/Hero.tsx
│  ├─ rows/ContentRow.tsx
│  ├─ cards/MovieCard.tsx  # + WideCard + CardSkeleton (fluid prop)
│  ├─ browse/CatalogPage.tsx
│  ├─ detail/DetailClient.tsx
│  ├─ player/{Player,TrailerPlayer}.tsx
│  ├─ search/SearchOverlay.tsx
│  ├─ ui/{primitives,Toasts,Modal}.tsx
│  └─ pwa/SWRegister.tsx
├─ lib/
│  ├─ types.ts  quality.ts (junk filter + disk type cache)
│  ├─ moviebox-server.ts  api-client.ts  store.ts  ui-store.ts  utils.ts
├─ public/ (sw.js, icons/)
├─ android/                # Capacitor Android project (APK source)
├─ capacitor.config.ts
├─ scripts/mkicons.js      # regenerates PWA + Android icons from brand SVG
└─ tailwind.config.ts      # design tokens (§5)
```

---

*End of specification — v3.0. If a detail is missing here, the source of truth is the running app; update this document whenever a behavior changes.*
