"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Search, X, Clock, ChevronRight, Film, Flame, Trash2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { useUI } from "@/lib/ui-store";
import { useStore } from "@/lib/store";
import type { Suggestion } from "@/lib/types";
import { cn } from "@/lib/utils";

const TRENDING = ["Squid Game", "Attack on Titan", "Naruto", "Friends", "One Piece", "Money Heist"];

function useDebounced(value: string, ms: number) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <span className="font-bold text-accent-hover">{text.slice(i, i + q.length)}</span>
      {text.slice(i + q.length)}
    </>
  );
}

export function SearchOverlay() {
  const { searchOpen, setSearchOpen } = useUI();
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [sug, setSug] = React.useState<Suggestion[]>([]);
  const [active, setActive] = React.useState(-1);
  const [loading, setLoading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const recent = useStore((s) => s.recentSearches);
  const addRecent = useStore((s) => s.addRecentSearch);
  const clearRecent = useStore((s) => s.clearRecentSearches);
  const library = useStore((s) => s.library);
  const debounced = useDebounced(q, 300);

  React.useEffect(() => {
    if (searchOpen) {
      setQ("");
      setSug([]);
      setActive(-1);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [searchOpen]);

  React.useEffect(() => {
    if (!searchOpen) return;
    const kw = debounced.trim();
    if (!kw) {
      setSug([]);
      return;
    }
    let live = true;
    setLoading(true);
    // custom (admin-added) titles first, then API suggestions
    const lib = library
      .filter((t) => t.name.toLowerCase().includes(kw.toLowerCase()))
      .map<Suggestion>((t) => ({ title: t.name, slug: t.slug, subjectId: t.id }));
    api
      .suggest(kw)
      .then((r) => live && setSug([...lib, ...r]))
      .catch(() => live && setSug(lib))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [debounced, searchOpen, library]);

  React.useEffect(() => {
    if (!searchOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSearchOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen, setSearchOpen]);

  if (!searchOpen) return null;

  const submit = (query: string) => {
    const kw = query.trim();
    if (!kw) return;
    addRecent(kw);
    setSearchOpen(false);
    router.push("/search?q=" + encodeURIComponent(kw));
  };

  const openSuggestion = (s: Suggestion) => {
    if (s.slug) {
      addRecent(s.title);
      setSearchOpen(false);
      router.push("/title/" + s.slug);
    } else {
      submit(s.title);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, sug.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    } else if (e.key === "Enter") {
      const s = active >= 0 ? sug[active] : null;
      if (s) openSuggestion(s);
      else submit(q);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Search">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setSearchOpen(false)} />

      {/* gradient border wrapper */}
      <div className="relative mx-auto mt-[7vh] w-[min(680px,94vw)] animate-fade-up sm:mt-[10vh]">
        <div className="rounded-modal bg-gradient-to-b from-accent/50 via-white/15 to-white/10 p-px shadow-[0_30px_90px_rgba(0,0,0,0.8)]">
          <div className="overflow-hidden rounded-[17px] bg-raised">
            {/* input */}
            <div className="flex items-center gap-3.5 border-b border-line px-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-accent-hover">
                <Search size={18} />
              </span>
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setActive(-1);
                }}
                onKeyDown={onKeyDown}
                placeholder="Search movies, series, anime…"
                className="search-input h-[68px] flex-1 bg-transparent text-[17px] font-medium text-tp outline-none placeholder:text-tm"
                aria-label="Search"
              />
              {loading && (
                <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-white/20 border-t-accent" />
              )}
              <button
                onClick={() => setSearchOpen(false)}
                aria-label="Close search"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-tm transition-colors hover:bg-white/10 hover:text-tp"
              >
                <X size={18} />
              </button>
            </div>

            {/* body */}
            <div className="max-h-[54vh] overflow-y-auto p-2.5">
              {q.trim() === "" ? (
                <div className="animate-fade-in">
                  {recent.length > 0 && (
                    <div className="mb-1.5">
                      <div className="flex items-center justify-between px-3 pb-1.5 pt-2">
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-tm">Recent searches</p>
                        <button
                          onClick={clearRecent}
                          className="inline-flex items-center gap-1 text-xs text-tm transition-colors hover:text-tp"
                        >
                          <Trash2 size={12} /> Clear all
                        </button>
                      </div>
                      <div className="grid gap-1 sm:grid-cols-2">
                        {recent.map((r) => (
                          <div key={r} className="group flex items-center">
                            <button
                              onClick={() => submit(r)}
                              className="flex min-w-0 flex-1 items-center gap-3 rounded-btn px-3 py-2.5 text-left transition-colors hover:bg-white/5"
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-tm">
                                <Clock size={14} />
                              </span>
                              <span className="truncate text-[13.5px] text-ts group-hover:text-tp">{r}</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className={cn(recent.length > 0 && "mt-1 border-t border-line pt-2")}>
                    <p className="flex items-center gap-1.5 px-3 pb-2 pt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-tm">
                      <Flame size={12} className="text-accent-hover" /> Popular right now
                    </p>
                    <div className="flex flex-wrap gap-2 px-3 pb-2">
                      {TRENDING.map((t) => (
                        <button
                          key={t}
                          onClick={() => submit(t)}
                          className="rounded-full border border-line bg-white/5 px-3.5 py-2 text-[13px] font-medium text-ts transition-all hover:border-accent/50 hover:bg-accent/10 hover:text-tp"
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : sug.length === 0 && !loading ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center animate-fade-in">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-tm">
                    <Search size={22} />
                  </span>
                  <p className="text-[15px] font-semibold text-tp">No movies found.</p>
                  <p className="text-[13px] text-tm">Try another search.</p>
                  <div className="mt-1 flex flex-wrap justify-center gap-2">
                    {TRENDING.slice(0, 3).map((t) => (
                      <button
                        key={t}
                        onClick={() => submit(t)}
                        className="rounded-full border border-line bg-white/5 px-3.5 py-1.5 text-[12.5px] font-medium text-ts hover:border-accent/50 hover:text-tp"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="animate-fade-in">
                  {sug.map((s, i) => (
                    <button
                      key={s.title + i}
                      onClick={() => openSuggestion(s)}
                      onMouseEnter={() => setActive(i)}
                      className={cn(
                        "flex w-full items-center gap-3.5 rounded-card px-3 py-2.5 text-left transition-colors",
                        active === i ? "bg-white/10" : "hover:bg-white/5"
                      )}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-white/10 to-white/5 text-accent-hover">
                        <Film size={16} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium text-tp">
                        <Highlight text={s.title} q={q.trim()} />
                      </span>
                      <ChevronRight
                        size={16}
                        className={cn("shrink-0 transition-all", active === i ? "translate-x-0.5 text-accent-hover" : "text-tm")}
                      />
                    </button>
                  ))}
                  <div className="mt-1 border-t border-line px-3 pb-1 pt-2">
                    <button
                      onClick={() => submit(q)}
                      className="flex w-full items-center justify-between rounded-card px-3 py-2.5 text-sm font-bold text-accent-hover transition-colors hover:bg-white/5"
                    >
                      See all results for “{q.trim()}”
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* footer */}
            <div className="flex items-center gap-4 border-t border-line px-5 py-2.5 text-[11px] text-tm">
              <span className="hidden items-center gap-1.5 sm:flex">
                <kbd className="rounded-md border border-line bg-white/5 px-1.5 py-0.5 font-sans text-[10px] font-bold">/</kbd> search
              </span>
              <span className="hidden items-center gap-1.5 sm:flex">
                <kbd className="rounded-md border border-line bg-white/5 px-1.5 py-0.5 font-sans text-[10px] font-bold">↑↓</kbd> navigate
              </span>
              <span className="hidden items-center gap-1.5 sm:flex">
                <kbd className="rounded-md border border-line bg-white/5 px-1.5 py-0.5 font-sans text-[10px] font-bold">↵</kbd> open
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="rounded-md border border-line bg-white/5 px-1.5 py-0.5 font-sans text-[10px] font-bold">Esc</kbd> close
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
