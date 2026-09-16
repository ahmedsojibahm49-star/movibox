"use client";
import * as React from "react";
import {
  LayoutDashboard,
  Users,
  Activity,
  HeartPulse,
  RefreshCw,
  Play,
  ListVideo,
  Clock,
  Shield,
  Clapperboard,
  Plus,
  Pencil,
  Trash2,
  Download,
  Upload,
  Link2,
  Info,
  X,
  Check,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { Button, Skeleton } from "@/components/ui/primitives";
import { cn, formatDuration } from "@/lib/utils";
import type { LibraryTitle } from "@/lib/types";

const HEALTH_CHECKS = [
  { label: "Homepage", path: "/api/home" },
  { label: "Movies catalog", path: "/api/catalog?type=movies&page=1" },
  { label: "Series catalog", path: "/api/catalog?type=series&page=1" },
  { label: "Anime catalog", path: "/api/catalog?type=anime&page=1" },
  { label: "Search", path: "/api/search?q=attack&page=1" },
  { label: "Suggestions", path: "/api/suggest?q=bat" },
  { label: "Detail", path: "/api/detail/attack-on-titan-c0p85b63Xl2" },
  { label: "Stream discovery", path: "/api/stream/7777395346602609920?slug=attack-on-titan-yZeOXuiywg9&se=1&ep=1" },
];

interface CheckResult {
  label: string;
  path: string;
  ok: boolean;
  ms: number;
  status?: number;
}

const TABS = [
  { key: "content", label: "Content", icon: <Clapperboard size={15} /> },
  { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={15} /> },
  { key: "users", label: "Users", icon: <Users size={15} /> },
  { key: "health", label: "API Health", icon: <HeartPulse size={15} /> },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const EMPTY_FORM = {
  name: "",
  type: "movie" as "movie" | "series",
  videoUrl: "",
  poster: "",
  backdrop: "",
  year: "",
  genre: "",
  language: "",
  episodeCount: "",
  description: "",
  sections: ["home"] as string[],
};

const PUBLISH_OPTIONS = [
  { key: "home", label: "Home" },
  { key: "movies", label: "Movies" },
  { key: "series", label: "Series" },
  { key: "anime", label: "Anime" },
  { key: "midnight", label: "Midnight (18+)" },
];

export default function AdminPage() {
  const users = useStore((s) => s.users);
  const watchlist = useStore((s) => s.watchlist);
  const history = useStore((s) => s.history);
  const user = useStore((s) => s.user);
  const toast = useStore((s) => s.toast);
  const library = useStore((s) => s.library);
  const addLibrary = useStore((s) => s.addLibrary);
  const updateLibrary = useStore((s) => s.updateLibrary);
  const removeLibrary = useStore((s) => s.removeLibrary);

  const [tab, setTab] = React.useState<TabKey>("content");
  const [results, setResults] = React.useState<CheckResult[]>([]);
  const [checking, setChecking] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY_FORM);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const runChecks = React.useCallback(async () => {
    setChecking(true);
    const out = await Promise.all(
      HEALTH_CHECKS.map(async (c) => {
        const t0 = performance.now();
        try {
          const r = await fetch(c.path, { cache: "no-store" });
          return { ...c, ok: r.ok, ms: Math.round(performance.now() - t0), status: r.status };
        } catch {
          return { ...c, ok: false, ms: Math.round(performance.now() - t0) };
        }
      })
    );
    setResults(out);
    setChecking(false);
  }, []);

  React.useEffect(() => {
    if (tab === "health" && results.length === 0) runChecks();
  }, [tab, results.length, runChecks]);

  const plays = history.length;
  const topContent = React.useMemo(() => {
    const map = new Map<string, { name: string; poster: string; plays: number }>();
    history.forEach((h) => {
      const cur = map.get(h.slug) || { name: h.name, poster: h.poster, plays: 0 };
      cur.plays += 1;
      map.set(h.slug, cur);
    });
    return [...map.values()].sort((a, b) => b.plays - a.plays).slice(0, 5);
  }, [history]);
  const totalSeconds = history.reduce((a, h) => a + h.progress, 0);

  // ---------- content (custom library) ----------
  const setField = (k: keyof typeof EMPTY_FORM) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const toggleSection = (key: string) =>
    setForm((f) => ({
      ...f,
      sections: f.sections.includes(key)
        ? f.sections.filter((s) => s !== key)
        : [...f.sections, key],
    }));

  const submitContent = () => {
    if (!form.name.trim()) return toast("error", "Please enter a title name.");
    if (!form.videoUrl.trim()) return toast("error", "Please paste a video URL.");
    if (form.sections.length === 0) return toast("error", "Pick at least one section to publish to.");
    const payload = {
      name: form.name.trim(),
      type: form.type,
      videoUrl: form.videoUrl.trim(),
      poster: form.poster.trim() || undefined,
      backdrop: form.backdrop.trim() || undefined,
      year: form.year.trim() || undefined,
      genre: form.genre.trim() || undefined,
      language: form.language.trim() || undefined,
      episodeCount: form.type === "series" ? Math.max(1, parseInt(form.episodeCount, 10) || 1) : undefined,
      description: form.description.trim() || undefined,
      sections: form.sections,
    };
    if (editingId) {
      updateLibrary(editingId, payload);
      toast("success", "“" + payload.name + "” updated");
    } else {
      addLibrary(payload);
    }
    resetForm();
  };

  const startEdit = (t: LibraryTitle) => {
    setEditingId(t.id);
    setForm({
      name: t.name,
      type: t.type,
      videoUrl: t.videoUrl,
      poster: t.poster || "",
      backdrop: t.backdrop || "",
      year: t.year || "",
      genre: t.genre || "",
      language: t.language || "",
      episodeCount: t.type === "series" ? String(t.episodeCount || 1) : "",
      description: t.description || "",
      sections: t.sections && t.sections.length ? t.sections : ["home"],
    });
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(library, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "streambox-library.json";
    a.click();
    URL.revokeObjectURL(url);
    toast("success", "Library exported");
  };

  const importJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const arr = JSON.parse(String(reader.result));
        if (!Array.isArray(arr)) throw new Error("bad");
        let n = 0;
        arr.forEach((x) => {
          if (x && x.name && x.videoUrl) {
            addLibrary(
              {
                name: String(x.name),
                type: x.type === "series" ? "series" : "movie",
                videoUrl: String(x.videoUrl),
                poster: x.poster || undefined,
                backdrop: x.backdrop || undefined,
                year: x.year || undefined,
                genre: x.genre || undefined,
                language: x.language || undefined,
                episodeCount: x.episodeCount ? Number(x.episodeCount) : undefined,
                description: x.description || undefined,
                sections: Array.isArray(x.sections) ? x.sections.map(String) : ["home"],
              },
              { silent: true }
            );
            n++;
          }
        });
        toast(n ? "success" : "error", n ? `Imported ${n} title${n > 1 ? "s" : ""}` : "No valid titles in file");
      } catch {
        toast("error", "That file isn’t a valid library export.");
      }
    };
    reader.readAsText(f);
    e.target.value = "";
  };

  return (
    <div className="pt-20 pb-12">
      <div className="container-site">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl font-extrabold tracking-tight sm:text-3xl">
              <Shield size={24} className="text-accent" /> Admin
            </h1>
            <p className="mt-1 text-sm text-tm">Add your own videos and manage the platform</p>
          </div>
          <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-full border border-line bg-card p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition-all",
                  tab === t.key
                    ? "bg-gradient-to-br from-[#FFB300] via-accent to-[#FF4D00] text-white"
                    : "text-ts hover:text-tp"
                )}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {tab === "content" && (
          <div className="animate-fade-in">
            <div className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
              {/* form */}
              <section className="rounded-card border border-line bg-card p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-tm">
                    {editingId ? <Pencil size={15} /> : <Plus size={15} />}
                    {editingId ? "Edit title" : "Add a title"}
                  </h2>
                  {editingId && (
                    <button onClick={resetForm} className="flex items-center gap-1 text-xs text-tm hover:text-tp">
                      <X size={13} /> Cancel
                    </button>
                  )}
                </div>

                <div className="space-y-3.5">
                  <Field label="Title *">
                    <input
                      value={form.name}
                      onChange={setField("name")}
                      placeholder="e.g. My First Short Film"
                      className="input"
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Type">
                      <select value={form.type} onChange={setField("type")} className="input">
                        <option value="movie">Movie</option>
                        <option value="series">Series</option>
                      </select>
                    </Field>
                    <Field label="Year">
                      <input value={form.year} onChange={setField("year")} placeholder="2026" className="input" inputMode="numeric" />
                    </Field>
                  </div>

                  <Field label="Video URL *  (direct MP4 or M3U8 link)">
                    <input
                      value={form.videoUrl}
                      onChange={setField("videoUrl")}
                      placeholder="https://…/video.mp4  or  https://…/stream.m3u8"
                      className="input font-mono text-[12.5px]"
                    />
                    <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-tm">
                      <Link2 size={12} /> Host it anywhere — your own server, a video host, or your API. HLS (.m3u8) is auto-supported.
                    </p>
                  </Field>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Poster URL">
                      <input value={form.poster} onChange={setField("poster")} placeholder="https://…/poster.jpg" className="input" />
                    </Field>
                    <Field label="Backdrop URL">
                      <input value={form.backdrop} onChange={setField("backdrop")} placeholder="https://…/bg.jpg" className="input" />
                    </Field>
                  </div>

                  {/* live poster preview */}
                  {form.poster.trim() && (
                    <div className="flex items-center gap-3 rounded-card border border-line bg-white/[0.03] p-2.5">
                      <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-md bg-white/5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={form.poster.trim()} alt="Poster preview" className="h-full w-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.25")} />
                      </div>
                      <p className="text-xs text-tm">
                        Poster preview. Leave blank to use the default cover art.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <Field label="Genre">
                      <input value={form.genre} onChange={setField("genre")} placeholder="Drama" className="input" />
                    </Field>
                    <Field label="Language">
                      <input value={form.language} onChange={setField("language")} placeholder="Hindi" className="input" />
                    </Field>
                    {form.type === "series" && (
                      <Field label="Episodes">
                        <input
                          value={form.episodeCount}
                          onChange={setField("episodeCount")}
                          placeholder="1"
                          className="input"
                          inputMode="numeric"
                        />
                      </Field>
                    )}
                  </div>

                  <Field label="Description">
                    <textarea
                      value={form.description}
                      onChange={setField("description")}
                      rows={3}
                      placeholder="Short synopsis shown on the detail page…"
                      className="input resize-none"
                    />
                  </Field>

                  {/* publish targets */}
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-tm">
                      <Upload size={12} /> Publish to <span className="normal-case text-tm/60">(where it appears)</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {PUBLISH_OPTIONS.map((o) => {
                        const on = form.sections.includes(o.key);
                        return (
                          <button
                            key={o.key}
                            type="button"
                            onClick={() => toggleSection(o.key)}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-all",
                              on
                                ? "border-transparent bg-gradient-to-br from-[#FFB300] via-accent to-[#FF4D00] text-white shadow-[0_2px_12px_rgba(255,122,26,0.35)]"
                                : "border-line bg-white/5 text-ts hover:border-line-strong hover:text-tp"
                            )}
                          >
                            {on && <Check size={13} strokeWidth={3} />}
                            {o.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-1.5 text-[11.5px] text-tm">
                      Always appears in search + its own detail/player page. “Home” shows it in the
                      My Collection row; the rest appear as a “Your Uploads” row on that section.
                    </p>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button icon={editingId ? <Pencil size={14} /> : <Plus size={15} />} onClick={submitContent}>
                      {editingId ? "Save changes" : "Add to catalog"}
                    </Button>
                  </div>
                </div>
              </section>

              {/* library list */}
              <section className="rounded-card border border-line bg-card p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-tm">
                    My catalog <span className="text-tm/60">({library.length})</span>
                  </h2>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={exportJson}
                      disabled={library.length === 0}
                      className="inline-flex h-8 items-center gap-1.5 rounded-btn border border-line px-3 text-xs font-semibold text-ts transition-colors hover:text-tp disabled:opacity-40"
                    >
                      <Download size={13} /> Export
                    </button>
                    <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-btn border border-line px-3 text-xs font-semibold text-ts transition-colors hover:text-tp">
                      <Upload size={13} /> Import
                      <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={importJson} />
                    </label>
                  </div>
                </div>

                {library.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-10 text-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-tm">
                      <Clapperboard size={24} />
                    </span>
                    <p className="text-sm font-semibold">Nothing added yet</p>
                    <p className="max-w-[240px] text-xs leading-5 text-tm">
                      Add a video with a direct URL on the left — it instantly appears on Home, Search and the player.
                    </p>
                  </div>
                ) : (
                  <ul className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                    {library.map((t) => (
                      <li key={t.id} className="flex items-center gap-3 rounded-card border border-line bg-white/[0.02] p-2.5">
                        <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-white/5">
                          {t.poster ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={t.poster} alt="" className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-tm">
                              <Clapperboard size={15} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{t.name}</p>
                          <p className="truncate text-[11px] text-tm">
                            <span className="capitalize">{t.type}</span>
                            {t.year ? ` · ${t.year}` : ""}
                            {t.language ? ` · ${t.language}` : ""}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {(t.sections && t.sections.length ? t.sections : ["home"]).map((s) => (
                              <span key={s} className="rounded-badge bg-accent/15 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-accent-hover">
                                {s}
                              </span>
                            ))}
                          </div>
                          <p className="mt-0.5 truncate font-mono text-[10.5px] text-tm/70">{t.videoUrl}</p>
                        </div>
                        <button
                          onClick={() => startEdit(t)}
                          aria-label={"Edit " + t.name}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-btn text-tm transition-colors hover:bg-white/10 hover:text-tp"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => removeLibrary(t.id)}
                          aria-label={"Delete " + t.name}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-btn text-tm transition-colors hover:bg-danger/15 hover:text-danger"
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            {/* how it works */}
            <div className="mt-5 rounded-card border border-line bg-card/60 p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <Info size={15} className="text-accent" /> How to add your own videos
              </h3>
              <div className="mt-3 grid gap-4 text-[13px] leading-6 text-ts sm:grid-cols-3">
                {[
                  {
                    n: "1",
                    t: "Get a direct video URL",
                    d: "Upload your MP4 to any host (your server, a video host, or a file link) — or build your own API that returns a video URL.",
                  },
                  {
                    n: "2",
                    t: "Paste it above",
                    d: "Give it a name, type, poster and optional details. MP4 plays natively; .m3u8 (HLS) streams automatically.",
                  },
                  {
                    n: "3",
                    t: "It goes live everywhere",
                    d: "The title shows on Home (My Collection), Search and its own detail + player page — alongside all MovieBox content.",
                  },
                ].map((s) => (
                  <div key={s.n} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-extrabold text-accent-hover">
                      {s.n}
                    </span>
                    <div>
                      <p className="font-semibold text-tp">{s.t}</p>
                      <p className="mt-1 text-tm">{s.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "dashboard" && (
          <div className="animate-fade-in">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={<Clapperboard size={17} />} label="Custom titles" value={String(library.length)} />
              <StatCard icon={<Users size={17} />} label="Registered users" value={String(users.length)} />
              <StatCard icon={<Play size={17} />} label="Total plays" value={String(plays)} />
              <StatCard icon={<Clock size={17} />} label="Watch time" value={formatDuration(totalSeconds)} />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <section className="rounded-card border border-line bg-card p-5">
                <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-tm">Top content (this device)</h2>
                {topContent.length === 0 ? (
                  <p className="py-8 text-center text-sm text-tm">No plays recorded yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {topContent.map((t, i) => (
                      <li key={t.name} className="flex items-center gap-3">
                        <span className="w-5 text-center text-sm font-extrabold text-tm">{i + 1}</span>
                        {t.poster && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={t.poster} alt="" className="h-12 w-9 rounded object-cover" loading="lazy" />
                        )}
                        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{t.name}</p>
                        <span className="text-xs font-bold text-accent-hover">{t.plays} plays</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-card border border-line bg-card p-5">
                <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-tm">Recent signups</h2>
                {users.length === 0 ? (
                  <p className="py-8 text-center text-sm text-tm">No accounts yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {users.slice(-5).reverse().map((u) => (
                      <li key={u.id} className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#FFB300] to-[#FF4D00] text-sm font-bold text-white">
                          {u.name.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{u.name}</p>
                          <p className="truncate text-xs text-tm">{u.email}</p>
                        </div>
                        <span className="text-xs text-tm">
                          {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        )}

        {tab === "users" && (
          <div className="animate-fade-in rounded-card border border-line bg-card">
            <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-line p-4 text-xs font-bold uppercase tracking-wider text-tm sm:grid-cols-[1.4fr_1.4fr_.6fr_.8fr]">
              <span>User</span>
              <span className="hidden sm:block">Email</span>
              <span className="hidden sm:block">Provider</span>
              <span>Joined</span>
            </div>
            {users.length === 0 ? (
              <p className="p-10 text-center text-sm text-tm">No registered accounts on this device yet.</p>
            ) : (
              users.map((u) => (
                <div
                  key={u.id}
                  className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-line/60 p-4 last:border-0 sm:grid-cols-[1.4fr_1.4fr_.6fr_.8fr]"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FFB300] to-[#FF4D00] text-sm font-bold text-white">
                      {u.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="truncate text-sm font-semibold">
                      {u.name}
                      {user?.id === u.id && (
                        <span className="ml-2 rounded-badge bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold text-accent-hover">
                          You
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="hidden truncate text-sm text-ts sm:block">{u.email}</span>
                  <span className="hidden text-xs text-tm capitalize sm:block">{u.provider}</span>
                  <span className="text-xs text-tm">
                    {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "health" && (
          <div className="animate-fade-in">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-tm">
                {checking
                  ? "Checking endpoints…"
                  : `Last checked ${results.length ? "just now" : "—"} · ${results.filter((r) => r.ok).length}/${HEALTH_CHECKS.length} healthy`}
              </p>
              <Button size="sm" variant="secondary" icon={<RefreshCw size={14} className={cn(checking && "animate-spin")} />} loading={checking} onClick={runChecks}>
                Re-test now
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {results.length === 0
                ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-card" />)
                : results.map((r) => (
                    <div
                      key={r.path}
                      className={cn(
                        "flex items-center gap-3.5 rounded-card border p-4",
                        r.ok ? "border-line bg-card" : "border-danger/30 bg-danger/5"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                          r.ok ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
                        )}
                      >
                        <Activity size={17} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{r.label}</p>
                        <p className="truncate text-[11px] text-tm">{r.path}</p>
                      </div>
                      <span className={cn("shrink-0 text-xs font-bold tabular-nums", r.ok ? "text-success" : "text-danger")}>
                        {r.ok ? r.ms + " ms" : "Failed"}
                      </span>
                    </div>
                  ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-tm">
              These checks verify the StreamBox proxy routes and the self-hosted MovieBox API behind them.
              If “Stream discovery” fails, the MovieBox API service is likely down — restart it (see README).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-tm">{label}</span>
      {children}
    </label>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-card border border-line bg-card p-5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-accent-hover">{icon}</span>
      <p className="mt-3 text-2xl font-extrabold tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-tm">{label}</p>
    </div>
  );
}
