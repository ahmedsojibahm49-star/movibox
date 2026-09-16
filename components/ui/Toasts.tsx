"use client";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed right-4 top-20 z-[200] flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex items-start gap-3 rounded-card border border-line bg-raised/95 p-3.5 shadow-modal backdrop-blur animate-slide-in-r",
            t.kind === "success" && "border-l-2 border-l-success",
            t.kind === "error" && "border-l-2 border-l-danger",
            t.kind === "info" && "border-l-2 border-l-accent"
          )}
        >
          {t.kind === "success" && <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" />}
          {t.kind === "error" && <AlertCircle size={18} className="mt-0.5 shrink-0 text-danger" />}
          {t.kind === "info" && <Info size={18} className="mt-0.5 shrink-0 text-accent" />}
          <p className="flex-1 text-sm text-tp">{t.message}</p>
          <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-tm hover:text-tp">
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
