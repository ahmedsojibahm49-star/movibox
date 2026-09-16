"use client";
import * as React from "react";
import Link from "next/link";
import {
  User,
  ListVideo,
  History,
  Settings as SettingsIcon,
  Play,
  Trash2,
  LogOut,
  Check,
  Pencil,
  X,
  AlertTriangle,
} from "lucide-react";
import { useStore, continueWatching } from "@/lib/store";
import { Button, EmptyState, Modal } from "@/components/ui/primitives";
import { WideCard } from "@/components/cards/MovieCard";
import { cn, formatDuration } from "@/lib/utils";

const TABS = [
  { key: "overview", label: "Overview", icon: <User size={15} /> },
  { key: "watchlist", label: "Watchlist", icon: <ListVideo size={15} /> },
  { key: "history", label: "History", icon: <History size={15} /> },
  { key: "settings", label: "Settings", icon: <SettingsIcon size={15} /> },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function ProfilePage() {
  const user = useStore((s) => s.user);
  const watchlist = useStore((s) => s.watchlist);
  const history = useStore((s) => s.history);
  const removeHistory = useStore((s) => s.removeHistory);
  const clearHistory = useStore((s) => s.clearHistory);
  const logout = useStore((s) => s.logout);
  const updateUser = useStore((s) => s.updateUser);
  const deleteAccount = useStore((s) => s.deleteAccount);
  const autoplayNext = useStore((s) => s.autoplayNext);
  const setAutoplayNext = useStore((s) => s.setAutoplayNext);
  const mature = useStore((s) => s.mature);
  const setMature = useStore((s) => s.setMature);
  const toast = useStore((s) => s.toast);
  const [tab, setTab] = React.useState<TabKey>("overview");

  // support deep links like /profile?tab=settings (from the Midnight gate)
  React.useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "settings" || t === "watchlist" || t === "history" || t === "overview") setTab(t);
  }, []);
  const [confirmClear, setConfirmClear] = React.useState(false);
  const [confirmAccount, setConfirmAccount] = React.useState(false);
  const [confirmWipe, setConfirmWipe] = React.useState(false);
  const [editingName, setEditingName] = React.useState(false);
  const [nameDraft, setNameDraft] = React.useState("");

  const cw = continueWatching(history);
  const hours = (history.reduce((a, h) => a + h.progress, 0) / 3600).toFixed(1);
  const watchedCount = history.filter((h) => h.duration && h.progress / h.duration > 0.9).length;

  if (!user) {
    return (
      <div className="pt-24">
        <EmptyState
          icon={<User size={28} />}
          title="Sign in to view your profile"
          hint="Your watchlist, history and settings live here."
          action={
            <Link
              href="/login"
              className="inline-flex h-11 items-center rounded-btn bg-gradient-to-br from-[#FFB300] via-accent to-[#FF4D00] px-5 text-sm font-semibold text-white"
            >
              Sign in
            </Link>
          }
        />
      </div>
    );
  }

  const saveName = () => {
    if (nameDraft.trim() && nameDraft.trim() !== user.name) updateUser({ name: nameDraft });
    setEditingName(false);
  };

  return (
    <div className="pt-20 pb-12">
      <div className="container-site">
        {/* header */}
        <div className="flex flex-col gap-5 rounded-card border border-line bg-card p-6 sm:flex-row sm:items-center">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FFB300] to-[#FF4D00] text-2xl font-extrabold text-white shadow-[0_4px_20px_rgba(255,122,26,0.35)] sm:h-20 sm:w-20 sm:text-3xl">
            {user.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            {editingName ? (
              <div className="flex max-w-sm items-center gap-2">
                <input
                  autoFocus
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveName()}
                  className="input max-w-[220px]"
                  aria-label="Display name"
                />
                <button onClick={saveName} aria-label="Save name" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-success hover:bg-white/15">
                  <Check size={16} />
                </button>
                <button onClick={() => setEditingName(false)} aria-label="Cancel" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-tm hover:bg-white/15">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <h1 className="flex items-center gap-2 text-xl font-extrabold sm:text-2xl">
                <span className="truncate">{user.name}</span>
                <button
                  onClick={() => {
                    setNameDraft(user.name);
                    setEditingName(true);
                  }}
                  aria-label="Edit name"
                  className="shrink-0 text-tm transition-colors hover:text-tp"
                >
                  <Pencil size={15} />
                </button>
              </h1>
            )}
            <p className="truncate text-sm text-tm">{user.email}</p>
            <p className="mt-1 text-xs text-tm">
              Member since {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              {user.provider === "google" && " · Google account"}
            </p>
          </div>
          <button
            onClick={() => {
              logout();
              toast("info", "Signed out");
            }}
            className="inline-flex h-10 w-fit shrink-0 items-center gap-2 rounded-btn border border-line px-4 text-sm font-semibold text-ts transition-colors hover:border-danger/40 hover:text-danger"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>

        {/* stats */}
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Watchlist", value: String(watchlist.length) },
            { label: "Watched", value: String(watchedCount) },
            { label: "In progress", value: String(cw.length) },
            { label: "Hours watched", value: hours },
          ].map((s) => (
            <div key={s.label} className="rounded-card border border-line bg-card p-4 text-center">
              <p className="text-2xl font-extrabold tabular-nums">{s.value}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-tm">{s.label}</p>
            </div>
          ))}
        </div>

        {/* tabs */}
        <div className="no-scrollbar mt-6 flex gap-1 overflow-x-auto border-b border-line">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "relative flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors",
                tab === t.key ? "text-tp" : "text-tm hover:text-ts"
              )}
            >
              {t.icon}
              {t.label}
              {tab === t.key && (
                <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-[#FFB300] to-[#FF4D00]" />
              )}
            </button>
          ))}
        </div>

        <div className="py-8">
          {tab === "overview" && (
            <div className="animate-fade-in">
              {cw.length === 0 ? (
                <EmptyState
                  icon={<Play size={26} />}
                  title="Nothing in progress"
                  hint="Start watching something and it will show up here."
                  action={
                    <Link
                      href="/movies"
                      className="inline-flex h-11 items-center rounded-btn bg-gradient-to-br from-[#FFB300] via-accent to-[#FF4D00] px-5 text-sm font-semibold text-white"
                    >
                      Browse now
                    </Link>
                  }
                />
              ) : (
                <div className="no-scrollbar flex gap-3.5 overflow-x-auto pb-2">
                  {cw.slice(0, 10).map((e) => (
                    <WideCard
                      key={e.slug + (e.se || 0) + "-" + (e.ep || 0)}
                      t={{ name: e.name, slug: e.slug, subjectId: e.subjectId, poster: e.poster }}
                      progress={e.progress}
                      duration={e.duration}
                      label={e.se && e.ep ? `S${e.se} · E${e.ep}` : undefined}
                      onRemove={() => removeHistory(e.slug, e.se, e.ep)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "watchlist" && (
            <div className="animate-fade-in">
              {watchlist.length === 0 ? (
                <EmptyState icon={<ListVideo size={26} />} title="Your watchlist is empty" />
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {watchlist.map((w) => (
                    <li key={w.slug}>
                      <Link
                        href={"/title/" + w.slug}
                        className="group flex items-center gap-3.5 rounded-card border border-line bg-card p-3 transition-colors hover:border-line-strong"
                      >
                        {w.poster && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={w.poster} alt="" className="h-16 w-11 shrink-0 rounded-md object-cover" loading="lazy" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{w.name}</p>
                          <p className="text-xs text-tm">{w.year || ""}</p>
                        </div>
                        <span className="text-tm transition-transform group-hover:translate-x-0.5">→</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === "history" && (
            <div className="animate-fade-in">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-tm">{history.length} items</p>
                {history.length > 0 && (
                  <Button size="sm" variant="danger" icon={<Trash2 size={14} />} onClick={() => setConfirmClear(true)}>
                    Clear all
                  </Button>
                )}
              </div>
              {history.length === 0 ? (
                <EmptyState icon={<History size={26} />} title="No watch history yet" />
              ) : (
                <ul className="space-y-2">
                  {history.map((h) => {
                    const pct = h.duration ? Math.round((h.progress / h.duration) * 100) : 0;
                    return (
                      <li
                        key={h.slug + (h.se || 0) + "-" + (h.ep || 0)}
                        className="flex items-center gap-3.5 rounded-card border border-line bg-card p-3"
                      >
                        {h.poster && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={h.poster} alt="" className="h-16 w-11 shrink-0 rounded-md object-cover" loading="lazy" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{h.name}</p>
                          <p className="text-xs text-tm">
                            {h.se && h.ep ? `S${h.se} · E${h.ep} · ` : ""}
                            {formatDuration(h.progress)} / {formatDuration(h.duration)}
                          </p>
                          <div className="mt-1.5 h-1 w-full max-w-[200px] overflow-hidden rounded-full bg-white/10">
                            <div
                              className={cn("h-full rounded-full", pct >= 90 ? "bg-success" : "bg-gradient-to-r from-[#FFB300] to-[#FF4D00]")}
                              style={{ width: Math.max(2, pct) + "%" }}
                            />
                          </div>
                        </div>
                        {pct >= 90 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-success">
                            <Check size={13} strokeWidth={3} /> Watched
                          </span>
                        ) : (
                          <Link
                            href={`/watch/${h.slug}${h.se && h.ep ? `?se=${h.se}&ep=${h.ep}` : ""}`}
                            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-xs font-bold text-black transition-transform hover:scale-105"
                          >
                            <Play size={11} className="fill-black" strokeWidth={0} /> Resume
                          </Link>
                        )}
                        <button
                          onClick={() => removeHistory(h.slug, h.se, h.ep)}
                          aria-label="Remove from history"
                          className="text-tm transition-colors hover:text-danger"
                        >
                          <Trash2 size={15} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {tab === "settings" && (
            <div className="animate-fade-in max-w-lg space-y-3">
              <SettingRow
                title="Autoplay next episode"
                desc="Series keep playing without a tap when an episode ends."
                right={
                  <button
                    role="switch"
                    aria-checked={autoplayNext}
                    onClick={() => {
                      setAutoplayNext(!autoplayNext);
                      toast("success", "Autoplay " + (!autoplayNext ? "enabled" : "disabled"));
                    }}
                    className={cn(
                      "relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200",
                      autoplayNext ? "bg-gradient-to-r from-[#FFB300] to-[#FF4D00]" : "bg-white/15"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all duration-200",
                        autoplayNext ? "left-[22px]" : "left-0.5"
                      )}
                    />
                  </button>
                }
              />
              <SettingRow
                title="Show Midnight (18+) content"
                desc="Reveals the Midnight shelf in the navigation and unlocks the 18+ movies, series and anime section."
                right={
                  <button
                    role="switch"
                    aria-checked={mature}
                    onClick={() => {
                      setMature(!mature);
                      toast("success", "Midnight (18+) " + (!mature ? "enabled" : "disabled"));
                    }}
                    className={cn(
                      "relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200",
                      mature ? "bg-gradient-to-r from-[#FFB300] to-[#FF4D00]" : "bg-white/15"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all duration-200",
                        mature ? "left-[22px]" : "left-0.5"
                      )}
                    />
                  </button>
                }
              />
              <SettingRow
                title="Clear all data"
                desc="Remove watchlist, history and recent searches from this device."
                right={
                  <Button size="sm" variant="secondary" icon={<Trash2 size={14} />} onClick={() => setConfirmWipe(true)}>
                    Clear
                  </Button>
                }
              />
              <SettingRow
                title="Delete account"
                desc="Remove this demo account and all of its data. You can sign up again."
                right={
                  <Button size="sm" variant="danger" icon={<AlertTriangle size={14} />} onClick={() => setConfirmAccount(true)}>
                    Delete
                  </Button>
                }
              />
              <div className="rounded-card border border-line bg-card p-4">
                <p className="text-sm font-semibold">Storage</p>
                <p className="mt-0.5 text-xs leading-5 text-tm">
                  Your watchlist, history and custom admin catalog are stored locally in this browser
                  (demo mode) — no server database is used.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal open={confirmClear} onClose={() => setConfirmClear(false)} size="sm">
        <div className="p-6">
          <h3 className="text-lg font-bold">Clear all history?</h3>
          <p className="mt-2 text-sm text-tm">
            This removes all watch progress and continue-watching entries. This cannot be undone.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                clearHistory();
                setConfirmClear(false);
                toast("success", "History cleared");
              }}
            >
              Clear history
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={confirmWipe} onClose={() => setConfirmWipe(false)} size="sm">
        <div className="p-6">
          <h3 className="text-lg font-bold">Clear all data?</h3>
          <p className="mt-2 text-sm text-tm">
            Watchlist, history and recent searches will be removed from this device. Your account and
            custom catalog stay.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setConfirmWipe(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                useStore.setState({ watchlist: [], history: [], recentSearches: [] });
                setConfirmWipe(false);
                toast("success", "All data cleared");
              }}
            >
              Clear everything
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={confirmAccount} onClose={() => setConfirmAccount(false)} size="sm">
        <div className="p-6">
          <h3 className="flex items-center gap-2 text-lg font-bold">
            <AlertTriangle size={18} className="text-danger" /> Delete account?
          </h3>
          <p className="mt-2 text-sm text-tm">
            “{user.name}” and all its data (watchlist, history) will be removed from this device.
            This cannot be undone.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setConfirmAccount(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                deleteAccount();
                setConfirmAccount(false);
                toast("info", "Account deleted");
              }}
            >
              Delete account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function SettingRow({
  title,
  desc,
  right,
}: {
  title: string;
  desc: string;
  right: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-card border border-line bg-card p-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-tm">{desc}</p>
      </div>
      <div className="shrink-0">{right}</div>
    </div>
  );
}
