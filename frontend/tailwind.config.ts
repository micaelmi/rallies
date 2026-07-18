import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        foreground: "var(--foreground)",
        muted: "var(--muted)",
        border: "var(--border)",
        brand: "var(--brand)",
        accent: "var(--accent)"
      },
      borderRadius: {
        xl: "var(--radius)"
      },
      boxShadow: {
        soft: "var(--shadow)"
      },
      maxWidth: {
        content: "72rem"
      }
    }
  },
  plugins: []
};

export default config;
