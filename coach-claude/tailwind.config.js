/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0a0c10",
          900: "#0f1218",
          850: "#141822",
          800: "#1a1f2b",
          700: "#252b3a",
          600: "#323a4d",
        },
        brand: {
          // Coach Claude signature — warm coral/ember
          50: "#fff1ec",
          100: "#ffe0d4",
          300: "#ff9f7e",
          400: "#ff7a4d",
          500: "#f55a2a",
          600: "#dd4313",
          700: "#b6340e",
        },
        accent: {
          cyan: "#2dd4bf",
          violet: "#a78bfa",
          amber: "#fbbf24",
          rose: "#fb7185",
          sky: "#38bdf8",
          lime: "#a3e635",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out",
      },
    },
  },
  plugins: [],
};
