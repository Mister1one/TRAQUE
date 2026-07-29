import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#E7E8E1",
        ink: "#13161A",
        "ink-soft": "#1B1F24",
        blaze: "#FF4E1F",
        "blaze-dim": "#C93F19",
        forest: "#21362B",
        signal: "#8A9A6B",
        "text-ink": "#1A1C19",
        "text-paper": "#EDEEE7",
        line: "rgba(26,28,25,0.12)",
        "line-paper": "rgba(237,238,231,0.16)",
      },
      fontFamily: {
        display: ["var(--font-oswald)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jbmono)", "monospace"],
      },
      backgroundImage: {
        "grid-paper":
          "linear-gradient(rgba(26,28,25,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(26,28,25,0.06) 1px, transparent 1px)",
        "grid-ink":
          "linear-gradient(rgba(237,238,231,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(237,238,231,0.06) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "28px 28px",
      },
      keyframes: {
        sweep: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        blip: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.4", transform: "scale(0.85)" },
        },
        rise: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        sweep: "sweep 6s linear infinite",
        blip: "blip 2.4s ease-in-out infinite",
        rise: "rise 0.7s cubic-bezier(0.16,1,0.3,1) both",
      },
    },
  },
  plugins: [],
};
export default config;
