"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Title, LibraryTitle } from "./types";

// ------------------------------------------------------------------
// Demo authentication (local). Swap with Supabase for production:
// the store shape (user, signup, login, logout) maps 1:1 to Supabase Auth.
// ------------------------------------------------------------------

export interface User {
  id: string;
  name: string;
  email: string;
  provider: "email" | "google";
  createdAt: string;
}

export interface WatchEntry {
  slug: string;
  subjectId: string;
  name: string;
  poster: string;
  se?: number;
  ep?: number;
  progress: number; // seconds
  duration: number; // seconds
  updatedAt: number;
}

export interface Toast {
  id: number;
  kind: "success" | "error" | "info";
  message: string;
}

interface State {
  // auth
  user: User | null;
  users: User[];
  signup: (name: string, email: string, password: string) => { ok: boolean; error?: string };
  login: (email: string, password: string) => { ok: boolean; error?: string };
  loginAsGoogle: () => void;
  logout: () => void;
  updateUser: (patch: Partial<Pick<User, "name" | "email">>) => void;
  deleteAccount: () => void;
  // watchlist
  watchlist: Title[];
  inWatchlist: (slug: string) => boolean;
  toggleWatchlist: (t: Title) => void;
  removeWatchlist: (slug: string) => void;
  // history / continue watching
  history: WatchEntry[];
  saveProgress: (e: Omit<WatchEntry, "updatedAt">) => void;
  removeHistory: (slug: string, se?: number, ep?: number) => void;
  clearHistory: () => void;
  // toasts
  toasts: Toast[];
  toast: (kind: Toast["kind"], message: string) => void;
  dismissToast: (id: number) => void;
  // misc
  recentSearches: string[];
  addRecentSearch: (q: string) => void;
  clearRecentSearches: () => void;
  autoplayNext: boolean;
  setAutoplayNext: (v: boolean) => void;
  // mature (18+) content visibility — user toggles this in Profile → Settings
  mature: boolean;
  setMature: (v: boolean) => void;
  // custom library (admin-added, self-hosted / own-API videos)
  library: LibraryTitle[];
  addLibrary: (t: Omit<LibraryTitle, "id" | "slug" | "createdAt">, opts?: { silent?: boolean }) => void;
  updateLibrary: (id: string, patch: Partial<Omit<LibraryTitle, "id" | "slug">>) => void;
  removeLibrary: (id: string) => void;
  clearLibrary: () => void;
  libraryBySlug: (slug: string) => LibraryTitle | undefined;
}

let toastSeq = 1;

// simple non-crypto hashing for demo password check (NOT for production)
function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      user: null,
      users: [],
      signup: (name, email, password) => {
        const e = email.trim().toLowerCase();
        if (!name.trim()) return { ok: false, error: "Please enter your name." };
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return { ok: false, error: "Please enter a valid email address." };
        if (password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
        const users = get().users;
        if (users.some((u) => u.email === e)) return { ok: false, error: "This email is already in use. Try logging in." };
        const user: User = {
          id: "u_" + Date.now().toString(36),
          name: name.trim(),
          email: e,
          provider: "email",
          createdAt: new Date().toISOString(),
        };
        set({ users: [...users, user], user });
        return { ok: true };
      },
      login: (email, password) => {
        const e = email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return { ok: false, error: "Please enter a valid email address." };
        const u = get().users.find((x) => x.email === e);
        if (!u) return { ok: false, error: "No account found with this email." };
        if (hash(u.email + password) !== hash(u.email + password) && false) {
          /* noop */
        }
        // Demo mode: we don't store real passwords — accept the password if non-empty
        if (!password) return { ok: false, error: "Please enter your password." };
        set({ user: u });
        return { ok: true };
      },
      loginAsGoogle: () => {
        const users = get().users;
        let u = users.find((x) => x.provider === "google");
        if (!u) {
          u = {
            id: "u_g_" + Date.now().toString(36),
            name: "Google User",
            email: "demo.google.user@gmail.com",
            provider: "google",
            createdAt: new Date().toISOString(),
          };
          set({ users: [...users, u] });
        }
        set({ user: u });
      },
      logout: () => set({ user: null }),
      updateUser: (patch) => {
        const u = get().user;
        if (!u) return;
        const nu = { ...u, ...patch, name: (patch.name ?? u.name).trim() || u.name };
        set({ user: nu, users: get().users.map((x) => (x.id === u.id ? nu : x)) });
        get().toast("success", "Profile updated");
      },
      deleteAccount: () => {
        const u = get().user;
        if (!u) return;
        set({
          user: null,
          users: get().users.filter((x) => x.id !== u.id),
          watchlist: [],
          history: [],
          recentSearches: [],
        });
      },

      watchlist: [],
      inWatchlist: (slug) => get().watchlist.some((w) => w.slug === slug),
      toggleWatchlist: (t) => {
        const cur = get().watchlist;
        const exists = cur.some((w) => w.slug === t.slug);
        set({ watchlist: exists ? cur.filter((w) => w.slug !== t.slug) : [...cur, t] });
        get().toast("success", exists ? "Removed from watchlist" : "Added to watchlist");
      },
      removeWatchlist: (slug) =>
        set({ watchlist: get().watchlist.filter((w) => w.slug !== slug) }),

      history: [],
      saveProgress: (e) => {
        const cur = get().history.filter(
          (h) => !(h.slug === e.slug && (h.se || 0) === (e.se || 0) && (h.ep || 0) === (e.ep || 0))
        );
        set({ history: [{ ...e, updatedAt: Date.now() }, ...cur].slice(0, 100) });
      },
      removeHistory: (slug, se, ep) =>
        set({
          history: get().history.filter(
            (h) => !(h.slug === slug && (h.se || 0) === (se || 0) && (h.ep || 0) === (ep || 0))
          ),
        }),
      clearHistory: () => set({ history: [] }),

      toasts: [],
      toast: (kind, message) => {
        const id = toastSeq++;
        // Cap the stack at 3 — oldest falls off automatically.
        set({ toasts: [...get().toasts, { id, kind, message }].slice(-3) });
        setTimeout(() => get().dismissToast(id), 3200);
      },
      dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

      recentSearches: [],
      addRecentSearch: (q) => {
        const cur = get().recentSearches.filter((x) => x.toLowerCase() !== q.toLowerCase());
        set({ recentSearches: [q, ...cur].slice(0, 6) });
      },
      clearRecentSearches: () => set({ recentSearches: [] }),

      autoplayNext: true,
      setAutoplayNext: (v) => set({ autoplayNext: v }),

      mature: false,
      setMature: (v) => set({ mature: v }),

      library: [],
      addLibrary: (t, opts) => {
        const id = "lib_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
        const item: LibraryTitle = { ...t, id, slug: "lib-" + id, createdAt: Date.now() };
        set({ library: [item, ...get().library] });
        if (!opts?.silent) get().toast("success", "“" + t.name + "” added to the catalog");
      },
      updateLibrary: (id, patch) =>
        set({
          library: get().library.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        }),
      removeLibrary: (id) => {
        const t = get().library.find((x) => x.id === id);
        set({ library: get().library.filter((x) => x.id !== id) });
        if (t) get().toast("info", "“" + t.name + "” removed");
      },
      clearLibrary: () => set({ library: [] }),
      libraryBySlug: (slug) => get().library.find((t) => t.slug === slug),
    }),
    {
      name: "streambox-store",
      partialize: (s) => ({
        user: s.user,
        users: s.users,
        watchlist: s.watchlist,
        history: s.history,
        recentSearches: s.recentSearches,
        autoplayNext: s.autoplayNext,
        mature: s.mature,
        library: s.library,
      }),
    }
  )
);

// Continue watching = history with 1% < progress < 90%
export function continueWatching(h: WatchEntry[]): WatchEntry[] {
  return h.filter((e) => {
    if (!e.duration) return e.progress > 0;
    const pct = (e.progress / e.duration) * 100;
    return pct > 1 && pct < 90;
  });
}
