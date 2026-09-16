"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  ListVideo,
  User,
  Menu,
  X,
  Play,
  Clapperboard,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Home", href: "/" },
  { label: "Movies", href: "/movies" },
  { label: "Series", href: "/series" },
  { label: "Anime", href: "/anime" },
  { label: "Midnight", href: "/midnight" },
  { label: "Top 10", href: "/top10" },
  { label: "Genres", href: "/genres" },
];

function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <Link href="/" onClick={onClick} className="flex items-center gap-2 shrink-0" aria-label="StreamBox home">
      <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-gradient-to-br from-[#FFB300] via-accent to-[#FF4D00] shadow-[0_2px_12px_rgba(255,122,26,0.4)]">
        <Play size={15} className="text-white fill-white" strokeWidth={0} />
      </span>
      <span className="text-[19px] font-extrabold tracking-tight">
        STREAM<span className="text-accent">BOX</span>
      </span>
    </Link>
  );
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const mature = useStore((s) => s.mature);
  const [scrolled, setScrolled] = React.useState(false);
  const [drawer, setDrawer] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const user = useStore((s) => s.user);
  const watchlistCount = useStore((s) => s.watchlist.length);
  const logout = useStore((s) => s.logout);
  const { searchOpen, setSearchOpen } = useUI();
  const profileRef = React.useRef<HTMLDivElement>(null);

  const isHome = pathname === "/";
  const solid = scrolled || !isHome || drawer;

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    const h = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ⌘K / Ctrl+K /  "/"
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const t = e.target as HTMLElement;
        const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
        if (!typing) {
          e.preventDefault();
          setSearchOpen(true);
        }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [setSearchOpen]);

  React.useEffect(() => setDrawer(false), [pathname]);

  // Midnight (18+) only appears once the user enables it in Settings
  const nav = mature ? NAV : NAV.filter((n) => n.href !== "/midnight");

  // Immersive watch page has its own compact top bar — hide the global header.
  // NOTE: must come AFTER all hooks (early return before hooks = React error #300).
  if (pathname.startsWith("/watch")) return null;

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-300",
          solid ? "bg-base/90 backdrop-blur-md border-b border-line" : "bg-gradient-to-b from-black/80 to-transparent"
        )}
      >
        <div className="container-site flex h-16 items-center gap-3 pt-[env(safe-area-inset-top)]">
          <Logo />
          <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Main">
            {nav.map((n) => {
              const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cn(
                    "relative rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200",
                    active ? "text-tp" : "text-ts hover:text-tp"
                  )}
                >
                  {n.label}
                  {active && (
                    <span className="absolute inset-x-3 -bottom-[1px] h-0.5 rounded-full bg-accent" />
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ts transition-colors hover:bg-white/10 hover:text-tp"
            >
              <Search size={19} />
            </button>
            <Link
              href="/watchlist"
              aria-label="Watchlist"
              className="relative hidden h-10 w-10 items-center justify-center rounded-full text-ts transition-colors hover:bg-white/10 hover:text-tp sm:inline-flex"
            >
              <ListVideo size={19} />
              {watchlistCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                  {watchlistCount}
                </span>
              )}
            </Link>
            {user ? (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen((v) => !v)}
                  className="flex items-center gap-1.5 rounded-full p-1 pr-2 transition-colors hover:bg-white/10"
                  aria-label="Profile menu"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#FFB300] to-[#FF4D00] text-sm font-bold text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                  <ChevronDown size={14} className={cn("text-ts transition-transform", profileOpen && "rotate-180")} />
                </button>
                {profileOpen && (
                  <div className="absolute right-0 top-12 w-56 rounded-card border border-line bg-raised p-1.5 shadow-modal animate-scale-in">
                    <div className="border-b border-line px-3 py-2.5">
                      <p className="truncate text-sm font-semibold">{user.name}</p>
                      <p className="truncate text-xs text-tm">{user.email}</p>
                    </div>
                    {[
                      { icon: <User size={16} />, label: "Profile", href: "/profile" },
                      { icon: <ListVideo size={16} />, label: "Watchlist", href: "/watchlist" },
                    ].map((i) => (
                      <Link
                        key={i.label}
                        href={i.href}
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-ts hover:bg-white/5 hover:text-tp"
                      >
                        {i.icon}
                        {i.label}
                      </Link>
                    ))}
                    <button
                      onClick={() => {
                        logout();
                        setProfileOpen(false);
                        router.push("/");
                      }}
                      className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-danger hover:bg-danger/10"
                    >
                      <LogOut size={16} />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="ml-1 hidden rounded-btn bg-gradient-to-br from-[#FFB300] via-accent to-[#FF4D00] px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 sm:inline-flex"
              >
                Sign in
              </Link>
            )}
            <button
              onClick={() => setDrawer(true)}
              aria-label="Menu"
              className="hidden h-10 w-10 items-center justify-center rounded-full text-ts hover:bg-white/10 hover:text-tp md:inline-flex lg:hidden"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={() => setDrawer(false)} />
          <div className="absolute right-0 top-0 flex h-full w-[290px] flex-col border-l border-line bg-surface p-5 shadow-modal animate-slide-in-r">
            <div className="mb-6 flex items-center justify-between">
              <Logo onClick={() => setDrawer(false)} />
              <button onClick={() => setDrawer(false)} aria-label="Close menu" className="text-ts hover:text-tp">
                <X size={20} />
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {nav.map((n) => {
                const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={cn(
                      "flex items-center gap-3 rounded-card px-3 py-3 text-[15px] font-medium transition-colors",
                      active ? "bg-white/10 text-tp" : "text-ts hover:bg-white/5 hover:text-tp"
                    )}
                  >
                    <Clapperboard size={18} className={cn(active && "text-accent")} />
                    {n.label}
                  </Link>
                );
              })}
              <Link
                href="/watchlist"
                className="flex items-center gap-3 rounded-card px-3 py-3 text-[15px] font-medium text-ts hover:bg-white/5 hover:text-tp"
              >
                <ListVideo size={18} />
                Watchlist
                {watchlistCount > 0 && (
                  <span className="ml-auto rounded-full bg-accent/20 px-2 py-0.5 text-xs font-bold text-accent-hover">
                    {watchlistCount}
                  </span>
                )}
              </Link>
            </nav>
            <div className="mt-auto border-t border-line pt-4">
              {user ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#FFB300] to-[#FF4D00] text-sm font-bold text-white">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{user.name}</p>
                      <Link href="/profile" className="text-xs text-accent-hover hover:underline">
                        Profile
                      </Link>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      router.push("/");
                    }}
                    className="text-tm hover:text-danger"
                    aria-label="Sign out"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Link
                    href="/login"
                    className="flex-1 rounded-btn border border-line py-2.5 text-center text-sm font-semibold text-tp hover:bg-white/5"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    className="flex-1 rounded-btn bg-gradient-to-br from-[#FFB300] via-accent to-[#FF4D00] py-2.5 text-center text-sm font-semibold text-white"
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
