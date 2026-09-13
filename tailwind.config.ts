import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          500: "#F95E1B",
          600: "#EE4D2D",
          700: "#D73211",
        },
        warm: {
          50: "#FFFAF8",
          100: "#FFF3EE",
        },
        shopee: {
          DEFAULT: "#EE4D2D",
          light: "#FFF5F1",
          hover: "#D73211",
        },
        lazada: {
          DEFAULT: "#0F3EAA",
          light: "#F0F2FF",
          accent: "#0F2F86",
        },
        tiktok: {
          DEFAULT: "#000000",
          light: "#F4F4F4",
          pink: "#FE2C55",
          cyan: "#25F4EE",
        },
        trust: {
          green: "#10B981",
          light: "#ECFDF5",
        }
      },
      fontFamily: {
        sans: ["var(--font-kanit)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "hero-gradient": "linear-gradient(160deg, #FF7043 0%, #EE4D2D 40%, #C62828 100%)",
      },
      boxShadow: {
        card: "0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)",
        "card-hover": "0 8px 30px -4px rgba(238,77,45,0.20), 0 4px 12px -2px rgba(0,0,0,0.08)",
        glow: "0 0 25px -5px rgba(238, 77, 45, 0.3)",
      }
    },
  },
  plugins: [],
};
export default config;
