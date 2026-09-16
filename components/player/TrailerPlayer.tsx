"use client";
import * as React from "react";
import { Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

function fmt(s: number): string {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return m + ":" + String(ss).padStart(2, "0");
}

/**
 * Lightweight trailer player:
 *  - play/pause, ±10s seek, progress bar (click + drag to seek)
 *  - mute toggle, auto-hiding controls, keyboard (Space, ←/→, M)
 *  - mobile: tap = play/pause, double-tap left/right = ∓/±15s
 */
export function TrailerPlayer({ src, poster, title }: { src: string; poster?: string; title: string }) {
  const vref = React.useRef<HTMLVideoElement>(null);
  const barRef = React.useRef<HTMLDivElement>(null);
  const hideTimer = React.useRef<NodeJS.Timeout | null>(null);
  const lastTap = React.useRef(0);
  const tapZone = React.useRef<"L" | "R" | "C">("C");

  const [playing, setPlaying] = React.useState(false);
  const [muted, setMuted] = React.useState(false);
  const [time, setTime] = React.useState(0);
  const [dur, setDur] = React.useState(0);
  const [showUi, setShowUi] = React.useState(true);

  const poke = () => {
    setShowUi(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (vref.current && !vref.current.paused) setShowUi(false);
    }, 2800);
  };

  const toggle = () => {
    const v = vref.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
    poke();
  };

  const seekBy = (delta: number) => {
    const v = vref.current;
    if (!v || !isFinite(v.duration)) return;
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + delta));
    poke();
  };

  const restart = () => {
    const v = vref.current;
    if (!v) return;
    v.currentTime = 0;
    v.play().catch(() => {});
    poke();
  };

  const seekFromEvent = (clientX: number, commit: boolean) => {
    const v = vref.current;
    const bar = barRef.current;
    if (!v || !bar || !isFinite(v.duration) || v.duration <= 0) return;
    const r = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    v.currentTime = ratio * v.duration;
    if (commit) setTime(ratio * v.duration);
  };

  const onBarPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    seekFromEvent(e.clientX, true);
    const move = (ev: PointerEvent) => seekFromEvent(ev.clientX, false);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      poke();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // keyboard shortcuts while the player is on screen
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.key === " " || e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggle();
      } else if (e.key === "ArrowLeft") seekBy(-10);
      else if (e.key === "ArrowRight") seekBy(10);
      else if (e.key.toLowerCase() === "m") {
        const v = vref.current;
        if (v) v.muted = !v.muted;
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // double-tap seek zones (mobile)
  const onVideoTap = (e: React.MouseEvent) => {
    const now = Date.now();
    const x = e.clientX;
    const w = vref.current?.getBoundingClientRect().width ?? window.innerWidth;
    const zone = x < w / 3 ? "L" : x > (2 * w) / 3 ? "R" : "C";
    if (now - lastTap.current < 300 && zone === tapZone.current) {
      if (zone === "L") seekBy(-15);
      else if (zone === "R") seekBy(15);
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;
    tapZone.current = zone;
    toggle();
  };

  const pct = dur > 0 ? (time / dur) * 100 : 0;

  return (
    <div
      className={cn("group relative aspect-video w-full select-none bg-black", showUi && "cursor-pointer")}
      onMouseMove={poke}
      onMouseLeave={() => vref.current && !vref.current.paused && setShowUi(false)}
    >
      <video
        ref={vref}
        src={src}
        poster={poster}
        playsInline
        autoPlay
        muted
        preload="auto"
        onClick={onVideoTap}
        onPlay={() => {
          setPlaying(true);
          poke();
        }}
        onPause={() => {
          setPlaying(false);
          setShowUi(true);
        }}
        onTimeUpdate={() => vref.current && setTime(vref.current.currentTime)}
        onLoadedMetadata={() => vref.current && setDur(vref.current.duration)}
        onEnded={() => setShowUi(true)}
        {...({ referrerPolicy: "no-referrer" } as unknown as React.VideoHTMLAttributes<HTMLVideoElement>)}
        className="h-full w-full object-contain"
      />

      {/* center play indicator (paused) */}
      {!playing && (
        <button
          onClick={toggle}
          aria-label="Play trailer"
          className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-tp backdrop-blur transition-transform hover:scale-105"
        >
          <Play size={26} className="ml-1 fill-white" strokeWidth={0} />
        </button>
      )}

      {/* bottom control bar */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pb-2 pt-8 transition-opacity duration-200 sm:px-4",
          showUi ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        {/* progress */}
        <div
          ref={barRef}
          onPointerDown={onBarPointerDown}
          role="slider"
          aria-label="Seek trailer"
          aria-valuemin={0}
          aria-valuemax={Math.round(dur)}
          aria-valuenow={Math.round(time)}
          className="group/bar relative h-4 cursor-pointer"
        >
          <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/20">
            <div className="h-full rounded-full bg-gradient-to-r from-[#FFB300] to-[#FF4D00]" style={{ width: pct + "%" }} />
          </div>
          <div
            className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white opacity-0 shadow transition-opacity group-hover/bar:opacity-100"
            style={{ left: `calc(${pct}% - 6px)` }}
          />
        </div>

        <div className="mt-1 flex items-center gap-2 sm:gap-3">
          <button onClick={toggle} aria-label={playing ? "Pause" : "Play"} className="text-tp transition-colors hover:text-accent-hover">
            {playing ? <Pause size={20} /> : <Play size={20} className="fill-white" strokeWidth={0} />}
          </button>
          <button onClick={() => seekBy(-10)} aria-label="Back 10 seconds" className="flex items-center gap-0.5 text-[11px] font-bold text-ts transition-colors hover:text-tp">
            <RotateCcw size={16} /> 10
          </button>
          <button onClick={() => seekBy(10)} aria-label="Forward 10 seconds" className="flex items-center gap-0.5 text-[11px] font-bold text-ts transition-colors hover:text-tp">
            <RotateCw size={16} /> 10
          </button>
          <button
            onClick={() => {
              const v = vref.current;
              if (v) {
                v.muted = !v.muted;
                setMuted(v.muted);
              }
            }}
            aria-label={muted ? "Unmute" : "Mute"}
            className="text-ts transition-colors hover:text-tp"
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <span className="ml-auto text-[11px] font-semibold tabular-nums text-ts">
            {fmt(time)} / {fmt(dur)}
          </span>
          <button onClick={restart} aria-label="Restart" className="hidden text-ts transition-colors hover:text-tp sm:block">
            <Play size={15} className="fill-white" strokeWidth={0} />
          </button>
        </div>
      </div>

      <p className="pointer-events-none absolute inset-x-0 top-0 truncate bg-gradient-to-b from-black/70 to-transparent px-4 pb-4 pt-2 text-xs font-semibold text-ts">
        {title} — Trailer
      </p>
    </div>
  );
}
