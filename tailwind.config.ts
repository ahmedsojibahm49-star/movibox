import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "#050505",
        surface: "#0B0B0F",
        card: "#111116",
        raised: "#18181F",
        line: "rgba(255,255,255,0.08)",
        "line-strong": "rgba(255,255,255,0.16)",
        tp: "#F5F5F7",
        ts: "#A1A1AA",
        tm: "#6B6B76",
        accent: "#FF7A1A",
        "accent-hover": "#FF9440",
        "accent-press": "#F05E00",
        success: "#22C55E",
        danger: "#EF4444",
        warning: "#F59E0B",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "14px",
        modal: "18px",
        btn: "10px",
        badge: "6px",
      },
      boxShadow: {
        card: "0 8px 24px rgba(0,0,0,0.45)",
        modal: "0 24px 64px rgba(0,0,0,0.6)",
        glow: "0 0 0 3px rgba(255,122,26,0.35)",
      },
      maxWidth: {
        site: "1600px",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "fade-up": { from: { opacity: "0", transform: "translateY(14px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "scale-in": { from: { opacity: "0", transform: "scale(.96)" }, to: { opacity: "1", transform: "scale(1)" } },
        "slide-in-r": { from: { opacity: "0", transform: "translateX(24px)" }, to: { opacity: "1", transform: "translateX(0)" } },
        shimmer: { from: { backgroundPosition: "200% 0" }, to: { backgroundPosition: "-200% 0" } },
        spin: { to: { transform: "rotate(360deg)" } },
        "ken-burns": { from: { transform: "scale(1.08)" }, to: { transform: "scale(1)" } },
      },
      animation: {
        "fade-in": "fade-in .25s ease-out",
        "fade-up": "fade-up .3s ease-out",
        "scale-in": "scale-in .2s ease-out",
        "slide-in-r": "slide-in-r .25s ease-out",
        shimmer: "shimmer 2s linear infinite",
        "ken-burns": "ken-burns 8s ease-out forwards",
      },
    },
  },
  plugins: [],
};
export default config;
