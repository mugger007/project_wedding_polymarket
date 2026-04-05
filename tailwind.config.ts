import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: "#34d399",
          purple: "#a78bfa",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(52,211,153,0.2), 0 20px 40px rgba(15,23,42,0.55)",
      },
      animation: {
        rise: "rise .6s ease-out",
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  darkMode: "class",
  plugins: [],
};

export default config;
