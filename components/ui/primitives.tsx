"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------- Button ----------------
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  icon,
  loading,
  className,
  children,
  disabled,
  ...rest
}: BtnProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold select-none",
        "transition-all duration-200 ease-out active:scale-[0.98] focus-visible:shadow-glow",
        "disabled:opacity-50 disabled:pointer-events-none",
        size === "sm" && "h-9 px-3.5 text-sm rounded-btn",
        size === "md" && "h-11 px-5 text-sm rounded-btn",
        size === "lg" && "h-12 px-6 text-[15px] rounded-btn",
        variant === "primary" &&
          "bg-gradient-to-br from-[#FFB300] via-accent to-[#FF4D00] text-white shadow-[0_4px_20px_rgba(255,122,26,0.3)] hover:brightness-110",
        variant === "secondary" &&
          "bg-white/10 text-tp border border-line hover:bg-white/20",
        variant === "ghost" && "text-ts hover:text-tp hover:bg-white/5",
        variant === "danger" && "bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25",
        className
      )}
      {...rest}
    >
      {loading ? <Spinner size={16} /> : icon}
      {children}
    </button>
  );
}

// ---------------- IconButton ----------------
export function IconButton({
  label,
  className,
  children,
  active,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200",
        "text-ts hover:text-tp hover:bg-white/10 active:scale-95 focus-visible:shadow-glow",
        active && "text-accent",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

// ---------------- Badge ----------------
export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "success" | "warning" | "danger";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-badge px-2 py-0.5 text-[11px] font-semibold leading-4",
        tone === "neutral" && "bg-white/10 text-ts",
        tone === "accent" && "bg-accent/20 text-accent-hover",
        tone === "success" && "bg-success/20 text-success",
        tone === "warning" && "bg-warning/20 text-warning",
        tone === "danger" && "bg-danger/20 text-danger",
        className
      )}
    >
      {children}
    </span>
  );
}

// ---------------- Spinner ----------------
export function Spinner({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn("inline-block animate-spin rounded-full border-2 border-white/20 border-t-accent", className)}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  );
}

// ---------------- Skeleton ----------------
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

// ---------------- EmptyState ----------------
export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center animate-fade-in">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-tm">{icon}</div>
      <p className="text-lg font-semibold text-tp">{title}</p>
      {hint && <p className="max-w-sm text-sm text-tm">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// ---------------- Modal ----------------
export function Modal({
  open,
  onClose,
  children,
  size = "md",
  hideClose,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "video";
  hideClose?: boolean;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        className={cn(
          "relative w-full rounded-modal border border-line bg-raised shadow-modal animate-scale-in",
          size === "sm" && "max-w-sm",
          size === "md" && "max-w-md",
          size === "lg" && "max-w-2xl",
          size === "video" && "max-w-4xl"
        )}
      >
        {!hideClose && (
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-ts hover:text-tp hover:bg-black/70 transition-colors"
          >
            <X size={18} />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}
