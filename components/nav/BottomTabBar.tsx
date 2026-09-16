"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Film, Tv, Moon, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";

const TABS = [
  { href: "/", label: "Home", icon: Home, mature: false },
  { href: "/movies", label: "Movies", icon: Film, mature: false },
  { href: "/anime", label: "Anime", icon: Tv, mature: false },
  { href: "/midnight", label: "Midnight", icon: Moon, mature: true },
  { href: "/profile", label: "Profile", icon: User, mature: false },
];

/**
 * App-style bottom tab bar — mobile only (hidden on md+).
 * Hidden on /watch for an immersive player experience.
 */
export function BottomTabBar() {
  const pathname = usePathname();
  const mature = useStore((s) => s.mature);
  if (pathname.startsWith("/watch")) return null;

  const tabs = mature ? TABS : TABS.filter((t) => !t.mature);
  const cols =
    tabs.length === 5 ? "grid-cols-5" : tabs.length === 4 ? "grid-cols-4" : "grid-cols-" + tabs.length;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-base/95 backdrop-blur-lg md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className={"mx-auto grid max-w-lg " + cols}>
        {tabs.map((t) => {
          const on = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={on ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 pb-1.5 pt-2 text-[10px] font-semibold transition-colors",
                on ? "text-accent" : "text-tm hover:text-ts"
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                  on && "bg-accent/15"
                )}
              >
                <Icon size={19} strokeWidth={on ? 2.4 : 2} />
              </span>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
