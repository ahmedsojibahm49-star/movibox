"use client";
import * as React from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  Settings,
  Subtitles,
  Gauge,
  PictureInPicture2,
  RotateCcw,
  WifiOff,
  Loader2,
  Film,
  X,
  ChevronDown,
  Check,
  Crown,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { useStore } from "@/lib/store";
import type { StreamResult } from "@/lib/types";
import { cn, formatDuration } from "@/lib/utils";

export interface PlayerProps {
  title: string;
  poster?: string;
  subjectId: string;
  slug: string;
  se?: number;
  ep?: number;
  isSeries?: boolean;
  maxEp?: number;
  hasNext?: boolean;
  onNext?: () => void;
  /**
   * Optional direct video URL (admin-added / self-hosted titles).
   * When set, the MovieBox stream API is skipped entirely —
   * MP4 plays natively, .m3u8 is routed through hls.js automatically.
   */
  directUrl?: string;
}

type Phase = "loading" | "ready" | "buffering" | "error" | "unavailable" | "vip" | "ended";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function Player(props: PlayerProps) {
  const { title, poster, subjectId, slug, se = 1, ep = 1, isSeries, maxEp, hasNext, onNext, directUrl } = props;
  const saveProgress = useStore((s) => s.saveProgress);
  const autoplayNext = useStore((s) => s.autoplayNext);

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const hlsRef = React.useRef<any>(null);
  const hideTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimer = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSavedRef = React.useRef(0);
  const lastTapRef = React.useRef(0);
  const seekOnReadyRef = React.useRef<number | null>(null);
  const resumeAnnouncedRef = React.useRef(false);
  const nextTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const failedUrlsRef = React.useRef<Set<string>>(new Set());
  const diagnosingRef = React.useRef(false);

  const [phase, setPhase] = React.useState<Phase>("loading");
  const [sources, setSources] = React.useState<StreamResult["sources"]>([]);
  const [srcIdx, setSrcIdx] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const [current, setCurrent] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [buffered, setBuffered] = React.useState(0);
  const [volume, setVolume] = React.useState(1);
  const [muted, setMuted] = React.useState(false);
  const [speed, setSpeed] = React.useState(1);
  const [fullscreen, setFullscreen] = React.useState(false);
  const [controls, setControls] = React.useState(true);
  const [menu, setMenu] = React.useState<null | "quality" | "speed" | "more">(null);
  const [centerFlash, setCenterFlash] = React.useState<null | "play" | "pause">(null);
  const [seekPreview, setSeekPreview] = React.useState<{ x: number; t: number } | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [resumeAt, setResumeAt] = React.useState<number | null>(null);
  const [countdown, setCountdown] = React.useState<number | null>(null);
  const [errorNote, setErrorNote] = React.useState("");
  const [pipOk] = React.useState(() => typeof document !== "undefined" && "pictureInPictureEnabled" in document);

  const src = sources[srcIdx];

  // ---------------- load sources ----------------
  const loadSources = React.useCallback(
    async (startQuality?: string) => {
      setPhase("loading");
      setErrorNote("");
      // Direct URL (admin-added / self-hosted video) — skip the stream API
      if (directUrl) {
        const isHls = /\.m3u8(\?|$)/i.test(directUrl);
        setSources([{ quality: "Source", format: isHls ? "HLS" : "MP4", url: directUrl, duration: 0, size: "" }]);
        setSrcIdx(0);
        setPhase("ready");
        return;
      }
      try {
        const r = await api.stream(subjectId, slug, se, ep);
        if (!r.hasResource || r.sources.length === 0) {
          setSources([]);
          setPhase(r.limited ? "vip" : "unavailable");
          return;
        }
        const sorted = [...r.sources].sort((a, b) => {
          const pa = parseInt(a.quality) || 0;
          const pb = parseInt(b.quality) || 0;
          return pb - pa;
        });
        setSources(sorted);
        // default: pick requested quality, else 480p if available (fast start), else lowest
        let idx = startQuality ? sorted.findIndex((s) => s.quality === startQuality) : -1;
        if (idx === -1) {
          idx = sorted.findIndex((s) => s.quality === "480p");
          if (idx === -1) idx = sorted.length - 1;
        }
        setSrcIdx(idx);
        setPhase("ready");
      } catch {
        setPhase("unavailable");
      }
    },
    [subjectId, slug, se, ep, directUrl]
  );

  React.useEffect(() => {
    resumeAnnouncedRef.current = false;
    failedUrlsRef.current = new Set();
    diagnosingRef.current = false;
    // resume point from history
    const h = useStore.getState().history.find(
      (x) => x.slug === slug && (x.se || 0) === se && (x.ep || 0) === ep
    );
    let point: number | null = null;
    if (h && h.duration && h.progress > 0) {
      const pct = (h.progress / h.duration) * 100;
      if (pct > 1 && pct < 95) {
        point = h.progress - 2;
        setResumeAt(point);
      } else if (pct >= 95) {
        point = 0;
      }
    }
    seekOnReadyRef.current = point;
    setCountdown(null);
    loadSources();
    return () => {
      if (nextTimeoutRef.current) clearTimeout(nextTimeoutRef.current);
      if (nextIntervalRef.current) clearInterval(nextIntervalRef.current);
    };
  }, [subjectId, se, ep, loadSources]);

  // ---------------- attach source to <video> ----------------
  React.useEffect(() => {
    const v = videoRef.current;
    if (!v || !src || phase !== "ready") return;
    const url = src.url;
    const isHls = url.includes(".m3u8") || src.format === "HLS";
    let cancelled = false;

    const attach = async () => {
      if (isHls) {
        const Hls = (await import("hls.js")).default;
        if (Hls.isSupported()) {
          if (hlsRef.current) hlsRef.current.destroy();
          const hls = new Hls({ maxBufferLength: 30 });
          hlsRef.current = hls;
          hls.loadSource(url);
          hls.attachMedia(v);
          hls.on(Hls.Events.ERROR, (_e, d) => {
            if (d.fatal) {
              if (d.type === Hls.ErrorTypes.NETWORK_ERROR) handleVideoError();
              else if (d.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
            }
          });
        } else if (v.canPlayType("application/vnd.apple.mpegurl")) {
          v.src = url;
        } else {
          handleVideoError();
          return;
        }
      } else {
        v.src = url;
        v.load();
      }
      if (!cancelled) {
        v.playbackRate = speed;
        const p = seekOnReadyRef.current;
        if (p && p > 0) {
          const doSeek = () => {
            try {
              v.currentTime = p;
            } catch {}
          };
          v.addEventListener("loadedmetadata", doSeek, { once: true });
        }
      }
    };
    attach();
    return () => {
      cancelled = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      v.removeAttribute("src");
      v.load();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src?.url, phase === "ready"]);

  // ---------------- video events ----------------
  const diagnose = async (url: string): Promise<string> => {
    try {
      const r = await fetch(url, { method: "HEAD", mode: "cors" });
      if (r.ok || r.status === 206) {
        return "The stream link may have expired. Tap Retry to get a fresh one.";
      }
      return `CDN responded with ${r.status}. Tap Retry — or run the site locally (localhost) where the CDN allows playback.`;
    } catch {
      return "The stream CDN is blocking this website's domain (hotlink protection). It plays normally on localhost / local network — see README.";
    }
  };

  const handleVideoError = React.useCallback(() => {
    if (!src) return;
    failedUrlsRef.current.add(src.url);
    // try the next source (any untried one, keeping quality order)
    const nextIdx = sources.findIndex((s) => !failedUrlsRef.current.has(s.url));
    if (nextIdx !== -1 && nextIdx !== srcIdx) {
      // Silent retry — the player's own loading state covers it, no toast spam.
      setSrcIdx(nextIdx);
      return;
    }
    if (diagnosingRef.current) return;
    diagnosingRef.current = true;
    diagnose(src.url).then((msg) => {
      diagnosingRef.current = false;
      setErrorNote(msg);
      setPhase("error");
    });
  }, [src, sources, srcIdx]);

  const onLoadedMeta = () => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration || 0);
    setPhase((p) => (p === "buffering" ? "ready" : p));
  };
  const onTime = () => {
    const v = videoRef.current;
    if (!v || dragging) return;
    setCurrent(v.currentTime);
    try {
      setBuffered(v.buffered.length ? v.buffered.end(v.buffered.length - 1) : 0);
    } catch {}
  };
  const onPlay = () => {
    setPlaying(true);
    setPhase("ready");
    if (seekOnReadyRef.current != null && resumeAnnouncedRef.current === false && videoRef.current && videoRef.current.currentTime > 1) {
      // announced on resume
    }
  };
  const onPause = () => {
    setPlaying(false);
    saveNow();
  };
  const onWaiting = () => setPhase((p) => (p === "ready" || p === "buffering" ? "buffering" : p));
  const onPlaying = () => setPhase("ready");
  const onEnded = () => {
    setPlaying(false);
    setPhase("ended");
    saveNow();
    if (hasNext && onNext) {
      setCountdown(10);
    }
  };

  // ---------------- progress saving ----------------
  const saveNow = React.useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    if (Math.abs(v.currentTime - lastSavedRef.current) < 3 && v.currentTime > 0) return;
    lastSavedRef.current = v.currentTime;
    saveProgress({
      slug,
      subjectId,
      name: title,
      poster: poster || "",
      se: isSeries ? se : undefined,
      ep: isSeries ? ep : undefined,
      progress: v.currentTime,
      duration: v.duration,
    });
  }, [saveProgress, slug, subjectId, title, poster, isSeries, se, ep]);

  React.useEffect(() => {
    saveTimer.current = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) saveNow();
    }, 5000);
    const onUnload = () => saveNow();
    window.addEventListener("beforeunload", onUnload);
    return () => {
      if (saveTimer.current) clearInterval(saveTimer.current);
      window.removeEventListener("beforeunload", onUnload);
      saveNow();
    };
  }, [saveNow]);

  // ---------------- resume announcement ----------------
  React.useEffect(() => {
    if (resumeAt != null && phase === "ready" && !resumeAnnouncedRef.current) {
      const v = videoRef.current;
      if (v && v.currentTime > 0.5) {
        resumeAnnouncedRef.current = true;
        setTimeout(() => setResumeAt(null), 4000);
      }
    }
  }, [phase, resumeAt]);

  // ---------------- next-episode countdown ----------------
  React.useEffect(() => {
    if (countdown == null) return;
    if (countdown <= 0) {
      if (nextIntervalRef.current) clearInterval(nextIntervalRef.current);
      if (autoplayNext && hasNext && onNext) onNext();
      return;
    }
    nextTimeoutRef.current = setTimeout(() => setCountdown((c) => (c == null ? null : c - 1)), 1000);
    return () => {
      if (nextTimeoutRef.current) clearTimeout(nextTimeoutRef.current);
    };
  }, [countdown, autoplayNext, hasNext, onNext]);

  // ---------------- controls auto-hide ----------------
  const poke = React.useCallback(() => {
    setControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setControls(false);
    }, 3000);
  }, []);

  React.useEffect(() => {
    if (!playing) {
      setControls(true);
      return;
    }
    poke();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [playing, poke]);

  // ---------------- actions ----------------
  const togglePlay = React.useCallback(() => {
    const v = videoRef.current;
    if (!v || phase === "unavailable" || phase === "vip" || phase === "error") return;
    if (v.paused) {
      v.play().catch(() => {});
      setCenterFlash("play");
    } else {
      v.pause();
      setCenterFlash("pause");
    }
    setTimeout(() => setCenterFlash(null), 500);
  }, [phase]);

  const seekBy = (delta: number) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    v.currentTime = Math.min(v.duration, Math.max(0, v.currentTime + delta));
    poke();
  };

  const setVol = (vol: number) => {
    const v = videoRef.current;
    const cl = Math.min(1, Math.max(0, vol));
    setVolume(cl);
    setMuted(cl === 0);
    if (v) {
      v.volume = cl;
      v.muted = cl === 0;
    }
  };
  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const toggleFullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen?.().catch(() => {});
  };
  React.useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const togglePip = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
    } catch {}
  };

  // double-tap seek (mobile)
  const onVideoTap = (e: React.MouseEvent) => {
    const now = Date.now();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (now - lastTapRef.current < 300) {
      lastTapRef.current = 0;
      seekBy(x < rect.width / 2 ? -15 : 15);
    } else {
      lastTapRef.current = now;
      setTimeout(() => {
        if (lastTapRef.current === now) togglePlay();
      }, 300);
    }
  };

  // keyboard
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      const v = videoRef.current;
      if (!v) return;
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          seekBy(e.shiftKey ? -30 : -5);
          break;
        case "ArrowRight":
          seekBy(e.shiftKey ? 30 : 5);
          break;
        case "j":
          seekBy(-10);
          break;
        case "l":
          seekBy(10);
          break;
        case "ArrowUp":
          e.preventDefault();
          setVol(v.volume + 0.05);
          break;
        case "ArrowDown":
          e.preventDefault();
          setVol(v.volume - 0.05);
          break;
        case "m":
          toggleMute();
          break;
        case "f":
          toggleFullscreen();
          break;
        case "p":
          if (pipOk) togglePip();
          break;
        case ".":
          cycleSpeed(1);
          break;
        case ",":
          cycleSpeed(-1);
          break;
        case "0": case "1": case "2": case "3": case "4":
        case "5": case "6": case "7": case "8": case "9":
          if (v.duration) v.currentTime = (v.duration * Number(e.key)) / 10;
          break;
        case "Home":
          if (v.duration) v.currentTime = 0;
          break;
        case "End":
          if (v.duration) v.currentTime = v.duration - 2;
          break;
      }
      poke();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [togglePlay, pipOk]);

  const cycleSpeed = (dir: 1 | -1) => {
    const i = SPEEDS.indexOf(speed);
    const ni = Math.min(SPEEDS.length - 1, Math.max(0, i + dir));
    applySpeed(SPEEDS[ni]);
  };
  const applySpeed = (s: number) => {
    setSpeed(s);
    const v = videoRef.current;
    if (v) v.playbackRate = s;
    useStore.getState().toast("info", "Playback speed " + s + "×");
  };

  const switchQuality = (q: string) => {
    const i = sources.findIndex((s) => s.quality === q);
    if (i === -1 || i === srcIdx) {
      setMenu(null);
      return;
    }
    const v = videoRef.current;
    const t = v?.currentTime || 0;
    seekOnReadyRef.current = t;
    setSrcIdx(i);
    setMenu(null);
  };

  // ---------------- seek bar geometry ----------------
  const barRef = React.useRef<HTMLDivElement>(null);
  const posToTime = (clientX: number) => {
    const el = barRef.current;
    if (!el || !duration) return 0;
    const r = el.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    return p * duration;
  };
  const onBarMove = (e: React.MouseEvent | React.TouchEvent) => {
    const x = "touches" in e ? e.touches[0]?.clientX : (e as React.MouseEvent).clientX;
    if (x == null) return;
    setSeekPreview({ x, t: posToTime(x) });
  };
  const onBarDown = (e: React.MouseEvent) => {
    setDragging(true);
    const t = posToTime(e.clientX);
    const v = videoRef.current;
    if (v) v.currentTime = t;
    setCurrent(t);
  };
  React.useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      setSeekPreview({ x: e.clientX, t: posToTime(e.clientX) });
      const v = videoRef.current;
      if (v) v.currentTime = posToTime(e.clientX);
      setCurrent(posToTime(e.clientX));
    };
    const onUp = () => {
      setDragging(false);
      setSeekPreview(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, duration]);

  const playedPct = duration ? (current / duration) * 100 : 0;
  const bufferedPct = duration ? (buffered / duration) * 100 : 0;
  const previewPct = seekPreview ? (seekPreview.t / (duration || 1)) * 100 : null;

  // ================================================================
  return (
    <div
      ref={wrapRef}
      className={cn(
        "group/player relative w-full select-none bg-black",
        fullscreen ? "flex h-full items-center justify-center" : "aspect-video overflow-hidden rounded-card"
      )}
      onMouseMove={poke}
      onMouseLeave={() => playing && setControls(false)}
    >
      <video
        ref={videoRef}
        className="h-full w-full object-contain"
        playsInline
        muted={muted}
          preload="auto"
          {...({ referrerPolicy: "no-referrer" } as unknown as React.VideoHTMLAttributes<HTMLVideoElement>)}
          onClick={onVideoTap}
        onDoubleClick={toggleFullscreen}
        onLoadedMetadata={onLoadedMeta}
        onTimeUpdate={onTime}
        onPlay={onPlay}
        onPause={onPause}
        onWaiting={onWaiting}
        onPlaying={onPlaying}
        onCanPlay={() => {
          setPhase((p) => (p === "buffering" || p === "loading" ? "ready" : p));
        }}
        onError={handleVideoError}
        onEnded={onEnded}
      />

      {/* poster behind */}
      {!playing && phase !== "loading" && poster && (
        <img
          src={poster}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full scale-125 object-cover opacity-30 blur-xl"
        />
      )}

      {/* -------- center states -------- */}
      {(phase === "loading" || phase === "buffering") && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40">
          <Loader2 size={44} className="animate-spin text-accent" strokeWidth={1.5} />
          <p className="text-xs font-medium tracking-wide text-ts">Loading stream…</p>
        </div>
      )}

      {centerFlash && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm animate-fade-in">
            {centerFlash === "play" ? <Play size={34} className="fill-white text-white" strokeWidth={0} /> : <Pause size={32} className="fill-white text-white" strokeWidth={0} />}
          </span>
        </div>
      )}

      {resumeAt != null && phase === "ready" && (
        <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-line bg-black/80 px-4 py-1.5 text-xs font-semibold text-tp backdrop-blur animate-fade-in">
          Resumed at {formatDuration(resumeAt)}
        </div>
      )}

      {/* error / unavailable */}
      {phase === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 p-6 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/10 text-danger">
            <WifiOff size={28} strokeWidth={1.5} />
          </span>
          <p className="max-w-sm text-[15px] font-semibold">This video is currently unavailable.</p>
          <p className="max-w-sm text-sm text-tm">{errorNote || "Please try again later."}</p>
          <div className="mt-2 flex gap-3">
            <button
              onClick={() => loadSources()}
              className="inline-flex h-11 items-center gap-2 rounded-btn bg-gradient-to-br from-[#FFB300] via-accent to-[#FF4D00] px-5 text-sm font-semibold text-white"
            >
              <RotateCcw size={15} /> Retry
            </button>
          </div>
        </div>
      )}

      {phase === "unavailable" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 p-6 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-tm">
            <Film size={28} strokeWidth={1.5} />
          </span>
          <p className="max-w-sm text-[15px] font-semibold">This video is currently unavailable.</p>
          <p className="max-w-sm text-sm text-tm">Please try again later.</p>
          <button
            onClick={() => loadSources()}
            className="mt-2 inline-flex h-11 items-center gap-2 rounded-btn bg-gradient-to-br from-[#FFB300] via-accent to-[#FF4D00] px-5 text-sm font-semibold text-white"
          >
            <RotateCcw size={15} /> Try again
          </button>
        </div>
      )}

      {phase === "vip" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 p-6 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-warning/10 text-warning">
            <Crown size={28} strokeWidth={1.5} />
          </span>
          <p className="max-w-sm text-[15px] font-semibold">This episode is VIP-only.</p>
          <p className="max-w-sm text-sm text-tm">
            It requires a premium account on the source. Try another episode or title.
          </p>
        </div>
      )}

      {/* -------- top bar -------- */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 flex items-center gap-3 bg-gradient-to-b from-black/80 to-transparent p-4 transition-all duration-300",
          controls || !playing ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        <p className="min-w-0 truncate text-sm font-bold">
          {title}
          {isSeries && (
            <span className="ml-2 font-medium text-tm">
              S{se} · E{ep}
            </span>
          )}
        </p>
        {src && (
          <span className="ml-auto shrink-0 rounded-badge bg-white/10 px-2 py-0.5 text-[11px] font-bold text-ts">
            {src.quality}
          </span>
        )}
      </div>

      {/* -------- bottom controls -------- */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pb-2.5 pt-8 transition-all duration-300 sm:px-4",
          controls || !playing ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        {/* seek bar */}
        <div
          ref={barRef}
          className="group/bar relative mb-2.5 h-4 cursor-pointer"
          onMouseDown={onBarDown}
          onMouseMove={onBarMove}
          onMouseLeave={() => !dragging && setSeekPreview(null)}
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(current)}
        >
          <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/20 transition-all group-hover/bar:h-1.5">
            <div className="absolute inset-y-0 left-0 rounded-full bg-white/30" style={{ width: bufferedPct + "%" }} />
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#FFB300] to-[#FF4D00]"
              style={{ width: playedPct + "%" }}
            />
          </div>
          <div
            className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow transition-transform group-hover/bar:scale-125"
            style={{ left: playedPct + "%" }}
          />
          {seekPreview && previewPct != null && (
            <div
              className="pointer-events-none absolute -top-9 -translate-x-1/2 rounded-md border border-line bg-raised px-2 py-1 text-[11px] font-bold text-tp shadow-modal"
              style={{ left: previewPct + "%" }}
            >
              {formatDuration(seekPreview.t)}
            </div>
          )}
        </div>

        {/* buttons */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <CtrlBtn label={playing ? "Pause" : "Play"} onClick={togglePlay}>
            {playing ? <Pause size={20} className="fill-tp" strokeWidth={0} /> : <Play size={20} className="fill-tp" strokeWidth={0} />}
          </CtrlBtn>
          <span className="hidden sm:inline-flex">
            <CtrlBtn label="Back 10 seconds" onClick={() => seekBy(-10)}>
              <SkipBack size={20} />
            </CtrlBtn>
          </span>
          <span className="hidden sm:inline-flex">
            <CtrlBtn label="Forward 10 seconds" onClick={() => seekBy(10)}>
              <SkipForward size={20} />
            </CtrlBtn>
          </span>

          {/* volume */}
          <div className="group/vol flex items-center">
            <CtrlBtn label={muted ? "Unmute" : "Mute"} onClick={toggleMute}>
              {muted || volume === 0 ? <VolumeX size={19} /> : <Volume2 size={19} />}
            </CtrlBtn>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => setVol(parseFloat(e.target.value))}
              aria-label="Volume"
              className="h-1 w-0 cursor-pointer accent-[#FF7A1A] opacity-0 transition-all duration-200 group-hover/vol:w-20 group-hover/vol:opacity-100 max-sm:hidden"
            />
          </div>

          <span className="ml-1 text-[12.5px] font-medium tabular-nums text-ts">
            {formatDuration(current)}
            <span className="text-tm"> / {formatDuration(duration)}</span>
          </span>

          <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
            {/* quality */}
            {sources.length > 1 && (
              <div className="relative">
                <MenuBtn
                  label="Quality"
                  active={menu === "quality"}
                  onClick={() => setMenu(menu === "quality" ? null : "quality")}
                >
                  <Settings size={18} />
                </MenuBtn>
                {menu === "quality" && (
                  <Popover onClose={() => setMenu(null)}>
                    <p className="px-1 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-tm">Quality</p>
                    {sources.map((s) => (
                      <button
                        key={s.quality + s.url.slice(-8)}
                        onClick={() => switchQuality(s.quality)}
                        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-ts hover:bg-white/5 hover:text-tp"
                      >
                        {s.quality}
                        {s.quality === src?.quality && <Check size={14} className="text-accent" />}
                      </button>
                    ))}
                  </Popover>
                )}
              </div>
            )}

            {/* speed */}
            <div className="relative">
              <MenuBtn
                label="Playback speed"
                active={menu === "speed"}
                onClick={() => setMenu(menu === "speed" ? null : "speed")}
                text
              >
                {speed === 1 ? "1×" : speed + "×"}
              </MenuBtn>
              {menu === "speed" && (
                <Popover onClose={() => setMenu(null)}>
                  <p className="px-1 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-tm">Speed</p>
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        applySpeed(s);
                        setMenu(null);
                      }}
                      className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-ts hover:bg-white/5 hover:text-tp"
                    >
                      {s === 1 ? "Normal" : s + "×"}
                      {s === speed && <Check size={14} className="text-accent" />}
                    </button>
                  ))}
                </Popover>
              )}
            </div>

            <span className="max-sm:hidden">
              <CtrlBtn label="Restart" onClick={() => { const v = videoRef.current; if (v) v.currentTime = 0; }}>
                <RotateCcw size={18} />
              </CtrlBtn>
            </span>
            {pipOk && (
              <CtrlBtn label="Picture in picture" onClick={togglePip}>
                <PictureInPicture2 size={18} />
              </CtrlBtn>
            )}
            <CtrlBtn label={fullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={toggleFullscreen}>
              {fullscreen ? <Minimize size={19} /> : <Maximize size={19} />}
            </CtrlBtn>
          </div>
        </div>
      </div>

      {/* -------- ended / up next -------- */}
      {phase === "ended" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80 p-6">
          {countdown != null && hasNext ? (
            <div className="flex flex-col items-center gap-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-tm">Up next</p>
              <div className="relative flex h-24 w-24 items-center justify-center">
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 96 96">
                  <circle cx="48" cy="48" r="42" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="4" />
                  <circle
                    cx="48"
                    cy="48"
                    r="42"
                    fill="none"
                    stroke="url(#g)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 42}
                    strokeDashoffset={2 * Math.PI * 42 * (1 - countdown / 10)}
                  />
                  <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#FFB300" />
                      <stop offset="100%" stopColor="#FF4D00" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="text-3xl font-extrabold tabular-nums">{countdown}</span>
              </div>
              <p className="text-sm text-ts">
                S{se} · E{ep + 1} will start automatically
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => onNext?.()}
                  className="inline-flex h-11 items-center gap-2 rounded-btn bg-gradient-to-br from-[#FFB300] via-accent to-[#FF4D00] px-5 text-sm font-semibold text-white"
                >
                  <Play size={15} className="fill-white" strokeWidth={0} /> Play now
                </button>
                <button
                  onClick={() => setCountdown(null)}
                  className="inline-flex h-11 items-center gap-2 rounded-btn border border-line bg-white/10 px-5 text-sm font-semibold text-tp hover:bg-white/20"
                >
                  <X size={15} /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={() => {
                  const v = videoRef.current;
                  if (v) {
                    v.currentTime = 0;
                    v.play().catch(() => {});
                  }
                }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-110"
                aria-label="Replay"
              >
                <RotateCcw size={26} />
              </button>
              <p className="text-sm font-semibold text-ts">Watch again</p>
            </>
          )}
        </div>
      )}
    </div>
  );

  function CtrlBtn({ label, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
    return (
      <button
        aria-label={label}
        title={label}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-tp transition-all hover:bg-white/15 active:scale-90"
        {...rest}
      >
        {children}
      </button>
    );
  }

  function MenuBtn({
    label,
    children,
    active,
    text,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean; text?: boolean }) {
    return (
      <button
        aria-label={label}
        title={label}
        className={cn(
          "inline-flex h-10 items-center justify-center gap-1 rounded-full px-2.5 text-[13px] font-bold transition-all hover:bg-white/15 active:scale-90",
          text ? "w-auto" : "w-10",
          active ? "bg-white/15 text-tp" : "text-tp"
        )}
        {...rest}
      >
        {children}
      </button>
    );
  }

  function Popover({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
    return (
      <>
        <div className="fixed inset-0 z-10" onClick={onClose} />
        <div className="absolute bottom-12 right-0 z-20 w-40 rounded-card border border-line bg-raised/95 p-1.5 shadow-modal backdrop-blur animate-scale-in">
          {children}
        </div>
      </>
    );
  }
}
